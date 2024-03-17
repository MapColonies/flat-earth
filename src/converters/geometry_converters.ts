import { BoundingBox, Geometry } from '../classes';
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
