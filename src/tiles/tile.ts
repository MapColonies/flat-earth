import { GeoPoint, type BoundingBox } from '../classes';
import type { ArrayElement } from '../types';
import { validateMetatile, validateTileByTileMatrix, validateTileMatrix } from '../validations/validations';
import type { TileMatrixSet } from './tileMatrixSet';
import { TileRange } from './tileRange';
import { tileEffectiveHeight, tileEffectiveWidth } from './tiles';
import type { TileMatrix, TileMatrixId } from './types';

/**
 * Tile class that supports a metatile definition
 */
export class Tile<T extends TileMatrixSet> {
  public readonly tileMatrixId: TileMatrixId<T>;
  public constructor(
    public readonly col: number,
    public readonly row: number,
    tileMatrix: TileMatrix,
    public readonly metatile = 1
  ) {
    validateMetatile(metatile);
    validateTileMatrix(tileMatrix);

    if (col < 0 || row < 0 || col > tileMatrix.matrixWidth - 1 || row > tileMatrix.matrixHeight - 1) {
      throw new RangeError('tile indices must be non-negative integers larger than 0 and less than tile matrix size');
    }

    this.tileMatrixId = tileMatrix.identifier.code;
  }

  /**
   * Calculates a bounding box of a tile
   * @param tileMatrix a tile matrix containing the tile
   * @param clamp a boolean whether to clamp the calculated bounding box to the tile matrix's bounding box
   * @returns bounding box of the tile
   */
  public toBoundingBox(tileMatrix: ArrayElement<T['tileMatrices']>, clamp = false): BoundingBox {
    validateTileMatrix(tileMatrix);
    validateTileByTileMatrix(this, tileMatrix);

    const { col, row, metatile } = this;
    const tileRange = new TileRange(col, row, col, row, tileMatrix, metatile);
    const tileBoundingBox = tileRange.toBoundingBox(tileMatrix, clamp);

    return tileBoundingBox;
  }

  /**
   * Calculates a point with longitude and latitude for a tile in a tile matrix
   * @param tileMatrix tile matrix which the tile belongs to
   * @returns point with longitude and latitude of the origin of the tile, determined by `cornerOfOrigin` property of the tile matrix
   */
  public toGeoPoint(tileMatrix: ArrayElement<T['tileMatrices']>): GeoPoint {
    validateTileMatrix(tileMatrix);
    validateTileByTileMatrix(this, tileMatrix);

    const { col, row, metatile } = this;
    const width = tileEffectiveWidth(tileMatrix) * metatile;
    const height = tileEffectiveHeight(tileMatrix) * metatile;

    const {
      pointOfOrigin: [originX, originY],
      cornerOfOrigin = 'topLeft',
    } = tileMatrix;

    const lon = originX + col * width;
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const lat = originY + (cornerOfOrigin === 'topLeft' ? -1 : 1) * row * height;

    return new GeoPoint(lon, lat);
  }

  /**
   * Converts tile to tile range in any tile matrix
   * This method will help find what tiles are needed to cover a given tile at a different tile matrix
   * @param tileMatrix tile matrix
   * @param targetTileMatrix target tile matrix
   * @returns tile range at the given tile matrix
   */
  public toTileRange(tileMatrix: ArrayElement<T['tileMatrices']>, targetTileMatrix: ArrayElement<T['tileMatrices']>): TileRange<T> {
    validateTileMatrix(tileMatrix);
    validateTileMatrix(targetTileMatrix);
    validateTileByTileMatrix(this, tileMatrix);

    const { metatile } = this;
    const { min: minTilePoint, max: maxTilePoint } = this.toBoundingBox(tileMatrix);

    const { col: minTileCol, row: minTileRow } = minTilePoint.toTile(targetTileMatrix, false, metatile);
    const { col: maxTileCol, row: maxTileRow } = maxTilePoint.toTile(targetTileMatrix, true, metatile);

    return new TileRange(minTileCol, minTileRow, maxTileCol, maxTileRow, targetTileMatrix, metatile);
  }
}
