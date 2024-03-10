import { BoundingBox, Geometry, Point, Polygon, Line } from '../classes';
import { geometryToTurfBbox } from './turf/turf_converters';

/**
 * Calculates the bounding box of a geometry
 * @param geometry
 */
export function geometryToBoundingBox(geometry: Geometry): BoundingBox {
  if (geometry instanceof BoundingBox) {
    return geometry;
  }

  if (geometry instanceof Point) {
    return new BoundingBox(geometry.coordinates.lon, geometry.coordinates.lat, geometry.coordinates.lon, geometry.coordinates.lat);
  }

  if (geometry instanceof Polygon || geometry instanceof Line) {
    const bboxResult = geometryToTurfBbox(geometry);
    return new BoundingBox(bboxResult[0], bboxResult[1], bboxResult[2], bboxResult[3]);
  }

  throw new Error('Geometry not supported');
}

/**
 * Calculates the bounding box of a feature and returns a polygon
 * @param boundingBox
 */
export function boundingBoxToPolygon(boundingBox: BoundingBox): Polygon {
  const points = new Array<Point>();
  points.push(new Point(boundingBox.min.lon, boundingBox.min.lat));
  points.push(new Point(boundingBox.max.lon, boundingBox.min.lat));
  points.push(new Point(boundingBox.max.lon, boundingBox.max.lat));
  points.push(new Point(boundingBox.min.lon, boundingBox.max.lat));
  points.push(new Point(boundingBox.min.lon, boundingBox.min.lat));
  return new Polygon([points]);
}
