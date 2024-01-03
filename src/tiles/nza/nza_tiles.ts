import {LonLat} from '../../classes';
import {CoordinateReferenceSystem} from '../../crs/crs_classes';
import {CRS_32636 as UTM} from '../../crs/crs_constants';
import {transformCrs} from '../../crs/transform_crs';
import {findNzaTile} from './nza_tiles_cache';

export function lonLatToTile(
  lonlat: LonLat,
  sourceCrs: CoordinateReferenceSystem
): NzaTile {
  const convertedCoordinate = transformCrs(lonlat, sourceCrs, UTM);
  const nzaTile = findNzaTile(convertedCoordinate);
  if (nzaTile) {
    return nzaTile;
  } else {
    throw new Error('tile not found');
  }
}

export class NzaTile {
  constructor(tile_name: string, zone: number, min_x: number, min_y: number) {
    this.tileName = tile_name;
    this.zone = zone;
    this.min_x = min_x;
    this.min_y = min_y;
  }

  tileName: string;
  zone: number;
  min_x: number;
  min_y: number;
}
