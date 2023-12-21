import {BoundingBox, Geometry, Line, Polygon} from '../../classes';
import {
  bbox as turfBbox,
  lineString as turfLineString,
  polygon as turfPolygon,
} from '@turf/turf';

import {
  Feature,
  LineString,
  GeoJsonProperties,
  Polygon as GeoJsonPolygon,
} from 'geojson';
import {boundingBoxToPolygon} from '../geometry_converters';

export function geometryToTurfBbox(geometry: Geometry) {
  const turfGeometry = convertGeometryToTurfGeometry(geometry);
  return turfBbox(turfGeometry);
}

/**
 * Converts a {@link Geometry} to a {@link turf Feature}
 * In case of a {@BoundingBox} it will return a {@link turf Polygon}
 * @param geometry
 */
export function convertGeometryToTurfGeometry(
  geometry: Geometry
):
  | Feature<LineString, GeoJsonProperties>
  | Feature<GeoJsonPolygon, GeoJsonProperties> {
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
    case 'BoundingBox':
      // in case of a bounding box we convert it to a polygon and will use one recursion
      return convertGeometryToTurfGeometry(
        boundingBoxToPolygon(geometry as BoundingBox)
      );
    default:
      throw new Error(
        'Cant convert geometry to turf geometry, geometry not supported'
      );
  }
}
