import {
  boundingBoxToTileRange,
  expandBBoxToTileGrid,
  findMinimalZoom,
  geometryToTiles,
  lonLatZoomToTile,
  tileToBoundingBox,
  tileToTileRange,
  zoomShift,
} from '../src/tiles/tiles';
import {
  CRS_CRS84,
  SCALESET_GOOGLE_CRS84_QUAD_MODIFIED,
  TILEGRID_WEB_MERCATOR,
  TILEGRID_WORLD_CRS84,
} from '../src/tiles/tiles_constants';
import {BoundingBox, LonLat, Point, Polygon} from '../src/classes';
import {Tile, TileGrid, TileRange} from '../src/tiles/tiles_classes';
import {Zoom} from '../src/types';

const tileGridTests = [
  {
    testCaseName: 'bounding box max.lon is equal or larger than min.lon',
    expected: "bounding box's max.lon must be larger than min.lon",
    tileGrid: new TileGrid(
      'WorldCRS84Quad',
      'CRS84 for the World',
      new BoundingBox(90, -90, 90, 90),
      CRS_CRS84,
      SCALESET_GOOGLE_CRS84_QUAD_MODIFIED,
      2,
      1,
      256,
      256
    ),
  },
  {
    testCaseName: 'bounding box min.lat is equal or larger than max.lat',
    expected: "bounding box's max.lat must be larger than min.lat",
    tileGrid: new TileGrid(
      'WorldCRS84Quad',
      'CRS84 for the World',
      new BoundingBox(-90, 90, 90, 90),
      CRS_CRS84,
      SCALESET_GOOGLE_CRS84_QUAD_MODIFIED,
      2,
      1,
      256,
      256
    ),
  },
  {
    testCaseName:
      'well known scale set has equal or less than following zoom levels',
    expected:
      "scale set must have it's zoom levels ordered in ascending order and must be larger then the previous by 1",
    tileGrid: {
      ...TILEGRID_WORLD_CRS84,
      ...{
        wellKnownScaleSet: {
          identifier: 'test',
          scaleDenominators: new Map([
            [0, 15000],
            [2, 5000],
          ]),
        },
      },
    },
  },
  {
    testCaseName:
      'well known scale set has equal or less than following scales',
    expected:
      "scale set must have it's scales ordered in ascending order and must be larger then the previous",
    tileGrid: {
      ...TILEGRID_WORLD_CRS84,
      ...{
        wellKnownScaleSet: {
          identifier: 'test',
          scaleDenominators: new Map([
            [0, 5000],
            [1, 5000],
          ]),
        },
      },
    },
  },
  {
    testCaseName: 'number of tiles on the x axis at min zoom is less than 1',
    expected:
      'number of tiles on the x axis of a tile grid at the min zoom level must be at lmax.lon 1',
    tileGrid: {...TILEGRID_WORLD_CRS84, ...{numberOfMinLevelTilesX: 0}},
  },
  {
    testCaseName: 'number of tiles on the y axis at min zoom is less than 1',
    expected:
      'number of tiles on the y axis of a tile grid at the min zoom level must be at lmax.lon 1',
    tileGrid: {...TILEGRID_WORLD_CRS84, ...{numberOfMinLevelTilesY: 0}},
  },
  {
    testCaseName: 'tile width is less than 1',
    expected: 'tile width of a tile grid must be at lmax.lon 1',
    tileGrid: {...TILEGRID_WORLD_CRS84, ...{tileWidth: 0}},
  },
  {
    testCaseName: 'tile height is less than 1',
    expected: 'tile height of a tile grid must be at lmax.lon 1',
    tileGrid: {...TILEGRID_WORLD_CRS84, ...{tileHeight: 0}},
  },
];

