import type { BBox } from 'geojson';
import { clampValues } from '../utilities';

export function clampBBoxToBBox(inputBBox: BBox, clampingBBox: BBox): BBox {
  const [clampingBoundingBoxMinEast, clampingBoundingBoxMinNorth, clampingBoundingBoxMaxEast, clampingBoundingBoxMaxNorth] = clampingBBox;

  const [minEast, minNorth, maxEast, maxNorth] = inputBBox;

  return [
    clampValues(minEast, clampingBoundingBoxMinEast, clampingBoundingBoxMaxEast),
    clampValues(minNorth, clampingBoundingBoxMinNorth, clampingBoundingBoxMaxNorth),
    clampValues(maxEast, clampingBoundingBoxMinEast, clampingBoundingBoxMaxEast),
    clampValues(maxNorth, clampingBoundingBoxMinNorth, clampingBoundingBoxMaxNorth),
  ];
}
