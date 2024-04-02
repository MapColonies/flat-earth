import type {
  BBox,
  GeometryCollection as GeoJSONGeometryCollection,
  LineString as GeoJSONLineString,
  Point as GeoJSONPoint,
  Polygon as GeoJSONPolygon,
  Position,
} from 'geojson';
import type { Tile } from './tiles/tile';
import type { TileMatrixSet } from './tiles/tileMatrixSet';
import { TileRange } from './tiles/tileRange';
import { geoCoordsToTile } from './tiles/tiles';
import type { ArrayElement, GeoJSONBaseGeometry, GeoJSONGeometry, Latitude, Longitude } from './types';
import { validateBoundingBox, validateBoundingBoxByTileMatrix, validateGeoPointByTileMatrix, validateMetatile, validateTileMatrix } from './validations/validations';

export abstract class Geometry<G extends GeoJSONGeometry> {
  protected constructor(public readonly type: G['type']) {}
  public abstract getGeoJSON(): G;
}

export abstract class BaseGeometry<G extends GeoJSONBaseGeometry> extends Geometry<G> {
  public constructor(private readonly geometry: G) {
    super(geometry.type);
  }

  public get coordinates(): G['coordinates'] {
    return this.geometry.coordinates;
  }

  public getGeoJSON(): G {
    return this.geometry;
  }
}

export class GeometryCollection extends Geometry<GeoJSONGeometryCollection> {
  public constructor(public readonly geometries: GeoJSONGeometry[]) {
    super('GeometryCollection');
  }

  public getGeoJSON(): GeoJSONGeometryCollection {
    return {
      type: this.type,
      geometries: this.geometries,
    };
  }
}

/**
 * A polygon is an area defined by a closed ring of points.
 * The first and last points of a ring must be the same.
 * Points must be ordered counterclockwise.
 */
export class Polygon extends BaseGeometry<GeoJSONPolygon> {
  public constructor(coordinates: Position[][] = []) {
    super({ type: 'Polygon', coordinates });
  }
}

export class Line extends BaseGeometry<GeoJSONLineString> {
  public constructor(coordinates: Position[] = []) {
    super({ type: 'LineString', coordinates });
  }
}

export class Point extends BaseGeometry<GeoJSONPoint> {
  public constructor(coordinates: Position) {
    super({ type: 'Point', coordinates });
  }
}

export class BoundingBox extends Polygon {
  public readonly min: GeoPoint;
  public readonly max: GeoPoint;

  public constructor([minX, minY, maxX, maxY]: BBox) {
    validateBoundingBox([minX, minY, maxX, maxY]);

    super([
      [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
        [minX, minY],
      ],
    ]);

    this.min = new GeoPoint(minX, minY);
    this.max = new GeoPoint(maxX, maxY);
  }

  /**
   * Calculates tile range that covers the bounding box
   * @param tileMatrix tile matrix
   * @param metatile size of a metatile
   * @returns tile range that covers the `boundingBox`
   */
  public toTileRange<T extends TileMatrixSet>(tileMatrix: ArrayElement<T['tileMatrices']>, metatile = 1): TileRange<T> {
    validateMetatile(metatile);
    validateTileMatrix(tileMatrix);
    validateBoundingBoxByTileMatrix(this, tileMatrix);

    const { cornerOfOrigin } = tileMatrix;

    const minTilePoint = new GeoPoint(this.min.lon, cornerOfOrigin === 'topLeft' ? this.max.lat : this.min.lat);
    const maxTilePoint = new GeoPoint(this.max.lon, cornerOfOrigin === 'topLeft' ? this.min.lat : this.max.lat);

    const { col: minTileCol, row: minTileRow } = geoCoordsToTile(minTilePoint, tileMatrix, false, metatile);
    const { col: maxTileCol, row: maxTileRow } = geoCoordsToTile(maxTilePoint, tileMatrix, true, metatile);

    return new TileRange(minTileCol, minTileRow, maxTileCol, maxTileRow, tileMatrix.identifier.code, metatile);
  }
}

export class GeoPoint {
  public constructor(
    public readonly lon: Longitude,
    public readonly lat: Latitude
  ) {}

  /**
   * Calculates a tile for longitude, latitude and tile matrix
   * @param tileMatrix tile matrix which the calculated tile belongs to
   * @param metatile size of a metatile
   * @returns tile within the tile matrix
   */
  public toTile<T extends TileMatrixSet>(tileMatrix: ArrayElement<T['tileMatrices']>, metatile = 1): Tile<T> {
    validateMetatile(metatile);
    validateTileMatrix(tileMatrix);
    validateGeoPointByTileMatrix(this, tileMatrix);

    return geoCoordsToTile(this, tileMatrix, false, metatile);
  }
}
