import type { TileMatrixId } from '../types';
import { validateMetatile } from '../validations/validations';
import type { TileMatrixSet } from './tileMatrixSet';

/**
 * Tile class that supports a metatile definition
 */
export class Tile<T extends TileMatrixSet> {
  public constructor(
    public col: number,
    public row: number,
    public tileMatrixId: TileMatrixId<T>,
    public metatile?: number
  ) {
    if (col < 0 || row < 0) {
      throw new Error('tile indices must be non-negative integers');
    }

    if (metatile !== undefined) {
      validateMetatile(metatile);
    }
  }
}
