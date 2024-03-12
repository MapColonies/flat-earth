import { BoundingBox } from '../classes';
import type { Zoom } from '../types';
import { validateMetatile } from '../validations/validations';

/**
 * An interface for a well known scale set. {link https://docs.opengeospatial.org/is/17-083r2/17-083r2.html#56|OGC spec}
 */
export class ScaleSet {
  public constructor(
    public identifier: string,
    public scaleDenominators: Map<Zoom, number>
  ) {}
}

/**
 * An interface for a coordinate reference system (CRS)
 */
export class CoordinateReferenceSystem {
  // partially implemented, currently unused
  public constructor(
    public identifier: string,
    public name: string
  ) {}
}

/**
 * An interface for an oblate ellipsoid
 */
export class Ellipsoid {
  public constructor(
    public name: string,
    public semiMajorAxis: number,
    public inverseFlattening: number
  ) {}
}

/**
 * An interface for a tile that supports a metatile definition
 */
export class Tile {
  public constructor(
    public x: number,
    public y: number,
    public z: number,
    public metatile?: number
  ) {
    if (x < 0 || y < 0 || z < 0) {
      throw new Error('tile indices must be non-negative integers');
    }

    if (metatile !== undefined) {
      validateMetatile(metatile);
    }
  }
}

/**
 * A class for a two-dimensional tile grid. See `TileMatrixSet2D` in {@link https://docs.opengeospatial.org/is/17-083r2/17-083r2.html#15|OGC spec}
 */
export class TileGrid {
  public constructor(
    public identifier: string,
    public title: string,
    public boundingBox: BoundingBox,
    public supportedCRS: CoordinateReferenceSystem,
    public wellKnownScaleSet: ScaleSet,
    public numberOfMinLevelTilesX: number,
    public numberOfMinLevelTilesY: number,
    public tileWidth: number,
    public tileHeight: number,
    public abstract?: string,
    public keywords?: string
  ) {}
}

export class TileRange {
  public constructor(
    public minX: number,
    public minY: number,
    public maxX: number,
    public maxY: number,
    public zoom: number,
    public metatile = 1
  ) {}

  public *tileGenerator(): Generator<Tile, void, void> {
    for (let y = this.minY; y <= this.maxY; y++) {
      for (let x = this.minX; x <= this.maxX; x++) {
        yield new Tile(x, y, this.zoom, this.metatile);
      }
    }
  }

  public tiles(): Tile[] {
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
