/// <reference types="jest-extended" />
import { deepStrictEqual } from 'node:assert/strict';
import { fc, it } from '@fast-check/jest';
import type { BBox, Position } from 'geojson';
import { SUPPORTED_CRS } from '../../src/constants';
import { Point } from '../../src/geometries/point';
import { TileMatrixSet } from '../../src/tiles/tileMatrixSet';
import { TILEMATRIXSETJSON_WORLD_CRS84_QUAD } from '../../src/tiles/tileMatrixSets/worldCRS84Quad';
import type { TileMatrixId, TileMatrixLimits, TileMatrixSetJSON, TileMatrixSet as TileMatrixSetType } from '../../src/tiles/types';
import { generatePointCoordinates } from './helpers/geometry';

const tileMatrixSetJSONs = [TILEMATRIXSETJSON_WORLD_CRS84_QUAD];

const nonFinite = (): fc.Arbitrary<number> =>
  fc.oneof(fc.constant(Number.NaN), fc.constant(Number.POSITIVE_INFINITY), fc.constant(Number.NEGATIVE_INFINITY));

describe('Point', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#constructor', () => {
    it('should successfully construct a point class instance', () => {
      const east = fc.double({ noDefaultInfinity: true, noNaN: true });
      const north = fc.double({ noDefaultInfinity: true, noNaN: true });
      const coordinates = fc.tuple(east, north);
      const bbox = fc.option(fc.tuple(east, north, east, north), { nil: undefined });
      const coordRefSys = fc.option(fc.constantFrom(...SUPPORTED_CRS), { nil: undefined });
      const arbitraries = [coordinates, bbox, coordRefSys] as const;
      const predicate = (coordinates: Position, bbox?: BBox, coordRefSys?: TileMatrixSetJSON['crs']) => {
        const point = new Point({
          coordinates,
          bbox,
          coordRefSys,
        });
        expect(point).toBeInstanceOf(Point);
      };
      fc.assert(fc.property(...arbitraries, predicate));
    });

    it("should throw an error when geometry's bounding box bounds are not finite or are NaN", () => {
      const coordinates = fc.oneof(fc.tuple(fc.double(), nonFinite()), fc.tuple(nonFinite(), fc.double()), fc.tuple(nonFinite(), nonFinite()));
      const bbox = fc.option(
        coordinates.chain(([east, north]) => {
          return fc.tuple(fc.constant(east), fc.constant(north), fc.constant(east), fc.constant(north));
        }),
        { nil: undefined }
      );
      const coordRefSys = fc.option(fc.constantFrom(...SUPPORTED_CRS), { nil: undefined });
      const arbitraries = [coordinates, bbox, coordRefSys] as const;
      const predicate = (coordinates: Position, bbox?: BBox, coordRefSys?: TileMatrixSetJSON['crs']) => {
        expect(
          () =>
            new Point({
              coordinates,
              bbox,
              coordRefSys,
            })
        ).toThrow(new Error('bounding box elements must be finite numbers that are neither infinite nor NaN'));
      };
      fc.assert(fc.property(...arbitraries, predicate));
    });
  });

  describe('#toTileMatrixLimits', () => {
    it('should yield a tile matrix limits only once and then complete', () => {
      const tileMatrixSetJSON = fc.constantFrom(...tileMatrixSetJSONs);
      const tileMatrixId = tileMatrixSetJSON.chain((tileMatrixSetJSON) =>
        fc.constantFrom(...tileMatrixSetJSON.tileMatrices.map((tileMatrixJSON) => tileMatrixJSON.id))
      );
      const metatile = fc.integer({ min: 1 });
      const arbitraries = [tileMatrixSetJSON, tileMatrixId, metatile] as const;
      const predicate = (tileMatrixSetJSON: TileMatrixSetJSON, tileMatrixId: TileMatrixId<TileMatrixSet>, metatile: number) => {
        const tileMatrixSet = new TileMatrixSet(tileMatrixSetJSON);
        const point = new Point({
          coordinates: generatePointCoordinates(),
          coordRefSys: tileMatrixSetJSON.crs,
        });

        const generator = point.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);
        const iterResult = generator.next();

        expect(iterResult.value).toEqual(
          expect.objectContaining<TileMatrixLimits<TileMatrixSetType>>({
            tileMatrixId: expect.any(String) as string,
            minTileRow: expect.any(Number) as number,
            maxTileRow: expect.any(Number) as number,
            minTileCol: expect.any(Number) as number,
            maxTileCol: expect.any(Number) as number,
          })
        );
        expect(iterResult.value).toContainAllKeys<TileMatrixLimits<TileMatrixSetType>>([
          'tileMatrixId',
          'minTileRow',
          'maxTileRow',
          'minTileCol',
          'maxTileCol',
        ]);

        const isSafeNaturalInteger = (value: number): boolean => Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER;
        expect(iterResult.value).toSatisfy<TileMatrixLimits<TileMatrixSet> | undefined>(
          (value) =>
            value !== undefined &&
            isSafeNaturalInteger(value.minTileCol) &&
            isSafeNaturalInteger(value.maxTileCol) &&
            isSafeNaturalInteger(value.minTileRow) &&
            isSafeNaturalInteger(value.maxTileRow)
        );

        expect(generator.next().done).toBeTruthy();
      };
      fc.assert(fc.property(...arbitraries, predicate));
    });

    it('should throw an error if metatile is not an integer equal to or larger than 1', () => {
      const tileMatrixSetJSON = fc.constantFrom(...tileMatrixSetJSONs);
      const tileMatrixId = fc.string();
      const metatile = fc.double().filter((number) => !(Number.isSafeInteger(number) && number >= 1));
      const arbitraries = [tileMatrixSetJSON, tileMatrixId, metatile] as const;
      const predicate = (tileMatrixSetJSON: TileMatrixSetJSON, tileMatrixId: TileMatrixId<TileMatrixSet>, metatile: number) => {
        const tileMatrixSet = new TileMatrixSet(tileMatrixSetJSON);
        const point = new Point({
          coordinates: generatePointCoordinates(),
          coordRefSys: tileMatrixSetJSON.crs,
        });

        const generator = point.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);
        expect(() => {
          generator.next();
        }).toThrow(new Error('metatile must be an integer with a value of at least 1'));
      };
      fc.assert(fc.property(...arbitraries, predicate));
    });

    it('should throw an error if CRS of geometry does not match tile matrix set CRS', () => {
      const originTileMatrixSetJSON = fc.constantFrom(...tileMatrixSetJSONs);
      const crs = fc.option(
        originTileMatrixSetJSON.map((tileMatrixSetJSON) => tileMatrixSetJSON.crs),
        { nil: undefined }
      );
      const tileMatrixSetJSON = originTileMatrixSetJSON.chain((tileMatrixSetJSON) =>
        fc
          .oneof(fc.string(), fc.record({ uri: fc.string() }), fc.record({ referenceSystem: fc.object() }), fc.record({ wkt: fc.object() }))
          .filter((crs) => {
            try {
              deepStrictEqual(crs, tileMatrixSetJSON.crs);
            } catch (err) {
              return true;
            }
            return false;
          })
          .chain((crs) => {
            return fc.constant({ ...tileMatrixSetJSON, ...{ crs } });
          })
      );
      const tileMatrixId = fc.string();
      const metatile = fc.integer({ min: 1 });
      const arbitraries = [tileMatrixSetJSON, tileMatrixId, metatile, crs] as const;
      const predicate = (
        tileMatrixSetJSON: TileMatrixSetJSON,
        tileMatrixId: TileMatrixId<TileMatrixSet>,
        metatile: number,
        crs?: TileMatrixSetJSON['crs']
      ) => {
        const tileMatrixSet = new TileMatrixSet(tileMatrixSetJSON);

        const point = new Point({
          coordinates: generatePointCoordinates(),
          coordRefSys: crs,
        });

        const generator = point.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);
        expect(() => {
          generator.next();
        }).toThrow(new Error("geometry's and tile matrix set's CRS do not match"));
      };
      fc.assert(fc.property(...arbitraries, predicate));
    });

    it('should throw an error if tile matrix identifier is not part of tile matrix set', () => {
      const tileMatrixSetJSON = fc.constantFrom(...tileMatrixSetJSONs);
      const tileMatrixId = tileMatrixSetJSON.chain((tileMatrixSetJSON) =>
        fc.string().filter((identifier) => !tileMatrixSetJSON.tileMatrices.map((tileMatrixJSON) => tileMatrixJSON.id).includes(identifier))
      );
      const metatile = fc.integer({ min: 1 });
      const arbitraries = [tileMatrixSetJSON, tileMatrixId, metatile] as const;
      const predicate = (tileMatrixSetJSON: TileMatrixSetJSON, tileMatrixId: TileMatrixId<TileMatrixSet>, metatile: number) => {
        const tileMatrixSet = new TileMatrixSet(tileMatrixSetJSON);
        const point = new Point({
          coordinates: generatePointCoordinates(),
          coordRefSys: tileMatrixSetJSON.crs,
        });

        const generator = point.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);
        expect(() => {
          generator.next();
        }).toThrow(new Error('tile matrix id is not part of the given tile matrix set'));
      };
      fc.assert(fc.property(...arbitraries, predicate));
    });
  });
});
