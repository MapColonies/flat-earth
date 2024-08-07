import { fc } from '@fast-check/jest';
import type { BBox, Position } from 'geojson';
import { SUPPORTED_CRS } from '../../../src/constants';
import type { GeoJSONBaseGeometry, LineStringInput, PointInput, PolygonInput } from '../../../src/geometries/types';
import type { TileMatrixSetJSON } from '../../../src/tiles/types';

type TransformGeometryPositionType<T, TO> = T extends Position ? TO : T extends (infer U)[] ? TransformGeometryPositionType<U, TO>[] : never;

interface GenerateGeometryInput<T extends GeoJSONBaseGeometry['coordinates']> {
  coordinates?: fc.Arbitrary<T>;
  bBox?: fc.Arbitrary<BBox>;
  crs?: fc.Arbitrary<TileMatrixSetJSON['crs']>;
}

interface PolygonInputOptions {
  closeLinearRing?: boolean;
}

export const coordinatesToBBox = <
  T extends GeoJSONBaseGeometry['coordinates'] | TransformGeometryPositionType<GeoJSONBaseGeometry['coordinates'], [number, number]>,
>(
  coordinates: T
): BBox => {
  const initialValue: { easts: number[]; norths: number[] } = { easts: [], norths: [] };
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const { easts, norths } = coordinates.flat(3).reduce(({ easts, norths }, value, index) => {
    if (index & 1) {
      norths.push(value);
    } else {
      easts.push(value);
    }
    return { easts, norths };
  }, initialValue);
  return [Math.min(...easts), Math.min(...norths), Math.max(...easts), Math.max(...norths)];
};

export const generatePointInput = ({ bBox, coordinates, crs }: GenerateGeometryInput<PointInput['coordinates']> = {}): fc.Arbitrary<PointInput> => {
  const generatedCoordinates =
    coordinates?.chain(([east, north]) => {
      return fc.tuple(fc.constant(east), fc.constant(north));
    }) ??
    (bBox
      ? bBox.chain(([minEast, minNorth, maxEast, maxNorth]) =>
          fc.tuple(
            fc.float({ min: Math.fround(minEast), max: Math.fround(maxEast), noNaN: true, minExcluded: true, maxExcluded: true }),
            fc.float({ min: Math.fround(minNorth), max: Math.fround(maxNorth), noNaN: true, minExcluded: true, maxExcluded: true })
          )
        )
      : fc.tuple(fc.float({ noDefaultInfinity: true, noNaN: true }), fc.float({ noDefaultInfinity: true, noNaN: true })));
  const bbox = fc.option(
    generatedCoordinates.chain(([east, north]) => fc.tuple(fc.constant(east), fc.constant(north), fc.constant(east), fc.constant(north))),
    { nil: undefined }
  );
  const coordRefSys = fc.option(crs ?? fc.constantFrom(...SUPPORTED_CRS), { nil: undefined });

  return fc.record({
    coordinates: generatedCoordinates,
    bbox,
    coordRefSys,
  });
};

export const generateLineInput = ({
  bBox,
  coordinates,
  crs,
}: GenerateGeometryInput<LineStringInput['coordinates']> = {}): fc.Arbitrary<LineStringInput> => {
  const lineInput = (
    coordinates?.chain((positions) => {
      return fc.constant(
        positions.map(([east, north]) => {
          return [east, north];
        })
      );
    }) ??
    (bBox
      ? bBox.chain(([minEast, minNorth, maxEast, maxNorth]) =>
          fc.array(
            fc.tuple(
              fc.float({ min: Math.fround(minEast), max: Math.fround(maxEast), noNaN: true, minExcluded: true, maxExcluded: true }),
              fc.float({ min: Math.fround(minNorth), max: Math.fround(maxNorth), noNaN: true, minExcluded: true, maxExcluded: true })
            ),
            { minLength: 2 }
          )
        )
      : fc.array(fc.tuple(fc.float({ noDefaultInfinity: true, noNaN: true }), fc.float({ noDefaultInfinity: true, noNaN: true })), { minLength: 2 }))
  ).chain((coordinates) =>
    fc.record({
      coordinates: fc.constant(coordinates),
      bbox: fc.option(fc.constant(coordinatesToBBox(coordinates)), { nil: undefined }),
      coordRefSys: fc.option(crs ?? fc.constantFrom(...SUPPORTED_CRS), { nil: undefined }),
    })
  );

  return lineInput;
};

// Notice: currently does not generates holes
export const generatePolygonInput = ({
  bBox,
  coordinates,
  crs,
  closeLinearRing,
}: GenerateGeometryInput<PolygonInput['coordinates']> & PolygonInputOptions = {}): fc.Arbitrary<PolygonInput> => {
  const polygonInput = (
    coordinates?.chain((positions) => {
      return fc.constant(
        positions.map((ring) =>
          ring.map(([east, north]) => {
            return [east, north];
          })
        )
      );
    }) ??
    (bBox
      ? bBox.chain(([minEast, minNorth, maxEast, maxNorth]) =>
          fc.tuple(
            fc.array(
              fc.tuple(
                fc.float({ min: Math.fround(minEast), max: Math.fround(maxEast), noNaN: true, minExcluded: true, maxExcluded: true }),
                fc.float({ min: Math.fround(minNorth), max: Math.fround(maxNorth), noNaN: true, minExcluded: true, maxExcluded: true })
              ),
              { minLength: 3 }
            )
          )
        )
      : fc.tuple(
          fc.array(fc.tuple(fc.float({ noDefaultInfinity: true, noNaN: true }), fc.float({ noDefaultInfinity: true, noNaN: true })), { minLength: 3 })
        ))
  ).chain((coordinates) => {
    if (closeLinearRing !== false) {
      coordinates[0].push(coordinates[0][0]);
    }

    return fc.record({
      coordinates: fc.constant(coordinates),
      bbox: fc.option(fc.constant(coordinatesToBBox(coordinates)), { nil: undefined }),
      coordRefSys: fc.option(crs ?? fc.constantFrom(...SUPPORTED_CRS), { nil: undefined }),
    });
  });

  return polygonInput;
};
