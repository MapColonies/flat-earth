import type { BBox, LineString as GeoJSONLineString, Point as GeoJSONPoint, Polygon as GeoJSONPolygon, Position } from 'geojson';
import type { GeoJSONGeometry, Latitude, Longitude } from './types';

export abstract class Geometry<G extends GeoJSONGeometry> {
  public readonly type: G['type'];

  protected constructor(protected readonly geometry: G) {
    this.type = geometry.type;
  }

  public getGeoJSON(): G {
    return this.geometry;
  }
}

/**
 * A polygon is an area defined by a closed ring of points.
 * The first and last points of a ring must be the same.
 * Points must be ordered counterclockwise.
 */
export class Polygon extends Geometry<GeoJSONPolygon> {
  public constructor(public readonly coordinates: Position[][] = []) {
    super({ type: 'Polygon', coordinates });
  }
}

export class Line extends Geometry<GeoJSONLineString> {
  public constructor(public readonly coordinates: Position[] = []) {
    super({ type: 'LineString', coordinates });
  }
}

export class Point extends Geometry<GeoJSONPoint> {
  public constructor(public readonly coordinates: Position) {
    super({ type: 'Point', coordinates });
  }
}

export class BoundingBox extends Polygon {
  public readonly min: GeoPoint;
  public readonly max: GeoPoint;
  public constructor(boundingBox: BBox) {
    super([
      [
        [boundingBox[0], boundingBox[1]],
        [boundingBox[2], boundingBox[1]],
        [boundingBox[2], boundingBox[3]],
        [boundingBox[0], boundingBox[3]],
        [boundingBox[0], boundingBox[1]],
      ],
    ]);

    this.min = new GeoPoint(boundingBox[0], boundingBox[1]);
    this.max = new GeoPoint(boundingBox[2], boundingBox[3]);
  }
}

export class GeoPoint {
  public constructor(
    public lon: Longitude,
    public lat: Latitude
  ) {}
}
