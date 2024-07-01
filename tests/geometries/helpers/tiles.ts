import { fc } from '@fast-check/jest';
import type { BBox } from 'geojson';
import type { TileMatrixSet } from '../../../src/tiles/tileMatrixSet';
import type { TileMatrixId, TileMatrixSetJSON } from '../../../src/tiles/types';
import type { ArrayElement } from '../../../src/types';

export const getTileMatrix = <T extends TileMatrixSet>(
  tileMatrixSet: T,
  tileMatrixId: TileMatrixId<T>
): ArrayElement<T['tileMatrices']> | undefined => {
  return tileMatrixSet.tileMatrices.find<ArrayElement<T['tileMatrices']>>((tileMatrix): tileMatrix is ArrayElement<T['tileMatrices']> => {
    const {
      identifier: { code: comparedTileMatrixId },
    } = tileMatrix;
    return comparedTileMatrixId === tileMatrixId;
  });
};

export const generateTileMatrixToBBox = (
  tileMatrixSetJSON: fc.Arbitrary<TileMatrixSetJSON>,
  tileMatrixId: fc.Arbitrary<string>
): fc.Arbitrary<BBox> => {
  return fc.tuple(tileMatrixSetJSON, tileMatrixId).map(([tileMatrixSetJSON, tileMatrixId]) => tileMatrixToBBox(tileMatrixSetJSON, tileMatrixId));
};

export const tileMatrixToBBox = (tileMatrixSetJSON: TileMatrixSetJSON, tileMatrixId: string): BBox => {
  const tileMatrixJSON = tileMatrixSetJSON.tileMatrices.find(({ id: comparedTileMatrixId }) => {
    return comparedTileMatrixId === tileMatrixId;
  });

  if (!tileMatrixJSON) {
    throw new Error('tile matrix id is not part of the given tile matrix set');
  }
  const {
    cellSize,
    cornerOfOrigin = 'topLeft',
    tileHeight,
    tileWidth,
    matrixHeight,
    matrixWidth,
    pointOfOrigin: [eastOrigin, northOrigin],
  } = tileMatrixJSON;

  const tileMatrixHeight = cellSize * tileHeight * matrixHeight;
  const tileMatrixWidth = cellSize * tileWidth * matrixWidth;

  const [minNorth, maxNorth] =
    cornerOfOrigin === 'topLeft' ? [northOrigin - tileMatrixHeight, northOrigin] : [northOrigin, northOrigin + tileMatrixHeight];
  const [minEast, maxEast] = [eastOrigin, eastOrigin + tileMatrixWidth];

  return [minEast, minNorth, maxEast, maxNorth];
};
