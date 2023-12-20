import {LonLat} from './interfaces';
import {Latitude, Longitude} from './types';
export abstract class Geometry {
  type: string;
  protected constructor(type: string) {
    this.type = type;
  }
}

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
