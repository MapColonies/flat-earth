import type { GeoJSONBaseGeometry, GeoJSONPoint } from '../../../src/geometries/types';
import type { TileMatrixId, TileMatrixLimits, TileMatrixSetJSON, TileMatrixSet as TileMatrixSetType } from '../../../src/tiles/types';
import type { CoordRefSysJSON } from '../../../src/types';

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
  expected: T extends GeoJSONPoint ? TileMatrixLimits<TileMatrixSetType> : TileMatrixLimits<TileMatrixSetType>[];
  tileMatrixId: TileMatrixId<TileMatrixSetType>;
  tileMatrixSetJSON: TileMatrixSetJSON;
  coordRefSys?: CoordRefSysJSON['coordRefSys'];
  metatile?: number;
}

export interface BadToTileMatrixLimitsTestCase<T extends GeoJSONBaseGeometry> extends Omit<ToTileMatrixLimitsTestCase<T>, 'expected'> {
  expected: Error;
}
