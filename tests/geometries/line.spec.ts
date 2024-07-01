/// <reference types="jest-extended" />
import { deepStrictEqual } from 'node:assert/strict';
import { fc, it } from '@fast-check/jest';
import type { BBox, Position } from 'geojson';
import { SUPPORTED_CRS } from '../../src/constants';
import { Line } from '../../src/geometries/line';
import type { GeoJSONLineString, LineStringInput } from '../../src/geometries/types';
import { TileMatrixSet } from '../../src/tiles/tileMatrixSet';
import { TILEMATRIXSETJSON_WORLD_CRS84_QUAD } from '../../src/tiles/tileMatrixSets/worldCRS84Quad';
import type { TileMatrixLimits, TileMatrixSetJSON, TileMatrixSet as TileMatrixSetType } from '../../src/tiles/types';
import { generateLineInput } from './helpers/geometries';
import { generateTileMatrixToBBox, getTileMatrix, tileMatrixToBBox } from './helpers/tiles';
import type {
  BadConstructorTestCase,
  BadToTileMatrixLimitsTestCase,
  ConstructorTestCase,
  ToTileMatrixLimitsArgs,
  ToTileMatrixLimitsTestCase,
} from './helpers/types';
import { generateNonFinite, isSafeInteger } from './helpers/propertyTest';

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

