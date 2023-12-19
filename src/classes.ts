import {Geometry, LonLat} from './interfaces';
import {Latitude, Longitude} from './types';
export class Polygon implements Geometry {
  type: string;
  constructor(public points: Array<Point> = []) {
    this.points = points;
    this.type = 'Polygon';
  }

  addPoint(point: Point) {
    this.points.push(point);
  }
}

export class Point implements Geometry {
  type: string;
  coordinates: LonLat;
  constructor(
    public lon: number,
    public lat: number
  ) {
    this.coordinates = {lon, lat};
    this.type = 'Point';
  }
}

export class BoundingBox implements Geometry {
  type: string;
  min: LonLat;
  max: LonLat;
  constructor(
    public minLon: Longitude,
    public minLat: Latitude,
    public maxLon: Longitude,
    public maxLat: Latitude
  ) {
    this.min = {lon: minLon, lat: minLat};
    this.max = {lon: maxLon, lat: maxLat};
    this.type = 'BoundingBox';
  }
}
