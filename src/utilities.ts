import type { GeoJSONBaseGeometry, GeoJSONGeometry } from './types';

export const flatGeometryCollection = (geoJSONGeometry: GeoJSONGeometry): GeoJSONBaseGeometry[] => {
  return geoJSONGeometry.type === 'GeometryCollection' ? geoJSONGeometry.geometries.flatMap(flatGeometryCollection) : [geoJSONGeometry];
};
