import type { BoundingBox, GeoPoint } from '../classes';
import type { ArrayElement } from '../types';
import { validateMetatile, validateTileByTileMatrix, validateTileMatrix } from '../validations/validations';
import type { TileMatrixSet } from './tileMatrixSet';
import { TileRange } from './tileRange';
import { geoCoordsToTile, tileToGeoCoords } from './tiles';
import type { TileMatrixId } from './types';

/**
 * Tile class that supports a metatile definition
 */
export class Tile<T extends TileMatrixSet> {
  public constructor(
    public readonly col: number,
    public readonly row: number,
    public readonly tileMatrixId: TileMatrixId<T>,
    public readonly metatile?: number
  ) {
    if (col < 0 || row < 0) {
      throw new Error('tile indices must be non-negative integers');
    }

    if (metatile !== undefined) {
      validateMetatile(metatile);
    }
  }

  /**
   * Calculates a bounding box of a tile
   * @param tileMatrix a tile matrix containing the tile
   * @param clamp a boolean whether to clamp the calculated bounding box to the tile matrix's bounding box
   * @returns bounding box of the tile
   */
  public toBoundingBox<T extends TileMatrixSet>(tileMatrix: ArrayElement<T['tileMatrices']>, clamp = false): BoundingBox {
    validateTileMatrix(tileMatrix);
    validateTileByTileMatrix(this, tileMatrix);

    const { col, row, tileMatrixId, metatile = 1 } = this;
    const tileRange = new TileRange(col, row, col, row, tileMatrixId, metatile);
    const tileBoundingBox = tileRange.toBoundingBox(tileMatrix, clamp);

    return tileBoundingBox;
  }

  /**
   * Calculates a point with longitude and latitude for a tile in a tile matrix
   * @param tileMatrix tile matrix which the tile belongs to
   * @returns point with longitude and latitude of the origin of the tile, determined by `cornerOfOrigin` property of the tile matrix
   */
  public toGeoPoint<T extends TileMatrixSet>(tileMatrix: ArrayElement<T['tileMatrices']>): GeoPoint {
    validateTileMatrix(tileMatrix);
    validateTileByTileMatrix(this, tileMatrix);

    const geoPoint = tileToGeoCoords(this, tileMatrix);
    return geoPoint;
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

    const { min: minTilePoint, max: maxTilePoint } = this.toBoundingBox(tileMatrix);

    const { col: minTileCol, row: minTileRow } = geoCoordsToTile(minTilePoint, targetTileMatrix, false, metatile);
    const { col: maxTileCol, row: maxTileRow } = geoCoordsToTile(maxTilePoint, targetTileMatrix, true, metatile);

    return new TileRange(minTileCol, minTileRow, maxTileCol, maxTileRow, targetTileMatrixId, metatile);
  }
}
