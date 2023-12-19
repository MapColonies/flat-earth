import {area as turfArea} from '@turf/turf';
import {distance as turfDistance} from '@turf/turf';
import {bbox as turfBbox} from '@turf/turf';
import {bboxPolygon as turfBboxPolygon} from '@turf/turf';
import {Feature, point, BBox} from '@turf/helpers';
import {Point} from './interfaces';

import {Geodesic} from 'geographiclib-geodesic';
const geod = Geodesic.WGS84;

export function area(feature: Feature<any>) {
  return turfArea(feature);
}

/**
 * Calculates the distance between two {@link Point|points} in degrees, radians, miles, or kilometers
 * Using the haversine formula, using this formula you may get a slight difference in the distance between two points
 * up to 0.5% of the actual distance.
 * @param from
 * @param to
 * @param options
 */

//TODO: add options
export function distance(from: Point, to: Point) {
  const turfForm = point([from.coordinates.lon, from.coordinates.lat]);
  const turfTo = point([to.coordinates.lon, to.coordinates.lat]);
  return turfDistance(turfForm, turfTo);
}

/**
 * Calculates the distance between two {@link Point|points} in meters using the geodesic formula (more accurate than haversine)
 * Using the vincenty formula, using this formula you may get a slight difference in the distance between two points
 * https://en.wikipedia.org/wiki/Vincenty%27s_formulae#:~:text=Vincenty's%20formulae%20are%20two%20related,by%20Thaddeus%20Vincenty%20(1975a).
 * @param from
 * @param to
 */
export function geodesicDistance(from: Point, to: Point) {
  const r = geod.Inverse(
    from.coordinates.lat,
    from.coordinates.lon,
    to.coordinates.lat,
    to.coordinates.lon
  );
  return r.s12;
}

/**
 * Calculates the bounding box of a feature
 * @param feature
 */
export function bbox(feature: Feature<any>) {
  return turfBbox(feature);
}

/**
 * Calculates the bounding box of a feature and returns a polygon
 * @param bbox
 */
export function bboxPolygon(bbox: BBox) {
  return turfBboxPolygon(bbox);
}
