import { access, constants, mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve as resolvePath } from 'node:path';
import { EOL } from 'os';
import { resolve } from '@apidevtools/json-schema-ref-parser';
import type $Refs from '@apidevtools/json-schema-ref-parser/dist/lib/refs';
import { ESLint } from 'eslint';
import type { JsonSchema, JsonSchemaObject, ParserOverride, Refs } from 'json-schema-to-zod';
import { jsonSchemaToZod, parseSchema } from 'json-schema-to-zod';
import { format, resolveConfigFile } from 'prettier';
import { ToWords } from 'to-words';
import jsLogger from '@map-colonies/js-logger';

const logger = jsLogger({
  redact: {
    paths: ['pid', 'hostname'],
    remove: true,
  },
});
const toWords = new ToWords();
const regexStartsWithNumerals = /^[\d]+/;
const regexAllowedCharacters = /[^($|\w+|\d+)]/g;
const regexCleanVar = /(^#\/definitions\/)|(.json$)/;
const regexFixOneOfCode = /\(\(result\) => \("error" in result \? \[...errors, result.error\] : errors\)\)\(/g;

type $Ref = string;
type ExtendedJsonSchemaObject = JsonSchemaObject &
  Partial<{
    $schema: string;
    $ref: $Ref;
    description: string;
    definitions: JsonSchemaObject;
  }>;
type ProcessingRefs = Record<string, boolean>;
type Definitions = Record<string, ExtendedJsonSchemaObject>;

interface ZodFileContent {
  filePath: string;
  zodCode: string;
}

const IMPORT_ZOD_CODE = 'import { z } from "zod"\n';
const ROOT_SCHEMA_URL = process.env.ROOT_SCHEMA_URL ?? 'https://schemas.opengis.net/tms/2.0/json/tileMatrixSet.json';
const SAVE_JSON_SCHEMAS = process.env.SAVE_JSON_SCHEMAS === 'true' ? true : false;
const JSON_SCHEMAS_ROOT_DIR = resolvePath('validations', 'schemas');
const ZOD_VALIDATIONS_ROOT_DIR = resolvePath('src', 'validations', 'zod');

let safeVarName: (name: string, convertNumerals?: boolean) => string;

class ZodCodeProcessor {
  public constructor(
    private zodCode: string,
    private readonly name: string,
    private readonly imports: Set<string>,
    private readonly definitions: Definitions[]
  ) {}

  public addImportedModules(): this {
    const schemasImports = [...this.imports]
      .map((importVar) => {
        const importPath = [this.definitions.length > 0 ? safeVarName(this.name, false) : undefined, safeVarName(importVar, false)]
          .filter((importPath): importPath is string => importPath !== undefined)
          .map((importPath) => `/${importPath}`)
          .join('');
        return `import { ${safeVarName(importVar)} } from '.${importPath}';`;
      })
      .join(EOL)
      .concat(EOL + IMPORT_ZOD_CODE);

    this.zodCode = schemasImports + (schemasImports.length > 0 ? EOL : '') + this.zodCode;

    return this;
  }

  public removeZodImport(): this {
    if (this.zodCode.startsWith(IMPORT_ZOD_CODE)) {
      this.zodCode = this.zodCode.replace(IMPORT_ZOD_CODE, '');
    }
    return this;
  }

  public fixOneOfParsedOutput(): this {
    this.zodCode = this.zodCode.replaceAll(regexFixOneOfCode, '((result): z.ZodError[] => (result.error ? [...errors, result.error] : errors))(');
    return this;
  }

  public appendRootDescription(description?: string): this {
    if (description !== undefined) {
      this.zodCode = formatCommentAndCode(description) + this.zodCode;
    }
    return this;
  }

  public async formatTypeScript(): Promise<this> {
    this.zodCode = await format(this.zodCode, {
      parser: 'typescript',
      singleQuote: true,
      plugins: ['prettier-plugin-jsdoc'],
      jsdocCommentLineStrategy: 'multiline',
    });
    return this;
  }

  public value(): string {
    return this.zodCode;
  }
}

const formatCommentAndCode = (comment: string, code?: string): string => {
  return '/** ' + comment + ' */' + (code !== undefined ? EOL + code : '');
};

const schemaParserFactory = (
  imports: Set<string>,
  processingRefs: ProcessingRefs,
  definitions: Definitions[],
  schemaDescription: string[]
): ParserOverride => {
  const schemaParser = (schema: ExtendedJsonSchemaObject, refs: Refs): string | void => {
    if (schema.definitions) {
      // store internal subschemas definitions
      definitions.push(schema.definitions);
    }

    if (schema.description !== undefined) {
      const { description, $schema, ...schemaProps } = schema;
      if (refs.path.length === 0) {
        schemaDescription.push(description);
      } else {
        const parsedSchema = parseSchema(schemaProps, refs);
        return formatCommentAndCode(description, parsedSchema);
      }
    }

    if (schema.$ref !== undefined) {
      if (!(schema.$ref in processingRefs)) {
        processingRefs[schema.$ref] = false;
      }
      const ref = schema.$ref.replace(regexCleanVar, '');
      imports.add(ref);
      return safeVarName(ref);
    }

    if (schema.allOf) {
      const withoutDescriptions = schema.allOf.filter((subSchema: JsonSchema) => {
        return typeof subSchema !== 'object' ? false : 'description' in subSchema ? false : true;
      });
      const descriptions = schema.allOf.filter<ExtendedJsonSchemaObject>((subSchema: JsonSchema): subSchema is ExtendedJsonSchemaObject['descr'] => {
        return typeof subSchema !== 'object' ? false : 'description' in subSchema ? true : false;
      });
      const description = descriptions[0]?.description;
      if (description !== undefined) {
        return formatCommentAndCode(
          description,
          parseSchema(withoutDescriptions.length > 1 ? { allOf: withoutDescriptions } : withoutDescriptions[0], refs)
        );
      }
    }
  };

  return schemaParser;
};

const writeToFile = async (filePath: string, data: Parameters<typeof writeFile>['1']): Promise<void> => {
  try {
    const dirPath = dirname(filePath);
    try {
      await access(dirPath, constants.W_OK);
    } catch (err) {
      logger.warn('path does not exist, creating missing folders');
      await mkdir(dirPath, { recursive: true });
    }

    await writeFile(filePath, data);
  } catch (err) {
    logger.error(`could not save file: ${filePath}`);
    throw err;
  }
};

const convertJsonSchemaToZod = async (
  jsonSchema: JsonSchema,
  name: string,
  processingRefs: ProcessingRefs = {}
): Promise<{ zodCode: string; processingRefs: ProcessingRefs; definitions: Definitions }> => {
  if (typeof jsonSchema !== 'object') {
    throw new Error('only object json schemas are supported');
  }

  const imports: Set<string> = new Set();
  const definitions: Definitions[] = [];
  const schemaDescription: string[] = [];

  // side effects within `jsonSchemaToZod` are used to extract info for further processing
  const schemaParser = schemaParserFactory(imports, processingRefs, definitions, schemaDescription);

  const zodCode = jsonSchemaToZod(jsonSchema, {
    module: 'esm',
    name: safeVarName(name),
    parserOverride: schemaParser,
  });

  const processedZodCode = (
    await new ZodCodeProcessor(zodCode, name, imports, definitions)
      .removeZodImport()
      .appendRootDescription(schemaDescription[0])
      .fixOneOfParsedOutput()
      .addImportedModules()
      .formatTypeScript()
  ).value();

  return {
    zodCode: processedZodCode,
    processingRefs,
    definitions: definitions[0],
  };
};

const init = async (): Promise<void> => {
  logger.info('zod validations build process started');
  await resolveConfigFile();

  const changeCase = await import('change-case-all');

  // javascript var has constraints on it's name
  safeVarName = (name: string, convertNumerals = true): string => {
    const safeJSVar = name
      // cannot contain spaces or other special characters
      .replace(regexAllowedCharacters, '');
    // cannot start with a numeral
    const safeJSVarNumerals = convertNumerals
      ? safeJSVar.replace(regexStartsWithNumerals, (match) => (Number(match) ? toWords.convert(Number(match)) : match))
      : safeJSVar;
    return changeCase.camelCase(safeJSVarNumerals);
  };
};

const resolveJsonSchemas = async (): Promise<$Refs> => {
  logger.info('resolving json schemas');
  const schemas = await resolve(ROOT_SCHEMA_URL);
  return schemas;
};

const saveJsonSchemas = async (schemas: $Refs): Promise<$Refs> => {
  if (!SAVE_JSON_SCHEMAS) {
    return schemas;
  }

  logger.info('saving json schemas');
  const schemasPath = Object.entries(schemas.paths());

  for (const [, schemaPath] of schemasPath) {
    logger.info(`saving schema: ${schemaPath}`);
    const schema = schemas.get(schemaPath);
    const fileName = basename(schemaPath);
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    await writeToFile(resolvePath(JSON_SCHEMAS_ROOT_DIR, fileName), JSON.stringify(schema, undefined, 2));
  }

  return schemas;
};

const jsonSchemasToZodFilesContent = async (schemas: $Refs): Promise<ZodFileContent[]> => {
  logger.info('converting json schemas');
  const schemasPath = Object.entries(schemas.paths());
  const zodFilesContent: ZodFileContent[] = [];

  for (const [, schemaPath] of schemasPath) {
    logger.info(`converting schema: ${schemaPath}`);
    let schema = schemas.get(schemaPath);

    if (schema === null || typeof schema === 'string' || typeof schema === 'number') {
      throw new Error('unsupported schema type');
    }

    let aggregateProcessingRefs: ProcessingRefs = {};
    let aggregateDefinitions: Definitions = {};
    const fileBaseName = basename(schemaPath, '.json');
    let name = fileBaseName;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
    while (true) {
      const { definitions, processingRefs, zodCode } = await convertJsonSchemaToZod(schema, name, aggregateProcessingRefs);

      aggregateProcessingRefs = structuredClone(processingRefs);
      aggregateDefinitions = { ...aggregateDefinitions, ...definitions };
      const isEmptyDefinitions = Object.keys(aggregateDefinitions).length === 0;

      const filePath = resolvePath(
        ZOD_VALIDATIONS_ROOT_DIR,
        fileBaseName !== name ? safeVarName(fileBaseName, false) : '',
        `${safeVarName(name, false)}.ts`
      );

      zodFilesContent.push({
        filePath,
        zodCode,
      });

      const processingRef = Object.entries(aggregateProcessingRefs).find(([, isProcessed]) => !isProcessed);
      if (!processingRef || isEmptyDefinitions) {
        break;
      }
      const [ref] = processingRef;
      const defRef = ref.replace('#/definitions/', '');
      if (ref.startsWith('#/definitions/') && defRef in aggregateDefinitions) {
        schema = aggregateDefinitions[defRef];
        name = defRef;
        aggregateProcessingRefs[ref] = true;
      } else {
        throw new Error('unfamiliar reference: ref was not found in known definitions');
      }
    }
  }

  return zodFilesContent;
};

const generateZodFiles = async (zodFilesContent: ZodFileContent[]): Promise<void> => {
  logger.info('generating zod files');
  for (const { filePath, zodCode } of zodFilesContent) {
    logger.info(`generating zod file: ${basename(filePath)}`);

    await writeToFile(filePath, zodCode);
  }
};

const fixlZodFilesLintIssues = async (): Promise<void> => {
  logger.info('linting zod files');

  const eslint = new ESLint({
    fix: true,
  });

  const lintedFilesResults = await eslint.lintFiles(`${ZOD_VALIDATIONS_ROOT_DIR}/**/*.ts`);
  await ESLint.outputFixes(lintedFilesResults);
};

init()
  .then(resolveJsonSchemas)
  .then(saveJsonSchemas)
  .then(jsonSchemasToZodFilesContent)
  .then(generateZodFiles)
  .then(fixlZodFilesLintIssues)
  .then(() => {
    logger.info('process finished successfully');
  })
  .catch((err) => {
    let errMessage: string;
    if (err instanceof Error) {
      errMessage = err.message;
    } else if (typeof err === 'object') {
      errMessage = JSON.stringify(err);
    } else if (typeof err === 'string') {
      errMessage = err;
    } else {
      errMessage = 'unknown error';
    }

    logger.error(`process stopped with an error: ${errMessage}`);
    throw err;
  });
