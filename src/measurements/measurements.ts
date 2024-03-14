import { booleanEqual, area as turfArea, distance as turfDistance, type Units } from '@turf/turf';
import { Geodesic } from 'geographiclib-geodesic';
import { Geometry, Point, Polygon } from '../classes';
import { convertGeometryToFeature } from '../converters/turf/turf_converters';
import type { GeoJSONGeometry } from '../types';

const geod = Geodesic.WGS84;

/**
 * Calculate the polygon's area in square meters
 * @param polygon a polygon
 * @returns polygon's area in square meters
 */
export function area(polygon: Polygon): number {
  const feature = convertGeometryToFeature(polygon);
  return turfArea(feature);
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
export function distance(from: Point, to: Point, options: { units?: Units } = { units: 'meters' }): number {
  return turfDistance(from, to, options);
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
export function geometriesEqual<G extends GeoJSONGeometry>(geometry1: Geometry<G>, geometry2: Geometry<G>): boolean {
  const feature1 = convertGeometryToFeature(geometry1);
  const feature2 = convertGeometryToFeature(geometry2);
  return booleanEqual(feature1, feature2);
}
