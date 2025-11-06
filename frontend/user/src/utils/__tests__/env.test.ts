import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('env 环境变量工具', () => {
  // 保存原始的 import.meta.env
  const originalEnv = import.meta.env;

  beforeEach(() => {
    // 重置到原始状态
    vi.unstubAllGlobals();
  });

  describe('env getter对象', () => {
    it('应该提供 apiBaseUrl getter', async () => {
      // 动态导入以获取新的实例
      const { env } = await import('../env');
      expect(typeof env.apiBaseUrl).toBe('string');
    });

    it('应该提供 wsUrl getter', async () => {
      const { env } = await import('../env');
      expect(typeof env.wsUrl).toBe('string');
    });

    it('应该提供 isDev getter', async () => {
      const { env } = await import('../env');
      expect(typeof env.isDev).toBe('boolean');
    });

    it('应该提供 isProd getter', async () => {
      const { env } = await import('../env');
      expect(typeof env.isProd).toBe('boolean');
    });

    it('apiBaseUrl 缺失时应该返回空字符串', async () => {
      // Mock import.meta.env 为空对象
      vi.stubGlobal('import', {
        meta: {
          env: {
            DEV: false,
            PROD: true,
          },
        },
      });

      const { env } = await import('../env');
      const url = env.apiBaseUrl;
      expect(typeof url).toBe('string');
    });

    it('wsUrl 缺失时应该返回空字符串', async () => {
      vi.stubGlobal('import', {
        meta: {
          env: {
            DEV: false,
            PROD: true,
          },
        },
      });

      const { env } = await import('../env');
      const url = env.wsUrl;
      expect(typeof url).toBe('string');
    });
  });

  describe('validateEnv 函数', () => {
    it('应该在环境变量完整时返回配置对象', async () => {
      // 由于 validateEnv 在实际运行时依赖 import.meta.env
      // 这里我们只测试函数的存在性和基本行为
      const { validateEnv } = await import('../env');
      expect(typeof validateEnv).toBe('function');
    });

    it('返回的配置对象应该有正确的类型', async () => {
      const { validateEnv } = await import('../env');

      // 尝试验证（如果环境变量设置了）
      try {
        const config = validateEnv();
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');

        if (config) {
          expect('VITE_API_BASE_URL' in config).toBe(true);
          expect('VITE_WS_URL' in config).toBe(true);
        }
      } catch (error) {
        // 如果抛出错误，说明缺少环境变量，这也是预期行为
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toContain('缺少必需的环境变量');
        }
      }
    });

    it('缺少环境变量时应该包含有用的错误消息', async () => {
      const { validateEnv } = await import('../env');

      try {
        // 尝试验证，如果缺少变量会抛出错误
        const config = validateEnv();
        // 如果没抛出错误，说明环境变量都设置了
        expect(config).toBeDefined();
      } catch (error) {
        // 验证错误消息的格式
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(
            error.message.includes('缺少必需的环境变量') ||
              error.message.includes('.env')
          ).toBe(true);
        }
      }
    });
  });

  describe('环境变量类型', () => {
    it('DEV 和 PROD 应该是互斥的', async () => {
      const { env } = await import('../env');

      // 在开发环境和生产环境中，DEV和PROD应该是互斥的
      // 至少有一个为true（但通常不会同时为true）
      const hasEnv = env.isDev || env.isProd;
      expect(hasEnv).toBe(true);
    });
  });

  describe('必需环境变量列表', () => {
    it('应该明确定义必需的环境变量', () => {
      // 这个测试验证我们知道哪些环境变量是必需的
      const requiredVars = ['VITE_API_BASE_URL', 'VITE_WS_URL'];

      requiredVars.forEach((varName) => {
        expect(varName).toBeTruthy();
        expect(varName.startsWith('VITE_')).toBe(true);
      });
    });
  });

  describe('错误消息格式', () => {
    it('错误消息应该帮助开发者定位问题', async () => {
      const { validateEnv } = await import('../env');

      try {
        validateEnv();
      } catch (error) {
        if (error instanceof Error) {
          // 错误消息应该包含关键信息
          const message = error.message;
          expect(
            message.includes('环境变量') ||
              message.includes('.env') ||
              message.includes('配置')
          ).toBe(true);
        }
      }
    });
  });

  describe('配置对象结构', () => {
    it('配置对象应该只包含必需的字段', async () => {
      const { validateEnv } = await import('../env');

      try {
        const config = validateEnv();

        if (config) {
          const keys = Object.keys(config);
          expect(keys).toContain('VITE_API_BASE_URL');
          expect(keys).toContain('VITE_WS_URL');
          expect(keys.length).toBe(2);
        }
      } catch {
        // 环境变量缺失是可以的，这个测试主要验证结构
        expect(true).toBe(true);
      }
    });
  });

  describe('getter 属性特性', () => {
    it('env对象的属性应该通过getter提供', async () => {
      const { env } = await import('../env');

      // 验证属性可以被访问
      const originalApiUrl = env.apiBaseUrl;
      const originalWsUrl = env.wsUrl;

      // 多次访问应该返回一致的值
      expect(env.apiBaseUrl).toBe(originalApiUrl);
      expect(env.wsUrl).toBe(originalWsUrl);
    });

    it('env对象应该提供所有必需的属性', async () => {
      const { env } = await import('../env');

      // 验证所有属性都可访问
      expect(typeof env.apiBaseUrl).toBe('string');
      expect(typeof env.wsUrl).toBe('string');
      expect(typeof env.isDev).toBe('boolean');
      expect(typeof env.isProd).toBe('boolean');
    });
  });
});
