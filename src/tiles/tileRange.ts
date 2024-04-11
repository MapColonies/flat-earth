import { BoundingBox } from '../classes';
import type { ArrayElement } from '../types';
import { validateMetatile, validateTileMatrix, validateTileRangeByTileMatrix } from '../validations/validations';
import { Tile } from './tile';
import type { TileMatrixSet } from './tileMatrixSet';
import { clampValues, tileMatrixToBoundingBox } from './tiles';
import type { TileMatrix, TileMatrixId } from './types';

export class TileRange<T extends TileMatrixSet> {
  public readonly tileMatrixId: TileMatrixId<T>;
  public constructor(
    public readonly minTileCol: number,
    public readonly minTileRow: number,
    public readonly maxTileCol: number,
    public readonly maxTileRow: number,
    public readonly tileMatrix: TileMatrix,
    public readonly metatile = 1
  ) {
    validateMetatile(metatile);
    validateTileMatrix(tileMatrix);

    if (minTileCol < 0 || minTileRow < 0) {
      throw new Error('tile indices must be non-negative integers');
    }

    if (minTileCol > maxTileCol || minTileRow > maxTileRow) {
      throw new Error('max tile indices must be equal or larger than min tile indices');
    }

    if (maxTileCol >= Math.ceil(tileMatrix.matrixWidth / metatile) || maxTileRow >= Math.ceil(tileMatrix.matrixHeight / metatile)) {
      throw new Error('max tile indices must be less than tile matrix size');
    }

    this.tileMatrixId = tileMatrix.identifier.code;
  }

  public *tileGenerator(tileMatrix: ArrayElement<T['tileMatrices']>): Generator<Tile<T>, void, void> {
    validateTileMatrix(tileMatrix);
    validateTileRangeByTileMatrix(this, tileMatrix);
    for (let row = this.minTileRow; row <= this.maxTileRow; row++) {
      for (let col = this.minTileCol; col <= this.maxTileCol; col++) {
        yield new Tile(col, row, tileMatrix, this.metatile);
      }
    }
  }

  /**
   * Converts tile range into a bounding box
   * @param tileMatrix tile matrix that the tile range belongs to
   * @param clamp a boolean whether to clamp the calculated bounding box to the tile matrix's bounding box
   * @returns bounding box
   */
  public toBoundingBox<T extends TileMatrixSet>(tileMatrix: ArrayElement<T['tileMatrices']>, clamp = false): BoundingBox {
    validateTileMatrix(tileMatrix);
    validateTileRangeByTileMatrix(this, tileMatrix);

    if (this.tileMatrixId !== tileMatrix.identifier.code) {
      throw new Error('tile matrix identifier does not match the identifier of the tile range');
    }

    const tile = new Tile(this.minTileCol, this.minTileRow, tileMatrix);
    const { lon, lat } = tile.toGeoPoint(tileMatrix);

    const boundingBox = tileMatrixToBoundingBox(
      { ...tileMatrix, pointOfOrigin: [lon, lat] },
      (this.maxTileRow - this.minTileRow) * this.metatile + 1,
      (this.maxTileCol - this.minTileCol) * this.metatile + 1
    );

    if (clamp) {
      // clamp the values in cases where a metatile may extend tile bounding box beyond the bounding box
      // of the tile matrix
      const { min: tileMatrixBoundingBoxMin, max: tileMatrixBoundingBoxMax } = tileMatrixToBoundingBox(tileMatrix);
      return new BoundingBox([
        clampValues(boundingBox.min.lon, tileMatrixBoundingBoxMin.lon, tileMatrixBoundingBoxMax.lon),
        clampValues(boundingBox.min.lat, tileMatrixBoundingBoxMin.lat, tileMatrixBoundingBoxMax.lat),
        clampValues(boundingBox.max.lon, tileMatrixBoundingBoxMin.lon, tileMatrixBoundingBoxMax.lon),
        clampValues(boundingBox.max.lat, tileMatrixBoundingBoxMin.lat, tileMatrixBoundingBoxMax.lat),
      ]);
    }

    return boundingBox;
  }
}
