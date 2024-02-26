import type { cornerOfOriginCode } from './constants';

export type URI = string;

/**
 * A 3D Point in the CRS indicated elsewhere
 */
export type Point = [number, number, number?];

/**
 * A 2D Point in the CRS indicated elsewhere
 */
export type Point2D = [number, number];

/**
 * Text string with the language of the string identified as recommended in the XML 1.0 W3C Recommendation, section 2.12
 */
export type LanguageString = {
  /**
   * Human-language string
   */
  value: string;
  /**
   * Language (in {@link https://www.rfc-editor.org/rfc/rfc4646.txt | IETF RFC 4646} syntax) of the string
   */
  lang?: string;
};

/**
 * Name or code with an (optional) authority
 */
export type CodeType = {
  code: string;
  /**
   * Dictionary, thesaurus, or authority for the name or code, such as the organisation who assigned the value, or the dictionary from which it is taken
   */
  codeSpace?: URI;
};

/**
 * Unordered list of one or more commonly used or formalised word(s) or phrase(s) used to describe the subject
 */
export type Keyword = {
  /**
   * Unordered list of one or more commonly used or formalized word(s) or phrase(s) used to describe a dataset
   */
  keyword?: LanguageString[];
  /**
   * Type of the keyword
   */
  type?: CodeType;
};

/**
 * Coordinate Reference System (CRS)
 */
export type CRS =
  /**
   * Simplification of the object into a url if the other properties are not present
   */
  | string
  | {
      /**
       * Reference to one coordinate reference system (CRS)
       */
      uri: URI;
    }
  | {
      /**
       * An object defining the CRS using the JSON encoding for Well-known text representation of coordinate reference systems 2.0
       */
      wkt: string;
    }
  | {
      /**
       * A reference system data structure as defined in the MD_ReferenceSystem of the ISO 19115
       */
      referenceSystem: object;
    };

/**
 * Minimum bounding rectangle surrounding a possibly 3D resource in the CRS indicated elsewhere
 */
export type BoundingBox = {
  /**
   * Coordinates of bounding box corner at which the value of each coordinate normally is the algebraic minimum within this bounding box
   */
  lowerLeft: Point;
  /**
   * Coordinates of bounding box corner at which the value of each coordinate normally is the algebraic maximum within this bounding box
   */
  upperRight: Point;
  /**
   * Reference or a definition of the CRS used by the lowerRight and upperRight coordinates
   */
  crs?: CRS;
  /**
   * Ordered list of names of the dimensions defined in the CRS
   */
  orderedAxes?: [string, string, string?];
};

/**
 * Minimum bounding rectangle surrounding a 2D resource in the CRS indicated elsewhere
 */
export type BoundingBox2D = {
  /**
   * Coordinates of bounding box corner at which the value of each coordinate normally is the algebraic minimum within this bounding box
   */
  lowerLeft: Point2D;
  /**
   * Coordinates of bounding box corner at which the value of each coordinate normally is the algebraic maximum within this bounding box
   */
  upperRight: Point2D;
  /**
   * Reference or a definition of the CRS used by the lowerRight and upperRight coordinates
   */
  crs?: CRS;
  /**
   * Ordered list of names of the dimensions defined in the CRS
   */
  orderedAxes?: [string, string];
};

/**
 * Variable Matrix Width data structure
 */
export type VariableMatrixWidth = {
  /**
   * Number of tiles in width that coalesce in a single tile for these rows
   */
  coalesce: number;
  /**
   * First tile row where the coalescence factor applies for this tilematrix
   */
  minTileRow: number;
  /**
   * Last tile row where the coalescence factor applies for this tilematrix
   */
  maxTileRow: number;
};

/**
 * The corner of the tile matrix (_topLeft_ or _bottomLeft_) used as the origin for numbering tile rows and columns. This corner is also a corner of the (0, 0) tile
 */
export type CornerOfOriginCode = (typeof cornerOfOriginCode)[number];

/**
 * A tile matrix, usually corresponding to a particular zoom level of a TileMatrixSet
 */
