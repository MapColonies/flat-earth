import {Zoom} from '../types';
import {BoundingBox, Geometry, Polygon} from '../classes';
import {Tile, TileRange} from './tiles_classes';
import {
  boundingBoxToTileRange,
  expandBBoxToTileGrid,
  findMinimalZoom,
} from './tiles';
import {geometryCoversBoundingBox} from '../measurements/measurements';
import {geometryToBoundingBox} from '../converters/geometry_converters';
// import { bboxToTileRange } from "./bboxUtils";
// import {Tile} from './tiles_classes';
// import {area, bboxPolygon, booleanEqual, Feature, intersect} from '@turf/turf';
// import {ITile, ITileRange} from '../models/interfaces/geo/iTile';
// import {bboxToTileRange} from './bboxUtils';
// import { boundingBoxToTiles, tileToBbox } from "./tiles";
// import {tilesGenerator} from './tilesGenerator';
// import {geometryToBoundingBox} from '../converters/geometry_converters';
// import { geometriesEqual, geometryCoversBoundingBox } from "../measurements/measurements";

// type TileIntersectionFunction<T> = (
//   tile: ITile,
//   intersectionTarget: T
// ) => TileIntersectionState;

// enum TileIntersectionState {
//   FULL = 'full',
//   PARTIAL = 'partial',
//   NONE = 'none',
// }
//
// interface IFootprintIntersectionParams {
//   footprint: Polygon | Feature<Polygon | MultiPolygon>;
//   maxZoom: number;
// }
/**
 * generate tile hashes
 * @param footprint footprint to cover with generated tile hashes
 * @param zoom max hash zoom
 * @returns
 */
/**
 * generate tile
 * @param bbox bbox to cover with generated tiles
 * @param zoom target tiles zoom level
 */
// public generateTiles(bbox: BBox2d, zoom: number): Generator<ITile>;
/**
 * generate tile
 * @param area
 * @param zoom target tiles zoom level
 */
