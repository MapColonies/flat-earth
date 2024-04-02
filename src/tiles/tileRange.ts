import { BoundingBox } from '../classes';
import type { ArrayElement } from '../types';
import { validateMetatile, validateTileRangeByTileMatrix } from '../validations/validations';
import { Tile } from './tile';
import type { TileMatrixSet } from './tileMatrixSet';
import { clampValues, tileMatrixToBoundingBox, tileToGeoCoords } from './tiles';
import type { TileMatrixId } from './types';

export class TileRange<T extends TileMatrixSet> {
  public constructor(
    public minTileCol: number,
    public minTileRow: number,
    public maxTileCol: number,
    public maxTileRow: number,
    public tileMatrixId: TileMatrixId<T>,
    public metatile = 1
  ) {
    {
      if (minTileCol < 0 || minTileRow < 0) {
        throw new Error('tile indices must be non-negative integers');
      }

      if (minTileCol > maxTileCol || minTileRow > maxTileRow) {
        throw new Error('max tile indices must be equal or larger than min tile indices');
      }

      validateMetatile(metatile);
    }
  }

  public *tileGenerator(): Generator<Tile<T>, void, void> {
    for (let row = this.minTileRow; row <= this.maxTileRow; row++) {
      for (let col = this.minTileCol; col <= this.maxTileCol; col++) {
        yield new Tile(col, row, this.tileMatrixId, this.metatile);
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
    validateTileRangeByTileMatrix(this, tileMatrix);

    const { maxTileCol, maxTileRow, metatile, minTileCol, minTileRow, tileMatrixId } = this;

    if (tileMatrixId !== tileMatrix.identifier.code) {
      throw new Error('tile matrix identifier does not match the identifier of the tile range');
    }

    const { lon, lat } = tileToGeoCoords(new Tile(minTileCol, minTileRow, tileMatrixId), tileMatrix);

    const boundingBox = tileMatrixToBoundingBox(
      { ...tileMatrix, pointOfOrigin: [lon, lat] },
      (maxTileRow - minTileRow) * metatile + 1,
      (maxTileCol - minTileCol) * metatile + 1
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

  public tiles(): Tile<T>[] {
    const tilesGenerator = this.tileGenerator();
    const tiles = [];
    for (const tile of tilesGenerator) {
      tiles.push(tile);
    }
    return tiles;
  }
}