export type TileMatrix = {
  /**
   * Title of this tile matrix, normally used for display to a human
   */
  title?: LanguageString;
  /**
   * Brief narrative description of this tile matrix set, normally available for display to a human
   */
  description?: LanguageString;
  /**
   * Unordered list of one or more commonly used or formalized word(s) or phrase(s) used to describe this dataset
   */
  keywords?: Keyword[];
  /**
   * Identifier selecting one of the scales defined in the TileMatrixSet and representing the scaleDenominator the tile. Implementation of 'identifier'
   */
  identifier: CodeType;
  /**
   * Scale denominator of this tile matrix
   */
  scaleDenominator: number;
  /**
   * Cell size of this tile matrix
   */
  cellSize: number;
  /**
   * The corner of the tile matrix (_topLeft_ or _bottomLeft_) used as the origin for numbering tile rows and columns. This corner is also a corner of the (0, 0) tile
   */
  cornerOfOrigin?: CornerOfOriginCode;
  /**
   * Precise position in CRS coordinates of the corner of origin (e.g. the top-left corner) for this tile matrix. This position is also a corner of the (0, 0) tile. In previous version, this was 'topLeftCorner' and 'cornerOfOrigin' did not exist
   */
  pointOfOrigin: Point2D;
  /**
   * Width of each tile of this tile matrix in pixels
   */
  tileWidth: number;
  /**
   * Height of each tile of this tile matrix in pixels
   */
  tileHeight: number;
  /**
   * Width of the matrix (number of tiles in width)
   */
  matrixHeight: number;
  /**
   * Height of the matrix (number of tiles in height)
   */
  matrixWidth: number;
  /**
   * Describes the rows that has variable matrix width
   */
  variableMatrixWidths?: VariableMatrixWidth[];
};

/**
 * A definition of a tile matrix set following the Tile Matrix Set standard
 */
export type TileMatrixSet = {
  /**
   * Title of this tile matrix set, normally used for display to a human
   */
  title?: LanguageString;
  /**
   * Brief narrative description of this tile matrix set, normally available for display to a human
   */
  description?: LanguageString;
  /**
   * Unordered list of one or more commonly used or formalized word(s) or phrase(s) used to describe this tile matrix set
   */
  keywords?: Keyword[];
  /**
   * Tile matrix set identifier. Implementation of 'identifier'
   */
  identifier?: CodeType;
  /**
   * Reference to an official source for this tileMatrixSet
   */
  uri?: URI;
  /**
   * This element is not intended to overwrite the CRS axis order but to make it visible to developers by repeating information that is already contained in the CRS definition
   */
  orderedAxes?: [string, string];
  /**
   * Coordinate Reference System (CRS)
   */
  crs: CRS;
  /**
   * Reference to a well-known scale set
   */
  wellKnownScaleSet?: string;
  /**
   * Minimum bounding rectangle surrounding the tile matrix set, in the supported CRS
   */
  boundingBox?: BoundingBox2D;
  /**
   * Describes scale levels and its tile matrices
   */
  tileMatrices: TileMatrix[];
};

/**
 * JSON encoding for TileMatrixSet. described in https://docs.ogc.org/is/17-083r4/17-083r4.html#toc18
 */
export type TileMatrixSetJSON = Omit<TileMatrixSet, 'title' | 'description' | 'keywords' | 'identifier' | 'crs' | 'boundingBox' | 'tileMatrices'> & {
  /**
   * Title of this tile matrix set, normally used for display to a human
   */
  title?: string;
  /**
   * Brief narrative description of this tile matrix set, normally available for display to a human
   */
  description?: string;
  /**
   * Unordered list of one or more commonly used or formalized word(s) or phrase(s) used to describe this tile matrix set
   */
  keywords?: string[];
  /**
   * Tile matrix set identifier
   */
  id?: string;
  /**
   * Coordinate Reference System (CRS)
   */
  crs: Exclude<CRS, { wkt: string }> | { wkt: object }; // TODO: currently not strongly typed as defined here https://proj.org/en/latest/schemas/v0.6/projjson.schema.json. more info found on proj website https://proj.org/specifications/projjson.html
  /**
   * Minimum bounding rectangle surrounding the tile matrix set, in the supported CRS
   */
  boundingBox?: [number, number, number, number];
  /**
   * Describes scale levels and its tile matrices
   */
  tileMatrices: (Omit<TileMatrix, 'identifier'> & { id: string })[];
};
