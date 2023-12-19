import {Latitude, Longitude} from "./types";

export interface Point {
    coordinates: LonLat;
}

export interface LonLat {
    lon: Longitude;
    lat: Latitude;
}