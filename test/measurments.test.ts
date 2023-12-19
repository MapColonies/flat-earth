import * as measurements from '../src/measurements';
import {Point} from '../src/classes';

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