describe('#boundingBoxToTiles', () => {
  it('should return a generator function which yields tiles inside the bounding box', () => {
    const bbox: BoundingBox = new BoundingBox(30, 30, 40, 40);
    const zoom: Zoom = 3;
    const expected = [new Tile(9, 2, 3, 1)];

    const tileRange = boundingBoxToTileRange(bbox, zoom);
    expect(tileRange.tiles()).toEqual(expected);
  });
  it('should return a generator function which yields tiles inside the bounding box with negative coordinates', () => {
    const bbox: BoundingBox = new BoundingBox(-40, -40, -30, -30);
    const zoom: Zoom = 3;
    const expected = [new Tile(6, 5, 3, 1)];
    const tileRange = boundingBoxToTileRange(bbox, zoom);
    expect(tileRange.tiles()).toEqual(expected);
  });
  it('should return a generator function which yields tiles inside the bounding box with non default metatile', () => {
    const bbox: BoundingBox = new BoundingBox(30, 30, 40, 40);
    const zoom: Zoom = 3;
    const metatile = 3;
    const expected = [new Tile(3, 0, 3, 3)];

    const tileRange = boundingBoxToTileRange(bbox, zoom, metatile);
    expect(tileRange.tiles()).toEqual(expected);
  });
  it('should return a generator function which yields tiles inside the bounding box with non default tile grid', () => {
    const bbox: BoundingBox = new BoundingBox(30, 30, 40, 40);
    const zoom: Zoom = 3;
    const tileGrid: TileGrid = TILEGRID_WEB_MERCATOR;
    const expected = [new Tile(4, 2, 3, 1)];

    const tileRange = boundingBoxToTileRange(bbox, zoom, undefined, tileGrid);
    expect(tileRange.tiles()).toEqual(expected);
  });
  it('should return a generator function which yields tiles inside the bounding box with non default tile grid & non default metatile', () => {
    const bbox: BoundingBox = new BoundingBox(30, 30, 40, 40);
    const zoom: Zoom = 3;
    const metatile = 3;
    const tileGrid: TileGrid = TILEGRID_WEB_MERCATOR;
    const expected = [new Tile(1, 0, 3, 3)];

    const tileRange = boundingBoxToTileRange(bbox, zoom, metatile, tileGrid);
    expect(tileRange.tiles()).toEqual(expected);
  });
  it("should throw an error when the given bounding box's max.lon value is more or equal to the min.lon value", () => {
    const bbox: BoundingBox = new BoundingBox(30, 30, 30, 40);
    const zoom: Zoom = 3;

    const badTilesGenerator = (): void => {
      boundingBoxToTileRange(bbox, zoom);
    };

    expect(badTilesGenerator).toThrow(
      Error("bounding box's max.lon must be larger than min.lon")
    );
  });
  it("should throw an error when the given bounding box's min.lat value is more or equal to the max.lat value", () => {
    const bbox: BoundingBox = new BoundingBox(30, 30, 40, 30);
    const zoom: Zoom = 3;

    const badTilesGenerator = (): void => {
      boundingBoxToTileRange(bbox, zoom);
    };

    expect(badTilesGenerator).toThrow(
      Error("bounding box's max.lat must be larger than min.lat")
    );
  });
  it("should throw an error when the given bounding box's min.lon value is less than tile grid's bounding box min.lon value", () => {
    const bbox: BoundingBox = new BoundingBox(-190, -30, 40, 30);
    const zoom: Zoom = 3;

    const badTilesGenerator = (): void => {
      boundingBoxToTileRange(bbox, zoom);
    };

    expect(badTilesGenerator).toThrow(
      RangeError("longitude -190 is out of range of tile grid's bounding box")
    );
  });
  it("should throw an error when the given bounding box's max.lon value is larger than tile grid's bounding box max.lon value", () => {
    const bbox: BoundingBox = new BoundingBox(30, -30, 190, 30);
    const zoom: Zoom = 3;

    const badTilesGenerator = (): void => {
      boundingBoxToTileRange(bbox, zoom);
    };

    expect(badTilesGenerator).toThrow(
      RangeError("longitude 190 is out of range of tile grid's bounding box")
    );
  });
  it("should throw an error when the given bounding box's min.lat value is less than tile grid's bounding box min.lat value", () => {
    const bbox: BoundingBox = new BoundingBox(30, -100, 40, 30);
    const zoom: Zoom = 3;

    const badTilesGenerator = (): void => {
      boundingBoxToTileRange(bbox, zoom);
    };

    expect(badTilesGenerator).toThrow(
      RangeError("latitude -100 is out of range of tile grid's bounding box")
    );
  });
  it("should throw an error when the given bounding box's max.lat value is larger than tile grid's bounding box max.lat value", () => {
    const bbox: BoundingBox = new BoundingBox(30, -30, 40, 100);
    const zoom: Zoom = 3;

    const badTilesGenerator = (): void => {
      boundingBoxToTileRange(bbox, zoom);
    };

    expect(badTilesGenerator).toThrow(
      RangeError("latitude 100 is out of range of tile grid's bounding box")
    );
  });

  it('should return the correct TileRange', () => {
    const boundingBox = new BoundingBox(-135, -45, -45, 45);
    const tileRange = boundingBoxToTileRange(boundingBox, 2);
    const expectedTileRange = new TileRange(1, 1, 2, 2, 2);
    expect(tileRange).toEqual(expectedTileRange);
  });
});

