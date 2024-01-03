import {BoundingBox, LonLat, Polygon} from '../../classes';
import {CoordinateReferenceSystem} from '../../crs/crs_classes';
import {CRS_32636 as UTM, CRS_CRS84 as WGS84} from '../../crs/crs_constants';
import {transformCrs} from '../../crs/transform_crs';
import {findNzaTile, findNzaTileByTileName} from './nza_tiles_cache';
import {boundingBoxToPolygon} from '../../converters/geometry_converters';

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

export function nzaTileToBoundingBox(
  nzaTileSubstring: string[],
  nzaTileName: string
): BoundingBox {
  // validate tile
  const nzaTile = findNzaTileByTileName(nzaTileName);
  if (!nzaTile) {
    throw new Error('tile not found');
  }
  const convertedCoordinate = convertTileSubstringToUtm(
    nzaTileSubstring,
    nzaTile
  );
  return convertUtmPointToWgs84BoundingBox(convertedCoordinate);
}

export function nzaTileToPolygon(
  nzaTileSubstring: string[],
  nzaTileName: string
): Polygon {
  const boundingBox = nzaTileToBoundingBox(nzaTileSubstring, nzaTileName);
  return boundingBoxToPolygon(boundingBox);
}

function convertTileSubstringToUtm(
  nzaTileSubstring: string[],
  nzaTile: NzaTile
): LonLat {
  const xCoordinatePart = nzaTileSubstring.map(x => x[0]).join('');
  const yCoordinatePart = nzaTileSubstring.map(x => x[1]).join('');
  const xCoordinate = nzaTile.min_x + parseInt(xCoordinatePart) * 10;
  const yCoordinate = nzaTile.min_y + parseInt(yCoordinatePart) * 10;
  return new LonLat(xCoordinate, yCoordinate);
}

function convertUtmPointToWgs84BoundingBox(utmPoint: LonLat): BoundingBox {
  const xCoordinate = utmPoint.lon;
  const yCoordinate = utmPoint.lat;
  // Bottom left corner
  const bottomLeft = transformCrs(utmPoint, UTM, WGS84);
  // Top right corner
  const xMax = xCoordinate * 10;
  const yMax = yCoordinate * 10;
  const topRight = transformCrs(new LonLat(xMax, yMax), UTM, WGS84);

  return new BoundingBox(
    bottomLeft.lon,
    bottomLeft.lat,
    topRight.lon,
    topRight.lat
  );
}

export class NzaTile {
  constructor(
    tile_name: string,
    zone: number,
    min_x: number,
    min_y: number,
    subTileString?: string
  ) {
    this.tileName = tile_name;
    this.zone = zone;
    this.min_x = min_x;
    this.min_y = min_y;
    this.subTileString = subTileString;
  }

  tileName: string;
  zone: number;
  min_x: number;
  min_y: number;
  subTileString?: string;
}
