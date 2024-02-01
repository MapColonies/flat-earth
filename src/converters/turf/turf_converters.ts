import { Feature, LineString, Polygon as TurfPolygon, BBox } from 'geojson';
import { bbox as turfBbox, lineString as turfLineString, polygon as turfPolygon } from '@turf/turf';
import { BoundingBox, Geometry, Line, Polygon } from '../../classes';
import { boundingBoxToPolygon } from '../geometry_converters';

export function geometryToTurfBbox(geometry: Geometry): BBox {
  const turfGeometry = convertGeometryToTurfGeometry(geometry);
  return turfBbox(turfGeometry);
}

/**
 * Converts a {@link Geometry} to a {@link turf Feature}
 * In case of a {@BoundingBox} it will return a {@link turf Polygon}
 * @param geometry
 */
export function convertGeometryToTurfGeometry(geometry: Geometry): Feature<LineString | TurfPolygon> {
  switch (geometry.type) {
    case 'Polygon':
      return polygonToTurfPolygon(geometry as Polygon);
    case 'Line':
      return lineToTurfLine(geometry as Line);
    case 'BoundingBox':
      // in case of a bounding box we convert it to a polygon and will use one recursion
      return convertGeometryToTurfGeometry(boundingBoxToPolygon(geometry as BoundingBox));
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
