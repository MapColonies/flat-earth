import type { TileMatrixSet } from './tiles/types';

type Concrete<Type> = {
  [Property in keyof Type]-?: Type[Property];
};

export type ArrayElement<T> = T extends (infer U)[] ? U : never;

export type Comparison = 'equal' | 'closest' | 'lower' | 'higher';
export interface CoordRefSys {
  coordRefSys?: TileMatrixSet['crs']; // TODO: change type according to - OGC Features and Geometries JSON - Part 1: Core
}
export type ConcreteCoordRefSys = Concrete<CoordRefSys>;
