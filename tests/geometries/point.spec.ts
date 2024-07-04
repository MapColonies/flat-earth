/// <reference types="jest-extended" />
import { deepStrictEqual } from 'node:assert/strict';
import { fc, it } from '@fast-check/jest';
import { Point } from '../../src/geometries/point';
import type { GeoJSONPoint, PointInput } from '../../src/geometries/types';
import { TileMatrixSet } from '../../src/tiles/tileMatrixSet';
import { TILEMATRIXSETJSON_WORLD_CRS84_QUAD } from '../../src/tiles/tileMatrixSets/worldCRS84Quad';
import { tileMatrixToBBox } from '../../src/tiles/tiles';
import type { TileMatrixLimits, TileMatrixSetJSON, TileMatrixSet as TileMatrixSetType } from '../../src/tiles/types';
import { generatePointInput } from './helpers/geometries';
import { generateNonFinite, isSafeInteger } from './helpers/propertyTest';
import { generateTileMatrixToBBox } from './helpers/tiles';
import {
  BadConstructorTestCase,
  BadToTileMatrixLimitsTestCase,
  ConstructorTestCase,
  ToTileMatrixLimitsTestCase,
  type ToTileMatrixLimitsArgs,
} from './helpers/types';

const tileMatrixSetJSONs = [TILEMATRIXSETJSON_WORLD_CRS84_QUAD];

const mockSupportedCRSGetter = jest.fn<TileMatrixSetJSON['crs'][] | undefined, unknown[]>().mockReturnValue(undefined);
jest.mock('../../src/constants', () => {
  const originalModule = jest.requireActual<typeof import('../../src/constants')>('../../src/constants');
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __esModule: true,
    ...originalModule,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    get SUPPORTED_CRS(): TileMatrixSetJSON['crs'][] {
      return mockSupportedCRSGetter() ?? originalModule.SUPPORTED_CRS;
    },
  };
});