describe('Bad tile grid', () => {
  test.each(tileGridTests)(
    "should throw an error when the tile grid's $testCaseName",
    ({tileGrid, expected}) => {
      const badTilesGenerator = (): void => {
        const bbox: BoundingBox = new BoundingBox(30, 30, 40, 40);
        const zoom: Zoom = 3;

        boundingBoxToTileRange(bbox, zoom, undefined, tileGrid);
      };

      expect(badTilesGenerator).toThrow(new Error(expected));
    }
  );
});

describe('#zoomShift', () => {
  it('should return a shifted zoom level given a zoom level, reference tile grid & target tile grid', () => {
    const zoom: Zoom = 3;
    const referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84;
    const targetTileGrid: TileGrid = TILEGRID_WEB_MERCATOR;
    const expected = 3;

    const shiftedZoom = zoomShift(zoom, referenceTileGrid, targetTileGrid);

    expect(shiftedZoom).toEqual(expected);
  });
  it('should throw an error given a zoom level, reference tile grid & target tile grid when no match for scale denominator', () => {
    const zoom: Zoom = 3;
    const referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84;
    const targetTileGrid: TileGrid = {
      ...TILEGRID_WEB_MERCATOR,
      ...{
        wellKnownScaleSet: {
          identifier: 'badScaleSet',
          scaleDenominators: new Map([[0, 5000]]),
        },
      },
    };

    const badShiftedZoom = (): void => {
      zoomShift(zoom, referenceTileGrid, targetTileGrid);
    };

    expect(badShiftedZoom).toThrow(
      new Error('no matching target scale found for the given zoom level')
    );
  });
});

