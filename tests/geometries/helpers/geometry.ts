import { randomPoint } from '@turf/random';
import type { BBox, Position } from 'geojson';

// NOTE: currently this only generates coords in WGS84 projection - if coords in other CRS are needed this must be changed
export const generatePointCoordinates = (bbox?: BBox): Position => randomPoint(undefined, { bbox }).features[0].geometry.coordinates;
