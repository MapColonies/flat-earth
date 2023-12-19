import {Longitude, Latitude} from './types';

export interface LonLat {
  lon: Longitude;
  lat: Latitude;
}

export interface Geometry {
  type: string;
}
