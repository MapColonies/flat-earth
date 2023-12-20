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
