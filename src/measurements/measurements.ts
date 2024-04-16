import { booleanEqual, area as turfArea, distance as turfDistance, type Units } from '@turf/turf';
import { Geodesic } from 'geographiclib-geodesic';
import { Geometry, Point, Polygon } from '../classes';
import { geometryToFeature } from '../converters/turf';
import type { GeoJSONGeometry } from '../types';

const geod = Geodesic.WGS84;

/**
 * Calculate the polygon's area in square meters
 * @param polygon a polygon
 * @returns polygon's area in square meters
 */
export function area(polygon: Polygon): number | undefined {
  const feature = geometryToFeature(polygon);
  return feature ? turfArea(feature) : feature;
}

/**
 * Calculates the distance between two {@link Point|points} in meters
 * Using the haversine formula, using this formula you may get a slight difference in the distance between two points
 * up to 0.5% of the actual distance.
 * @param from origin point
 * @param to destination point
 * @param options object specifying units for distance output
 * @returns distance in meters
 */
export function distance(from: Point, to: Point, options: { units?: Units } = { units: 'meters' }): number | undefined {
  // TODO: only a single distance function should exist for distance calculated on the surface of an ellipsoid
  const fromPoint = geometryToFeature(from);
  const toPoint = geometryToFeature(to);
  return fromPoint && toPoint ? turfDistance(fromPoint, toPoint, options) : undefined;
}

/**
 * Calculates the distance between two {@link Point|points} in meters using the inverse geodesic formula (more accurate than haversine)
 * Using this formula you may get a slight difference in the distance between two points
 * @param from origin point
 * @param to destination point
 * @returns distance in meters
 */
export function geodesicDistance(from: Point, to: Point): number | undefined {
  const [fromLon, fromLat] = from.coordinates;
  const [toLon, toLat] = to.coordinates;

  const r = geod.Inverse(fromLat, fromLon, toLat, toLon);
  return r.s12;
}

/**
 * Check if two geometries are equal
 * @param geometry1
 * @param geometry2
 * @returns true/false if two geometries are equal
 */
export function geometriesEqual<G extends GeoJSONGeometry>(geometry1: Geometry<G>, geometry2: Geometry<G>): boolean | undefined {
  const feature1 = geometryToFeature(geometry1);
  const feature2 = geometryToFeature(geometry2);
  return feature1 && feature2 ? booleanEqual(feature1, feature2) : undefined;
}
