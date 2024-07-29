import type { BBox } from 'geojson';
import { clampValues } from '../tiles';

export function clipByBBox(bBox: BBox, clippingBoundingBox: BBox): BBox {
  const [clippingBoundingBoxMinEast, clippingBoundingBoxMinNorth, clippingBoundingBoxMaxEast, clippingBoundingBoxMaxNorth] = clippingBoundingBox;

  const [minEast, minNorth, maxEast, maxNorth] = bBox;

  return [
    clampValues(minEast, clippingBoundingBoxMinEast, clippingBoundingBoxMaxEast),
    clampValues(minNorth, clippingBoundingBoxMinNorth, clippingBoundingBoxMaxNorth),
    clampValues(maxEast, clippingBoundingBoxMinEast, clippingBoundingBoxMaxEast),
    clampValues(maxNorth, clippingBoundingBoxMinNorth, clippingBoundingBoxMaxNorth),
  ];
}
