import {LonLat} from '../../classes';
import {NzaTile} from './nza_tiles';

const NZA_TILES_CACHE = loadNzaTilesCache();
export function findNzaTile(lonLat: LonLat): NzaTile | undefined {
  const find = NZA_TILES_CACHE.find(tile => {
    if (tile.min_x === lonLat.lon && tile.min_y === lonLat.lat) {
      return new NzaTile(tile.tile_name, tile.zone, tile.min_x, tile.min_y);
    } else {
      return undefined;
    }
  });

  if (find) {
    return new NzaTile(find.tile_name, find.zone, find.min_x, find.min_y);
  } else {
    return undefined;
  }
}

export function findNzaTileByTileName(tileName: string): NzaTile | undefined {
  const find = NZA_TILES_CACHE.find(tile => {
    if (tile.tile_name === tileName) {
      return new NzaTile(tile.tile_name, tile.zone, tile.min_x, tile.min_y);
    } else {
      return undefined;
    }
  });

  if (find) {
    return new NzaTile(find.tile_name, find.zone, find.min_x, find.min_y);
  } else {
    return undefined;
  }
}

function loadNzaTilesCache() {
  // TODO: load from service
  return [
    {tile_name: 'בעל', zone: 37, min_x: 250000, min_y: 3740000},
    {tile_name: 'בלה', zone: 37, min_x: 280000, min_y: 3740000},
  ];
}
