// 简单的独立测试来验证bcrypt mock
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';

describe('bcrypt compare mock test', () => {
  beforeEach(() => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$test');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  it('should return true', async () => {
    const result = await bcrypt.compare('password', 'hash');
    expect(result).toBe(true);
  });
});
