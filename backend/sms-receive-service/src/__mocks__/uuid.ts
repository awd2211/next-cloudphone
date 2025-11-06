/**
 * Mock for uuid package to avoid ESM import issues in Jest
 */

let counter = 0;

export const v4 = (): string => {
  counter++;
  return `00000000-0000-4000-8000-${counter.toString().padStart(12, '0')}`;
};

export const v1 = v4;
export const v3 = v4;
export const v5 = v4;
export const NIL = '00000000-0000-0000-0000-000000000000';
export const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

export default {
  v1,
  v3,
  v4,
  v5,
  NIL,
  MAX,
};
