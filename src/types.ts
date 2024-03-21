import type { Geometry, GeometryCollection } from 'geojson';

/**
 * An ellipsoidal longitude
 */
export type Longitude = number;

/**
 * An ellipsoidal latitude
 */
export type Latitude = number;

/**
 * A zoom level
 */
export type Zoom = number;

export type GeoJSONBaseGeometry = Exclude<Geometry, GeometryCollection>;
export type GeoJSONGeometry = Geometry;
