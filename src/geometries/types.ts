import type { BBox, Feature, Geometry, GeometryCollection, LineString, Point, Polygon } from 'geojson';
import { CoordRefSys } from '../types';

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

export type GeometryCollectionInput = Omit<GeoJSONGeometryCollection, 'type'> & CoordRefSys;
export type PolygonInput = Omit<GeoJSONPolygon, 'type'> & CoordRefSys;
export type LineStringInput = Omit<GeoJSONLineString, 'type'> & CoordRefSys;
export type PointInput = Omit<GeoJSONPoint, 'type'> & CoordRefSys;
export type BoundingBoxInput = { bbox: BBox } & CoordRefSys;

export type JSONFG<E, G extends E | null> = {
  time: object | null;
  place: G | (G & CoordRefSys);
  conformsTo?: string[];
  featureType?: string | string[];
  featureSchema?: string | object;
} & CoordRefSys;

export type JSONFGFeature<G extends Geometry | null, P extends E | null, E> = Feature<G> & JSONFG<E, P>; // TODO: not strictly typed as in json-fg schemas
