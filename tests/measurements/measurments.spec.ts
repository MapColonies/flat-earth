import { Line, Point, Polygon } from '../../src/classes';
import { geometryToBoundingBox } from '../../src/converters/geometry_converters';
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
