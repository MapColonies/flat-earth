import type { BBox } from 'geojson';
import { clampValue } from '../utilities';

export function clampBBoxToBBox(inputBBox: BBox, clampingBBox: BBox): BBox {
  const [clampingBoundingBoxMinEast, clampingBoundingBoxMinNorth, clampingBoundingBoxMaxEast, clampingBoundingBoxMaxNorth] = clampingBBox;

  const [minEast, minNorth, maxEast, maxNorth] = inputBBox;

  return [
    clampValue(minEast, clampingBoundingBoxMinEast, clampingBoundingBoxMaxEast),
    clampValue(minNorth, clampingBoundingBoxMinNorth, clampingBoundingBoxMaxNorth),
    clampValue(maxEast, clampingBoundingBoxMinEast, clampingBoundingBoxMaxEast),
    clampValue(maxNorth, clampingBoundingBoxMinNorth, clampingBoundingBoxMaxNorth),
  ];
}
