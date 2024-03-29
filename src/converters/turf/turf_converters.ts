import { bbox, feature } from '@turf/turf';
import type { BBox, Feature } from 'geojson';
import { Geometry } from '../../classes';
import type { GeoJSONGeometry } from '../../types';

export function geometryToTurfBbox<G extends GeoJSONGeometry>(geometry: Geometry<G>): BBox {
  const feature = geometryToFeature(geometry);
  return bbox(feature);
}

/**
 * Converts a {@link Geometry} to a matching GeoJSON Feature.
 * Polygon will be returned for a BoundingBox input
 * @param geometry geometry
 */
export function geometryToFeature<G extends GeoJSONGeometry>(geometry: Geometry<G>): Feature<G> {
  const geoJSON = geometry.getGeoJSON();
  return feature(geoJSON);
}
