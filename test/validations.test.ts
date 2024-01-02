import {
  validateGeoJson,
  validateGeoJsonInGrid,
  validateGeoJsonSelfIntersect,
  validateGeoJsonTypes,
  validateNumberOfVertices,
} from '../src/validations/geojson_validations';
import {
  ValidationIssue,
  ValidationIssueType,
  ValidationResult,
  ValidationSeverity,
} from '../src/validations/validation_classes';

describe('Validations', () => {
  describe('#validateGeoJson', () => {
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
        new ValidationIssue(
          'Expected to find four or more positions here.',
          ValidationSeverity.Error,
          ValidationIssueType.GeoJsonNotEnoughCoordinates,
          33,
          73
        ),
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
        new ValidationIssue(
          'First and last positions of a Polygon or MultiPolygon’s ring should be the same.',
          ValidationSeverity.Error,
          ValidationIssueType.GeoJsonNotClosed,
          34,
          46
        ),
        new ValidationIssue(
          'First and last positions of a Polygon or MultiPolygon’s ring should be the same.',
          ValidationSeverity.Error,
          ValidationIssueType.GeoJsonNotClosed,
          73,
          85
        ),
      ]);
      expect(result).toEqual(expected);
    });
  });
  describe('#validateGeoJsonSelfIntersect', () => {
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
        new ValidationIssue(
          'The polygon is self intersecting',
          ValidationSeverity.Warning,
          ValidationIssueType.GeoJsonSelfIntersect
        ),
      ]);
      expect(result).toEqual(expected);
    });
  });
  describe('#validateGeoJsonTypes', () => {
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
        new ValidationIssue(
          'Type Point was not specified in the allowed types',
          ValidationSeverity.Warning,
          ValidationIssueType.GeoJsonInvalidType
        ),
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
        new ValidationIssue(
          'Type Polygon was not specified in the allowed types',
          ValidationSeverity.Warning,
          ValidationIssueType.GeoJsonInvalidType
        ),
      ]);
      expect(result).toEqual(expected);
    });
  });
  describe('#validateGeoJsonInGrid', () => {
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
        new ValidationIssue(
          'Point lon: -185 lat: 8.901183 is not inside the grid',
          ValidationSeverity.Error,
          ValidationIssueType.GeoJsonNotInGrid
        ),
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
        new ValidationIssue(
          'Point lon: -110 lat: 95 is not inside the grid',
          ValidationSeverity.Error,
          ValidationIssueType.GeoJsonNotInGrid
        ),
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
        new ValidationIssue(
          'Point lon: 185.6 lat: 10.1 is not inside the grid',
          ValidationSeverity.Error,
          ValidationIssueType.GeoJsonNotInGrid
        ),
      ]);
      expect(result).toEqual(expected);
    });
    it('Should validate a geojson MultiPolygon is inside the grid', () => {
      const geojson = {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [102, 2],
              [103, 2],
              [103, 3],
              [102, 3],
              [102, 2],
            ],
          ],
          [
            [
              [100, 0],
              [101, 0],
              [101, 1],
              [100, 1],
              [100, 0],
            ],
          ],
        ],
      };
      const result = validateGeoJsonInGrid(JSON.stringify(geojson));
      const expected = new ValidationResult(true);
      expect(result).toEqual(expected);
    });
    it('Should validate a geojson MultiPolygon is not inside the grid', () => {
      const geojson = {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [185, 2],
              [103, 2],
              [103, 3],
              [102, 3],
              [102, 2],
            ],
          ],
          [
            [
              [100, 0],
              [101, 0],
              [101, 1],
              [100, 1],
              [100, 0],
            ],
          ],
        ],
      };
      const result = validateGeoJsonInGrid(JSON.stringify(geojson));
      const expected = new ValidationResult(false, [
        new ValidationIssue(
          'Point lon: 185 lat: 2 is not inside the grid',
          ValidationSeverity.Error,
          ValidationIssueType.GeoJsonNotInGrid
        ),
      ]);
      expect(result).toEqual(expected);
    });
  });
  describe('#validateNumberOfVertices', () => {
    it('Should validate number of vertices is ok in a polygon', () => {
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

      const result = validateNumberOfVertices(JSON.stringify(geojson), 5);
      const expected = new ValidationResult(true);
      expect(result).toEqual(expected);
    });
    it('Should validate number of vertices is more than allowed in a polygon', () => {
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

      const result = validateNumberOfVertices(JSON.stringify(geojson), 4);
      const expected = new ValidationResult(false, [
        new ValidationIssue(
          'Polygon has more than 4 vertices',
          ValidationSeverity.Info,
          ValidationIssueType.GeoJsonTooManyCoordinates
        ),
      ]);
      expect(result).toEqual(expected);
    });
    it('Should validate a geojson MultiPolygon number of vertices is ok', () => {
      const geojson = {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [185, 2],
              [103, 2],
              [103, 3],
              [102, 3],
              [102, 2],
            ],
          ],
          [
            [
              [100, 0],
              [101, 0],
              [101, 1],
              [100, 1],
              [100, 0],
            ],
          ],
        ],
      };
      const result = validateNumberOfVertices(JSON.stringify(geojson), 5);
      const expected = new ValidationResult(true);
      expect(result).toEqual(expected);
    });
    it('Should validate a geojson MultiPolygon number of vertices is more than allowed', () => {
      const geojson = {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [185, 2],
              [103, 2],
              [103, 3],
              [102, 3],
              [102, 3],
              [102, 2],
            ],
          ],
          [
            [
              [100, 0],
              [101, 0],
              [101, 1],
              [100, 1],
              [100, 0],
            ],
          ],
        ],
      };
      const result = validateNumberOfVertices(JSON.stringify(geojson), 5);
      const expected = new ValidationResult(false, [
        new ValidationIssue(
          'Polygon has more than 5 vertices',
          ValidationSeverity.Info,
          ValidationIssueType.GeoJsonTooManyCoordinates
        ),
      ]);
      expect(result).toEqual(expected);
    });
  });
});
