import {
  validateGeoJson,
  validateGeoJsonInGrid,
  validateGeoJsonSelfIntersect,
  validateGeoJsonTypes,
} from '../src/validations/geojson_validations';
import {
  ValidationIssueType,
  ValidationResult,
  ValidationSeverity,
} from '../src/validations/validation_classes';

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
  it('Should validate a geojson polygon is not ok due to missing minimum number of points', () => {
    const geojson = {
      type: 'Polygon',
      coordinates: [
        [
          [125.6, 10.1],
          [125.7, 10.1],
          [125.6, 10.1],
        ],
      ],
    };
    const result = validateGeoJson(JSON.stringify(geojson));
    const expected = new ValidationResult(false, [
      {
        message: 'Expected to find four or more positions here.',
        severity: ValidationSeverity.Error,
        from: 33,
        to: 73,
        validationIssueType: ValidationIssueType.GeoJsonNotEnoughCoordinates,
      },
    ]);
    expect(result).toEqual(expected);
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
        validationIssueType: ValidationIssueType.GeoJsonNotClosed,
      },
      {
        message:
          'First and last positions of a Polygon or MultiPolygon’s ring should be the same.',
        severity: ValidationSeverity.Error,
        from: 73,
        to: 85,
        validationIssueType: ValidationIssueType.GeoJsonNotClosed,
      },
    ]);
    expect(result).toEqual(expected);
  });
  it('Should validate a geojson self intersect', () => {
    const geojson = {
      type: 'Polygon',
      coordinates: [
        [
          [-12.034835, 8.901183],
          [-12.060413, 8.899826],
          [-12.03638, 8.873199],
          [-12.059383, 8.871418],
          [-12.034835, 8.901183],
        ],
      ],
    };
    const result = validateGeoJsonSelfIntersect(JSON.stringify(geojson));
    const expected = new ValidationResult(false, [
      {
        message: 'The polygon is self intersecting',
        severity: ValidationSeverity.Warning,
        from: 0,
        to: 0,
        validationIssueType: ValidationIssueType.GeoJsonSelfIntersect,
      },
    ]);
    expect(result).toEqual(expected);
  });
  it('Should validate a geojson is one of the specified types', () => {
    const geojson = {
      type: 'Point',
      coordinates: [[-12.034835, 8.901183]],
    };
    const result = validateGeoJsonTypes(JSON.stringify(geojson), ['Point']);
    const expected = new ValidationResult(true);
    expect(result).toEqual(expected);
  });
  it('Should validate a geojson is not one of the specified types', () => {
    const geojson = {
      type: 'Point',
      coordinates: [[-12.034835, 8.901183]],
    };
    const result = validateGeoJsonTypes(JSON.stringify(geojson), ['Polygon']);
    const expected = new ValidationResult(false, [
      {
        message: 'Type Point was not specified in the allowed types',
        severity: ValidationSeverity.Warning,
        from: 0,
        to: 0,
        validationIssueType: ValidationIssueType.GeoJsonInvalidType,
      },
    ]);
    expect(result).toEqual(expected);
  });
  it('Should validate a collection of geojson is according to the specified types', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-0.703125, 24.84656534821976],
                [11.25, 24.84656534821976],
                [11.25, 31.353636941500987],
                [-0.703125, 31.353636941500987],
                [-0.703125, 24.84656534821976],
              ],
            ],
          },
        },
      ],
    };
    const result = validateGeoJsonTypes(JSON.stringify(geojson), ['Polygon']);
    const expected = new ValidationResult(true);
    expect(result).toEqual(expected);
  });
  it('Should validate a collection of geojson is according to the specified types', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-0.703125, 24.84656534821976],
                [11.25, 24.84656534821976],
                [11.25, 31.353636941500987],
                [-0.703125, 31.353636941500987],
                [-0.703125, 24.84656534821976],
              ],
            ],
          },
        },
      ],
    };
    const result = validateGeoJsonTypes(JSON.stringify(geojson), ['Point']);
    const expected = new ValidationResult(false, [
      {
        message: 'Type Polygon was not specified in the allowed types',
        severity: ValidationSeverity.Warning,
        from: 0,
        to: 0,
        validationIssueType: ValidationIssueType.GeoJsonInvalidType,
      },
    ]);
    expect(result).toEqual(expected);
  });
  it('Should validate a geojson inside the grid', () => {
    const geojson = {
      type: 'Point',
      coordinates: [-12.034835, 8.901183],
    };
    const result = validateGeoJsonInGrid(JSON.stringify(geojson));
    const expected = new ValidationResult(true);
    expect(result).toEqual(expected);
  });
  it('Should validate a geojson is not inside the grid (lon)', () => {
    const geojson = {
      type: 'Point',
      coordinates: [-185.0, 8.901183],
    };
    const result = validateGeoJsonInGrid(JSON.stringify(geojson));
    const expected = new ValidationResult(false, [
      {
        message: 'Point lon: -185 lat: 8.901183 is not inside the grid',
        severity: ValidationSeverity.Error,
        from: 0,
        to: 0,
        validationIssueType: ValidationIssueType.GeoJsonNotInGrid,
      },
    ]);
    expect(result).toEqual(expected);
  });
  it('Should validate a geojson is not inside the grid (lat)', () => {
    const geojson = {
      type: 'Point',
      coordinates: [-110.0, 95.0],
    };
    const result = validateGeoJsonInGrid(JSON.stringify(geojson));
    const expected = new ValidationResult(false, [
      {
        message: 'Point lon: -110 lat: 95 is not inside the grid',
        severity: ValidationSeverity.Error,
        from: 0,
        to: 0,
        validationIssueType: ValidationIssueType.GeoJsonNotInGrid,
      },
    ]);
    expect(result).toEqual(expected);
  });
  it('Should validate a geojson polygon is not inside the grid', () => {
    const geojson = {
      type: 'Polygon',
      coordinates: [
        [
          [185.6, 10.1],
          [125.7, 10.1],
          [125.7, 10.2],
          [125.6, 10.2],
          [185.6, 10.1],
        ],
      ],
    };
    const result = validateGeoJsonInGrid(JSON.stringify(geojson));
    const expected = new ValidationResult(false, [
      {
        message: 'Point lon: 185.6 lat: 10.1 is not inside the grid',
        severity: ValidationSeverity.Error,
        from: 0,
        to: 0,
        validationIssueType: ValidationIssueType.GeoJsonNotInGrid,
      },
    ]);
    expect(result).toEqual(expected);
  });
});
