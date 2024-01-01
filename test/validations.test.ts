import { validateGeoJson } from "../src/validations/validations";

describe('Validations', () => {
  it('Should validate a geojson point is ok', () => {
    const geojson = {type: 'Point', coordinates: [125.6, 10.1]};
    const result = validateGeoJson(JSON.stringify(geojson));
    expect(result).toBe(true);
  });
  it('Should validate a geojson polygon is ok', () => {
    const geojson = {
      type: 'Polygon',
      coordinates: [
        [
          [125.6, 10.1],
          [125.7, 10.1],
          [125.7, 10.2],
          [125.6, 10.2],
          [125.6, 10.1],
        ],
      ],
    };
    const result = validateGeoJson(JSON.stringify(geojson));
    expect(result).toBe(true);
  });
  it('Should validate a geojson polygon is not ok', () => {
    const geojson = {
      type: 'Polygon',
      coordinates: [
        [
          [125.6, 10.1],
          [125.7, 10.1],
          [125.7, 10.2],
          [125.6, 10.2],
        ],
      ],
    };
    const result = validateGeoJson(JSON.stringify(geojson));
    expect(result).toBe(false);
  });
});
