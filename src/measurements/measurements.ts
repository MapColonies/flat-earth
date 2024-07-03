import { booleanEqual, area as turfArea, distance as turfDistance, type Units } from '@turf/turf';
import { Geodesic } from 'geographiclib-geodesic';
import { DEFAULT_CRS } from '../constants';
import type { Geometry } from '../geometries/geometry';
import type { Point } from '../geometries/point';
import type { Polygon } from '../geometries/polygon';
import type { GeoJSONGeometry } from '../geometries/types';
import { validateCRSByOtherCRS } from '../validations/validations';

const geod = Geodesic.WGS84;

/**
 * Calculate the polygon's area in square meters
 * @param polygon a polygon
 * @returns polygon's area in square meters
 */
export function area(polygon: Polygon): number | undefined {
  try {
    validateCRSByOtherCRS(polygon.coordRefSys, DEFAULT_CRS);
  } catch {
    return undefined;
  }
  const feature = polygon.getJSONFG();
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
export function distance(from: Point, to: Point, options: { units?: Units } = { units: 'meters' }): number | undefined {
  // TODO: only a single distance function should exist for distance calculated on the surface of an ellipsoid
  try {
    validateCRSByOtherCRS(from.coordRefSys, DEFAULT_CRS);
    validateCRSByOtherCRS(to.coordRefSys, DEFAULT_CRS);
  } catch {
    return undefined;
  }
  const fromPoint = from.getJSONFG();
  const toPoint = to.getJSONFG();
  if (!fromPoint.geometry || !toPoint.geometry) {
    return undefined;
  }
  return turfDistance(fromPoint.geometry, toPoint.geometry, options);
}

/**
 * Calculates the distance between two {@link Point|points} in meters using the inverse geodesic formula (more accurate than haversine)
 * Using this formula you may get a slight difference in the distance between two points
 * @param from origin point
 * @param to destination point
 * @returns distance in meters
 */
export function geodesicDistance(from: Point, to: Point): number | undefined {
  try {
    validateCRSByOtherCRS(from.coordRefSys, DEFAULT_CRS);
    validateCRSByOtherCRS(to.coordRefSys, DEFAULT_CRS);
  } catch {
    return undefined;
  }
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
export function geometriesEqual<G extends GeoJSONGeometry, T extends G>(geometry1: Geometry<G>, geometry2: Geometry<T>): boolean {
  const feature1 = geometry1.getJSONFG();
  const feature2 = geometry2.getJSONFG();
  return booleanEqual(feature1, feature2);
}
