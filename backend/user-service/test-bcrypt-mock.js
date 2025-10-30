// 测试bcrypt mock是否正常工作
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const bcrypt = require('bcryptjs');

test('bcrypt mock works', async () => {
  bcrypt.compare.mockResolvedValue(true);
  const result = await bcrypt.compare('password', 'hash');
  console.log('bcrypt.compare result:', result);
  expect(result).toBe(true);
});
