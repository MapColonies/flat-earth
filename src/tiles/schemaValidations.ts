import { z } from 'zod';
import { cornerOfOriginCode } from './constants';

export const uri = z.string().url();

export const point = z.union([z.tuple([z.number(), z.number(), z.number()]), z.tuple([z.number(), z.number()])]);

export const point2D = z.tuple([z.number(), z.number()]);

export const languageString = z
  .object({
    /**
     * Human-language string
     */
    value: z.string(),
    /**
     * Language (in {@link https://www.rfc-editor.org/rfc/rfc4646.txt | IETF RFC 4646} syntax) of the string
     */
    lang: z.string().optional(),
  })
  .strict();

export const codeType = z
  .object({
    code: z.string(),
    /**
     * Dictionary, thesaurus, or authority for the name or code, such as the organisation who assigned the value, or the dictionary from which it is taken
     */
    codeSpace: uri.optional(),
  })
  .strict();

export const keyword = z
  .object({
    /**
     * Unordered list of one or more commonly used or formalized word(s) or phrase(s) used to describe a dataset
     */
    keyword: languageString.array().nonempty().optional(),
    /**
     * Type of the keyword
     */
    type: codeType.optional(),
  })
  .strict();

export const crs = z.union([
  /**
   * Simplification of the object into a url if the other properties are not present
   */
  uri,
  z
    .object({
      /**
       * Reference to one coordinate reference system (CRS)
       */
      uri: uri,
    })
    .strict(),
  z
    .object({
      /**
       * An object defining the CRS using the JSON encoding for Well-known text representation of coordinate reference systems 2.0
       */
      wkt: z.string(),
    })
    .strict(),
  z
    .object({
      /**
       * A reference system data structure as defined in the MD_ReferenceSystem of the ISO 19115
       */
      referenceSystem: z.record(z.any()),
    })
    .strict(),
]);

// This is somewhat a duplicate of crs validation only with the change in wkt object validation type, due to the lack of Exclude utility type equivalent method in Zod https://github.com/colinhacks/zod/issues/829
export const crsJSON = z.union([
  /**
   * Simplification of the object into a url if the other properties are not present
   */
  uri,
  z
    .object({
      /**
       * Reference to one coordinate reference system (CRS)
       */
      uri: uri,
    })
    .strict(),
  z
    .object({
      /**
       * An object defining the CRS using the JSON encoding for Well-known text representation of coordinate reference systems 2.0
       */
      wkt: z.record(z.any()), // TODO: currently not strongly typed as defined here https://proj.org/en/latest/schemas/v0.6/projjson.schema.json. more info found on proj website https://proj.org/specifications/projjson.htm
    })
    .strict(),
  z
    .object({
      /**
       * A reference system data structure as defined in the MD_ReferenceSystem of the ISO 19115
       */
      referenceSystem: z.record(z.any()),
    })
    .strict(),
]);

export const boundingBox = z
  .object({
    /**
     * Coordinates of bounding box corner at which the value of each coordinate normally is the algebraic minimum within this bounding box
     */
    lowerLeft: point,
    /**
     * Coordinates of bounding box corner at which the value of each coordinate normally is the algebraic maximum within this bounding box
     */
    upperRight: point,
    /**
     * Reference or a definition of the CRS used by the lowerRight and upperRight coordinates
     */
    crs: crs.optional(),
    /**
     * Ordered list of names of the dimensions defined in the CRS
     */
    orderedAxes: z.union([z.tuple([z.string(), z.string(), z.string()]), z.tuple([z.string(), z.string()])]).optional(),
  })
  .strict();

export const boundingBox2D = z
  .object({
    /**
     * Coordinates of bounding box corner at which the value of each coordinate normally is the algebraic minimum within this bounding box
     */
    lowerLeft: point2D,
    /**
     * Coordinates of bounding box corner at which the value of each coordinate normally is the algebraic maximum within this bounding box
     */
    upperRight: point2D,
    /**
     * Reference or a definition of the CRS used by the lowerRight and upperRight coordinates
     */
    crs: crs.optional(),
    /**
     * Ordered list of names of the dimensions defined in the CRS
     */
    orderedAxes: z.tuple([z.string(), z.string()]).optional(),
  })
  .strict();

export const variableMatrixWidth = z
  .object({
    /**
     * Number of tiles in width that coalesce in a single tile for these rows
     */
    coalesce: z.number(),
    /**
     * First tile row where the coalescence factor applies for this tilematrix
     */
    minTileRow: z.number(),
    /**
     * Last tile row where the coalescence factor applies for this tilematrix
     */
    maxTileRow: z.number(),
  })
  .strict();

