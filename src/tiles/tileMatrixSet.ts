import type { ArrayElement, Comparison } from '../types';
import { validateTileMatrix } from '../validations/validations';
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

export class TileMatrixSet implements TileMatrixSetType {
  private readonly tileMatrixSet: TileMatrixSetType;
  public constructor(tileMatrixSetJSON: TileMatrixSetJSON) {
    // validateTileMatrixSet(tileMatrixSet); // TODO: missing implementation
    // validateCRS(tileMatrixSetJSON.crs); // TODO: needs a different validation
    this.tileMatrixSet = this.decodeFromJSON(tileMatrixSetJSON);
  }

  public get title(): LanguageString | undefined {
    return this.tileMatrixSet.title;
  }

  public get description(): LanguageString | undefined {
    return this.tileMatrixSet.description;
  }

  public get keywords(): Keyword[] | undefined {
    return this.tileMatrixSet.keywords;
  }

  public get identifier(): CodeType | undefined {
    return this.tileMatrixSet.identifier;
  }

  public get uri(): string | undefined {
    return this.tileMatrixSet.uri;
  }

  public get orderedAxes(): [string, string] | undefined {
    return this.tileMatrixSet.orderedAxes;
  }

  public get crs(): CRS {
    return this.tileMatrixSet.crs;
  }

  public get wellKnownScaleSet(): string | undefined {
    return this.tileMatrixSet.wellKnownScaleSet;
  }

  public get boundingBox(): BoundingBox2D | undefined {
    return this.tileMatrixSet.boundingBox;
  }

  public get tileMatrices(): TileMatrix[] {
    return this.tileMatrixSet.tileMatrices;
  }

  public toJSON(): TileMatrixSetJSON {
    return this.encodeToJSON();
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

  /**
   * Finds the matching tile matrix in tile matrix set to input `tileMatrix` based on the selected comparison method
   * @param tileMatrix target tile matrix
   * @param comparison comparison method
   * @returns matching tile matrix or undefined when matching scale could not be found
   */
  public findMatchingTileMatrix<T extends TileMatrixSet>(tileMatrix: TileMatrix, comparison: Comparison = 'equal'): TileMatrixId<T> | undefined {
    validateTileMatrix(tileMatrix);

    const { scaleDenominator: targetScaleDenominator } = tileMatrix;

    const { tileMatrixId, diff } = this.tileMatrices
      .sort((a, b) => b.scaleDenominator - a.scaleDenominator)
      .map(({ identifier: { code: tileMatrixId }, scaleDenominator }) => {
        return { tileMatrixId, diff: targetScaleDenominator - scaleDenominator };
      })
      .reduce((prevValue, { tileMatrixId, diff }) => {
        const { diff: prevDiff } = prevValue;

        switch (comparison) {
          case 'equal':
            if (diff === 0) {
              return { tileMatrixId, diff };
            }
            break;
          case 'closest':
            if (Math.abs(diff) < Math.abs(prevDiff)) {
              return { tileMatrixId, diff };
            }
            break;
          case 'lower':
            if (diff > 0 && diff < prevDiff) {
              return { tileMatrixId, diff };
            }
            break;
          case 'higher':
            if (diff < 0 && Math.abs(diff) < Math.abs(prevDiff)) {
              return { tileMatrixId, diff };
            }
            break;
        }

        return prevValue;
      });

    if ((comparison === 'equal' && diff !== 0) || (comparison === 'lower' && diff < 0) || (comparison === 'higher' && diff > 0)) {
      // could not find a match
      return undefined;
    }

    return tileMatrixId;
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

  private encodeToJSON(): TileMatrixSetJSON {
    const { crs, tileMatrices, boundingBox, description, identifier, keywords, title, ...otherProps } = this;

    const crsJSON = typeof crs === 'object' && 'wkt' in crs ? { wkt: JSON.parse(crs.wkt) as Record<string, unknown> } : crs;
    const tileMatricesJSON = tileMatrices.map((tileMaxtrixJSON) => {
      const { identifier, ...otherProps } = tileMaxtrixJSON;
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
