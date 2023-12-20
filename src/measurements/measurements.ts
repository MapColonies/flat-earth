import {
  area as turfArea,
  distance as turfDistance,
  polygon as turfPolygon,
  lineString as turfLineString,
  bbox as turfBbox,
  point,
} from '@turf/turf';
import {Point, Polygon, BoundingBox, Line, Geometry} from '../classes';

import {Geodesic} from 'geographiclib-geodesic';
const geod = Geodesic.WGS84;

export function area(polygon: Polygon) {
  const feature = convertGeometryToTurfGeometry(polygon);
  return turfArea(feature);
}

/**
 * Converts a {@link Polygon} to a {@link turfPolygon}
 * @param geometry
 */
function convertGeometryToTurfGeometry(geometry: Geometry) {
  switch (geometry.type) {
    case 'Polygon':
      return turfPolygon([
        (geometry as Polygon).points.map(point => [
          point.coordinates.lon,
          point.coordinates.lat,
        ]),
      ]);
    case 'Line':
      return turfLineString(
        (geometry as Line).points.map(point => [
          point.coordinates.lon,
          point.coordinates.lat,
        ])
      );
    default:
      throw new Error(
        'Cant convert geometry to turf geometry, geometry not supported'
      );
  }
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
export function geometryToBoundingBox(geometry: Geometry): BoundingBox {
  switch (geometry.type) {
    case 'Point': {
      const point = geometry as Point;
      return new BoundingBox(point.lon, point.lat, point.lon, point.lat);
    }
    case 'Polygon':
    case 'Line': {
      const bboxResult = geometryToTurfBbox(geometry);
      return new BoundingBox(
        bboxResult[0],
        bboxResult[1],
        bboxResult[2],
        bboxResult[3]
      );
    }
    default:
      throw new Error('Geometry not supported');
  }
}

function geometryToTurfBbox(geometry: Geometry) {
  const turfGeometry = convertGeometryToTurfGeometry(geometry);
  return turfBbox(turfGeometry);
}
/**
 * Calculates the bounding box of a feature and returns a polygon
 * @param boundingBox
 */
export function bboxToPolygon(boundingBox: BoundingBox): Polygon {
  const points = new Array<Point>();
  points.push(new Point(boundingBox.min.lon, boundingBox.min.lat));
  points.push(new Point(boundingBox.max.lon, boundingBox.min.lat));
  points.push(new Point(boundingBox.max.lon, boundingBox.max.lat));
  points.push(new Point(boundingBox.min.lon, boundingBox.max.lat));
  points.push(new Point(boundingBox.min.lon, boundingBox.min.lat));
  return new Polygon(points);
}
