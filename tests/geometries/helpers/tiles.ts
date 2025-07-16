import { fc } from '@fast-check/jest';
import type { BBox } from 'geojson';
import { TileMatrixCollection } from '../../../src/tiles/tileMatrixCollection';
import type { TileMatrixSetJSON } from '../../../src/tiles/types';
import { tileMatrixToBBox } from '../../../src/tiles/utilities';

export const generateTileMatrixToBBox = (
  tileMatrixSetJSON: fc.Arbitrary<TileMatrixSetJSON>,
  tileMatrixId: fc.Arbitrary<string>
): fc.Arbitrary<BBox> => {
  return fc.tuple(tileMatrixSetJSON, tileMatrixId).map(([tileMatrixSetJSON, tileMatrixId]) => {
    const tileMatrixCollection = new TileMatrixCollection(tileMatrixSetJSON);
    const tileMatrix = tileMatrixCollection.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix collection');
    }
    return tileMatrixToBBox(tileMatrix);
  });
};
