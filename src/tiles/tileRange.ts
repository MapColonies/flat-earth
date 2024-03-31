import type { TileMatrixId } from '../types';
import { validateMetatile } from '../validations/validations';
import { Tile } from './tile';
import type { TileMatrixSet } from './tileMatrixSet';

export class TileRange<T extends TileMatrixSet> {
  public constructor(
    public minCol: number,
    public minRow: number,
    public maxCol: number,
    public maxRow: number,
    public tileMatrixId: TileMatrixId<T>,
    public metatile = 1
  ) {
    {
      if (minCol < 0 || minRow < 0) {
        throw new Error('tile indices must be non-negative integers');
      }

      if (minCol > maxCol || minRow > maxRow) {
        throw new Error('max tile indices must be equal or larger than min tile indices');
      }

      validateMetatile(metatile);
    }
  }

  public *tileGenerator(): Generator<Tile<T>, void, void> {
    for (let row = this.minRow; row <= this.maxRow; row++) {
      for (let col = this.minCol; col <= this.maxCol; col++) {
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