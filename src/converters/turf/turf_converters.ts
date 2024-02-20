import type { Feature, LineString, Polygon as TurfPolygon, BBox } from 'geojson';
import { bbox as turfBoundingBox, lineString as turfLineString, polygon as turfPolygon } from '@turf/turf';
import { BoundingBox, Geometry, Line, Polygon } from '../../classes';
import { boundingBoxToPolygon } from '../geometry_converters';

export function geometryToTurfBbox(geometry: Geometry): BBox {
  const feature = convertGeometryToFeature(geometry);
  return turfBoundingBox(feature);
}

/**
 * Converts a {@link Geometry} to a {@link Feature}.
 * In case of a {@link BoundingBox} it will return a polygon ({@link TurfPolygon})
 * @param geometry
 */
export function convertGeometryToFeature(geometry: Geometry): Feature<LineString | TurfPolygon> {
  switch (geometry.type) {
    case 'Polygon':
      return polygonToTurfPolygon(geometry as Polygon);
    case 'Line':
      return lineToTurfLine(geometry as Line);
    case 'BoundingBox':
      // in case of a bounding box we convert it into a polygon and will use one recursion
      return convertGeometryToFeature(boundingBoxToPolygon(geometry as BoundingBox));
    default:
      throw new Error('Cant convert geometry to turf geometry, geometry not supported');
  }
}

export function polygonToTurfPolygon(polygon: Polygon): Feature<TurfPolygon> {
  return turfPolygon([polygon.points.map((point) => [point.coordinates.lon, point.coordinates.lat])]);
}

export function lineToTurfLine(line: Line): Feature<LineString> {
  return turfLineString(line.points.map((point) => [point.coordinates.lon, point.coordinates.lat]));
}

export function boundingBoxToTurfBbox(boundingBox: BoundingBox): Feature<TurfPolygon> {
  return polygonToTurfPolygon(boundingBoxToPolygon(boundingBox));
}
