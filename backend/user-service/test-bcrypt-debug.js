// 测试 bcrypt mock 是否正常工作
const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn(),
};
jest.mock('bcryptjs', () => mockBcrypt);

const bcrypt = require('bcryptjs');

test('bcrypt mock works', async () => {
  mockBcrypt.compare.mockResolvedValue(true);
  const result = await bcrypt.compare('test', 'hash');
  console.log('Compare result:', result);
  console.log('Mock called:', mockBcrypt.compare.mock.calls.length);
  expect(result).toBe(true);
});
