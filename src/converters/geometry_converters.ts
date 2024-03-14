import { BoundingBox, Geometry, Polygon } from '../classes';
import type { GeoJSONGeometry } from '../types';
import { geometryToTurfBbox } from './turf/turf_converters';

/**
 * Calculates the bounding box of a geometry
 * @param geometry
 */
export function geometryToBoundingBox<G extends GeoJSONGeometry>(geometry: Geometry<G>): BoundingBox {
  const bbox = geometryToTurfBbox(geometry);
  return new BoundingBox(bbox);
}

/**
 * Calculates the bounding box of a feature and returns a polygon
 * @param boundingBox
 */
export function boundingBoxToPolygon(boundingBox: BoundingBox): Polygon {
  return new Polygon([
    [
      [boundingBox.min.lon, boundingBox.min.lat],
      [boundingBox.max.lon, boundingBox.min.lat],
      [boundingBox.max.lon, boundingBox.max.lat],
      [boundingBox.min.lon, boundingBox.max.lat],
      [boundingBox.min.lon, boundingBox.min.lat],
    ],
  ]);
}