describe('Line', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('#constructor', () => {
    const wktCircular: Record<string | number | symbol, unknown> = {};
    wktCircular.a = wktCircular;

    const testCases: ConstructorTestCase<GeoJSONLineString>[] = [
      {
        case: 'for a simple line',
        coordinates: [
          [0, 0],
          [0, 10],
        ],
      },
      {
        case: 'for a closed on itself line',
        coordinates: [
          [0, 10],
          [0, 0],
          [10, 0],
          [0, 10],
        ],
      },
      {
        case: 'for a closed on itself line',
        coordinates: [
          [0, 10],
          [0, 0],
          [10, 0],
          [0, 10],
        ],
      },
    ];

    // TODO: add input geometry validation tests once validations for input geometry are imlpemented
    const badTestCases: BadConstructorTestCase<GeoJSONLineString>[] = [
      {
        case: 'for a line with a coordiante with non-finite values',
        coordinates: [
          [Infinity, -Infinity],
          [0, 0],
        ],
        expected: new Error("geometry's positions must consist of finite numbers that are neither infinite nor NaN"),
      },
      {
        case: 'for a line with a coordiante with NaN values',
        coordinates: [
          [NaN, -NaN],
          [0, 0],
        ],
        expected: new Error("geometry's positions must consist of finite numbers that are neither infinite nor NaN"),
      },
      {
        case: 'for an unsupported CRS',
        coordinates: [
          [0, 0],
          [1, 1],
        ],
        coordRefSys: 'badCRS',
        expected: new Error('unsupported CRS'),
      },
      {
        case: 'for an un-stringifiable defined with bigint',
        coordinates: [
          [0, 0],
          [1, 1],
        ],
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
        coordinates: [
          [0, 0],
          [1, 1],
        ],
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

    it.each(testCases)('should construct a line class instance $case', ({ coordinates, coordRefSys }) => {
      const line = new Line({ coordinates, coordRefSys });

      expect(line).toBeInstanceOf(Line);
    });

    it.each(badTestCases)('should throw an error $case', ({ coordinates, coordRefSys, expected, mock }) => {
      mock?.();
      expect(() => new Line({ coordinates, coordRefSys })).toThrow(expected);
    });

    describe('#property-test', () => {
      let lineInput: fc.Arbitrary<LineStringInput>;
      beforeAll(() => {
        lineInput = generateLineInput();
      });

      // NOTE: currently tests do not account for topology nor CRS limits
      it('should construct a line class instance', () => {
        const arbitraries = [lineInput] as const;
        const predicate = (lineInput: LineStringInput) => {
          const line = new Line(lineInput);

          expect(line).toBeInstanceOf(Line);
        };
        fc.assert(fc.property(...arbitraries, predicate));
      });

      it("should throw an error when geometry's coordinates are not finite or are NaN", () => {
        const badCoordinates = fc.array(
          fc.oneof(
            fc.tuple(fc.float({ noNaN: true }), generateNonFinite()),
            fc.tuple(generateNonFinite(), fc.float({ noNaN: true })),
            fc.tuple(generateNonFinite(), generateNonFinite())
          ),
          { minLength: 1 }
        );
        const goodCoordinates = fc.array(fc.tuple(fc.float({ noNaN: true }), fc.float({ noNaN: true })), { minLength: 1 });
        const coordinates = fc.tuple(badCoordinates, goodCoordinates).chain(([badCoordinates, goodCoordinates]) => {
          return fc.shuffledSubarray([...goodCoordinates, ...badCoordinates], {
            minLength: goodCoordinates.length + 1,
            maxLength: badCoordinates.length + goodCoordinates.length,
          });
        });
        const bbox = fc.option(
          coordinates.chain((coordinates) => {
            const easts = coordinates.map((v) => v[0]);
            const norths = coordinates.map((v) => v[1]);
            return fc.tuple(
              fc.constant(Math.min(...easts)),
              fc.constant(Math.min(...norths)),
              fc.constant(Math.max(...easts)),
              fc.constant(Math.max(...norths))
            );
          }),
          { nil: undefined }
        );
        const coordRefSys = fc.option(fc.constantFrom(...SUPPORTED_CRS), { nil: undefined });
        const arbitraries = [coordinates, bbox, coordRefSys] as const;
        const predicate = (coordinates: Position[], bbox?: BBox, coordRefSys?: TileMatrixSetJSON['crs']) => {
          expect(
            () =>
              new Line({
                coordinates,
                bbox,
                coordRefSys,
              })
          ).toThrow(new Error("geometry's positions must consist of finite numbers that are neither infinite nor NaN"));
        };
        fc.assert(fc.property(...arbitraries, predicate));
      });
    });
  });

  describe('#toTileMatrixLimits', () => {
    const testCases: ToTileMatrixLimitsTestCase<GeoJSONLineString>[] = [
      {
        case: 'for a line with multiple segments generating multiple tile matrix limits',
        coordinates: [
          [-180, 90],
          [0, 45],
          [-180, 80],
          [-135, -90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '2',
        expected: [
          {
            minTileCol: 0,
            minTileRow: 0,
            maxTileCol: 0,
            maxTileRow: 3,
            tileMatrixId: '2',
          },
          {
            minTileCol: 1,
            minTileRow: 0,
            maxTileCol: 1,
            maxTileRow: 0,
            tileMatrixId: '2',
          },
          {
            minTileCol: 2,
            minTileRow: 0,
            maxTileCol: 2,
            maxTileRow: 0,
            tileMatrixId: '2',
          },
          {
            minTileCol: 3,
            minTileRow: 0,
            maxTileCol: 3,
            maxTileRow: 0,
            tileMatrixId: '2',
          },
        ],
      },
      {
        case: 'for a line with multiple segments forming a closed loop lying on tile matrix bounding box generating multiple tile matrix limits',
        coordinates: [
          [-180, 90],
          [180, 90],
          [180, -90],
          [-180, -90],
          [-180, 90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '2',
        expected: [
          {
            minTileCol: 0,
            minTileRow: 0,
            maxTileCol: 7,
            maxTileRow: 0,
            tileMatrixId: '2',
          },
          {
            minTileCol: 0,
            minTileRow: 1,
            maxTileCol: 0,
            maxTileRow: 1,
            tileMatrixId: '2',
          },
          {
            minTileCol: 7,
            minTileRow: 1,
            maxTileCol: 7,
            maxTileRow: 1,
            tileMatrixId: '2',
          },
          {
            minTileCol: 0,
            minTileRow: 2,
            maxTileCol: 0,
            maxTileRow: 2,
            tileMatrixId: '2',
          },
          {
            minTileCol: 7,
            minTileRow: 2,
            maxTileCol: 7,
            maxTileRow: 2,
            tileMatrixId: '2',
          },
          {
            minTileCol: 0,
            minTileRow: 3,
            maxTileCol: 7,
            maxTileRow: 3,
            tileMatrixId: '2',
          },
        ],
      },
      {
        case: 'for a line with multiple segments forming a mostly horizontal closed loop lying on tile matrix internal bounds generating multiple tile matrix limits',
        coordinates: [
          [-135, 45],
          [135, 45],
          [135, -45],
          [-135, -45],
          [-135, 45],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '3',
        expected: [
          {
            minTileCol: 2,
            minTileRow: 2,
            maxTileCol: 13,
            maxTileRow: 2,
            tileMatrixId: '3',
          },
          {
            minTileCol: 2,
            minTileRow: 3,
            maxTileCol: 2,
            maxTileRow: 3,
            tileMatrixId: '3',
          },
          {
            minTileCol: 13,
            minTileRow: 3,
            maxTileCol: 13,
            maxTileRow: 3,
            tileMatrixId: '3',
          },
          {
            minTileCol: 2,
            minTileRow: 4,
            maxTileCol: 2,
            maxTileRow: 4,
            tileMatrixId: '3',
          },
          {
            minTileCol: 13,
            minTileRow: 4,
            maxTileCol: 13,
            maxTileRow: 4,
            tileMatrixId: '3',
          },
          {
            minTileCol: 2,
            minTileRow: 5,
            maxTileCol: 13,
            maxTileRow: 5,
            tileMatrixId: '3',
          },
        ],
      },
      {
        case: 'for a line with multiple segments forming a mostly vertical closed loop lying on tile matrix internal bounds generating multiple tile matrix limits',
        coordinates: [
          [45, 45],
          [112.5, 45],
          [112.5, -45],
          [45, -45],
          [45, 45],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '3',
        expected: [
          {
            minTileCol: 10,
            minTileRow: 2,
            maxTileCol: 10,
            maxTileRow: 5,
            tileMatrixId: '3',
          },
          {
            minTileCol: 11,
            minTileRow: 2,
            maxTileCol: 11,
            maxTileRow: 2,
            tileMatrixId: '3',
          },
          {
            minTileCol: 11,
            minTileRow: 5,
            maxTileCol: 11,
            maxTileRow: 5,
            tileMatrixId: '3',
          },
          {
            minTileCol: 12,
            minTileRow: 2,
            maxTileCol: 12,
            maxTileRow: 5,
            tileMatrixId: '3',
          },
        ],
      },
      {
        case: 'for a line with multiple zero-length segments generating multiple tile matrix limits',
        coordinates: [
          [45, 45],
          [45, 45],
          [112.5, 45],
          [112.5, -45],
          [112.5, -45],
          [112.5, -45],
          [110, -40],
          [110, -40],
          [80, -20],
          [80, -20],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '3',
        expected: [
          {
            minTileCol: 10,
            minTileRow: 2,
            maxTileCol: 10,
            maxTileRow: 2,
            tileMatrixId: '3',
          },
          {
            minTileCol: 11,
            minTileRow: 2,
            maxTileCol: 11,
            maxTileRow: 2,
            tileMatrixId: '3',
          },
          {
            minTileCol: 11,
            minTileRow: 4,
            maxTileCol: 11,
            maxTileRow: 5,
            tileMatrixId: '3',
          },
          {
            minTileCol: 12,
            minTileRow: 2,
            maxTileCol: 12,
            maxTileRow: 5,
            tileMatrixId: '3',
          },
        ],
      },
      {
        case: 'for a mostly vertical line with multiple segments lying on tile matrix internal bounds generating multiple tile matrix limits',
        coordinates: [
          [45, 45],
          [45, 0],
          [112.5, 0],
          [112.5, -45],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '3',
        expected: [
          {
            minTileCol: 10,
            minTileRow: 2,
            maxTileCol: 10,
            maxTileRow: 4,
            tileMatrixId: '3',
          },
          {
            minTileCol: 11,
            minTileRow: 3,
            maxTileCol: 11,
            maxTileRow: 4,
            tileMatrixId: '3',
          },
          {
            minTileCol: 12,
            minTileRow: 3,
            maxTileCol: 12,
            maxTileRow: 5,
            tileMatrixId: '3',
          },
        ],
      },
      {
        case: 'for a line with multiple segments forming a closed loop without bounding an area generating multiple tile matrix limits',
        coordinates: [
          [-180, 90],
          [180, -90],
          [0, 0],
          [-180, 90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '2',
        expected: [
          {
            minTileCol: 0,
            minTileRow: 0,
            maxTileCol: 1,
            maxTileRow: 0,
            tileMatrixId: '2',
          },
          {
            minTileCol: 2,
            minTileRow: 1,
            maxTileCol: 3,
            maxTileRow: 1,
            tileMatrixId: '2',
          },
          {
            minTileCol: 4,
            minTileRow: 2,
            maxTileCol: 5,
            maxTileRow: 2,
            tileMatrixId: '2',
          },
          {
            minTileCol: 6,
            minTileRow: 3,
            maxTileCol: 7,
            maxTileRow: 3,
            tileMatrixId: '2',
          },
        ],
      },
      {
        case: 'for a mostly horizontally directed line generating multiple tile matrix limits',
        coordinates: [
          [-180, 90],
          [0, 45],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '2',
        expected: [
          {
            minTileCol: 0,
            minTileRow: 0,
            maxTileCol: 3,
            maxTileRow: 0,
            tileMatrixId: '2',
          },
          {
            minTileCol: 4,
            minTileRow: 1,
            maxTileCol: 4,
            maxTileRow: 1,
            tileMatrixId: '2',
          },
        ],
      },
      {
        case: 'for a mostly vertically directed line generating multiple tile matrix limits',
        coordinates: [
          [-180, 90],
          [-135, -90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '2',
        expected: [
          {
            minTileCol: 0,
            minTileRow: 0,
            maxTileCol: 0,
            maxTileRow: 3,
            tileMatrixId: '2',
          },
          {
            minTileCol: 1,
            minTileRow: 4,
            maxTileCol: 1,
            maxTileRow: 4,
            tileMatrixId: '2',
          },
        ],
      },
      {
        case: 'for a line on the tile matrix bounding box with low scale tile matrix',
        coordinates: [
          [180, -90],
          [-180, -90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: [
          {
            minTileCol: 0,
            minTileRow: 0,
            maxTileCol: 1,
            maxTileRow: 0,
            tileMatrixId: '0',
          },
        ],
      },
      {
        case: 'for a line on the tile matrix bounding box with low scale tile matrix with non-default metatile (2)',
        coordinates: [
          [180, -90],
          [-180, -90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        metatile: 2,
        expected: [
          {
            minTileCol: 0,
            minTileRow: 0,
            maxTileCol: 0,
            maxTileRow: 0,
            tileMatrixId: '0',
          },
        ],
      },
      {
        case: 'for a line on the tile matrix bounding box with high scale tile matrix',
        coordinates: [
          [179.9999999999868, -89.9999999999934],
          [-180, -89.9999999999934],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        expected: [
          {
            minTileCol: 0,
            minTileRow: 8388607,
            maxTileCol: 16777215,
            maxTileRow: 8388607,
            tileMatrixId: '23',
          },
        ],
      },
      {
        case: 'for a line on the tile matrix bounding box with high scale tile matrix with non-default metatile (2)',
        coordinates: [
          [179.9999999999868, -89.9999999999934],
          [-180, -89.9999999999934],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        metatile: 2,
        expected: [
          {
            minTileCol: 0,
            minTileRow: 4194303,
            maxTileCol: 8388607,
            maxTileRow: 4194303,
            tileMatrixId: '23',
          },
        ],
      },
      {
        case: 'for a line with an end on the tile matrix origin with low scale tile matrix',
        coordinates: [
          [-180, 90],
          [-100, -90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: [
          {
            minTileCol: 0,
            minTileRow: 0,
            maxTileCol: 0,
            maxTileRow: 0,
            tileMatrixId: '0',
          },
        ],
      },
      {
        case: 'for a line with an end on the tile matrix origin with low scale tile matrix with non-default metatile (2)',
        coordinates: [
          [-180, 90],
          [180, -90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        metatile: 2,
        expected: [
          {
            minTileCol: 0,
            minTileRow: 0,
            maxTileCol: 0,
            maxTileRow: 0,
            tileMatrixId: '0',
          },
        ],
      },
      {
        case: 'for a line with an end on the tile matrix origin with high scale tile matrix',
        coordinates: [
          [-180, 90],
          [-179.99997, 89.99997],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        expected: [
          {
            minTileCol: 0,
            minTileRow: 0,
            maxTileCol: 0,
            maxTileRow: 0,
            tileMatrixId: '23',
          },
          {
            minTileCol: 1,
            minTileRow: 0,
            maxTileCol: 1,
            maxTileRow: 1,
            tileMatrixId: '23',
          },
        ],
      },
      {
        case: 'for a line with an end on the tile matrix origin with high scale tile matrix with non-default metatile (2)',
        coordinates: [
          [-180, 90],
          [-179.999999, 89.99997],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        metatile: 2,
        expected: [
          {
            minTileCol: 0,
            minTileRow: 0,
            maxTileCol: 0,
            maxTileRow: 0,
            tileMatrixId: '23',
          },
        ],
      },
      {
        case: 'for a line with an end in the center of the tile matrix bounding box with low scale tile matrix',
        coordinates: [
          [0, 0],
          [10, 10],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: [
          {
            minTileCol: 1,
            minTileRow: 0,
            maxTileCol: 1,
            maxTileRow: 0,
            tileMatrixId: '0',
          },
        ],
      },
      {
        case: 'for a line with an end in the center of the tile matrix bounding box with low scale tile matrix with non-default metatile (2)',
        coordinates: [
          [0, 0],
          [10, 10],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        metatile: 2,
        expected: [
          {
            minTileCol: 0,
            minTileRow: 0,
            maxTileCol: 0,
            maxTileRow: 0,
            tileMatrixId: '0',
          },
        ],
      },
      {
        case: 'for a line with an end in the center of the tile matrix bounding box with high scale tile matrix',
        coordinates: [
          [0, 0],
          [0.00001, -0.00001],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        expected: [
          {
            minTileCol: 8388608,
            minTileRow: 4194304,
            maxTileCol: 8388608,
            maxTileRow: 4194304,
            tileMatrixId: '23',
          },
        ],
      },
      {
        case: 'for a line with an end in the center of the tile matrix bounding box with high scale tile matrix with non-default metatile (2)',
        coordinates: [
          [0, 0],
          [0.00001, -0.00001],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        metatile: 2,
        expected: [
          {
            minTileCol: 4194304,
            minTileRow: 2097152,
            maxTileCol: 4194304,
            maxTileRow: 2097152,
            tileMatrixId: '23',
          },
        ],
      },
    ];

    const badTestCases: BadToTileMatrixLimitsTestCase<GeoJSONLineString>[] = [
      {
        case: 'for a non integer positive metatile',
        coordinates: [
          [180.1, -90.1],
          [180.1, -90.1],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        metatile: 0.5,
        expected: new Error('metatile must be an integer with a value of at least 1'),
      },
      {
        case: 'for a non identical CRS between geometry and tile matrix',
        coordinates: [
          [180.1, -90.1],
          [180.1, -90.1],
        ],
        coordRefSys: 'http://www.opengis.net/def/crs/OGC/0/CRS84',
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: new Error('CRS mismatch'),
      },
      {
        case: 'for a tile matrix identifier not found inside the available tile matrices',
        coordinates: [
          [180.1, -90.1],
          [180.1, -90.1],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '24',
        expected: new Error('tile matrix id is not part of the given tile matrix set'),
      },
      {
        case: 'for a line end outside the tile matrix bounding box with low scale tile matrix',
        coordinates: [
          [180.1, -90],
          [180, -90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: new RangeError("point's easting, 180.1, is out of range of tile matrix bounding box of tile matrix: 0"),
      },
      {
        case: 'for a line end outside the tile matrix bounding box with low scale tile matrix',
        coordinates: [
          [180, -90.1],
          [180, -90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: new RangeError("point's northing, -90.1, is out of range of tile matrix bounding box of tile matrix: 0"),
      },
      {
        case: 'for a line end outside the tile matrix bounding box with low scale tile matrix',
        coordinates: [
          [-180.1, 90],
          [-180, 90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: new RangeError("point's easting, -180.1, is out of range of tile matrix bounding box of tile matrix: 0"),
      },
      {
        case: 'for a line end outside the tile matrix bounding box with low scale tile matrix',
        coordinates: [
          [-180, 90.1],
          [-180, 90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        expected: new RangeError("point's northing, 90.1, is out of range of tile matrix bounding box of tile matrix: 0"),
      },
      {
        case: 'for a line end outside the tile matrix bounding box with low scale tile matrix with non-default metatile (2)',
        coordinates: [
          [180.1, -90],
          [180, -90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '0',
        metatile: 2,
        expected: new RangeError("point's easting, 180.1, is out of range of tile matrix bounding box of tile matrix: 0"),
      },
      {
        case: 'for a line end outside the tile matrix bounding box with high scale tile matrix',
        coordinates: [
          [180, 90],
          [-180, 90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        expected: new RangeError("point's easting, 180, is out of range of tile matrix bounding box of tile matrix: 23"),
      },
      {
        case: 'for a line end outside the tile matrix bounding box with high scale tile matrix',
        coordinates: [
          [179.9999999999868, -90],
          [-180, 90],
        ],
        tileMatrixSetJSON: TILEMATRIXSETJSON_WORLD_CRS84_QUAD,
        tileMatrixId: '23',
        expected: new RangeError("point's northing, -90, is out of range of tile matrix bounding box of tile matrix: 23"),
      },
    ];

    it.each(testCases)(
      'should yield a tile matrix limits for tiles intersected by the line and then complete $case',
      ({ coordinates, coordRefSys, tileMatrixSetJSON, tileMatrixId, metatile, expected }) => {
        const line = new Line({ coordinates, coordRefSys: coordRefSys ?? tileMatrixSetJSON.crs });
        const tileMatrixSet = new TileMatrixSet(tileMatrixSetJSON);

        const generator = line.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);

        let index = 0;
        for (const value of generator) {
          expect(value).toEqual(expected[index]);
          index++;
        }

        expect(generator.next().done).toBeTruthy();
      }
    );

    it.each(badTestCases)('should throw an error $case', ({ coordinates, coordRefSys, tileMatrixSetJSON, tileMatrixId, metatile, expected }) => {
      const line = new Line({ coordinates, coordRefSys: coordRefSys ?? tileMatrixSetJSON.crs });
      const tileMatrixSet = new TileMatrixSet(tileMatrixSetJSON);

      const generator = line.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);

      expect(() => {
        generator.next();
      }).toThrow(expected);

      expect(generator.next().done).toBeTruthy();
    });

    describe('#property-test', () => {
      const toTileMatrixLimitsArgs = fc
        .constantFrom(...tileMatrixSetJSONs)
        .map((tileMatrixSetJSON) => {
          return {
            tileMatrixSetJSON,
            tileMatrixId: fc.constantFrom(...tileMatrixSetJSON.tileMatrices.map((tileMatrixJSON) => tileMatrixJSON.id)),
          };
        })
        .chain(({ tileMatrixId, tileMatrixSetJSON }) => {
          const bBox = tileMatrixId.map((tileMatrixId) => tileMatrixToBBox(tileMatrixSetJSON, tileMatrixId));

          return fc.record({
            tileMatrixId,
            tileMatrixSet: fc.constant(new TileMatrixSet(tileMatrixSetJSON)),
            metatile: fc.integer({ min: 1 }),
            geometry: generateLineInput({ bBox }).chain((lineInput) =>
              fc.constant(new Line({ ...lineInput, ...{ coordRefSys: tileMatrixSetJSON.crs } }))
            ),
          });
        });

      it('should yield a tile matrix limits and finally complete for a line that is completely within the tile matrix bounding box', () => {
        const arbitraries = [toTileMatrixLimitsArgs] as const;
        const predicate = ({ geometry: line, metatile, tileMatrixId, tileMatrixSet }: ToTileMatrixLimitsArgs<Line>) => {
          const tileMatrix = getTileMatrix(tileMatrixSet, tileMatrixId);
          if (!tileMatrix) {
            throw new Error('tile matrix id is not part of the given tile matrix set');
          }
          const { matrixHeight, matrixWidth } = tileMatrix;

          const generator = line.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);

          for (const value of generator) {
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
          }
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
        const predicate = ({ geometry: line, metatile, tileMatrixId, tileMatrixSet }: ToTileMatrixLimitsArgs<Line>) => {
          const generator = line.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);

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
        const lineInput = generateLineInput();
        const arbitraries = [
          fc
            .tuple(toTileMatrixLimitsArgs, lineInput, tileMatrixSetJSON, crs)
            .chain(([{ geometry: _, tileMatrixSet: _tileMatrixSet, ...args }, lineInput, tileMatrixSetJSON, crs]) =>
              fc.constant({
                ...args,
                tileMatrixSet: new TileMatrixSet(tileMatrixSetJSON),
                geometry: new Line({ ...lineInput, ...{ coordRefSys: crs } }),
              })
            ),
        ] as const;
        const predicate = ({ geometry: line, metatile, tileMatrixId, tileMatrixSet }: ToTileMatrixLimitsArgs<Line>) => {
          const generator = line.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);

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
        const predicate = ({ geometry: line, metatile, tileMatrixId, tileMatrixSet }: ToTileMatrixLimitsArgs<Line>) => {
          const generator = line.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);

          expect(() => {
            generator.next();
          }).toThrow(new Error('tile matrix id is not part of the given tile matrix set'));
        };
        fc.assert(fc.property(...arbitraries, predicate));
      });

      it('should throw an error if part of the geometry lies outside of the tile matrix bounding box', () => {
        const tileMatrixSetJSON = fc.constantFrom(...tileMatrixSetJSONs);
        const crs = tileMatrixSetJSON.map((tileMatrixSetJSON) => tileMatrixSetJSON.crs);
        const tileMatrixId = tileMatrixSetJSON.chain((tileMatrixSetJSON) =>
          fc.constantFrom(...tileMatrixSetJSON.tileMatrices.map((tileMatrixJSON) => tileMatrixJSON.id))
        );
        const tileMatrixBBox = generateTileMatrixToBBox(tileMatrixSetJSON, tileMatrixId);
        const goodCoordinates = fc.array(
          tileMatrixBBox.chain(([tileMatrixMinEast, tileMatrixMinNorth, tileMatrixMaxEast, tileMatrixMaxNorth]) =>
            fc.tuple(
              fc.float({
                min: Math.fround(tileMatrixMinEast),
                max: Math.fround(tileMatrixMaxEast),
                noNaN: true,
                minExcluded: true,
                maxExcluded: true,
              }),
              fc.float({
                min: Math.fround(tileMatrixMinNorth),
                max: Math.fround(tileMatrixMaxNorth),
                noNaN: true,
                minExcluded: true,
                maxExcluded: true,
              })
            )
          ),
          { minLength: 1 }
        );
        const badCoordinates = fc.array(
          tileMatrixBBox.chain(([tileMatrixMinEast, tileMatrixMinNorth, tileMatrixMaxEast, tileMatrixMaxNorth]) =>
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
          ),
          { minLength: 1 }
        );
        const coordinates = fc.tuple(badCoordinates, goodCoordinates).chain(([badCoordinates, goodCoordinates]) => {
          return fc.shuffledSubarray([...goodCoordinates, ...badCoordinates], {
            minLength: goodCoordinates.length + 1,
            maxLength: badCoordinates.length + goodCoordinates.length,
          });
        });
        const lineInput = generateLineInput({ coordinates });
        const arbitraries = [
          fc
            .tuple(toTileMatrixLimitsArgs, lineInput, tileMatrixSetJSON, crs)
            .chain(([{ geometry: _, tileMatrixSet: _tileMatrixSet, ...args }, lineInput, tileMatrixSetJSON, crs]) =>
              fc.constant({
                ...args,
                tileMatrixSet: new TileMatrixSet(tileMatrixSetJSON),
                geometry: new Line({ ...lineInput, ...{ coordRefSys: crs } }),
              })
            ),
        ] as const;
        const predicate = ({ geometry: line, metatile, tileMatrixId, tileMatrixSet }: ToTileMatrixLimitsArgs<Line>) => {
          const generator = line.toTileMatrixLimits(tileMatrixSet, tileMatrixId, metatile);

          expect(() => {
            generator.next();
          }).toThrow(RangeError);
        };
        fc.assert(fc.property(...arbitraries, predicate));
      });
    });
  });
});
