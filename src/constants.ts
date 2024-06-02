import type { TileMatrixSetJSON } from './tiles/types';

/* eslint-disable @typescript-eslint/naming-convention */
export const CRS_URI = {
  OGC_CRS_84_0: 'http://www.opengis.net/def/crs/OGC/0/CRS84',
  OGC_CRS_84_1_3: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84',
} as const;
export const DEFAULT_CRS = CRS_URI['OGC_CRS_84_0'];
export const SUPPORTED_CRS: TileMatrixSetJSON['crs'][] = [CRS_URI['OGC_CRS_84_0'], CRS_URI['OGC_CRS_84_1_3']];
