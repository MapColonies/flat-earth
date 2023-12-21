import {BoundingBox, Geometry, Point, Polygon} from '../classes';
import {geometryToTurfBbox} from './turf/turf_converters';

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
  return new Polygon(points);
}
