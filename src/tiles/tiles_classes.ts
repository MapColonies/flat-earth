import {BoundingBox} from '../classes';
import {Zoom} from '../types';

/**
 * An interface for a well known scale set. {link https://docs.opengeospatial.org/is/17-083r2/17-083r2.html#56|OGC spec}
 */
export class ScaleSet {
  identifier: string;
  scaleDenominators: Map<Zoom, number>;
  constructor(identifier: string, scaleDenominators: Map<Zoom, number>) {
    this.identifier = identifier;
    this.scaleDenominators = scaleDenominators;
  }
}

/**
 * An interface for a coordinate reference system (CRS)
 */
export class CoordinateReferenceSystem {
  // partially implemented, currently unused
  identifier: string;
  name: string;
  constructor(identifier: string, name: string) {
    this.identifier = identifier;
    this.name = name;
  }
}

/**
 * An interface for an oblate ellipsoid
 */
export class Ellipsoid {
  name: string;
  semiMajorAxis: number;
  inverseFlattening: number;
  constructor(name: string, semiMajorAxis: number, inverseFlattening: number) {
    this.name = name;
    this.semiMajorAxis = semiMajorAxis;
    this.inverseFlattening = inverseFlattening;
  }
}

/**
 * An interface for a tile that supports a metatile definition
 */
export class Tile {
  x: number;
  y: number;
  z: number;
  metatile?: number;
  constructor(x: number, y: number, z: number, metatile?: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.metatile = metatile;
  }
}

/**
 * A class for a two-dimensional tile grid. See `TileMatrixSet2D` in {@link https://docs.opengeospatial.org/is/17-083r2/17-083r2.html#15|OGC spec}
 */
export class TileGrid {
  identifier: string;
  title: string;
  abstract?: string;
  keywords?: string;
  boundingBox: BoundingBox;
  supportedCRS: CoordinateReferenceSystem; // Currently unused
  wellKnownScaleSet: ScaleSet; // Currently at least one must be given
  numberOfMinLevelTilesX: number;
  numberOfMinLevelTilesY: number;
  tileWidth: number;
  tileHeight: number;
  constructor(
    identifier: string,
    title: string,
    boundingBox: BoundingBox,
    supportedCRS: CoordinateReferenceSystem,
    wellKnownScaleSet: ScaleSet,
    numberOfMinLevelTilesX: number,
    numberOfMinLevelTilesY: number,
    tileWidth: number,
    tileHeight: number,
    abstract?: string,
    keywords?: string
  ) {
    this.identifier = identifier;
    this.title = title;
    this.boundingBox = boundingBox;
    this.supportedCRS = supportedCRS;
    this.wellKnownScaleSet = wellKnownScaleSet;
    this.numberOfMinLevelTilesX = numberOfMinLevelTilesX;
    this.numberOfMinLevelTilesY = numberOfMinLevelTilesY;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.abstract = abstract;
    this.keywords = keywords;
  }
}
