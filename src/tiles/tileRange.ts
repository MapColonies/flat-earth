import type { TileMatrixId } from '../types';
import { validateMetatile } from '../validations/validations';
import { Tile } from './tile';
import type { TileMatrixSet } from './tileMatrixSet';

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

  public tiles(): Tile<T>[] {
    const tilesGenerator = this.tileGenerator();
    const tiles = [];
    for (const tile of tilesGenerator) {
      tiles.push(tile);
    }
    return tiles;
  }
}
