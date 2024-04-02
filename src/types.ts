import type { Geometry, GeometryCollection } from 'geojson';

export type ArrayElement<T> = T extends (infer U)[] ? U : never;

export type Comparison = 'equal' | 'closest' | 'lower' | 'higher';

/**
 * An ellipsoidal longitude
 */
export type Longitude = number;

/**
 * An ellipsoidal latitude
 */
export type Latitude = number;

export type GeoJSONBaseGeometry = Exclude<Geometry, GeometryCollection>;
export type GeoJSONGeometry = Geometry;
