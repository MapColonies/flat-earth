import type { BBox } from 'geojson';
import { clampValue } from '../tiles';

export function clipByBBox(bBox: BBox, clippingBoundingBox: BBox): BBox {
  const [clippingBoundingBoxMinEast, clippingBoundingBoxMinNorth, clippingBoundingBoxMaxEast, clippingBoundingBoxMaxNorth] = clippingBoundingBox;

  const [minEast, minNorth, maxEast, maxNorth] = bBox;

  return [
    clampValue(minEast, clippingBoundingBoxMinEast, clippingBoundingBoxMaxEast),
    clampValue(minNorth, clippingBoundingBoxMinNorth, clippingBoundingBoxMaxNorth),
    clampValue(maxEast, clippingBoundingBoxMinEast, clippingBoundingBoxMaxEast),
    clampValue(maxNorth, clippingBoundingBoxMinNorth, clippingBoundingBoxMaxNorth),
  ];
}
