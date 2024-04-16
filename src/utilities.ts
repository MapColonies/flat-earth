import type { Geometry, Position } from 'geojson';
import type { GeoJSONBaseGeometry, GeoJSONGeometry } from './types';

export const flatGeometryCollection = (geoJSONGeometry: GeoJSONGeometry): GeoJSONBaseGeometry[] => {
  return geoJSONGeometry.type === 'GeometryCollection' ? geoJSONGeometry.geometries.flatMap(flatGeometryCollection) : [geoJSONGeometry];
};

export const flattenGeometryPositions = (geometry: Geometry): Position[] => {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates];
    case 'LineString':
      return geometry.coordinates;
    case 'Polygon':
      return geometry.coordinates.flat();
    default:
      return [];
  }
};
