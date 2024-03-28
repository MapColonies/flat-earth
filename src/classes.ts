import type {
  BBox,
  GeometryCollection as GeoJSONGeometryCollection,
  LineString as GeoJSONLineString,
  Point as GeoJSONPoint,
  Polygon as GeoJSONPolygon,
  Position,
} from 'geojson';
import type { GeoJSONBaseGeometry, GeoJSONGeometry, Latitude, Longitude } from './types';

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
    if (maxY < minY) {
      throw new Error('invalid bounding box input: minimum latitude must be lower than the maximum latitude')
    }
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
}

export class GeoPoint {
  public constructor(
    public readonly lon: Longitude,
    public readonly lat: Latitude
  ) {}
}
