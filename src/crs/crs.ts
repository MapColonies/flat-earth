import type { ConcreteCoordRefSys, ConcreteCoordRefSysJSON } from '../geometries/types';

export function decodeFromJSON(coordRefSysJSON: ConcreteCoordRefSysJSON['coordRefSys']): ConcreteCoordRefSys['coordRefSys'] {
  return typeof coordRefSysJSON === 'object' && 'wkt' in coordRefSysJSON ? { wkt: JSON.stringify(coordRefSysJSON.wkt) } : coordRefSysJSON;
}

export function encodeToJSON(coordRefSys: ConcreteCoordRefSys['coordRefSys']): ConcreteCoordRefSysJSON['coordRefSys'] {
  return typeof coordRefSys === 'object' && 'wkt' in coordRefSys ? { wkt: JSON.parse(coordRefSys.wkt) as Record<string, unknown> } : coordRefSys;
}
