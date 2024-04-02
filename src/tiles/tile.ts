import type { ArrayElement, TileMatrixId } from '../types';
import { validateMetatile, validateTileMatrix } from '../validations/validations';
import type { TileMatrixSet } from './tileMatrixSet';
import { TileRange } from './tileRange';
import { geoCoordsToTile, tileToBoundingBox } from './tiles';

/**
 * Tile class that supports a metatile definition
 */
export class Tile<T extends TileMatrixSet> {
  public constructor(
    public col: number,
    public row: number,
    public tileMatrixId: TileMatrixId<T>,
    public metatile?: number
  ) {
    if (col < 0 || row < 0) {
      throw new Error('tile indices must be non-negative integers');
    }

    if (metatile !== undefined) {
      validateMetatile(metatile);
    }
  }

  /**
   * Converts tile to tile range in any tile matrix
   * This method will help find what tiles are needed to cover a given tile at a different tile matrix
   * @param tileMatrix tile matrix
   * @param targetTileMatrix target tile matrix
   * @returns tile range at the given tile matrix
   */
  public toTileRange<T extends TileMatrixSet>(
    tileMatrix: ArrayElement<T['tileMatrices']>,
    targetTileMatrix: ArrayElement<T['tileMatrices']>
  ): TileRange<T> {
    validateTileMatrix(tileMatrix);
    validateTileMatrix(targetTileMatrix);

    const { metatile = 1 } = this;
    const {
      identifier: { code: targetTileMatrixId },
    } = targetTileMatrix;

    const { min: minTilePoint, max: maxTilePoint } = tileToBoundingBox(this, tileMatrix);

    const { col: minCol, row: minRow } = geoCoordsToTile(minTilePoint, targetTileMatrix, false, metatile);
    const { col: maxCol, row: maxRow } = geoCoordsToTile(maxTilePoint, targetTileMatrix, true, metatile);

    return new TileRange(minCol, minRow, maxCol, maxRow, targetTileMatrixId, metatile);
  }
}
