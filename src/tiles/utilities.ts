import type { BBox, Position } from 'geojson';
import type { ArrayElement } from '../utils/types';
import { validatePositionByTileMatrix } from '../validations';
import { TileMatrixNotFoundError } from './errors';
import type { TileEdgeInclusion, TileIndex, TileMatrix, TileMatrixId, TileMatrixSet } from './types';

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

/**
 * Get tile matrix
 * @param tileMatrixSet - tile matrix set
 * @param tileMatrixId - tile matrix identifier of `tileMatrixSet`
 * @returns Tile matrix set
 * @throws {@link TileMatrixNotFoundError} This exception is thrown if the `tileMatrixId` is not found in `tileMatrixSet`.
 */
export function getTileMatrix<T extends TileMatrixSet>(tileMatrixSet: TileMatrixSet, tileMatrixId: TileMatrixId<T>): ArrayElement<T['tileMatrices']> {
  const tileMatrix = tileMatrixSet.tileMatrices.find<ArrayElement<T['tileMatrices']>>((tileMatrix): tileMatrix is ArrayElement<T['tileMatrices']> => {
    const {
      identifier: { code: comparedTileMatrixId },
    } = tileMatrix;
    return comparedTileMatrixId === tileMatrixId;
  });
  if (!tileMatrix) {
    throw new TileMatrixNotFoundError();
  }
  return tileMatrix;
}

export function reshapeBBoxToTileMatrix<T extends TileMatrixSet>(bBox: BBox, tileMatrixSet: T, tileMatrixId: TileMatrixId<T>, metatile = 1): BBox {
  const tileMatrix = getTileMatrix(tileMatrixSet, tileMatrixId);

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
  tileEdgeInclusion: TileEdgeInclusion,
  metatile = 1
): Position {
  const tileIndex = positionToTileIndex(position, tileMatrixSet, tileMatrixId, tileEdgeInclusion, metatile);
  return tileIndexToPosition(tileIndex, tileMatrixSet, metatile);
}

export function positionToTileIndex<T extends TileMatrixSet>(
  position: Position,
  tileMatrixSet: T,
  tileMatrixId: TileMatrixId<T>,
  tileEdgeInclusion: TileEdgeInclusion = 'none',
  metatile = 1
): TileIndex<T> {
  const tileMatrix = getTileMatrix(tileMatrixSet, tileMatrixId);

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
  switch (tileEdgeInclusion) {
    case 'both': {
      // location is on at least one of the edges of the tile
      const onEdgeEastTranslation = east === tileMatrixBoundingBoxMinEast ? 1 : 0;
      const onEdgeNorthTranslation = north === (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMaxNorth : tileMatrixBoundingBoxMinNorth) ? 1 : 0;

      col = Math.ceil(tempTileCol) - 1 + onEdgeEastTranslation;
      row = Math.ceil(tempTileRow) - 1 + onEdgeNorthTranslation;
      break;
    }
    case 'col': {
      // location is on column edges of the tile
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
      // location is on row edges of the tile
      const onEdgeEastTranslation = east === tileMatrixBoundingBoxMaxEast && Number.isSafeInteger(tempTileCol) ? 1 : 0;
      const onEdgeNorthTranslation = north === (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMaxNorth : tileMatrixBoundingBoxMinNorth) ? 1 : 0;

      col = Math.floor(tempTileCol) - onEdgeEastTranslation;
      row = Math.ceil(tempTileRow) - 1 + onEdgeNorthTranslation;
      break;
    }
    case 'none': {
      // location is on one of the maximum edge of the tile matrix (e.g. lon = 180 lat = 90 in wgs84) and the location coincides with (meta)tile edge
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

  const tileMatrix = getTileMatrix(tileMatrixSet, tileMatrixId);

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
