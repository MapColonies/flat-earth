import {tileToTileRange} from '../src/tiles/tiles';
import {Tile, TileRange} from '../src/tiles/tiles_classes';

describe('TileRanger', () => {
  describe('tileToRange', () => {
    it('create range with same zoom', () => {
      const tile = new Tile(1, 1, 2);

      const range = tileToTileRange(tile, 2);
      const expectedRange = new TileRange(1, 1, 2, 2, 2);
      expect(range).toEqual(expectedRange);
    });

    it('create range with higher zoom', () => {
      const tile = new Tile(1, 1, 2);
      const range = tileToTileRange(tile, 3);

      const expectedRange = {
        minX: 2,
        minY: 2,
        maxX: 4,
        maxY: 4,
        zoom: 3,
      };
      expect(range).toEqual(expectedRange);
    });

    it('create range with lower zoom', () => {
      const tile = new Tile(1, 1, 2);

      const range = tileToTileRange(tile, 1);

      const expectedRange = {
        minX: 0,
        minY: 0,
        maxX: 1,
        maxY: 1,
        zoom: 1,
      };
      expect(range).toEqual(expectedRange);
    });
  });

  // describe('encodeFootprint', () => {
  //   it('encode rectangle polygon calls encode bbox', () => {
  //     const bbox = [-45, 0, 45, 45] as BBox2d;
  //     const bboxPoly = bboxPolygon(bbox);
  //
  //     const ranges = [];
  //     const gen = ranger.encodeFootprint(bboxPoly, 2);
  //     for (const range of gen) {
  //       ranges.push(range);
  //     }
  //
  //     const expectedRanges = [
  //       {
  //         minX: 3,
  //         maxX: 5,
  //         minY: 2,
  //         maxY: 3,
  //         zoom: 2,
  //       },
  //     ];
  //     expect(ranges).toEqual(expectedRanges);
  //   });
  //
  //   it('encodes none bbox polygon properly', () => {
  //     const poly = polygon([
  //       [
  //         [-45, 0],
  //         [0, 45],
  //         [45, 0],
  //         [-45, 0],
  //       ],
  //     ]);
  //
  //     const tileRanges = [];
  //     const gen = ranger.encodeFootprint(poly, 5);
  //     for (const range of gen) {
  //       tileRanges.push(range);
  //     }
  //
  //     const expectedRanges = [
  //       { minX: 24, minY: 16, maxX: 25, maxY: 17, zoom: 5 },
  //       { minX: 25, minY: 16, maxX: 26, maxY: 17, zoom: 5 },
  //       { minX: 25, minY: 17, maxX: 26, maxY: 18, zoom: 5 },
  //       { minX: 26, minY: 16, maxX: 28, maxY: 18, zoom: 5 },
  //       { minX: 26, minY: 18, maxX: 27, maxY: 19, zoom: 5 },
  //       { minX: 27, minY: 18, maxX: 28, maxY: 19, zoom: 5 },
  //       { minX: 27, minY: 19, maxX: 28, maxY: 20, zoom: 5 },
  //       { minX: 28, minY: 16, maxX: 32, maxY: 20, zoom: 5 },
  //       { minX: 28, minY: 20, maxX: 29, maxY: 21, zoom: 5 },
  //       { minX: 29, minY: 20, maxX: 30, maxY: 21, zoom: 5 },
  //       { minX: 29, minY: 21, maxX: 30, maxY: 22, zoom: 5 },
  //       { minX: 30, minY: 20, maxX: 32, maxY: 22, zoom: 5 },
  //       { minX: 30, minY: 22, maxX: 31, maxY: 23, zoom: 5 },
  //       { minX: 31, minY: 22, maxX: 32, maxY: 23, zoom: 5 },
  //       { minX: 31, minY: 23, maxX: 32, maxY: 24, zoom: 5 },
  //       { minX: 32, minY: 16, maxX: 36, maxY: 20, zoom: 5 },
  //       { minX: 36, minY: 16, maxX: 38, maxY: 18, zoom: 5 },
  //       { minX: 38, minY: 16, maxX: 39, maxY: 17, zoom: 5 },
  //       { minX: 39, minY: 16, maxX: 40, maxY: 17, zoom: 5 },
  //       { minX: 38, minY: 17, maxX: 39, maxY: 18, zoom: 5 },
  //       { minX: 36, minY: 18, maxX: 37, maxY: 19, zoom: 5 },
  //       { minX: 37, minY: 18, maxX: 38, maxY: 19, zoom: 5 },
  //       { minX: 36, minY: 19, maxX: 37, maxY: 20, zoom: 5 },
  //       { minX: 32, minY: 20, maxX: 34, maxY: 22, zoom: 5 },
  //       { minX: 34, minY: 20, maxX: 35, maxY: 21, zoom: 5 },
  //       { minX: 35, minY: 20, maxX: 36, maxY: 21, zoom: 5 },
  //       { minX: 34, minY: 21, maxX: 35, maxY: 22, zoom: 5 },
  //       { minX: 32, minY: 22, maxX: 33, maxY: 23, zoom: 5 },
  //       { minX: 33, minY: 22, maxX: 34, maxY: 23, zoom: 5 },
  //       { minX: 32, minY: 23, maxX: 33, maxY: 24, zoom: 5 },
  //     ];
  //     expect(tileRanges).toEqual(expectedRanges);
  //   });
  // });
  //
  // describe('generateTiles', () => {
  //   it('generates expected tiles from bbox', () => {
  //     const bbox = [-45, -45, 0, 0] as BBox2d;
  //
  //     const tiles = [];
  //     const gen = ranger.generateTiles(bbox, 2);
  //     for (const tile of gen) {
  //       tiles.push(tile);
  //     }
  //
  //     const expectedTiles = [
  //       {
  //         x: 3,
  //         y: 1,
  //         zoom: 2,
  //       },
  //     ];
  //     expect(tiles).toEqual(expectedTiles);
  //   });
  //
  //   it('generates expected tiles from bbox polygon', () => {
  //     const bbox = [-45, -45, 0, 0] as BBox2d;
  //     const poly = bboxPolygon(bbox);
  //
  //     const tiles = [];
  //     const gen = ranger.generateTiles(poly, 2);
  //     for (const tile of gen) {
  //       tiles.push(tile);
  //     }
  //
  //     const expectedTiles = [
  //       {
  //         x: 3,
  //         y: 1,
  //         zoom: 2,
  //       },
  //     ];
  //     expect(tiles).toEqual(expectedTiles);
  //   });
  //
  //   it('generates expected tiles from none bbox polygon', () => {
  //     const poly = polygon([
  //       [
  //         [-45, 0],
  //         [0, 45],
  //         [45, 0],
  //         [-45, 0],
  //       ],
  //     ]);
  //
  //     const tiles = [];
  //     const gen = ranger.generateTiles(poly, 2);
  //     for (const tile of gen) {
  //       tiles.push(tile);
  //     }
  //
  //     const expectedTiles = [
  //       {
  //         x: 3,
  //         y: 2,
  //         zoom: 2,
  //       },
  //       {
  //         x: 4,
  //         y: 2,
  //         zoom: 2,
  //       },
  //     ];
  //     expect(tiles).toEqual(expectedTiles);
  //   });
  // });
});
