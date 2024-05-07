import type { BBox, Geometry, GeometryCollection, LineString, Point, Polygon } from 'geojson';
import type { TileMatrixSet } from './tiles/types';

export type ArrayElement<T> = T extends (infer U)[] ? U : never;

export type Comparison = 'equal' | 'closest' | 'lower' | 'higher';

/**
 * Geodetic longitude
 */
export type Longitude = number;

/**
 * Geodetic latitude
 */
export type Latitude = number;

export type GeoJSONGeometry = Geometry;
export type GeoJSONBaseGeometry = Exclude<Geometry, GeometryCollection>;
export type GeoJSONGeometryCollection = GeometryCollection;
export type GeoJSONPolygon = Polygon;
export type GeoJSONLineString = LineString;
export type GeoJSONPoint = Point;

export interface JSONFG {
  coordRefSys?: TileMatrixSet['crs']; // TODO: change type according to - OGC Features and Geometries JSON - Part 1: Core
}
export type ExtendedGeometry = Geometry & JSONFG;
export type JSONFGGeometry = ExtendedGeometry;
export type JSONFGBaseGeometry = Exclude<ExtendedGeometry, GeometryCollection>;
export type JSONFGGeometryCollection = GeometryCollection & JSONFG;
export type JSONFGGPolygon = Polygon & JSONFG;
export type JSONFGGLineString = LineString & JSONFG;
export type JSONFGGPoint = Point & JSONFG;
export type JSONFGGBBox = { bbox: BBox } & JSONFG;

export type PolygonInput = Omit<JSONFGGPolygon, 'type'>;
export type LineStringInput = Omit<JSONFGGLineString, 'type'>;
export type PointInput = Omit<JSONFGGPoint, 'type'>;
export type BoundingBoxInput = Omit<JSONFGGBBox, 'type'>;
