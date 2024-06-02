import { encodeToJSON } from '../crs/crs';
import { BoundingBox } from '../geometries/boundingBox';
import type { ArrayElement } from '../types';
import { validateMetatile, validateTileMatrixIdByTileMatrixSet } from '../validations/validations';
import { Tile } from './tile';
import type { TileMatrixSet } from './tileMatrixSet';
import { tileMatrixToBBox } from './tiles';
import type { TileIndex, TileMatrixId, TileMatrixLimits } from './types';

/**
 * Tile range class that supports a metatile definition
 */
export class TileRange<T extends TileMatrixSet> implements TileMatrixLimits<T> {
  private readonly tileMatrix: ArrayElement<T['tileMatrices']>;

  /**
   * Tile range constructor
   * @param minTileCol minimum tile col
   * @param minTileRow  minimum tile row
   * @param maxTileCol maximum tile col
   * @param maxTileRow maximum tile row
   * @param tileMatrixSet tile matrix set
   * @param tileMatrixId tile matrix identifier of `tileMatrixSet`
   * @param metatile size of a metatile
   */
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

  /**
   * Convert tile range to an iterator of tile indices
   * @returns generator function of tile indices in the tile range
   */
  public *tileGenerator(): Generator<TileIndex<T>, void, void> {
    for (let row = this.minTileRow; row <= this.maxTileRow; row++) {
      for (let col = this.minTileCol; col <= this.maxTileCol; col++) {
        yield { col, row, tileMatrixId: this.tileMatrixId };
      }
    }
    return;
  }

  /**
   * Converts tile range into a bounding box
   * @param clamp whether to clamp the output bounding box to the tile matrix's bounding box
   * @returns bounding box
   */
  public toBoundingBox(clamp = true): BoundingBox {
    const tile = new Tile({ col: this.minTileCol, row: this.minTileRow, tileMatrixId: this.tileMatrixId }, this.tileMatrixSet, this.metatile);
    const {
      coordinates: [east, north],
    } = tile.toPoint();

    const tileRangeBBox = tileMatrixToBBox(
      { ...this.tileMatrix, pointOfOrigin: [east, north] },
      (this.maxTileRow - this.minTileRow) * this.metatile + 1,
      (this.maxTileCol - this.minTileCol) * this.metatile + 1
    );
    const tileRangeBoundingBox = new BoundingBox({ bbox: tileRangeBBox, coordRefSys: encodeToJSON(this.tileMatrixSet.crs) });

    return clamp
      ? tileRangeBoundingBox.clampToBoundingBox(
          new BoundingBox({ bbox: tileMatrixToBBox(this.tileMatrix), coordRefSys: encodeToJSON(this.tileMatrixSet.crs) })
        )
      : tileRangeBoundingBox;
  }
}
