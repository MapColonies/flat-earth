import { area as turfArea, booleanEqual, distance as turfDistance, point } from '@turf/turf';
import { Geometry, Point, Polygon } from '../classes';
import { Geodesic } from 'geographiclib-geodesic';
import { convertGeometryToTurfGeometry } from '../converters/turf/turf_converters';
import { geometryToBoundingBox } from '../converters/geometry_converters';

const geod = Geodesic.WGS84;

export function area(polygon: Polygon) {
  const feature = convertGeometryToTurfGeometry(polygon);
  return turfArea(feature);
}

/**
 * Calculates the distance between two {@link Point|points} in meters
 * Using the haversine formula, using this formula you may get a slight difference in the distance between two points
 * up to 0.5% of the actual distance.
 * @param from
 * @param to
 * @returns {number} distance in meters
 */
//TODO: add options
export function distance(from: Point, to: Point): number {
  const turfForm = point([from.coordinates.lon, from.coordinates.lat]);
  const turfTo = point([to.coordinates.lon, to.coordinates.lat]);
  return turfDistance(turfForm, turfTo, { units: 'meters' });
}

/**
 * Calculates the distance between two {@link Point|points} in meters using the geodesic formula (more accurate than haversine)
 * Using the vincenty formula, using this formula you may get a slight difference in the distance between two points
 * https://en.wikipedia.org/wiki/Vincenty%27s_formulae#:~:text=Vincenty's%20formulae%20are%20two%20related,by%20Thaddeus%20Vincenty%20(1975a).
 * @param from
 * @param to
 * @returns {number} distance in meters
 */
export function geodesicDistance(from: Point, to: Point): number | undefined {
  const r = geod.Inverse(from.coordinates.lat, from.coordinates.lon, to.coordinates.lat, to.coordinates.lon);
  return r.s12;
}

/**
 * Check if two geometries are equal
 * @param geometry1
 * @param geometry2
 */
export function geometriesEqual(geometry1: Geometry, geometry2: Geometry) {
  const turfGeometry1 = convertGeometryToTurfGeometry(geometry1);
  const turfGeometry2 = convertGeometryToTurfGeometry(geometry2);
  return booleanEqual(turfGeometry1, turfGeometry2);
}

/**
 * Check if a geometry covers it's bounding box
 * @param geometry
 */
export function geometryCoversBoundingBox(geometry: Geometry) {
  const boundingBox = geometryToBoundingBox(geometry);
  return geometriesEqual(geometry, boundingBox);
}
