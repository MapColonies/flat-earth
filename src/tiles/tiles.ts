import type { BBox, Position } from 'geojson';
import type { ArrayElement } from '../types';
import { validateTileMatrix } from '../validations/validations';
import type { TileMatrixSet } from './tileMatrixSet';
import type { TileIndex, TileMatrix, TileMatrixId } from './types';

/**
 * Calculates GeoJSON bbox for a tile matrix and input height and width
 * @param tileMatrix tile matrix
 * @param matrixHeight tile matrix height
 * @param matrixWidth tile matrix width
 * @returns GeoJSON bbox
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

export function positionToTileIndex<T extends TileMatrixSet>(
  position: Position,
  tileMatrixSet: T,
  tileMatrixId: TileMatrixId<T>,
  reverseIntersectionPolicy: boolean,
  metatile = 1
): TileIndex<T> {
  const [east, north] = position;

  const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
  if (!tileMatrix) {
    throw new Error('tile matrix id is not part of the given tile matrix set');
  }

  const width = tileEffectiveWidth(tileMatrix) * metatile;
  const height = tileEffectiveHeight(tileMatrix) * metatile;

  const [tileMatrixBoundingBoxMinEast, tileMatrixBoundingBoxMinNorth, tileMatrixBoundingBoxMaxEast, tileMatrixBoundingBoxMaxNorth] = tileMatrixToBBox(tileMatrix);
  const { cornerOfOrigin = 'topLeft' } = tileMatrix;

  const tempTileCol = (east - tileMatrixBoundingBoxMinEast) / width;
  const tempTileRow = (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMaxNorth - north : north - tileMatrixBoundingBoxMinNorth) / height;

  // when explicitly asked to reverse the intersection policy (location on the edge of the tile)
  if (reverseIntersectionPolicy) {
    const onEdgeEastTranslation = east === tileMatrixBoundingBoxMinEast ? 1 : 0;
    const onEdgeNorthTranslation = north === (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMaxNorth : tileMatrixBoundingBoxMinNorth) ? 1 : 0;

    const col = Math.ceil(tempTileCol) - 1 + onEdgeEastTranslation;
    const row = Math.ceil(tempTileRow) - 1 + onEdgeNorthTranslation;

    return { col, row, tileMatrixId };
  }

  // when east/north is on the maximum edge of the tile matrix (e.g. lon = 180 lat = 90 in wgs84)
  const onEdgeEastTranslation = east === tileMatrixBoundingBoxMaxEast ? 1 : 0;
  const onEdgeNorthTranslation = north === (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMinNorth : tileMatrixBoundingBoxMaxNorth) ? 1 : 0;

  const col = Math.floor(tempTileCol) - onEdgeEastTranslation;
  const row = Math.floor(tempTileRow) - onEdgeNorthTranslation;

  return { col, row, tileMatrixId };
}

export function tileEffectiveHeight(tileMatrix: TileMatrix): number {
  const { cellSize, tileHeight } = tileMatrix;
  return cellSize * tileHeight;
}

export function tileEffectiveWidth(tileMatrix: TileMatrix): number {
  const { cellSize, tileWidth } = tileMatrix;
  return cellSize * tileWidth;
}

export function tileIndexToPosition<T extends TileMatrixSet>(tileIndex: TileIndex<T>, tileMatrixSet: T, metatile = 1): Position {
  const { col, row, tileMatrixId } = tileIndex;

  const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
  if (!tileMatrix) {
    throw new Error('tile matrix id is not part of the given tile matrix set');
  }

  const width = tileEffectiveWidth(tileMatrix) * metatile;
  const height = tileEffectiveHeight(tileMatrix) * metatile;

  const {
    pointOfOrigin: [originX, originY],
    cornerOfOrigin = 'topLeft',
  } = tileMatrix;

  const east = originX + col * width;
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const north = originY + (cornerOfOrigin === 'topLeft' ? -1 : 1) * row * height;

  return [east, north];
}
