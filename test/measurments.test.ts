import * as measurements from '../src/measurements';
import {Point, Polygon} from '../src/classes';

test('Haversine distance', () => {
  const from = new Point(0, 0);
  const to = new Point(1, 0);
  expect(measurements.distance(from, to)).toBe(111195.0802335329);
});

test('Geodesic distance', () => {
  const from = new Point(0, 0);
  const to = new Point(1, 0);
  expect(measurements.geodesicDistance(from, to)).toBe(111319.49079327357);
});

test('Area of Australia polygon', () => {
  const points = new Array<Point>();
  points.push(new Point(125, -15));
  points.push(new Point(113, -22));
  points.push(new Point(117, -37));
  points.push(new Point(130, -33));
  points.push(new Point(148, -39));
  points.push(new Point(154, -27));
  points.push(new Point(144, -15));
  points.push(new Point(125, -15));
  const polygon = new Polygon(points);
  expect(Math.round(measurements.area(polygon))).toBe(7748891609977);
});

test('Polygon geometry to bounding box', () => {
  const points = new Array<Point>();
  points.push(new Point(125, -15));
  points.push(new Point(113, -22));
  points.push(new Point(117, -37));
  points.push(new Point(130, -33));
  points.push(new Point(148, -39));
  points.push(new Point(154, -27));
  points.push(new Point(144, -15));
  points.push(new Point(125, -15));
  const polygon = new Polygon(points);
  const bbox = measurements.geometryToBoundingBox(polygon);
  expect(bbox.min.lon).toBe(113);
  expect(bbox.min.lat).toBe(-39);
  expect(bbox.max.lon).toBe(154);
  expect(bbox.max.lat).toBe(-15);
});

test('Point geometry to bounding box', () => {
  const point = new Point(125, -15);
  const bbox = measurements.geometryToBoundingBox(point);
  expect(bbox.min.lon).toBe(125);
  expect(bbox.min.lat).toBe(-15);
  expect(bbox.max.lon).toBe(125);
  expect(bbox.max.lat).toBe(-15);
});
