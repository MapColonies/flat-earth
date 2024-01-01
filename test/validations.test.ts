import { validateGeoJson } from "../src/validations/geojson_validations";
import { ValidationResult, ValidationSeverity } from "../src/validations/validation_classes";

describe('Validations', () => {
  it('Should validate a geojson point is ok', () => {
    const geojson = {type: 'Point', coordinates: [125.6, 10.1]};
    const result = validateGeoJson(JSON.stringify(geojson));
    const expected = new ValidationResult(true);
    expect(result).toStrictEqual(expected);
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
    const expected = new ValidationResult(true);
    expect(result).toStrictEqual(expected);
  });
  it('Should validate a geojson polygon is not ok due to missing last point', () => {
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
    const expected = new ValidationResult(false, [
      {
        message:
          'First and last positions of a Polygon or MultiPolygon’s ring should be the same.',
        severity: ValidationSeverity.Error,
        from: 34,
        to: 46,
      },
      {
        message:
          'First and last positions of a Polygon or MultiPolygon’s ring should be the same.',
        severity: ValidationSeverity.Error,
        from: 73,
        to: 85,
      },
    ]);
    expect(result).toEqual(expected);
  });
});
