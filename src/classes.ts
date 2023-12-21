import {Latitude, Longitude} from './types';
export abstract class Geometry {
  type: string;
  protected constructor(type: string) {
    this.type = type;
  }
}

/**
 * A polygon is an area defined by a closed ring of points.
 * The first and last points of a ring must be the same.
 * points must be ordered counterclockwise.
 */
export class Polygon extends Geometry {
  constructor(public points: Array<Point> = []) {
    super('Polygon');
    this.points = points;
  }
}

export class Line extends Geometry {
  constructor(public points: Array<Point> = []) {
    super('Line');
    this.points = points;
  }
}

export class Point extends Geometry {
  coordinates: LonLat;
  constructor(
    public lon: number,
    public lat: number
  ) {
    super('Point');
    this.coordinates = {lon, lat};
  }
}

export class BoundingBox extends Geometry {
  min: LonLat;
  max: LonLat;
  constructor(
    minLon: Longitude,
    minLat: Latitude,
    maxLon: Longitude,
    maxLat: Latitude
  ) {
    super('BoundingBox');
    this.min = {lon: minLon, lat: minLat};
    this.max = {lon: maxLon, lat: maxLat};
  }
}

export class LonLat {
  constructor(
    public lon: Longitude,
    public lat: Latitude
  ) {}
}