describe('#lonLatZoomToTile', () => {
  it('should return a tile for a given longitude, latitude & zoom', () => {
    const lonLat: LonLat = {lon: 30, lat: 30};
    const zoom: Zoom = 2;
    const expected: Tile = {x: 4, y: 1, z: 2, metatile: 1};

    const tile = lonLatZoomToTile(lonLat, zoom);

    expect(tile).toEqual(expected);
  });
  it('should return a tile for a given negative longitude, latitude & zoom', () => {
    const lonLat: LonLat = {lon: -30, lat: -30};
    const zoom: Zoom = 2;
    const expected: Tile = {x: 3, y: 2, z: 2, metatile: 1};

    const tile = lonLatZoomToTile(lonLat, zoom);

    expect(tile).toEqual(expected);
  });
  it('should return a tile for a given longitude, latitude & zoom with non default metatile', () => {
    const lonLat: LonLat = {lon: 30, lat: 30};
    const zoom: Zoom = 2;
    const metatile = 3;
    const expected: Tile = {x: 1, y: 0, z: 2, metatile: 3};

    const tile = lonLatZoomToTile(lonLat, zoom, metatile);

    expect(tile).toEqual(expected);
  });
  it('should return a tile for a given longitude, latitude & zoom with non default tile grid', () => {
    const lonLat: LonLat = {lon: 30, lat: 30};
    const zoom: Zoom = 2;
    const tileGrid: TileGrid = TILEGRID_WEB_MERCATOR;
    const expected: Tile = {x: 2, y: 1, z: 2, metatile: 1};

    const tile = lonLatZoomToTile(lonLat, zoom, undefined, tileGrid);

    expect(tile).toEqual(expected);
  });
  it('should return a tile for a given longitude, latitude & zoom with non default tile grid & non default metatile', () => {
    const lonLat: LonLat = {lon: 90, lat: 30};
    const zoom: Zoom = 2;
    const metatile = 3;
    const tileGrid: TileGrid = TILEGRID_WEB_MERCATOR;
    const expected: Tile = {x: 1, y: 0, z: 2, metatile: 3};

    const tile = lonLatZoomToTile(lonLat, zoom, metatile, tileGrid);

    expect(tile).toEqual(expected);
  });
  it("should return a tile when longitude is equal to tile grid's bounding box extent", () => {
    const lonLat: LonLat = {lon: 180, lat: 30};
    const zoom: Zoom = 2;
    const expected: Tile = {x: 7, y: 1, z: 2, metatile: 1};

    const tile = lonLatZoomToTile(lonLat, zoom);

    expect(tile).toEqual(expected);
  });
  it("should return a tile when latitude is equal to tile grid's bounding box extent", () => {
    const lonLat: LonLat = {lon: 30, lat: -90};
    const zoom: Zoom = 2;
    const expected: Tile = {x: 4, y: 3, z: 2, metatile: 1};

    const tile = lonLatZoomToTile(lonLat, zoom);

    expect(tile).toEqual(expected);
  });
  it("should throw an error when longitude is outside of tile grid's bounding box", () => {
    const lonLat: LonLat = {lon: -190, lat: 30};
    const zoom: Zoom = 0;

    const badLonLatZoomToTile = (): void => {
      lonLatZoomToTile(lonLat, zoom);
    };

    expect(badLonLatZoomToTile).toThrow(
      RangeError("longitude -190 is out of range of tile grid's bounding box")
    );
  });
  it("should throw an error when latitude is outside of tile grid's bounding box", () => {
    const lonLat: LonLat = {lon: 30, lat: 100};
    const zoom: Zoom = 0;

    const badLonLatZoomToTile = (): void => {
      lonLatZoomToTile(lonLat, zoom);
    };

    expect(badLonLatZoomToTile).toThrow(
      RangeError("latitude 100 is out of range of tile grid's bounding box")
    );
  });
  it("should throw an error when the zoom level is not part of zoom levels of tile grid's scale set", () => {
    const lonLat: LonLat = {lon: 30, lat: 30};
    const zoom: Zoom = 1.5;

    const badLonLatZoomToTile = (): void => {
      lonLatZoomToTile(lonLat, zoom);
    };

    expect(badLonLatZoomToTile).toThrow(
      Error('zoom level is not part of the given well known scale set')
    );
  });
  it('should throw an error when metatile is zero or less', () => {
    const lonLat: LonLat = {lon: 30, lat: 30};
    const zoom: Zoom = 0;
    const metatile = 0;

    const badLonLatZoomToTile = (): void => {
      lonLatZoomToTile(lonLat, zoom, metatile);
    };

    expect(badLonLatZoomToTile).toThrow(
      Error('metatile must be larger than 0')
    );
  });
  describe('Bad tile grid', () => {
    test.each(tileGridTests)(
      "should throw an error when the tile grid's $testCaseName",
      ({tileGrid, expected}) => {
        const badLonLatZoomToTile = (): void => {
          const lonLat: LonLat = {lon: 30, lat: 30};
          const zoom: Zoom = 0;

          lonLatZoomToTile(lonLat, zoom, undefined, tileGrid);
        };

        expect(badLonLatZoomToTile).toThrow(new Error(expected));
      }
    );
  });
});

