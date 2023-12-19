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

import {area, distance, geodesicDistance} from "./measurments";
import * as turf from "@turf/turf";
import {Point} from "./interfaces";

var from: Point = {coordinates:{lon:-70.86830735206604, lat:42.24527777890384}};
var to : Point = {coordinates:{lon:-71.076744, lat:42.40466}};
console.log(distance(from,to));

console.log(geodesicDistance(from,to));
