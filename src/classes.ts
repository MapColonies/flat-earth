import type { Latitude, Longitude } from './types';

export abstract class Geometry {
  protected constructor(public type: string) {}
}

/**
 * A polygon is an area defined by a closed ring of points.
 * The first and last points of a ring must be the same.
 * Points must be ordered counterclockwise.
 */
export class Polygon extends Geometry {
  public constructor(public points: Point[] = []) {
    super('Polygon');
  }
}

export class Line extends Geometry {
  public constructor(public points: Point[] = []) {
    super('Line');
  }
}

export class Point extends Geometry {
  public coordinates: GeoPoint;
  public constructor(lon: Longitude, lat: Latitude) {
    super('Point');
    this.coordinates = { lon, lat };
  }
}

export class BoundingBox extends Geometry {
  public min: GeoPoint;
  public max: GeoPoint;
  public constructor(minLon: Longitude, minLat: Latitude, maxLon: Longitude, maxLat: Latitude) {
    super('BoundingBox');
    this.min = { lon: minLon, lat: minLat };
    this.max = { lon: maxLon, lat: maxLat };
  }
}

export class GeoPoint {
  public constructor(
    public lon: Longitude,
    public lat: Latitude
  ) {}
}
