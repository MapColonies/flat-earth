import type { BBox, Feature, Geometry, GeometryCollection, LineString, Point, Polygon } from 'geojson';
import type { TileMatrixSet, TileMatrixSetJSON } from '../tiles/types';

type NonOptional<Type> = {
  [Property in keyof Type]-?: Type[Property];
};

/**
 * Geodetic longitude
 */
export type Longitude = number;

/**
 * Geodetic latitude
 */
export type Latitude = number;

export interface CoordRefSysJSON {
  coordRefSys?: TileMatrixSetJSON['crs']; // TODO: change type according to - OGC Features and Geometries JSON - Part 1: Core
}
export interface CoordRefSys {
  coordRefSys?: TileMatrixSet['crs']; // TODO: change type according to - OGC Features and Geometries JSON - Part 1: Core
}

export type ConcreteCoordRefSys = NonOptional<CoordRefSys>;
export type ConcreteCoordRefSysJSON = NonOptional<CoordRefSysJSON>;

export type GeoJSONGeometry = Geometry;
export type GeoJSONBaseGeometry = Exclude<Geometry, GeometryCollection>;
export type GeoJSONGeometryCollection = GeometryCollection;
export type GeoJSONPolygon = Polygon;
export type GeoJSONLineString = LineString;
export type GeoJSONPoint = Point;

export type GeometryCollectionInput = Omit<GeoJSONGeometryCollection, 'type'> & CoordRefSysJSON;
export type PolygonInput = Omit<GeoJSONPolygon, 'type'> & CoordRefSysJSON;
export type LineStringInput = Omit<GeoJSONLineString, 'type'> & CoordRefSysJSON;
export type PointInput = Omit<GeoJSONPoint, 'type'> & CoordRefSysJSON;
export type BoundingBoxInput = { bbox: BBox } & CoordRefSysJSON;

export type JSONFG<E, G extends E | null> = {
  time: Record<string, unknown> | null;
  place: G | (G & CoordRefSysJSON);
  conformsTo?: string[];
  featureType?: string | string[];
  featureSchema?: string | Record<string, unknown>;
} & CoordRefSysJSON;

export type JSONFGFeature<G extends Geometry | null, P extends E | null, E> = Feature<G> & JSONFG<E, P>; // TODO: not strictly typed as in json-fg schemas
