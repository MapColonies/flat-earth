import {Longitude, Latitude} from './types';

export interface Point {
  coordinates: LonLat;
}

export interface LonLat {
  lon: Longitude;
  lat: Latitude;
}

export interface Polygon {
  points: Array<Point>;
}

export interface BoundingBox {
  min: LonLat;
  max: LonLat;
}
