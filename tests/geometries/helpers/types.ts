import type { Line } from '../../../src/geometries/line';
import type { Point } from '../../../src/geometries/point';
import type { Polygon } from '../../../src/geometries/polygon';
import type { CoordRefSysJSON, GeoJSONBaseGeometry, GeoJSONPoint } from '../../../src/geometries/types';
import type { TileMatrixCollection } from '../../../src/tiles/tileMatrixCollection';
import type { TileMatrixId, TileMatrixLimits, TileMatrixSet, TileMatrixSetJSON } from '../../../src/tiles/types';

export interface ConstructorTestCase<T extends GeoJSONBaseGeometry> {
  case: string;
  coordinates: T['coordinates'];
  coordRefSys?: CoordRefSysJSON['coordRefSys'];
}

export interface BadConstructorTestCase<T extends GeoJSONBaseGeometry> extends ConstructorTestCase<T> {
  expected: Error;
  mock?: () => void;
}

export interface ToTileMatrixLimitsTestCase<T extends GeoJSONBaseGeometry> {
  case: string;
  coordinates: T['coordinates'];
  expected: T extends GeoJSONPoint ? TileMatrixLimits<TileMatrixSet> : TileMatrixLimits<TileMatrixSet>[];
  tileMatrixId: TileMatrixId<TileMatrixSet>;
  tileMatrixSetJSON: TileMatrixSetJSON;
  coordRefSys?: CoordRefSysJSON['coordRefSys'];
  metatile?: number;
}

export interface BadToTileMatrixLimitsTestCase<T extends GeoJSONBaseGeometry> extends Omit<ToTileMatrixLimitsTestCase<T>, 'expected'> {
  expected: Error;
}

export interface ToTileMatrixLimitsArgs<T extends Point | Line | Polygon> {
  geometry: T;
  tileMatrixCollection: TileMatrixCollection;
  tileMatrixId: string;
  metatile: number;
}
