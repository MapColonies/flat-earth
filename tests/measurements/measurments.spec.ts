import { BoundingBox, Line, Point, Polygon } from '../../src/classes';
import { boundingBoxToPolygon, geometryToBoundingBox } from '../../src/converters/geometry_converters';
import * as measurements from '../../src/measurements/measurements';

test('Haversine distance', () => {
  const from = new Point([0, 0]);
  const to = new Point([1, 0]);
  expect(measurements.distance(from, to)).toBe(111195.0802335329);
});

test('Geodesic distance', () => {
  const from = new Point([0, 0]);
  const to = new Point([1, 0]);
  expect(measurements.geodesicDistance(from, to)).toBe(111319.49079327357);
});

test('Area of Australia polygon', () => {
  const polygon = new Polygon([
    [
      [125, -15],
      [113, -22],
      [117, -37],
      [130, -33],
      [148, -39],
      [154, -27],
      [144, -15],
      [125, -15],
    ],
  ]);
  expect(Math.round(measurements.area(polygon))).toBe(7748891609977);
});

test('Polygon geometry to bounding box', () => {
  const polygon = new Polygon([
    [
      [125, -15],
      [113, -22],
      [117, -37],
      [130, -33],
      [148, -39],
      [154, -27],
      [144, -15],
      [125, -15],
    ],
  ]);
  const bbox = geometryToBoundingBox(polygon);
  expect(bbox.min.lon).toBe(113);
  expect(bbox.min.lat).toBe(-39);
  expect(bbox.max.lon).toBe(154);
  expect(bbox.max.lat).toBe(-15);
});

test('Point geometry to bounding box', () => {
  const point = new Point([125, -15]);
  const bbox = geometryToBoundingBox(point);
  expect(bbox.min.lon).toBe(125);
  expect(bbox.min.lat).toBe(-15);
  expect(bbox.max.lon).toBe(125);
  expect(bbox.max.lat).toBe(-15);
});

test('Line geometry to bounding box', () => {
  const line = new Line([
    [125, -15],
    [113, -22],
  ]);
  const bbox = geometryToBoundingBox(line);
  expect(bbox.min.lon).toBe(113);
  expect(bbox.min.lat).toBe(-22);
  expect(bbox.max.lon).toBe(125);
  expect(bbox.max.lat).toBe(-15);
});

test('Bounding box to polygon', () => {
  const bbox = new BoundingBox([113, -39, 154, -15]);
  const polygon = boundingBoxToPolygon(bbox);
  expect(polygon.coordinates[0]).toHaveLength(5);
  expect(polygon.coordinates[0][0]).toStrictEqual([113, -39]);
  expect(polygon.coordinates[0][1]).toStrictEqual([154, -39]);
  expect(polygon.coordinates[0][2]).toStrictEqual([154, -15]);
  expect(polygon.coordinates[0][3]).toStrictEqual([113, -15]);
  expect(polygon.coordinates[0][4]).toStrictEqual([113, -39]);
});
