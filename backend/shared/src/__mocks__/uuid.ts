// Mock implementation of uuid for Jest tests
export const v4 = jest.fn(() => 'mock-uuid-v4');
export const v1 = jest.fn(() => 'mock-uuid-v1');
export const v3 = jest.fn(() => 'mock-uuid-v3');
export const v5 = jest.fn(() => 'mock-uuid-v5');
export const validate = jest.fn(() => true);
export const parse = jest.fn((uuid) => Buffer.from(uuid));
