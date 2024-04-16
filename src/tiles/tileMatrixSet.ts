import type { ArrayElement } from '../types';
import type {
  BoundingBox2D,
  CRS,
  CodeType,
  Keyword,
  LanguageString,
  TileMatrix,
  TileMatrixId,
  TileMatrixSetJSON,
  TileMatrixSet as TileMatrixSetType,
} from './types';

export class TileMatrixSet {
  private readonly options: TileMatrixSetType;
  // TODO: add validations for TileMatrixSetJSON with json-schema-to-zod?! missing validations on TileMatrixSet / TileMatrix - use ZOD/AJV?
  public constructor(private readonly tileMatrixSetJSON: TileMatrixSetJSON) {
    this.options = this.decodeFromJSON(tileMatrixSetJSON);
  }

  public get title(): LanguageString | undefined {
    return this.options.title;
  }

  public get description(): LanguageString | undefined {
    return this.options.description;
  }

  public get keywords(): Keyword[] | undefined {
    return this.options.keywords;
  }

  public get identifier(): CodeType | undefined {
    return this.options.identifier;
  }

  public get uri(): string | undefined {
    return this.options.uri;
  }

  public get orderedAxes(): [string, string] | undefined {
    return this.options.orderedAxes;
  }

  public get crs(): CRS {
    return this.options.crs;
  }

  public get wellKnownScaleSet(): string | undefined {
    return this.options.wellKnownScaleSet;
  }

  public get boundingBox(): BoundingBox2D | undefined {
    return this.options.boundingBox;
  }

  public get tileMatrices(): TileMatrix[] {
    return this.options.tileMatrices;
  }

  public toJSON(): TileMatrixSetJSON {
    return this.tileMatrixSetJSON;
  }

  /**
   * Extracts a tile matrix from a tile matrix set
   * @param tileMatrixId tile matrix identifier
   * @returns tile matrix or `undefined` if `identifier` was not found in `tileMatrixSet`
   */
  public getTileMatrix<T extends TileMatrixSet>(tileMatrixId: TileMatrixId<T>): ArrayElement<T['tileMatrices']> | undefined {
    return this.tileMatrices.find<ArrayElement<T['tileMatrices']>>((tileMatrix): tileMatrix is ArrayElement<T['tileMatrices']> => {
      const {
        identifier: { code: comparedTileMatrixId },
      } = tileMatrix;
      return comparedTileMatrixId === tileMatrixId;
    });
  }

  private decodeFromJSON(tileMatrixSetJSON: TileMatrixSetJSON): TileMatrixSetType {
    const {
      crs: crsJSON,
      tileMatrices: tileMatricesJSON,
      boundingBox: boundingBoxJSON,
      description: descriptionJSON,
      id: idJSON,
      keywords: keywordsJSON,
      title: titleJSON,
      ...otherProps
    } = tileMatrixSetJSON;

    const crs = typeof crsJSON === 'object' && 'wkt' in crsJSON ? { wkt: JSON.stringify(crsJSON.wkt) } : crsJSON;
    const tileMatrices = tileMatricesJSON.map((tileMaxtrix) => {
      const { id, ...otherProps } = tileMaxtrix;
      return {
        identifier: { code: id },
        ...otherProps,
      };
    });

    return {
      crs,
      tileMatrices,
      ...(boundingBoxJSON && {
        boundingBox: { lowerLeft: [boundingBoxJSON[0], boundingBoxJSON[1]], upperRight: [boundingBoxJSON[2], boundingBoxJSON[3]] },
      }),
      ...(descriptionJSON !== undefined && { description: { value: descriptionJSON } }),
      ...(idJSON !== undefined && { identifier: { code: idJSON } }),
      ...(keywordsJSON && {
        keywords: keywordsJSON.map((keyword) => {
          return { keyword: [{ value: keyword }] };
        }),
      }),
      ...(titleJSON !== undefined && { title: { value: titleJSON } }),
      ...otherProps,
    };
  }

  private encodeToJSON(tileMatrixSet: TileMatrixSetType): TileMatrixSetJSON {
    const { crs, tileMatrices, boundingBox, description, identifier, keywords, title, ...otherProps } = tileMatrixSet;

    const crsJSON = typeof crs === 'object' && 'wkt' in crs ? { wkt: JSON.parse(crs.wkt) as object } : crs;
    const tileMatricesJSON = tileMatrices.map((tileMaxtrixJSON) => {
      const { identifier, cornerOfOrigin, ...otherProps } = tileMaxtrixJSON;
      return {
        id: identifier.code,
        ...otherProps,
      };
    });
    const keywordsJSON = keywords
      ?.flatMap((keyword) => (keyword.keyword ? keyword.keyword.map((keyword) => keyword.value) : undefined))
      ?.filter((keyword): keyword is string => typeof keyword === 'string');

    return {
      crs: crsJSON,
      tileMatrices: tileMatricesJSON,
      ...(boundingBox && { boundingBox: [...boundingBox.lowerLeft, ...boundingBox.upperRight] }),
      ...(description && { description: description.value }),
      ...(identifier && { id: identifier.code }),
      ...(keywords && { keywords: keywordsJSON }),
      ...(title && { title: title.value }),
      ...otherProps,
    };
  }
}