describe('#tileToBoundingBox', () => {
  it('should return a bounding box for a given tile', () => {
    const tile: Tile = {x: 1, y: 1, z: 1};
    const expected: BoundingBox = new BoundingBox(-90, -90, 0, 0);

    const boundingBox = tileToBoundingBox(tile);

    expect(boundingBox).toEqual(expected);
  });
  it('should return a bounding box for a given tile which contains a metatile size that overrides the default', () => {
    const tile: Tile = {x: 1, y: 0, z: 1, metatile: 3};
    const expected: BoundingBox = new BoundingBox(90, -180, 360, 90);

    const boundingBox = tileToBoundingBox(tile);

    expect(boundingBox).toEqual(expected);
  });
  it('should return a bounding box for a given tile which contains a metatile size that overrides the default with clamping used', () => {
    const tile: Tile = {x: 1, y: 0, z: 1, metatile: 3};
    const expected: BoundingBox = new BoundingBox(90, -90, 180, 90);

    const boundingBox = tileToBoundingBox(tile, undefined, true);

    expect(boundingBox).toEqual(expected);
  });
  it('should return a bounding box for a given tile with non default tile grid', () => {
    const tile: Tile = {x: 0, y: 0, z: 0};
    const tileGrid: TileGrid = TILEGRID_WEB_MERCATOR;
    const expected: BoundingBox = new BoundingBox(
      TILEGRID_WEB_MERCATOR.boundingBox.min.lon,
      TILEGRID_WEB_MERCATOR.boundingBox.min.lat,
      TILEGRID_WEB_MERCATOR.boundingBox.max.lon,
      TILEGRID_WEB_MERCATOR.boundingBox.max.lat
    );

    const boundingBox = tileToBoundingBox(tile, tileGrid);

    expect(boundingBox).toEqual(expected);
  });
  it('should return a bounding box for a given tile with non default tile grid & non default metatile', () => {
    const tile: Tile = {x: 1, y: 0, z: 2, metatile: 3};
    const tileGrid: TileGrid = TILEGRID_WEB_MERCATOR;
    const expected: BoundingBox = new BoundingBox(
      90,
      -42.525564389903295,
      360,
      85.05112877980659
    );

    const boundingBox = tileToBoundingBox(tile, tileGrid);

    expect(boundingBox).toEqual(expected);
  });
  it('should return a bounding box for a given tile with non default tile grid & non default metatile & clamping used', () => {
    const tile: Tile = {x: 1, y: 0, z: 2, metatile: 3};
    const tileGrid: TileGrid = TILEGRID_WEB_MERCATOR;
    const expected: BoundingBox = new BoundingBox(
      90,
      -42.525564389903295,
      180,
      85.05112877980659
    );

    const boundingBox = tileToBoundingBox(tile, tileGrid, true);

    expect(boundingBox).toEqual(expected);
  });
  it("should throw an error when the tile's x index is outside of tile grid", () => {
    const tile: Tile = {x: 2, y: 1, z: 0};

    const badTileToBoundingBox = (): void => {
      tileToBoundingBox(tile);
    };

    expect(badTileToBoundingBox).toThrow(
      RangeError('x index out of range of tile grid')
    );
  });
  it("should throw an error when the tile's y index is outside of tile grid", () => {
    const tile: Tile = {x: 1, y: 1, z: 0};

    const badTileToBoundingBox = (): void => {
      tileToBoundingBox(tile);
    };

    expect(badTileToBoundingBox).toThrow(
      RangeError('y index out of range of tile grid')
    );
  });
  it("should throw an error when the tile's z index is not part of zoom levels of tile grid's scale set", () => {
    const tile: Tile = {x: 2, y: 1, z: 1.5};

    const badTileToBoundingBox = (): void => {
      tileToBoundingBox(tile);
    };

    expect(badTileToBoundingBox).toThrow(
      Error('zoom level is not part of the given well known scale set')
    );
  });
  it("should throw an error when the tile's x index is outside of tile grid because of large enough metatile", () => {
    const tile: Tile = {x: 1, y: 0, z: 0, metatile: 2};

    const badTileToBoundingBox = (): void => {
      tileToBoundingBox(tile);
    };

    expect(badTileToBoundingBox).toThrow(
      RangeError('x index out of range of tile grid')
    );
  });
  it("should throw an error when the tile's y index is outside of tile grid because of large enough metatile", () => {
    const tile: Tile = {x: 0, y: 1, z: 0, metatile: 2};

    const badTileToBoundingBox = (): void => {
      tileToBoundingBox(tile);
    };

    expect(badTileToBoundingBox).toThrow(
      RangeError('y index out of range of tile grid')
    );
  });
  it('should throw an error when metatile is zero or less', () => {
    const tile: Tile = {x: 0, y: 0, z: 0, metatile: 0};

    const badTileToBoundingBox = (): void => {
      tileToBoundingBox(tile);
    };

    expect(badTileToBoundingBox).toThrow(
      new Error('metatile must be larger than 0')
    );
  });
  describe('Bad tile grid', () => {
    test.each(tileGridTests)(
      "should throw an error when the tile grid's $testCaseName",
      ({tileGrid, expected}) => {
        const badTileToBoundingBox = (): void => {
          const tile = {x: 0, y: 0, z: 0};

          tileToBoundingBox(tile, tileGrid);
        };

        expect(badTileToBoundingBox).toThrow(new Error(expected));
      }
    );
  });
});
describe('tileToRange', () => {
  it('create range with same zoom', () => {
    const tile = new Tile(1, 1, 2);

    const range = tileToTileRange(tile, 2);
    const expectedRange = new TileRange(1, 1, 1, 1, 2);
    expect(range).toEqual(expectedRange);
  });

  it('create range with higher zoom one level up', () => {
    const tile = new Tile(1, 1, 1);
    const range = tileToTileRange(tile, 2);

    const expectedRange = new TileRange(2, 2, 3, 3, 2);
    expect(range).toEqual(expectedRange);
  });

  it('throws error when target zoom level is lower than tile zoom', () => {
    const tile = new Tile(1, 1, 1);

    const badTileToTileRange = (): void => {
      tileToTileRange(tile, 0);
    };

    expect(badTileToTileRange).toThrow();
  });

  it('create range with higher zoom in more than one level', () => {
    const tile = new Tile(0, 0, 0, 1);
    const range = tileToTileRange(tile, 2);

    const expectedRange = new TileRange(0, 0, 3, 3, 2);
    expect(range).toEqual(expectedRange);
  });
});

