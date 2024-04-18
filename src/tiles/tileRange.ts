import { BoundingBox } from '../classes';
import type { ArrayElement } from '../types';
import { validateMetatile, validateTileMatrixIdByTileMatrixSet } from '../validations/validations';
import { Tile } from './tile';
import type { TileMatrixSet } from './tileMatrixSet';
import { tileMatrixToBoundingBox } from './tiles';
import type { TileIndex, TileMatrixId, TileMatrixLimits } from './types';

export class TileRange<T extends TileMatrixSet> implements TileMatrixLimits<T> {
  private readonly tileMatrix: ArrayElement<T['tileMatrices']>;

  public constructor(
    public readonly minTileCol: number,
    public readonly minTileRow: number,
    public readonly maxTileCol: number,
    public readonly maxTileRow: number,
    private readonly tileMatrixSet: T,
    public readonly tileMatrixId: TileMatrixId<T>,
    public readonly metatile = 1
  ) {
    validateMetatile(metatile);
    // validateTileMatrixSet(tileMatrixSet); // TODO: missing implementation
    validateTileMatrixIdByTileMatrixSet(tileMatrixId, tileMatrixSet);

    const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix set');
    }

    if (minTileCol < 0 || minTileRow < 0) {
      throw new Error('min tile indices must be non-negative integers');
    }

    if (minTileCol > maxTileCol || minTileRow > maxTileRow) {
      throw new Error('max tile indices must be equal or larger than min tile indices');
    }

    this.tileMatrix = tileMatrix;
  }

  public *tileGenerator(): Generator<TileIndex<T>, void, void> {
    for (let row = this.minTileRow; row <= this.maxTileRow; row++) {
      for (let col = this.minTileCol; col <= this.maxTileCol; col++) {
        yield { col, row, tileMatrixId: this.tileMatrixId };
      }
    }
  }

  /**
   * Converts tile range into a bounding box
   * @param clamp a boolean whether to clamp the calculated bounding box to the tile matrix's bounding box
   * @returns bounding box
   */
  public toBoundingBox(clamp = true): BoundingBox {
    const tile = new Tile(this.minTileCol, this.minTileRow, this.tileMatrixSet, this.tileMatrixId, this.metatile);
    const {
      coordinates: [east, north],
    } = tile.toPoint();

    const tileRangeBoundingBox = tileMatrixToBoundingBox(
      { ...this.tileMatrix, pointOfOrigin: [east, north] },
      this.tileMatrixSet.crs,
      (this.maxTileRow - this.minTileRow) * this.metatile + 1,
      (this.maxTileCol - this.minTileCol) * this.metatile + 1
    );

    return clamp ? tileRangeBoundingBox.clampToBoundingBox(tileMatrixToBoundingBox(this.tileMatrix, this.tileMatrixSet.crs)) : tileRangeBoundingBox;
  }
}