describe('Point', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('#constructor', () => {
    const wktCircular: Record<string | number | symbol, unknown> = {};
    wktCircular.a = wktCircular;

    const testCases: ConstructorTestCase<GeoJSONPoint>[] = [
      {
        case: 'for a point',
        coordinates: [180, -90],
      },
    ];

    // TODO: add input geometry validation tests once validations for input geometry are imlpemented
    const badTestCases: BadConstructorTestCase<GeoJSONPoint>[] = [
      {
        case: 'for a coordiante with non-finite values',
        coordinates: [Infinity, -Infinity],
        expected: new Error("geometry's positions must consist of finite numbers that are neither infinite nor NaN"),
      },
      {
        case: 'for a coordiante with NaN values',
        coordinates: [NaN, -NaN],
        expected: new Error("geometry's positions must consist of finite numbers that are neither infinite nor NaN"),
      },
      {
        case: 'for an unsupported CRS',
        coordinates: [0, 0],
        coordRefSys: 'badCRS',
        expected: new Error('unsupported CRS'),
      },
      {
        case: 'for an un-stringifiable defined with bigint',
        coordinates: [0, 0],
        coordRefSys: {
          wkt: {
            a: 9007199254740991n,
          },
        },
        expected: new TypeError('Do not know how to serialize a BigInt'),
        mock: () => {
          mockSupportedCRSGetter.mockReturnValue([
            {
              wkt: {
                a: 9007199254740991n,
              },
            },
          ]);
        },
      },
      {
        case: 'for an un-stringifiable defined with a circular reference',
        coordinates: [0, 0],
        coordRefSys: {
          wkt: {
            wktCircular,
          },
        },
        expected: new TypeError(`Converting circular structure to JSON
    --> starting at object with constructor 'Object'
    --- property 'a' closes the circle`),
        mock: () => {
          const wktCircular: Record<string | number | symbol, unknown> = {};
          wktCircular.a = wktCircular;
          mockSupportedCRSGetter.mockReturnValue([
            {
              wkt: {
                wktCircular,
              },
            },
          ]);
        },
      },
    ];

    it.each(testCases)('should construct a point class instance $case', ({ coordinates, coordRefSys }) => {
      const point = new Point({ coordinates, coordRefSys });

      expect(point).toBeInstanceOf(Point);
    });

    it.each(badTestCases)('should throw an error $case', ({ coordinates, coordRefSys, expected, mock }) => {
      mock?.();
      expect(() => new Point({ coordinates, coordRefSys })).toThrow(expected);
    });

    describe('#property-test', () => {
      let pointInput: fc.Arbitrary<PointInput>;
      beforeAll(() => {
        pointInput = generatePointInput();
      });

      it('should construct a point class instance', () => {
        const arbitraries = [pointInput] as const;
        const predicate = (pointInput: PointInput) => {
          const point = new Point(pointInput);

          expect(point).toBeInstanceOf(Point);
        };
        fc.assert(fc.property(...arbitraries, predicate));
      });

      it("should throw an error when geometry's coordinates are not finite or are NaN", () => {
        const badCoordinates = fc.oneof(
          fc.tuple(fc.float({ noNaN: true }), generateNonFinite()),
          fc.tuple(generateNonFinite(), fc.float({ noNaN: true })),
          fc.tuple(generateNonFinite(), generateNonFinite())
        );
        const pointInput = generatePointInput({ coordinates: badCoordinates });
        const arbitraries = [pointInput] as const;
        const predicate = (pointInput: PointInput) => {
          expect(() => new Point(pointInput)).toThrow(
            new Error("geometry's positions must consist of finite numbers that are neither infinite nor NaN")
          );
        };
        fc.assert(fc.property(...arbitraries, predicate));
      });
    });
  });

  describe('#toTileMatrixLimits', () => {
    const testCases: ToTileMatrixLimitsTestCase<GeoJSONPoint>[] = [
      {
        case: 'for a point on the tile matrix bounding box with low scale tile matrix',
        coordinates: [180, -90],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: {
          minTileCol: 1,
          minTileRow: 0,
          maxTileCol: 1,
          maxTileRow: 0,
          tileMatrixId: '0',
        },
      },
      {
        case: 'for a point on the tile matrix bounding box with low scale tile matrix with non-default metatile (2)',
        coordinates: [180, -90],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        metatile: 2,
        expected: {
          minTileCol: 0,
          minTileRow: 0,
          maxTileCol: 0,
          maxTileRow: 0,
          tileMatrixId: '0',
        },
      },
      {
        case: 'for a point on the tile matrix bounding box with high scale tile matrix',
        coordinates: [179.9999999999868, -89.9999999999934],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        expected: {
          minTileCol: 16777215,
          minTileRow: 8388607,
          maxTileCol: 16777215,
          maxTileRow: 8388607,
          tileMatrixId: '23',
        },
      },
      {
        case: 'for a point on the tile matrix bounding box with high scale tile matrix with non-default metatile (2)',
        coordinates: [179.9999999999868, -89.9999999999934],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        metatile: 2,
        expected: {
          minTileCol: 8388607,
          minTileRow: 4194303,
          maxTileCol: 8388607,
          maxTileRow: 4194303,
          tileMatrixId: '23',
        },
      },
      {
        case: 'for a point on the tile matrix origin with low scale tile matrix',
        coordinates: [-180, 90],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: {
          minTileCol: 0,
          minTileRow: 0,
          maxTileCol: 0,
          maxTileRow: 0,
          tileMatrixId: '0',
        },
      },
      {
        case: 'for a point on the tile matrix origin with low scale tile matrix with non-default metatile (2)',
        coordinates: [-180, 90],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        metatile: 2,
        expected: {
          minTileCol: 0,
          minTileRow: 0,
          maxTileCol: 0,
          maxTileRow: 0,
          tileMatrixId: '0',
        },
      },
      {
        case: 'for a point on the tile matrix origin with high scale tile matrix',
        coordinates: [-180, 90],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        expected: {
          minTileCol: 0,
          minTileRow: 0,
          maxTileCol: 0,
          maxTileRow: 0,
          tileMatrixId: '23',
        },
      },
      {
        case: 'for a point on the tile matrix origin with high scale tile matrix with non-default metatile (2)',
        coordinates: [-180, 90],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        metatile: 2,
        expected: {
          minTileCol: 0,
          minTileRow: 0,
          maxTileCol: 0,
          maxTileRow: 0,
          tileMatrixId: '23',
        },
      },
      {
        case: 'for a point in the center of the tile matrix bounding box with low scale tile matrix',
        coordinates: [0, 0],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: {
          minTileCol: 1,
          minTileRow: 0,
          maxTileCol: 1,
          maxTileRow: 0,
          tileMatrixId: '0',
        },
      },
      {
        case: 'for a point in the center of the tile matrix bounding box with low scale tile matrix with non-default metatile (2)',
        coordinates: [0, 0],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        metatile: 2,
        expected: {
          minTileCol: 0,
          minTileRow: 0,
          maxTileCol: 0,
          maxTileRow: 0,
          tileMatrixId: '0',
        },
      },
      {
        case: 'for a point in the center of the tile matrix bounding box with high scale tile matrix',
        coordinates: [0, 0],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        expected: {
          minTileCol: 8388608,
          minTileRow: 4194304,
          maxTileCol: 8388608,
          maxTileRow: 4194304,
          tileMatrixId: '23',
        },
      },
      {
        case: 'for a point in the center of the tile matrix bounding box with high scale tile matrix with non-default metatile (2)',
        coordinates: [0, 0],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        metatile: 2,
        expected: {
          minTileCol: 4194304,
          minTileRow: 2097152,
          maxTileCol: 4194304,
          maxTileRow: 2097152,
          tileMatrixId: '23',
        },
      },
    ];

    const badTestCases: BadToTileMatrixLimitsTestCase<GeoJSONPoint>[] = [
      {
        case: 'for a non integer positive metatile',
        coordinates: [180.1, -90.1],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        metatile: 0.5,
        expected: new Error('metatile must be an integer with a value of at least 1'),
      },
      {
        case: 'for a non identical CRS between geometry and tile matrix',
        coordinates: [180.1, -90.1],
        coordRefSys: 'http://www.opengis.net/def/crs/OGC/0/CRS84',
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: new Error('CRS mismatch'),
      },
      {
        case: 'for a tile matrix identifier not found inside the available tile matrices',
        coordinates: [180.1, -90.1],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '24',
        expected: new Error('tile matrix id is not part of the given tile matrix set'),
      },
      {
        case: 'for a point outside the tile matrix bounding box with low scale tile matrix',
        coordinates: [180.1, -90],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: new RangeError('point out of bounds of tile matrix 0 on east axis. bounds: [-180,180], east value: 180.1'),
      },
      {
        case: 'for a point outside the tile matrix bounding box with low scale tile matrix',
        coordinates: [180, -90.1],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: new RangeError('point out of bounds of tile matrix 0 on north axis. bounds: [-90,90], north value: -90.1'),
      },
      {
        case: 'for a point outside the tile matrix bounding box with low scale tile matrix',
        coordinates: [-180.1, 90],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: new RangeError('point out of bounds of tile matrix 0 on east axis. bounds: [-180,180], east value: -180.1'),
      },
      {
        case: 'for a point outside the tile matrix bounding box with low scale tile matrix',
        coordinates: [-180, 90.1],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: new RangeError('point out of bounds of tile matrix 0 on north axis. bounds: [-90,90], north value: 90.1'),
      },
      {
        case: 'for a point outside the tile matrix bounding box with low scale tile matrix with non-default metatile (2)',
        coordinates: [180.1, -90.1],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        metatile: 2,
        expected: new RangeError('point out of bounds of tile matrix 0 on east axis. bounds: [-180,180], east value: 180.1'),
      },
      {
        case: 'for a point outside the tile matrix bounding box with high scale tile matrix',
        coordinates: [180, 90],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        expected: new RangeError('point out of bounds of tile matrix 23 on east axis. bounds: [-180,179.9999999999868], east value: 180'),
      },
      {
        case: 'for a point outside the tile matrix bounding box with high scale tile matrix',
        coordinates: [179.9999999999868, -90],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        expected: new RangeError('point out of bounds of tile matrix 23 on north axis. bounds: [-89.9999999999934,90], north value: -90'),
      },
    ];

    it.each(testCases)(
      'should yield a tile matrix limits for tiles intersected by the point only once and then complete $case',
      ({ coordinates, coordRefSys, tileMatrixSetJSON, tileMatrixId, metatile, expected }) => {
        const point = new Point({ coordinates, coordRefSys: coordRefSys ?? tileMatrixSetJSON.crs });
        const tileMatrixSet = new TileMatrixSet(tileMatrixSetJSON);

        const generator = point.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);
        const iterResult = generator.next();
        const value = iterResult.value;

        expect(value).toStrictEqual(expected);

        expect(generator.next().done).toBeTruthy();
      }
    );

    it.each(badTestCases)('should throw an error $case', ({ coordinates, coordRefSys, tileMatrixSetJSON, tileMatrixId, metatile, expected }) => {
      const point = new Point({ coordinates, coordRefSys: coordRefSys ?? tileMatrixSetJSON.crs });
      const tileMatrixSet = new TileMatrixSet(tileMatrixSetJSON);

      const generator = point.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);
      expect(() => {
        generator.next();
      }).toThrow(expected);

      expect(generator.next().done).toBeTruthy();
    });

    describe('#property-test', () => {
      // const toTileMatrixLimitsArgs2 = toTileMatrixLimitsArgsGenerator<Point, PointInput>(tileMatrixSetJSONs, generatePointInput, Point);
      const toTileMatrixLimitsArgs = fc
        .constantFrom(...tileMatrixSetJSONs)
        .map((tileMatrixSetJSON) => {
          return {
            tileMatrixSetJSON,
            tileMatrixId: fc.constantFrom(...tileMatrixSetJSON.tileMatrices.map((tileMatrixJSON) => tileMatrixJSON.id)),
          };
        })
        .chain(({ tileMatrixId, tileMatrixSetJSON }) => {
          const tileMatrixSet = new TileMatrixSet(tileMatrixSetJSON);
          const bBox = tileMatrixId.map((tileMatrixId) => {
            const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
            if (!tileMatrix) {
              throw new Error('tile matrix id is not part of the given tile matrix set');
            }
            return tileMatrixToBBox(tileMatrix);
          });

          return fc.record({
            tileMatrixId,
            tileMatrixSet: fc.constant(tileMatrixSet),
            metatile: fc.integer({ min: 1 }),
            geometry: generatePointInput({ bBox }).chain((pointInput) =>
              fc.constant(new Point({ ...pointInput, ...{ coordRefSys: tileMatrixSetJSON.crs } }))
            ),
          });
        });

      it('should yield a tile matrix limits only once and then complete for a point inside the tile matrix bounding box', () => {
        const arbitraries = [toTileMatrixLimitsArgs] as const;
        const predicate = ({ geometry: point, metatile, tileMatrixId, tileMatrixSet }: ToTileMatrixLimitsArgs<Point>) => {
          const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
          if (!tileMatrix) {
            throw new Error('tile matrix id is not part of the given tile matrix set');
          }
          const { matrixHeight, matrixWidth } = tileMatrix;

          const generator = point.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);
          const iterResult = generator.next();
          const value = iterResult.value;

          expect(value).toBeDefined();
          expect(value).toEqual(
            expect.objectContaining<TileMatrixLimits<TileMatrixSetType>>({
              tileMatrixId: expect.any(String) as string,
              minTileRow: expect.any(Number) as number,
              maxTileRow: expect.any(Number) as number,
              minTileCol: expect.any(Number) as number,
              maxTileCol: expect.any(Number) as number,
            })
          );
          expect(value).toContainAllKeys<TileMatrixLimits<TileMatrixSetType>>([
            'tileMatrixId',
            'minTileRow',
            'maxTileRow',
            'minTileCol',
            'maxTileCol',
          ]);
          expect(value).toSatisfy<TileMatrixLimits<TileMatrixSet> | undefined>(
            (value) =>
              value !== undefined &&
              isSafeInteger(value.minTileCol, { max: value.maxTileCol }) &&
              isSafeInteger(value.maxTileCol, { min: value.minTileCol, max: matrixWidth }) &&
              isSafeInteger(value.minTileRow, { max: value.maxTileRow }) &&
              isSafeInteger(value.maxTileRow, { min: value.minTileRow, max: matrixHeight })
          );

          expect(generator.next().done).toBeTruthy();
        };
        fc.assert(fc.property(...arbitraries, predicate));
      });

      it('should throw an error if metatile is not an integer equal to or larger than 1', () => {
        const metatile = fc.double().filter((number) => !(Number.isSafeInteger(number) && number >= 1));
        const arbitraries = [
          fc.tuple(toTileMatrixLimitsArgs, metatile).chain(([{ metatile: _, ...args }, metatile]) => {
            return fc.constant({ ...args, metatile });
          }),
        ] as const;
        const predicate = ({ geometry: point, metatile, tileMatrixId, tileMatrixSet }: ToTileMatrixLimitsArgs<Point>) => {
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
        const pointInput = generatePointInput();
        const arbitraries = [
          fc
            .tuple(toTileMatrixLimitsArgs, pointInput, tileMatrixSetJSON, crs)
            .chain(([{ geometry: _, tileMatrixSet: _tileMatrixSet, ...args }, pointInput, tileMatrixSetJSON, crs]) =>
              fc.constant({
                ...args,
                tileMatrixSet: new TileMatrixSet(tileMatrixSetJSON),
                geometry: new Point({ ...pointInput, ...{ coordRefSys: crs } }),
              })
            ),
        ] as const;
        const predicate = ({ geometry: point, metatile, tileMatrixId, tileMatrixSet }: ToTileMatrixLimitsArgs<Point>) => {
          const generator = point.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);

          expect(() => {
            generator.next();
          }).toThrow(new Error('CRS mismatch'));
        };
        fc.assert(fc.property(...arbitraries, predicate));
      });

      it('should throw an error if tile matrix identifier is not part of tile matrix set', () => {
        const arbitraries = [
          toTileMatrixLimitsArgs.chain(({ tileMatrixSet, tileMatrixId, ...args }) =>
            fc
              .string()
              .filter((identifier) => tileMatrixSet.tileMatrices.every(({ identifier: { code } }) => code !== identifier))
              .chain((tileMatrixId) => fc.constant({ ...args, tileMatrixSet, tileMatrixId }))
          ),
        ] as const;
        const predicate = ({ geometry: point, metatile, tileMatrixId, tileMatrixSet }: ToTileMatrixLimitsArgs<Point>) => {
          const generator = point.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);

          expect(() => {
            generator.next();
          }).toThrow(new Error('tile matrix id is not part of the given tile matrix set'));
        };
        fc.assert(fc.property(...arbitraries, predicate));
      });

      it('should throw an error if geometry lies outside of the tile matrix bounding box', () => {
        const tileMatrixSetJSON = fc.constantFrom(...tileMatrixSetJSONs);
        const crs = tileMatrixSetJSON.map((tileMatrixSetJSON) => tileMatrixSetJSON.crs);
        const tileMatrixId = tileMatrixSetJSON.chain((tileMatrixSetJSON) =>
          fc.constantFrom(...tileMatrixSetJSON.tileMatrices.map((tileMatrixJSON) => tileMatrixJSON.id))
        );
        const tileMatrixBBox = generateTileMatrixToBBox(tileMatrixSetJSON, tileMatrixId);
        const coordinates = tileMatrixBBox.chain(([tileMatrixMinEast, tileMatrixMinNorth, tileMatrixMaxEast, tileMatrixMaxNorth]) =>
          fc.oneof(
            fc.tuple(
              fc.float({ noDefaultInfinity: true, noNaN: true, min: Math.fround(tileMatrixMaxEast), minExcluded: true }),
              fc.float({ noDefaultInfinity: true, noNaN: true })
            ),
            fc.tuple(
              fc.float({ noDefaultInfinity: true, noNaN: true, max: Math.fround(tileMatrixMinEast), maxExcluded: true }),
              fc.float({ noDefaultInfinity: true, noNaN: true })
            ),
            fc.tuple(
              fc.float({ noDefaultInfinity: true, noNaN: true }),
              fc.float({ noDefaultInfinity: true, noNaN: true, min: Math.fround(tileMatrixMaxNorth), minExcluded: true })
            ),
            fc.tuple(
              fc.float({ noDefaultInfinity: true, noNaN: true }),
              fc.float({ noDefaultInfinity: true, noNaN: true, max: Math.fround(tileMatrixMinNorth), maxExcluded: true })
            )
          )
        );
        const pointInput = generatePointInput({ coordinates });
        const arbitraries = [
          fc
            .tuple(toTileMatrixLimitsArgs, pointInput, tileMatrixSetJSON, crs)
            .chain(([{ geometry: _, tileMatrixSet: _tileMatrixSet, ...args }, lineInput, tileMatrixSetJSON, crs]) =>
              fc.constant({
                ...args,
                tileMatrixSet: new TileMatrixSet(tileMatrixSetJSON),
                geometry: new Point({ ...lineInput, ...{ coordRefSys: crs } }),
              })
            ),
        ] as const;
        const predicate = ({ geometry: point, metatile, tileMatrixId, tileMatrixSet }: ToTileMatrixLimitsArgs<Point>) => {
          const generator = point.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);

          expect(() => {
            generator.next();
          }).toThrow(RangeError);
        };
        fc.assert(fc.property(...arbitraries, predicate));
      });
    });
  });
});