describe('Snap a bounding box to tile grid', () => {
  it('should get a bounding box smaller than the grid tiles and enlarge it to the grid', () => {
    const boundingBox = new BoundingBox(-110, -35, -50, 35);
    const snappedBoundingBox = expandBBoxToTileGrid(boundingBox, 2);

    const expectedBoundingBox = new BoundingBox(-135, -45, -45, 45);
    expect(snappedBoundingBox).toEqual(expectedBoundingBox);
  });

  it('should get a bounding box smaller than the grid tiles and enlarge it to the grid', () => {
    const boundingBox = new BoundingBox(50, -85, 125, -15);
    const snappedBoundingBox = expandBBoxToTileGrid(boundingBox, 2);

    const expectedBoundingBox = new BoundingBox(45, -90, 135, 0);
    expect(snappedBoundingBox).toEqual(expectedBoundingBox);
  });

  it('Bounding boxes is the same before and after snapping', () => {
    const boundingBox = new BoundingBox(-135, -45, -45, 45);
    const snappedBoundingBox = expandBBoxToTileGrid(boundingBox, 2);
    const expectedBoundingBox = new BoundingBox(-135, -45, -45, 45);
    expect(snappedBoundingBox).toEqual(expectedBoundingBox);
  });
});

describe('Find minimal zoom that can contain bounding box in one tile', () => {
  it('should return correct zoom starting at zoom 2 and moving to 1', () => {
    const boundingBox = new BoundingBox(-135, -45, -45, 45);
    const minimalZoom = findMinimalZoom(boundingBox);
    const expectedZoom = 1;
    expect(minimalZoom).toEqual(expectedZoom);
  });

  it('should return correct zoom', () => {
    const boundingBox = new BoundingBox(10, 10, 30, 30);
    const minimalZoom = findMinimalZoom(boundingBox);
    const expectedZoom = 3;
    expect(minimalZoom).toEqual(expectedZoom);
  });

  it('Small bounding box located on the edge of minimal tiles should go one level up', () => {
    const boundingBox = new BoundingBox(-100, -60, -45, -5);
    const minimalZoom = findMinimalZoom(boundingBox);
    const expectedZoom = 1;
    expect(minimalZoom).toEqual(expectedZoom);
  });
});

