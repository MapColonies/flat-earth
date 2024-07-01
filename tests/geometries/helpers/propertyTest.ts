import { fc } from '@fast-check/jest';

export const isSafeInteger = (value: number, { min = 0, max = Number.MAX_SAFE_INTEGER }): boolean =>
  Number.isSafeInteger(value) && value >= min && value <= max;

export const generateNonFinite = (): fc.Arbitrary<number> =>
  fc.oneof(fc.constant(Number.NaN), fc.constant(Number.POSITIVE_INFINITY), fc.constant(Number.NEGATIVE_INFINITY));
