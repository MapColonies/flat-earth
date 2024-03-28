import type { Geometry, GeometryCollection } from 'geojson';
import type { TileMatrixSet } from './tiles/classes/tileMatrixSet';

export type Comparison = 'equal' | 'closest' | 'lower' | 'higher';

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
export type Zoom<T extends TileMatrixSet> = ArrayElement<T['tileMatrices']>['identifier']['code'];

export type GeoJSONBaseGeometry = Exclude<Geometry, GeometryCollection>;
export type GeoJSONGeometry = Geometry;

export type ArrayElement<T> = T extends (infer U)[] ? U : never;
