import type { TileMatrixSetJSON, TileMatrixSet as TileMatrixSetType } from '../types';

export class TileMatrixSet {
  private readonly options: TileMatrixSetType;
  public constructor(private readonly tileMatrixSetJSON: TileMatrixSetJSON) {
    this.options = this.decodeFromJSON(tileMatrixSetJSON);
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
      ...(descriptionJSON && { description: { value: descriptionJSON } }),
      ...(idJSON && { identifier: { code: idJSON } }),
      ...(keywordsJSON && {
        keywords: keywordsJSON.map((keyword) => {
          return { keyword: [{ value: keyword }] };
        }),
      }),
      ...(titleJSON && { title: { value: titleJSON } }),
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
      ...(boundingBox && { boundingBox: boundingBox && [...boundingBox?.lowerLeft, ...boundingBox?.upperRight] }),
      ...(description && { description: description?.value }),
      ...(identifier && { id: identifier?.code }),
      ...(keywords && { keywords: keywordsJSON }),
      ...(title && { title: title?.value }),
      ...otherProps,
    };
  }

  get title() {
    return this.options.title;
  }

  get description() {
    return this.options.description;
  }

  get keywords() {
    return this.options.keywords;
  }

  get identifier() {
    return this.options.identifier;
  }

  get uri() {
    return this.options.uri;
  }

  get orderedAxes() {
    return this.options.orderedAxes;
  }

  get crs() {
    return this.options.crs;
  }

  get wellKnownScaleSet() {
    return this.options.wellKnownScaleSet;
  }

  get boundingBox() {
    return this.options.boundingBox;
  }

  get tileMatrices() {
    return this.options.tileMatrices;
  }

  public toJSON(): TileMatrixSetJSON {
    return this.tileMatrixSetJSON;
  }
}
