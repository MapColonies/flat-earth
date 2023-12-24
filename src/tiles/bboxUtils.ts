// import {BBox2d} from '@turf/helpers/dist/js/lib/geojson';
// import {ITile, ITileRange} from '../models/interfaces/geo/iTile';
// import {degreesToTile, tileToDegrees} from './geoConvertor';
// import {degreesPerTile} from './tiles_from_mc_utils';
// import {Zoom} from '../types';
// import {BoundingBox} from '../classes';
// import { lonLatZoomToTile, tileProjectedHeight } from "./tiles";
//
// const snapMinCordToTileGrid = (cord: number, tileRes: number): number => {
//   const newCord = Math.floor(cord / tileRes) * tileRes;
//   return newCord;
// };
//
// /**
//  * rounds bbox to grid
//  * @param bbox original bbox
//  * @param zoom target tiles grid zoom level
//  * @returns bbox that contains the original bbox and match tile grid lines
//  */
// export function snapBBoxToTileGrid(bbox: BoundingBox, zoom: Zoom): BoundingBox {
//   lonLatZoomToTile(bbox.min.lon, bbox.min.lat, zoom);
//   geoC
//   const tileRes = tileProjectedHeight(zoom);
//   const snappedMinLon = snapMinCordToTileGrid(bbox.min.lon, tileRes);
//   let snappedMaxLon = snapMinCordToTileGrid(bbox.max.lon, tileRes);
//   if (snappedMaxLon != maxLon) {
//     snappedMaxLon += tileRes;
//   }
//   let sanppedMinLat: number;
//   let snappedMaxLat: number;
//   if (zoom === 0) {
//     // eslint-disable-next-line @typescript-eslint/no-magic-numbers
//     sanppedMinLat = -90;
//     // eslint-disable-next-line @typescript-eslint/no-magic-numbers
//     snappedMaxLat = 90;
//   } else {
//     sanppedMinLat = snapMinCordToTileGrid(minLat, tileRes);
//     snappedMaxLat = snapMinCordToTileGrid(maxLat, tileRes);
//     if (snappedMaxLat != maxLat) {
//       snappedMaxLat += tileRes;
//     }
//   }
//   const snappedBbox: BBox2d = [
//     snappedMinLon,
//     sanppedMinLat,
//     snappedMaxLon,
//     snappedMaxLat,
//   ];
//   return snappedBbox;
// }
//
// /**
//  * create bbox from tile grid coordinates
//  * @param minTile corner tile for bbox with minimal x,y values
//  * @param maxTile corner tile for bbox with maximal x,y values
//  * @returns
//  */
// export const bboxFromTiles = (minTile: ITile, maxTile: ITile): BBox2d => {
//   if (minTile.zoom !== maxTile.zoom) {
//     throw new Error(
//       'Could not calcualte bbox from tiles due to not matching zoom levels'
//     );
//   }
//
//   const minPoint = tileToDegrees(minTile);
//   const maxPoint = tileToDegrees({
//     x: maxTile.x + 1,
//     y: maxTile.y + 1,
//     zoom: maxTile.zoom,
//   });
//
//   return [
//     minPoint.longitude,
//     minPoint.latitude,
//     maxPoint.longitude,
//     maxPoint.latitude,
//   ];
// };
//
// /**
//  * coverts bbox to covering tile range of specified zoom level
//  * @param bbox
//  * @param zoom target zoom level
//  * @returns covering tile range
//  */
// export const bboxToTileRange = (bbox: BBox2d, zoom: number): ITileRange => {
//   const sanitizedBbox = snapBBoxToTileGrid(bbox, zoom);
//   const minTile = degreesToTile(
//     {
//       longitude: sanitizedBbox[0],
//       latitude: sanitizedBbox[1],
//     },
//     zoom
//   );
//   const maxTile = degreesToTile(
//     {
//       longitude: sanitizedBbox[2],
//       latitude: sanitizedBbox[3],
//     },
//     zoom
//   );
//   return {
//     minX: minTile.x,
//     minY: minTile.y,
//     maxX: maxTile.x,
//     maxY: maxTile.y,
//     zoom,
//   };
// };
