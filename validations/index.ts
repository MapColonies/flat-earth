import { access, constants, mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve as resolvePath } from 'node:path';
import { EOL } from 'os';
import { resolve } from '@apidevtools/json-schema-ref-parser';
import type $Refs from '@apidevtools/json-schema-ref-parser/dist/lib/refs';
import { ESLint } from 'eslint';
import type { JsonSchema, JsonSchemaObject, ParserOverride } from 'json-schema-to-zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';
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
type ExtendedJsonSchemaObject = JsonSchemaObject & Partial<{ $ref: $Ref; definitions: JsonSchemaObject }>;
type ProcessingRefs = Record<string, boolean>;
type Definitions = Record<string, ExtendedJsonSchemaObject>;

interface ZodFileContent {
  rootFileBaseName: string;
  schemaName: string;
  imports: string;
  zodCode: string;
}

const ROOT_SCHEMA_URL = process.env.ROOT_SCHEMA_URL ?? 'https://schemas.opengis.net/tms/2.0/json/tileMatrixSet.json';
const SAVE_JSON_SCHEMAS = process.env.SAVE_JSON_SCHEMAS === 'true' ? true : false;
const JSON_SCHEMAS_ROOT_DIR = resolvePath('validations', 'schemas');
const ZOD_VALIDATIONS_ROOT_DIR = resolvePath('src', 'validations', 'zod');

let safeVarName: (name: string, convertNumerals?: boolean) => string;

const formatTypeScript = async (zodCode: string): Promise<string> => {
  return format(zodCode, { parser: 'typescript', singleQuote: true });
};

const fixOneOfOutput = (zodCode: string): string => {
  const ttt = zodCode.replaceAll(regexFixOneOfCode, '((result): z.ZodError[] => (result.error ? [...errors, result.error] : errors))(');
  return ttt;
};

const zodCodePostProcessing = (zodCode: string): string => {
  zodCode = fixOneOfOutput(zodCode);
  return zodCode;
};

const schemaParserFactory = (imports: Set<string>, processingRefs: ProcessingRefs, definitions: Definitions[]): ParserOverride => {
  const schemaParser = (schema: ExtendedJsonSchemaObject): string | void => {
    if (schema.definitions) {
      // store internal subschemas definitions
      definitions.push(schema.definitions);
    }

    if (schema.$ref !== undefined) {
      if (!(schema.$ref in processingRefs)) {
        processingRefs[schema.$ref] = false;
      }
      const ref = schema.$ref.replace(regexCleanVar, '');
      imports.add(ref);
      return safeVarName(ref);
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
): Promise<{ zodCode: string; imports: Set<string>; processingRefs: ProcessingRefs; definitions: Definitions }> => {
  if (typeof jsonSchema !== 'object') {
    throw new Error('only object json schemas are supported');
  }

  const definitionsArr: Definitions[] = [];
  const imports: Set<string> = new Set();

  // side effects within `jsonSchemaToZod` are used to extract info for further processing
  const schemaParser = schemaParserFactory(imports, processingRefs, definitionsArr);

  const zodCode = jsonSchemaToZod(jsonSchema, {
    module: 'esm',
    name: safeVarName(name),
    parserOverride: schemaParser,
  });

  const processedZodCode = zodCodePostProcessing(zodCode);
  const formattedZodCode = await formatTypeScript(processedZodCode);

  return {
    zodCode: formattedZodCode,
    imports,
    processingRefs,
    definitions: definitionsArr[0],
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
    logger.info(`saving schema: ${schemaPath}`); // TODO: use mapcolonies logger
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
    let flag = true;

    while (flag) {
      const { definitions, imports, processingRefs, zodCode } = await convertJsonSchemaToZod(schema, name, aggregateProcessingRefs);

      aggregateProcessingRefs = structuredClone(processingRefs);
      aggregateDefinitions = { ...aggregateDefinitions, ...definitions };
      const isEmptyDefinitions = Object.keys(aggregateDefinitions).length === 0;

      const schemasImports = [...imports]
        .map((importVar) => {
          const importPath = [
            fileBaseName === name && !isEmptyDefinitions ? safeVarName(fileBaseName, false) : undefined,
            safeVarName(importVar, false),
          ]
            .filter((importPath): importPath is string => importPath !== undefined)
            .map((importPath) => `/${importPath}`)
            .join('');
          return `import { ${safeVarName(importVar)} } from '.${importPath}';`;
        })
        .join(EOL);

      zodFilesContent.push({
        zodCode: zodCode,
        schemaName: name,
        rootFileBaseName: fileBaseName,
        imports: schemasImports,
      });

      const processingRef = Object.entries(aggregateProcessingRefs).find(([, isProcessed]) => !isProcessed);
      if (!processingRef || isEmptyDefinitions) {
        flag = false;
        continue;
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
  for (const { schemaName, rootFileBaseName, imports, zodCode } of zodFilesContent) {
    logger.info(`generating zod file for: ${schemaName}`);

    const zodFileContent = imports + (imports.length > 0 ? EOL : '') + zodCode;

    const filePath = resolvePath(
      ZOD_VALIDATIONS_ROOT_DIR,
      rootFileBaseName !== schemaName ? safeVarName(rootFileBaseName, false) : '',
      `${safeVarName(schemaName, false)}.ts`
    );

    await writeToFile(filePath, zodFileContent);
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
