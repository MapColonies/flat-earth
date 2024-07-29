import type { BBox, Position } from 'geojson';
import type { ArrayElement } from '../utils/types';
import { validatePositionByTileMatrix } from '../validations';
import type { TileMatrixSet } from './tileMatrixSet';
import type { ReverseIntersectionPolicy, TileIndex, TileMatrix, TileMatrixId } from './types';

export function tileMatrixToBBox<T extends TileMatrixSet>(
  tileMatrix: ArrayElement<T['tileMatrices']>,
  matrixHeight: number = tileMatrix.matrixHeight,
  matrixWidth: number = tileMatrix.matrixWidth
): BBox {
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

export function clampBBoxToTileMatrix<T extends TileMatrixSet>(bBox: BBox, tileMatrixSet: T, tileMatrixId: TileMatrixId<T>, metatile = 1): BBox {
  const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
  if (!tileMatrix) {
    throw new Error('tile matrix id is not part of the given tile matrix set');
  }

  const { cornerOfOrigin = 'topLeft' } = tileMatrix;

  const [minEast, minNorth, maxEast, maxNorth] = bBox;
  const tileIndexMin = positionToTileIndex(
    [minEast, cornerOfOrigin === 'topLeft' ? maxNorth : minNorth],
    tileMatrixSet,
    tileMatrixId,
    'none',
    metatile
  );
  const minPosition = tileIndexToPosition(tileIndexMin, tileMatrixSet, metatile);
  const tileIndexMax = positionToTileIndex(
    [maxEast, cornerOfOrigin === 'topLeft' ? minNorth : maxNorth],
    tileMatrixSet,
    tileMatrixId,
    'both',
    metatile
  );
  const maxPosition = tileIndexToPosition(tileIndexMax, tileMatrixSet, metatile);

  return [
    minPosition[0],
    cornerOfOrigin === 'topLeft' ? maxPosition[1] - tileEffectiveHeight(tileMatrix) * metatile : minPosition[1],
    maxPosition[0] + tileEffectiveWidth(tileMatrix) * metatile,
    cornerOfOrigin === 'topLeft' ? minPosition[1] : maxPosition[1] + tileEffectiveHeight(tileMatrix) * metatile,
  ];
}

export function clampPositionToTileMatrix<T extends TileMatrixSet>(
  position: Position,
  tileMatrixSet: T,
  tileMatrixId: TileMatrixId<T>,
  reverseIntersectionPolicy: ReverseIntersectionPolicy,
  metatile = 1
): Position {
  const tileIndex = positionToTileIndex(position, tileMatrixSet, tileMatrixId, reverseIntersectionPolicy, metatile);
  return tileIndexToPosition(tileIndex, tileMatrixSet, metatile);
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
  reverseIntersectionPolicy: ReverseIntersectionPolicy = 'none',
  metatile = 1
): TileIndex<T> {
  const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
  if (!tileMatrix) {
    throw new Error('tile matrix id is not part of the given tile matrix set');
  }
  validatePositionByTileMatrix(position, tileMatrix);

  const [east, north] = position;

  const width = tileEffectiveWidth(tileMatrix) * metatile;
  const height = tileEffectiveHeight(tileMatrix) * metatile;

  const [tileMatrixBoundingBoxMinEast, tileMatrixBoundingBoxMinNorth, tileMatrixBoundingBoxMaxEast, tileMatrixBoundingBoxMaxNorth] =
    tileMatrixToBBox(tileMatrix);
  const { cornerOfOrigin = 'topLeft' } = tileMatrix;

  const tempTileCol = (east - tileMatrixBoundingBoxMinEast) / width;
  const tempTileRow = (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMaxNorth - north : north - tileMatrixBoundingBoxMinNorth) / height;

  let col: TileIndex<T>['col'];
  let row: TileIndex<T>['row'];
  switch (reverseIntersectionPolicy) {
    case 'both': {
      // when explicitly asked to reverse the intersection policy (location on the edge of the tile)
      const onEdgeEastTranslation = east === tileMatrixBoundingBoxMinEast ? 1 : 0;
      const onEdgeNorthTranslation = north === (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMaxNorth : tileMatrixBoundingBoxMinNorth) ? 1 : 0;

      col = Math.ceil(tempTileCol) - 1 + onEdgeEastTranslation;
      row = Math.ceil(tempTileRow) - 1 + onEdgeNorthTranslation;
      break;
    }
    case 'col': {
      const onEdgeEastTranslation = east === tileMatrixBoundingBoxMinEast ? 1 : 0;
      const onEdgeNorthTranslation =
        north === (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMinNorth : tileMatrixBoundingBoxMaxNorth) && Number.isSafeInteger(tempTileRow)
          ? 1
          : 0;

      col = Math.ceil(tempTileCol) - 1 + onEdgeEastTranslation;
      row = Math.floor(tempTileRow) - onEdgeNorthTranslation;
      break;
    }
    case 'row': {
      const onEdgeEastTranslation = east === tileMatrixBoundingBoxMaxEast && Number.isSafeInteger(tempTileCol) ? 1 : 0;
      const onEdgeNorthTranslation = north === (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMaxNorth : tileMatrixBoundingBoxMinNorth) ? 1 : 0;

      col = Math.floor(tempTileCol) - onEdgeEastTranslation;
      row = Math.ceil(tempTileRow) - 1 + onEdgeNorthTranslation;
      break;
    }
    case 'none': {
      // when east/north is on the maximum edge of the tile matrix (e.g. lon = 180 lat = 90 in wgs84) and the point's position coincides with (meta)tile edge
      const onEdgeEastTranslation = east === tileMatrixBoundingBoxMaxEast && Number.isSafeInteger(tempTileCol) ? 1 : 0;
      const onEdgeNorthTranslation =
        north === (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMinNorth : tileMatrixBoundingBoxMaxNorth) && Number.isSafeInteger(tempTileRow)
          ? 1
          : 0;

      col = Math.floor(tempTileCol) - onEdgeEastTranslation;
      row = Math.floor(tempTileRow) - onEdgeNorthTranslation;
      break;
    }
  }
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
    pointOfOrigin: [originEast, originNorth],
    cornerOfOrigin = 'topLeft',
  } = tileMatrix;

  const east = originEast + col * width;
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const north = originNorth + (cornerOfOrigin === 'topLeft' ? -1 : 1) * row * height;

  return [east, north];
}
