import type { BBox } from 'geojson';
import type { ArrayElement, Comparison } from '../types';
import { validateTileMatrix } from '../validations/validations';
import type { TileMatrixSet } from './tileMatrixSet';
import type { TileMatrix, TileMatrixId } from './types';

/**
 * Finds the matching tile matrix in target tile matrix set based on the selected comparison method
 * @param tileMatrix source tile matrix
 * @param targetTileMatrixSet target tile matrix set
 * @param comparison comparison method
 * @throws error when matching scale could not be found
 * @returns matching tile matrix
 */
export function findMatchingTileMatrix<T extends TileMatrixSet>(
  tileMatrix: TileMatrix,
  targetTileMatrixSet: T,
  comparison: Comparison = 'equal'
): TileMatrixId<T> | undefined {
  validateTileMatrix(tileMatrix);
  // validateTileMatrixSet(targetTileMatrixSet); // TODO: currently not implemented

  const { scaleDenominator } = tileMatrix;

  const { tileMatrixId, diff } = targetTileMatrixSet.tileMatrices
    .sort((a, b) => b.scaleDenominator - a.scaleDenominator)
    .map(({ identifier: { code: tileMatrixId }, scaleDenominator: targetScaleDenominator }) => {
      return { tileMatrixId, diff: targetScaleDenominator - scaleDenominator };
    })
    .reduce((prevValue, { tileMatrixId, diff }) => {
      const { diff: prevDiff } = prevValue;

      switch (comparison) {
        case 'equal':
          if (diff === 0) {
            return { tileMatrixId, diff };
          }
          break;
        case 'closest':
          if (Math.abs(diff) < Math.abs(prevDiff)) {
            return { tileMatrixId, diff };
          }
          break;
        case 'lower':
          if (diff > 0 && diff < prevDiff) {
            return { tileMatrixId, diff };
          }
          break;
        case 'higher':
          if (diff < 0 && Math.abs(diff) < Math.abs(prevDiff)) {
            return { tileMatrixId, diff };
          }
          break;
      }

      return prevValue;
    });

  if ((comparison === 'equal' && diff !== 0) || (comparison === 'lower' && diff < 0) || (comparison === 'higher' && diff > 0)) {
    // could not find a match
    return undefined;
  }

  return tileMatrixId;
}

/**
 * Calculates bbox for a tile matrix and input height and width
 * @param tileMatrix tile matrix
 * @param matrixHeight tile matrix height
 * @param matrixWidth tile matrix width
 * @returns bbox
 */
export function tileMatrixToBBox<T extends TileMatrixSet>(
  tileMatrix: ArrayElement<T['tileMatrices']>,
  matrixHeight: number = tileMatrix.matrixHeight,
  matrixWidth: number = tileMatrix.matrixWidth
): BBox {
  validateTileMatrix(tileMatrix);

  if (matrixHeight < 0 || matrixWidth < 0) {
    throw new Error('tile matrix dimensions must be non-negative integers');
  }

  const { cellSize, pointOfOrigin, tileHeight, tileWidth, cornerOfOrigin = 'topLeft' } = tileMatrix;
  const [eastOrigin, northOrigin] = pointOfOrigin; // TODO: currently the axis order is assumed and not calculated
  const tileMatrixHeight = cellSize * tileHeight * matrixHeight;
  const tileMatrixWidth = cellSize * tileWidth * matrixWidth;

  const [minNorth, maxNorth] =
    cornerOfOrigin === 'topLeft' ? [northOrigin - tileMatrixHeight, northOrigin] : [northOrigin, northOrigin + tileMatrixHeight];
  const [minEast, maxEast] = [eastOrigin, eastOrigin + tileMatrixWidth];

  return [minEast, minNorth, maxEast, maxNorth];
}

export function avoidNegativeZero(value: number): number {
  if (value === 0) {
    return 0;
  }
  return value;
}

export function clampValues(value: number, minValue: number, maxValue: number): number {
  if (value < minValue) {
    return minValue;
  }

  if (value > maxValue) {
    return maxValue;
  }

  return value;
}

export function tileEffectiveHeight(tileMatrix: TileMatrix): number {
  const { cellSize, tileHeight } = tileMatrix;
  return cellSize * tileHeight;
}

export function tileEffectiveWidth(tileMatrix: TileMatrix): number {
  const { cellSize, tileWidth } = tileMatrix;
  return cellSize * tileWidth;
}
