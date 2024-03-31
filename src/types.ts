import type { Geometry, GeometryCollection } from 'geojson';
import type { TileMatrixSet } from './tiles/tileMatrixSet';

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

/**
 * Tile Matrix Id
 */
export type TileMatrixId<T extends TileMatrixSet> = ArrayElement<T['tileMatrices']>['identifier']['code'];

export type GeoJSONBaseGeometry = Exclude<Geometry, GeometryCollection>;
export type GeoJSONGeometry = Geometry;