export const tileMatrix = z
  .object({
    /**
     * Title of this tile matrix, normally used for display to a human
     */
    title: languageString.optional(),
    /**
     * Brief narrative description of this tile matrix set, normally available for display to a human
     */
    description: languageString.optional(),
    /**
     * Unordered list of one or more commonly used or formalized word(s) or phrase(s) used to describe this dataset
     */
    keywords: keyword.array().nonempty().optional(),
    /**
     * Identifier selecting one of the scales defined in the TileMatrixSet and representing the scaleDenominator the tile. Implementation of 'identifier'
     */
    identifier: codeType,
    /**
     * Scale denominator of this tile matrix
     */
    scaleDenominator: z.number().positive(),
    /**
     * Cell size of this tile matrix
     */
    cellSize: z.number().positive(),
    /**
     * The corner of the tile matrix (_topLeft_ or _bottomLeft_) used as the origin for numbering tile rows and columns. This corner is also a corner of the (0, 0) tile.
     */
    cornerOfOrigin: z.enum(cornerOfOriginCode).optional().default('topLeft'),
    /**
     * Precise position in CRS coordinates of the corner of origin (e.g. the top-left corner) for this tile matrix. This position is also a corner of the (0, 0) tile. In previous version, this was 'topLeftCorner' and 'cornerOfOrigin' did not exist.
     */
    pointOfOrigin: point2D,
    /**
     * Width of each tile of this tile matrix in pixels
     */
    tileWidth: z.number().int().gte(1),
    /**
     * Height of each tile of this tile matrix in pixels
     */
    tileHeight: z.number().int().gte(1),
    /**
     * Width of the matrix (number of tiles in width)
     */
    matrixHeight: z.number().int().gte(1),
    /**
     * Height of the matrix (number of tiles in height)
     */
    matrixWidth: z.number().int().gte(1),
    /**
     * Describes the rows that has variable matrix width
     */
    variableMatrixWidths: variableMatrixWidth.array().nonempty().optional(),
  })
  .strict();

export const tileMatrixSet = z
  .object({
    /**
     * Title of this tile matrix set, normally used for display to a human
     */
    title: languageString.optional(),
    /**
     * Brief narrative description of this tile matrix set, normally available for display to a human
     */
    description: languageString.optional(),
    /**
     * Unordered list of one or more commonly used or formalized word(s) or phrase(s) used to describe this tile matrix set
     */
    keywords: keyword.array().nonempty().optional(),
    /**
     * Tile matrix set identifier. Implementation of 'identifier'
     */
    identifier: codeType.optional(),
    /**
     * Reference to an official source for this tileMatrixSet
     */
    uri: uri.optional(),
    /**
     * This element is not intended to overwrite the CRS axis order but to make it visible to developers by repeating information that is already contained in the CRS definition.
     */
    orderedAxes: z.tuple([z.string(), z.string()]).optional(),
    /**
     * Coordinate Reference System (CRS)
     */
    crs: crs,
    /**
     * Reference to a well-known scale set
     */
    wellKnownScaleSet: uri.optional(),
    /**
     * Minimum bounding rectangle surrounding the tile matrix set, in the supported CRS
     */
    boundingBox: boundingBox2D.optional(),
    /**
     * Describes scale levels and its tile matrices
     */
    tileMatrices: tileMatrix.array().nonempty(),
  })
  .strict();

export const tileMatrixSetJSON = tileMatrixSet
  .omit({
    title: true,
    description: true,
    keywords: true,
    identifier: true,
    crs: true,
    boundingBox: true,
    tileMatrices: true,
  })
  .merge(
    z.object({
      /**
       * Title of this tile matrix set, normally used for display to a human
       */
      title: z.string().optional(),
      /**
       * Brief narrative description of this tile matrix set, normally available for display to a human
       */
      description: z.string().optional(),
      /**
       * Unordered list of one or more commonly used or formalized word(s) or phrase(s) used to describe this tile matrix set
       */
      keywords: z.string().array().optional(),
      /**
       * Tile matrix set identifier
       */
      id: z.string().optional(),
      /**
       * Coordinate Reference System (CRS)
       */
      crs: crsJSON,
      /**
       * Minimum bounding rectangle surrounding the tile matrix set, in the supported CRS
       */
      boundingBox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
      /**
       * Describes scale levels and its tile matrices
       */
      tileMatrices: tileMatrix
        .omit({ identifier: true })
        .merge(z.object({ id: z.string() }))
        .array()
        .nonempty(),
    })
  )
  .strict();
