import {BoundingBox} from '../classes';

/**
 * An interface for a coordinate reference system (CRS)
 */
export class CoordinateReferenceSystem {
  identifier: string;
  name: string;
  bounds: BoundingBox;
  epsg: string;

  constructor(
    identifier: string,
    name: string,
    epsg: string,
    bounds: BoundingBox
  ) {
    this.identifier = identifier;
    this.name = name;
    this.bounds = bounds;
    this.epsg = epsg;
  }
}
