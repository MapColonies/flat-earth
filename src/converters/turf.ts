import { bbox, feature } from '@turf/turf';
import type { BBox, Feature } from 'geojson';
import { Geometry } from '../classes';
import { TILEMATRIXSET_WORLD_CRS84_QUAD } from '../tiles/constants';
import type { GeoJSONGeometry } from '../types';
import { validateCRS } from '../validations/validations';

export function geometryToTurfBbox<G extends GeoJSONGeometry>(geometry: Geometry<G>): BBox | undefined {
  const feature = geometryToFeature(geometry);
  return feature ? bbox(feature) : feature;
}

/**
 * Converts a {@link Geometry} to a matching GeoJSON Feature.
 * Polygon will be returned for a BoundingBox input
 * @param geometry geometry
 */
export function geometryToFeature<G extends GeoJSONGeometry>(geometry: Geometry<G>): Feature<G> | undefined {
  try {
    validateCRS(geometry.coordRefSys, TILEMATRIXSET_WORLD_CRS84_QUAD.crs);
  } catch {
    return undefined;
  }

  const geoJSON = geometry.getJSONFG();
  return feature(geoJSON);
}
