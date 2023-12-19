import {area as turfArea} from '@turf/turf';
import {distance as turfDistance} from '@turf/turf';
import bbox from '@turf/bbox';
import {bboxPolygon} from '@turf/turf';
import * as turf from '@turf/turf';
import {
  Feature,
  polygon as turfPolygon,
  point,
  BBox,
  Position,
} from '@turf/helpers';
import {Point, Polygon, BoundingBox} from './classes';

import {Geodesic} from 'geographiclib-geodesic';
import {Geometry} from './interfaces';
const geod = Geodesic.WGS84;

export function area(polygon: Polygon) {
  const feature = convertPolygonToFeature(polygon);
  return turfArea(feature);
}

function convertPolygonToFeature(polygon: Polygon) {
  return turfPolygon([
    polygon.points.map(point => [point.coordinates.lon, point.coordinates.lat]),
  ]);
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
  return turfDistance(turfForm, turfTo, {units: 'meters'});
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
  const r = geod.Inverse(
    from.coordinates.lat,
    from.coordinates.lon,
    to.coordinates.lat,
    to.coordinates.lon
  );
  return r.s12;
}

/**
 * Calculates the bounding box of a geometry
 * @param geometry
 */
// export function bbox(geometry: Geometry): BoundingBox {
//   const turfBbox1: BBox = bbox(geometry);
//   return new BoundingBox(
//     turfBbox1[0],
//     turfBbox1[1],
//     turfBbox1[2],
//     turfBbox1[3]
//   );
// }

/**
 * Calculates the bounding box of a feature and returns a polygon
 * @param boundingBox
 */
export function bboxToPolygon(boundingBox: BoundingBox): Polygon {
  const bbox: BBox = [
    boundingBox.min.lon,
    boundingBox.min.lat,
    boundingBox.max.lon,
    boundingBox.max.lat,
  ];
  const result = new Polygon();
  const turfPolygon = bboxPolygon(bbox);
  turfPolygon.geometry.coordinates[0].forEach((point: Position) => {
    result.addPoint(new Point(point[0], point[1]));
  });
  return result;
}
