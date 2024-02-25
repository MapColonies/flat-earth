import { z } from 'zod';
import type { cornerOfOriginCode } from './constants';
import type {
  boundingBox,
  boundingBox2D,
  codeType,
  crs,
  keyword,
  languageString,
  point,
  point2D,
  tileMatrix,
  tileMatrixSet,
  tileMatrixSetJSON,
  uri,
  variableMatrixWidth,
} from './schemaValidations';

type URI = z.infer<typeof uri>;

/**
 * Name or code with an (optional) authority
 */
type CodeType = z.infer<typeof codeType>;

/**
 * Text string with the language of the string identified as recommended in the XML 1.0 W3C Recommendation, section 2.12
 */
type LanguageString = z.infer<typeof languageString>;

/**
 * Unordered list of one or more commonly used or formalised word(s) or phrase(s) used to describe the subject
 */
type Keyword = z.infer<typeof keyword>;

/**
 * A 3D Point in the CRS indicated elsewhere
 */
type Point = z.infer<typeof point>;

/**
 * A 2D Point in the CRS indicated elsewhere
 */
type Point2D = z.infer<typeof point2D>;

/**
 * The corner of the tile matrix (_topLeft_ or _bottomLeft_) used as the origin for numbering tile rows and columns. This corner is also a corner of the (0, 0) tile.
 */
type CornerOfOriginCode = (typeof cornerOfOriginCode)[number];

/**
 * Coordinate Reference System (CRS)
 */
type CRS = z.infer<typeof crs>;

/**
 * Minimum bounding rectangle surrounding a possibly 3D resource in the CRS indicated elsewhere
 */
type BoundingBox = z.infer<typeof boundingBox>;

/**
 * Minimum bounding rectangle surrounding a 2D resource in the CRS indicated elsewhere
 */
type BoundingBox2D = z.infer<typeof boundingBox2D>;

/**
 * Variable Matrix Width data structure
 */
type VariableMatrixWidth = z.infer<typeof variableMatrixWidth>;

/**
 * A tile matrix, usually corresponding to a particular zoom level of a TileMatrixSet
 */
type TileMatrix = z.infer<typeof tileMatrix>;

/**
 * A definition of a tile matrix set following the Tile Matrix Set standard
 */
type TileMatrixSet = z.infer<typeof tileMatrixSet>;

/**
 * JSON encoding for TileMatrixSet. described in https://docs.ogc.org/is/17-083r4/17-083r4.html#toc18
 */
export type TileMatrixSetJSON = z.infer<typeof tileMatrixSetJSON>;
