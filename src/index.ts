console.log('Try npm run lint/fix!');

const longString =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer ut aliquet diam.';

const trailing = 'Semicolon';

const why = {am: 'I tabbed?'};

const iWish = "I didn't have a trailing space...";

const sicilian = true;

const vizzini = sicilian ? !sicilian : sicilian;

const re = /foo {3}bar/;

export function doSomeStuff(
  withThis: string,
  andThat: string,
  andThose: string[]
) {
  //function on one line
  if (!andThose.length) {
    return false;
  }
  console.log(withThis);
  console.log(andThat);
  console.dir(andThose);
  console.log(longString, trailing, why, iWish, vizzini, re);
  return;
}
// TODO: more examples

import {area, bboxToPolygon, distance, geodesicDistance} from './measurements';
// import * as turf from "@turf/turf";
import {Point, BoundingBox, Polygon} from './classes';

const from: Point = new Point(-70.86830735206604, 42.24527777890384);
const to: Point = new Point(-71.076744, 42.40466);
console.log(distance(from, to));

console.log(geodesicDistance(from, to));

const bbox: BoundingBox = new BoundingBox(
  -70.86830735206604,
  42.24527777890384,
  -71.076744,
  42.40466
);
console.log(bboxToPolygon(bbox));
// console.log(area(bboxToPolygon(bbox)));
const points = new Array<Point>();
points.push(new Point(125, -15));
points.push(new Point(113, -22));
points.push(new Point(154, -27));
points.push(new Point(144, -15));
points.push(new Point(125, -15));
const polygon = new Polygon(points);
console.log(area(polygon));

// var polygon2 = turf.polygon([[[125, -15], [113, -22], [154, -27], [144, -15], [125, -15]]]);

// console.log(turf.area(polygon2));
