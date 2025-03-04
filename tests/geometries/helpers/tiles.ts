import { fc } from '@fast-check/jest';
import type { BBox } from 'geojson';
import { TileMatrixSet } from '../../../src/tiles/tileMatrixSet';
import type { TileMatrixSetJSON } from '../../../src/tiles/types';
import { tileMatrixToBBox } from '../../../src/tiles/utilities';

export const generateTileMatrixToBBox = (
  tileMatrixSetJSON: fc.Arbitrary<TileMatrixSetJSON>,
  tileMatrixId: fc.Arbitrary<string>
): fc.Arbitrary<BBox> => {
  return fc.tuple(tileMatrixSetJSON, tileMatrixId).map(([tileMatrixSetJSON, tileMatrixId]) => {
    const tileMatrixSet = new TileMatrixSet(tileMatrixSetJSON);
    const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix set');
    }
    return tileMatrixToBBox(tileMatrix);
  });
};