describe('#geometryToTiles', () => {
  it('generates expected tiles from bbox', () => {
    const boundingBox = new BoundingBox(-45, -45, 0, 0);
    const tileRanges = geometryToTiles(boundingBox, 2);
    const expectedTiles = [new Tile(3, 2, 2, 1)];
    const tiles = tileRanges.flatMap(tileRange => tileRange.tiles());
    expect(tiles).toEqual(expectedTiles);
  });

  it('generates expected tiles from none bbox polygon', () => {
    // this is a polygon of a triangle
    const polygon = new Polygon([
      new Point(-45, 0),
      new Point(0, 45),
      new Point(45, 0),
      new Point(-45, 0),
    ]);

    const tileRanges = geometryToTiles(polygon, 2);
    const tiles = tileRanges.flatMap(tileRange => tileRange.tiles());
    const expectedTiles = [new Tile(3, 1, 2, 1), new Tile(4, 1, 2, 1)];

    expect(tiles).toEqual(expect.arrayContaining(expectedTiles));
  });

  it('generates expected tiles from none bbox polygon in higher zoom', () => {
    // this is a polygon of a triangle
    const polygon = new Polygon([
      new Point(-45, 0),
      new Point(0, 45),
      new Point(45, 0),
      new Point(-45, 0),
    ]);

    const tileRanges = geometryToTiles(polygon, 3);
    const expectedTileRanges = [
      new TileRange(7, 2, 7, 2, 3),
      new TileRange(7, 3, 7, 3, 3),
      new TileRange(8, 2, 8, 2, 3),
      new TileRange(8, 3, 8, 3, 3),
      new TileRange(6, 3, 6, 3, 3),
      new TileRange(9, 3, 9, 3, 3),
    ];

    expect(tileRanges).toEqual(expect.arrayContaining(expectedTileRanges));
  });

  // it('generates expected tiles from none bbox polygon in higher zoom', () => {
  //   // this is a polygon of a triangle
  //   const polygon = new Polygon([
  //     new Point(-45, 0),
  //     new Point(0, 45),
  //     new Point(45, 0),
  //     new Point(-45, 0),
  //   ]);
  //
  //   const tileRanges = geometryToTiles(polygon, 5);
  //   const expectedTileRanges = [
  //     new TileRange(24, 16, 25, 17, 5),
  //     new TileRange(25, 16, 26, 17, 5),
  //     new TileRange(25, 17, 26, 18, 5),
  //     new TileRange(26, 16, 28, 18, 5),
  //     new TileRange(26, 18, 27, 19, 5),
  //     new TileRange(27, 18, 28, 19, 5),
  //     new TileRange(27, 19, 28, 20, 5),
  //     new TileRange(28, 16, 32, 20, 5),
  //     new TileRange(28, 20, 29, 21, 5),
  //     new TileRange(29, 20, 30, 21, 5),
  //     new TileRange(29, 21, 30, 22, 5),
  //     new TileRange(30, 20, 32, 22, 5),
  //     new TileRange(30, 22, 31, 23, 5),
  //     new TileRange(31, 22, 32, 23, 5),
  //     new TileRange(31, 23, 32, 24, 5),
  //     new TileRange(32, 16, 36, 20, 5),
  //     new TileRange(32, 20, 34, 22, 5),
  //     new TileRange(32, 22, 33, 23, 5),
  //     new TileRange(32, 23, 33, 24, 5),
  //     new TileRange(33, 22, 34, 23, 5),
  //     new TileRange(34, 20, 35, 21, 5),
  //     new TileRange(34, 21, 35, 22, 5),
  //     new TileRange(35, 20, 36, 21, 5),
  //     new TileRange(36, 16, 38, 18, 5),
  //     new TileRange(36, 19, 37, 20, 5),
  //     new TileRange(36, 18, 37, 19, 5),
  //     new TileRange(37, 18, 38, 19, 5),
  //     new TileRange(38, 16, 39, 17, 5),
  //     new TileRange(38, 17, 39, 18, 5),
  //     new TileRange(39, 16, 40, 17, 5),
  //   ];
  //
  //   expect(tileRanges).toEqual(expect.arrayContaining(expectedTileRanges));
  // });

  it('Should return a list of tiles for polygon in a specific zoom', () => {
    // Polygon looks like a house
    const polygon = new Polygon([
      new Point(-90, -90),
      new Point(90, -90),
      new Point(90, 0),
      new Point(0, 45),
      new Point(-90, 0),
      new Point(-90, -90),
    ]);
    const tileRanges = geometryToTiles(polygon, 2);
    const expectedTiles = [
      new Tile(2, 1, 2, 1),
      new Tile(3, 1, 2, 1),
      new Tile(4, 1, 2, 1),
      new Tile(5, 1, 2, 1),
      new Tile(2, 2, 2, 1),
      new Tile(3, 2, 2, 1),
      new Tile(4, 2, 2, 1),
      new Tile(5, 2, 2, 1),
      new Tile(2, 3, 2, 1),
      new Tile(3, 3, 2, 1),
      new Tile(4, 3, 2, 1),
      new Tile(5, 3, 2, 1),
    ];

    const tiles = tileRanges.flatMap(tileRange => tileRange.tiles());
    expect(tiles).toEqual(expect.arrayContaining(expectedTiles));
  });

  it("should take minimal zoom even if the polygon is small", () => {

    const polygon = new Polygon([
      new Point(34.80117503043931, 31.72186022095839),
      new Point(34.72650598377592, 31.687080518522365),
      new Point(34.73943749465019, 31.660099528252445),
      new Point(34.75654046064636, 31.660454592172286),
      new Point(34.77239199010512, 31.679626028688716),
      new Point(34.75278615103656, 31.685305694287223),
      new Point(34.77197484459302, 31.690630065179775),
      new Point(34.77239199010512, 31.69985825112292),
      new Point(34.80117503043931, 31.72186022095839),
    ]);
    // Polygon bounding box is smaller than the minimal zoom (in this example this bounding box
    // size match zoom 11,but we ask here to parse in zoom 10, so we need to make sure to take the smallest of the two.
    const tileRanges = geometryToTiles(polygon, 10);
    expect(tileRanges.length).toEqual(1);
  });

  it('Should return a list of tiles for polygon in a specific zoom', () => {
    // Polygon looks like a house
    const polygon = new Polygon([
      new Point(34.80117503043931, 31.72186022095839),
      new Point(34.72650598377592, 31.687080518522365),
      new Point(34.73943749465019, 31.660099528252445),
      new Point(34.75654046064636, 31.660454592172286),
      new Point(34.77239199010512, 31.679626028688716),
      new Point(34.75278615103656, 31.685305694287223),
      new Point(34.77197484459302, 31.690630065179775),
      new Point(34.77239199010512, 31.69985825112292),
      new Point(34.80117503043931, 31.72186022095839),
    ]);
    const tileRanges = geometryToTiles(polygon, 18);

    expect(tileRanges.length).toEqual(807);
  });
});
