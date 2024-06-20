import { fc } from '@fast-check/jest';
import type { BBox, Position } from 'geojson';
import { SUPPORTED_CRS } from '../../../src/constants';
import type { GeoJSONBaseGeometry, LineStringInput, PointInput } from '../../../src/geometries/types';
import type { TileMatrixSetJSON } from '../../../src/tiles/types';

interface GenerateGeometryInput<T extends GeoJSONBaseGeometry['coordinates']> {
  coordinates?: fc.Arbitrary<T>;
  bBox?: fc.Arbitrary<BBox>;
  crs?: fc.Arbitrary<TileMatrixSetJSON['crs']>;
}

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