//   function generateTiles(footprint: Polygon, zoom: Zoom): Generator<Tile>;
//   function *generateRanges<T>(
//     bbox: BoundingBox,
//     zoom: Zoom,
//     intersectionTarget: T,
//     intersectionFunction: TileIntersectionFunction<T>,
//     verbose = false
//   ): Generator<TileRange> {
//   /////////////////////////////////////////////////////////////////////////////////////////////////
//   /// Step 3: Convert the bbox to tile range of the requested zoom
//   /////////////////////////////////////////////////////////////////////////////////////////////////
//   if(verbose) {
//     console.log('Convert the bbox to tile range of the requested zoom');
//   }
//   const boundingBox = expandBBoxToTileGrid(bbox, zoom);
//   const tilesGenerator = boundingBoxToTileRange(boundingBox, zoom);
//   /////////////////////////////////////////////////////////////////////////////////////////////////
//   /// Step 4: Use range size to calculate zoom level where the target area is smaller then 1 tile
//   ///         (use zoom zero in-case there is no such zoom, for example in global bbox).
//   /////////////////////////////////////////////////////////////////////////////////////////////////
//   // find minimal zoom where the the area can be converted by area the size of single tile to skip levels that can't have full hashes
//   if(verbose) {
//     console.log(
//       "find minimal zoom where the the area can be converted by area the size of single tile to skip levels that can't have full hashes"
//     );
//   }
//
//   const minZoom = findMinimalZoom(boundingBox);
//
//   if(verbose) {
//     console.log(`MinZoom: ${minZoom}`);
//   }
//   /////////////////////////////////////////////////////////////////////////////////////////////////
//   /// Step 5: convert the requested bbox to to tile range of the zoom level calculated in step 3 (this reduce the iteration required for the calculation)
//   /////////////////////////////////////////////////////////////////////////////////////////////////
//   //find base hashes
//   const minimalRange = bboxToTileRange(bbox, minZoom);
//   for(let x = minimalRange.minX; x < minimalRange.maxX; x++
// )
// {
//   for (let y = minimalRange.minY; y < minimalRange.maxY; y++) {
//     /////////////////////////////////////////////////////////////////////////////////////////////////
//     /// Step 6: for every tile in the current range:
//     /// Step 7: check the tile intersection with the footprint
//     /////////////////////////////////////////////////////////////////////////////////////////////////
//     const tile = { x, y, zoom: minimalRange.zoom };
//     const intersection = intersectionFunction(tile, intersectionTarget);
//     if (verbose) {
//       console.log(
//         `Tile X: ${tile.x}, Y: ${tile.y} zoom ${tile.zoom}, intersection: ${intersection}`
//       );
//     }
//     /// if it is completely covered or the tile is in the requested zoom:
//     if (true)//intersection === TileIntersectionState.FULL) {
//       /// convert it to tile range of the requested resolution
//       /// add the range to the result set (yield is used for lazy calculation to improve memory usage)
//
//       const tileRange = new TileRange(1,1,1,1,1);//this.tileToRange(tile, zoom);
//       if (verbose) {
//         console.log(
//           `return BBOX tile range zoom: ${tileRange.zoom} : X ${tileRange.minX} - ${tileRange.maxX} : Y ${tileRange.minY} - ${tileRange.maxY}`
//         );
//       }
//       yield tileRange;
//     } else if (true)//intersection === TileIntersectionState.PARTIAL) {
//       /// if it partly covered:
//       // calculate the sub tiles contained in the current tile (in the next zoom level)
//       // for every sub tile recursively run step 6
//       //optimize partial base hashes
//       yield * this.optimizeHash(
//         tile,
//         zoom,
//         intersectionTarget,
//         intersectionFunction,
//         verbose
//       );
//     }
//     /// else do nothing as this tiles aren't intersected with the original footprint
//   }
// }
// }
//
// /**
//  * generate tile
//  * @param tile tile to get all intersecting tiles from
//  * @param targetZoom target tiles zoom level
//  * @param intersectionTarget original zoom level and footprint to intersect
//  * @param intersectionFunction the intersection function to be called
//  */
// private *optimizeHash<T>(
//   tile: ITile,
//   targetZoom: number,
//   intersectionTarget: T,
//   intersectionFunction: TileIntersectionFunction<T>,
//   verbose = false
// ): Generator<ITileRange> {
//   /// generate from a tile the next zoom level tiles that compose the tile
//   if (verbose) {
//     console.log(
//       `optimizeHash: Tile X: ${tile.x}, Y: ${tile.y} zoom ${
//         tile.zoom
//       }, intersectionTarget ${
//         (intersectionTarget as unknown as {maxZoom: number}).maxZoom
//       }, - generate from a tile the next zoom level tiles that compose the tile`
//     );
//   }
//   const tiles = this.generateSubTiles(tile);
//   for (const subTile of tiles) {
//     const intersection = intersectionFunction(subTile, intersectionTarget);
//     if (verbose) {
//       console.log(
//         `Tile X: ${subTile.x}, Y: ${subTile.y} zoom ${subTile.zoom}, intersection: ${intersection}`
//       );
//     }
//     if (intersection === TileIntersectionState.FULL) {
//       /// convert it to tile range of the requested resolution
//       /// add the range to the result set (yield is used for lazy calculation to improve memory usage)
//
//       const tileRange = this.tileToRange(subTile, targetZoom);
//       if (verbose) {
//         console.log(
//           `return BBOX tile range zoom: ${tileRange.zoom} : X ${tileRange.minX} - ${tileRange.maxX} : Y ${tileRange.minY} - ${tileRange.maxY}`
//         );
//       }
//       yield tileRange;
//     } else if (intersection === TileIntersectionState.PARTIAL) {
//       /// if it partly covered:
//       // calculate the sub tiles contained in the current tile (in the next zoom level) - recursive
//       yield* this.optimizeHash(
//         subTile,
//         targetZoom,
//         intersectionTarget,
//         intersectionFunction,
//         verbose
//       );
//     }
//   }
// }
//
// private generateSubTiles(tile: ITile): ITile[] {
//   const tile0 = {x: tile.x << 1, y: tile.y << 1, zoom: tile.zoom + 1};
//   const tile1 = {x: tile0.x + 1, y: tile0.y, zoom: tile0.zoom};
//   const tile2 = {x: tile0.x, y: tile0.y + 1, zoom: tile0.zoom};
//   const tile3 = {x: tile0.x + 1, y: tile0.y + 1, zoom: tile0.zoom};
//   const tiles = [tile0, tile1, tile2, tile3];
//   return tiles;
// }
//
// private readonly tileFootprintIntersection = (
//   tile: ITile,
//   intersectionParams: IFootprintIntersectionParams
// ): TileIntersectionState => {
//   const tileBbox = tileToBbox(tile);
//   const tilePoly = bboxPolygon(tileBbox);
//   const intersection = intersect(intersectionParams.footprint, tilePoly);
//   if (intersection === null) {
//     return TileIntersectionState.NONE;
//   }
//   // stop condition
//   if (tile.zoom === intersectionParams.maxZoom) {
//     return TileIntersectionState.FULL;
//   }
//   const intArea = area(intersection);
//   const hashArea = area(tilePoly);
//   if (intArea == hashArea) {
//     return TileIntersectionState.FULL;
//   }
//   return TileIntersectionState.PARTIAL;
// };

// function encodeFootprint(footprint: Polygon, zoom: Zoom): Generator<Tile> {
//   console.debug('Starting to encode footprint');
//   if (geometryCoversBoundingBox(footprint)) {
//     console.debug('footprint covers bounding box');
//     // if it is a bounding box convert it directly to a tile range and return it
//     // (boundingBox to tiles conversion is fast and direct mathematical conversion)
//     const boundingBox = geometryToBoundingBox(footprint);
//     return boundingBoxToTileRange(boundingBox, zoom);
//
//     } else {
//       const intersectionParams: IFootprintIntersectionParams = {
//         footprint,
//         maxZoom: zoom,
//       };
//       if (verbose) {
//         console.log(
//           'footprint is different from its boundingBox - generateRanges'
//         );
//       }
//       yield* generateRanges(
//         boundingBox,
//         zoom,
//         intersectionParams,
//         this.tileFootprintIntersection,
//         verbose
//       );
//     }
//   } else {
//     throw new Error('footprint does not cover bounding box');
//   }
// }

export function generateTiles(area: Geometry, zoom: Zoom): Generator<Tile> {
  switch (area.type) {
    // case 'Polygon':
    //   return encodeFootprint(area as Polygon, zoom);
    case 'BoundingBox':
      return boundingBoxToTileRange(area as BoundingBox, zoom).tileGenerator();
    default:
      throw new Error(`Unsupported area type: ${area.type}`);
  }
}
