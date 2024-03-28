import type { Zoom } from '../types';
import { validateMetatile } from '../validations/validations';
import type { TileMatrixSet } from './classes/tileMatrixSet';

/**
 * An interface for a tile that supports a metatile definition
 */
export class Tile<T extends TileMatrixSet> {
  public constructor(
    public x: number,
    public y: number,
    public z: Zoom<T>,
    public metatile?: number
  ) {
    if (x < 0 || y < 0) {
      throw new Error('tile indices must be non-negative integers');
    }

    if (metatile !== undefined) {
      validateMetatile(metatile);
    }
  }
}

export class TileRange<T extends TileMatrixSet> {
  public constructor(
    public minX: number,
    public minY: number,
    public maxX: number,
    public maxY: number,
    public zoom: Zoom<T>,
    public metatile = 1
  ) {
    {
      if (minX < 0 || minY < 0) {
        throw new Error('tile indices must be non-negative integers');
      }

      if (minX > maxX || minY > maxY) {
        throw new Error('max tile indices must be equal or larger than min tile indices');
      }

      validateMetatile(metatile);
    }
  }

  public *tileGenerator(): Generator<Tile<T>, void, void> {
    for (let y = this.minY; y <= this.maxY; y++) {
      for (let x = this.minX; x <= this.maxX; x++) {
        yield new Tile(x, y, this.zoom, this.metatile);
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

export enum TileIntersectionType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  NONE = 'NONE',
}
