import { area as turfArea, booleanEqual, distance as turfDistance, point } from '@turf/turf';
import { Geodesic } from 'geographiclib-geodesic';
import { Geometry, Point, Polygon } from '../classes';
import { convertGeometryToFeature } from '../converters/turf/turf_converters';
import { geometryToBoundingBox } from '../converters/geometry_converters';

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
 * @returns distance in meters
 */
//TODO: add options
export function distance(from: Point, to: Point): number {
  const turfFrom = point([from.coordinates.lon, from.coordinates.lat]);
  const turfTo = point([to.coordinates.lon, to.coordinates.lat]);
  return turfDistance(turfFrom, turfTo, { units: 'meters' });
}

/**
 * Calculates the distance between two {@link Point|points} in meters using the inverse geodesic formula (more accurate than haversine)
 * Using this formula you may get a slight difference in the distance between two points
 * @param from origin point
 * @param to destination point
 * @returns distance in meters
 */
export function geodesicDistance(from: Point, to: Point): number | undefined {
  const r = geod.Inverse(from.coordinates.lat, from.coordinates.lon, to.coordinates.lat, to.coordinates.lon);
  return r.s12;
}

/**
 * Check if two geometries are equal
 * @param geometry1
 * @param geometry2
 * @returns true/false if two geometries are equal
 */
export function geometriesEqual(geometry1: Geometry, geometry2: Geometry): boolean {
  const feature1 = convertGeometryToFeature(geometry1);
  const feature2 = convertGeometryToFeature(geometry2);
  return booleanEqual(feature1, feature2);
}

/**
 * Check if a geometry equals it's bounding box
 * @param geometry
 * @returns true/false if geometry equals it's bounding box
 */
export function geometryEqualsBoundingBox(geometry: Geometry): boolean {
  const boundingBox = geometryToBoundingBox(geometry);
  return geometriesEqual(geometry, boundingBox);
}
