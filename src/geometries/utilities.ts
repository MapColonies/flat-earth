import { Position } from 'geojson';
import type { TileMatrixSet } from '../tiles/tileMatrixSet';
import { avoidNegativeZero, tileEffectiveHeight, tileEffectiveWidth, tileMatrixToBBox } from '../tiles/tiles';
import type { TileIndex, TileMatrixId } from '../tiles/types';
import type { ArrayElement } from '../types';

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

  const [tileMatrixBoundingBoxMinEast, tileMatrixBoundingBoxMinNorth, tileMatrixBoundingBoxMaxEast, tileMatrixBoundingBoxMaxNorth] =
    tileMatrixToBBox(tileMatrix);
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

export function snapPositionToMinTileMatrixCell<T extends TileMatrixSet>(position: Position, tileMatrix: ArrayElement<T['tileMatrices']>): Position {
  const [minEast, minNorth] = position;
  const width = tileEffectiveWidth(tileMatrix);
  const snappedMinEast = Math.floor(minEast / width) * width;
  const height = tileEffectiveHeight(tileMatrix);
  const snappedMinNorth = Math.floor(minNorth / height) * height;
  return [avoidNegativeZero(snappedMinEast), avoidNegativeZero(snappedMinNorth)];
}

export function snapPositionToMaxTileMatrixCell<T extends TileMatrixSet>(position: Position, tileMatrix: ArrayElement<T['tileMatrices']>): Position {
  const [, , maxEast, maxNorth] = position;
  const width = tileEffectiveWidth(tileMatrix);
  const snappedMaxEast = Math.ceil(maxEast / width) * width;
  const height = tileEffectiveHeight(tileMatrix);
  const snappedMaxNorth = Math.ceil(maxNorth / height) * height;
  return [avoidNegativeZero(snappedMaxEast), avoidNegativeZero(snappedMaxNorth)];
}
