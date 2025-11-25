/**
 * 字段配置单元测试
 *
 * 验证所有提供商的字段配置正确性
 */

import { describe, test, expect } from 'vitest';
import { providerFieldsConfig, getProviderFields, getSupportedProviderTypes } from './fieldConfigs';
import type { ProviderType, FieldConfig } from './types';

describe('providerFieldsConfig', () => {
  // 测试所有支持的提供商类型
  const supportedTypes: ProviderType[] = ['ipidea', 'kookeey', 'brightdata', 'oxylabs', 'iproyal', 'smartproxy'];

  test('所有提供商类型都有配置', () => {
    supportedTypes.forEach(type => {
      expect(providerFieldsConfig[type]).toBeDefined();
      expect(Array.isArray(providerFieldsConfig[type])).toBe(true);
      expect(providerFieldsConfig[type].length).toBeGreaterThan(0);
    });
  });

  test('getSupportedProviderTypes 返回所有类型', () => {
    const types = getSupportedProviderTypes();
    expect(types).toHaveLength(6);
    supportedTypes.forEach(type => {
      expect(types).toContain(type);
    });
  });

  test('getProviderFields 返回正确的字段', () => {
    supportedTypes.forEach(type => {
      const fields = getProviderFields(type);
      expect(fields).toBeDefined();
      expect(Array.isArray(fields)).toBe(true);
    });
  });

  test('getProviderFields 处理未知类型', () => {
    const fields = getProviderFields('unknown-type');
    expect(fields).toEqual([]);
  });
});

describe('IPIDEA 字段配置', () => {
  const fields = providerFieldsConfig.ipidea;

  test('有 7 个字段', () => {
    expect(fields).toHaveLength(7);
  });

  test('所有字段都有必需属性', () => {
    fields.forEach((field: FieldConfig) => {
      expect(field.name).toBeDefined();
      expect(field.label).toBeDefined();
      expect(typeof field.name).toBe('string');
      expect(typeof field.label).toBe('string');
    });
  });

  test('包含必填字段', () => {
    const requiredFields = fields.filter((f: FieldConfig) => f.required);
    expect(requiredFields.length).toBeGreaterThan(0);

    const requiredNames = requiredFields.map((f: FieldConfig) => f.name);
    expect(requiredNames).toContain('apiKey');
    expect(requiredNames).toContain('username');
    expect(requiredNames).toContain('password');
    expect(requiredNames).toContain('gateway');
  });

  test('网关地址有正则验证', () => {
    const gatewayField = fields.find((f: FieldConfig) => f.name === 'gateway');
    expect(gatewayField).toBeDefined();
    expect(gatewayField?.pattern).toBeDefined();
    expect(gatewayField?.patternMessage).toBeDefined();

    // 测试正则表达式
    const pattern = gatewayField?.pattern;
    if (pattern) {
      expect(pattern.test('abc123.lqz.na.ipidea.online')).toBe(true);
      expect(pattern.test('TEST456.lqz.na.ipidea.online')).toBe(true);
      expect(pattern.test('invalid.com')).toBe(false);
      expect(pattern.test('missing-lqz.na.ipidea.online')).toBe(false);
    }
  });

  test('端口字段有默认值和选项', () => {
    const portField = fields.find((f: FieldConfig) => f.name === 'port');
    expect(portField).toBeDefined();
    expect(portField?.type).toBe('select');
    expect(portField?.defaultValue).toBe(2336);
    expect(portField?.options).toBeDefined();
    expect(portField?.options?.length).toBeGreaterThanOrEqual(2);
  });

  test('API 地址有默认值', () => {
    const apiUrlField = fields.find((f: FieldConfig) => f.name === 'apiUrl');
    expect(apiUrlField).toBeDefined();
    expect(apiUrlField?.type).toBe('url');
    expect(apiUrlField?.defaultValue).toBe('https://api.ipidea.net');
  });

  test('代理类型有默认值和选项', () => {
    const proxyTypeField = fields.find((f: FieldConfig) => f.name === 'proxyType');
    expect(proxyTypeField).toBeDefined();
    expect(proxyTypeField?.type).toBe('select');
    expect(proxyTypeField?.defaultValue).toBe('residential');
    expect(proxyTypeField?.options).toBeDefined();
    expect(proxyTypeField?.options?.length).toBeGreaterThanOrEqual(4);
  });

  test('密码字段使用 password 类型', () => {
    const passwordFields = fields.filter((f: FieldConfig) =>
      f.name.toLowerCase().includes('password') || f.name === 'apiKey'
    );
    passwordFields.forEach(field => {
      expect(field.type).toBe('password');
    });
  });
});

describe('Kookeey 字段配置', () => {
  const fields = providerFieldsConfig.kookeey;

  test('有 3 个字段', () => {
    expect(fields).toHaveLength(3);
  });

  test('包含 accessId 和 token', () => {
    const fieldNames = fields.map((f: FieldConfig) => f.name);
    expect(fieldNames).toContain('accessId');
    expect(fieldNames).toContain('token');
    expect(fieldNames).toContain('apiUrl');
  });

  test('必填字段正确', () => {
    const requiredFields = fields.filter((f: FieldConfig) => f.required);
    expect(requiredFields.length).toBe(3); // 所有字段都必填
  });

  test('token 是密码类型', () => {
    const tokenField = fields.find((f: FieldConfig) => f.name === 'token');
    expect(tokenField).toBeDefined();
    expect(tokenField?.type).toBe('password');
  });

  test('API 地址有默认值', () => {
    const apiUrlField = fields.find((f: FieldConfig) => f.name === 'apiUrl');
    expect(apiUrlField).toBeDefined();
    expect(apiUrlField?.defaultValue).toBe('https://kookeey.com');
  });
});

describe('Bright Data 字段配置', () => {
  const fields = providerFieldsConfig.brightdata;

  test('有正确数量的字段', () => {
    expect(fields.length).toBeGreaterThanOrEqual(4);
  });

  test('包含基本认证字段', () => {
    const fieldNames = fields.map((f: FieldConfig) => f.name);
    expect(fieldNames).toContain('apiKey');
    expect(fieldNames).toContain('username');
    expect(fieldNames).toContain('password');
  });

  test('zone 字段有选项', () => {
    const zoneField = fields.find((f: FieldConfig) => f.name === 'zone');
    expect(zoneField).toBeDefined();
    expect(zoneField?.type).toBe('select');
    expect(zoneField?.options).toBeDefined();
    expect(zoneField?.defaultValue).toBe('residential');
  });
});

describe('其他提供商字段配置', () => {
  const providers: ProviderType[] = ['oxylabs', 'iproyal', 'smartproxy'];

  test.each(providers)('%s 有字段配置', (provider) => {
    const fields = providerFieldsConfig[provider];
    expect(fields).toBeDefined();
    expect(fields.length).toBeGreaterThan(0);
  });

  test.each(providers)('%s 包含基本认证字段', (provider) => {
    const fields = providerFieldsConfig[provider];
    const fieldNames = fields.map((f: FieldConfig) => f.name);

    expect(fieldNames).toContain('apiKey');
    expect(fieldNames).toContain('username');
    expect(fieldNames).toContain('password');
  });

  test.each(providers)('%s API 地址有默认值', (provider) => {
    const fields = providerFieldsConfig[provider];
    const apiUrlField = fields.find((f: FieldConfig) => f.name === 'apiUrl');

    expect(apiUrlField).toBeDefined();
    expect(apiUrlField?.type).toBe('url');
    expect(apiUrlField?.defaultValue).toBeDefined();
    expect(apiUrlField?.defaultValue).toMatch(/^https?:\/\//);
  });
});

describe('字段类型验证', () => {
  test('所有字段类型都是有效的', () => {
    const validTypes = ['text', 'password', 'number', 'select', 'url', undefined];

    Object.values(providerFieldsConfig).forEach(fields => {
      fields.forEach((field: FieldConfig) => {
        expect(validTypes).toContain(field.type);
      });
    });
  });

  test('select 类型字段都有 options', () => {
    Object.values(providerFieldsConfig).forEach(fields => {
      fields.forEach((field: FieldConfig) => {
        if (field.type === 'select') {
          expect(field.options).toBeDefined();
          expect(Array.isArray(field.options)).toBe(true);
          expect(field.options!.length).toBeGreaterThan(0);
        }
      });
    });
  });

  test('有 pattern 的字段都有 patternMessage', () => {
    Object.values(providerFieldsConfig).forEach(fields => {
      fields.forEach((field: FieldConfig) => {
        if (field.pattern) {
          expect(field.patternMessage).toBeDefined();
          expect(typeof field.patternMessage).toBe('string');
        }
      });
    });
  });
});

describe('字段提示信息', () => {
  test('所有字段都有占位符或提示', () => {
    Object.values(providerFieldsConfig).forEach(fields => {
      fields.forEach((field: FieldConfig) => {
        const hasHelp = field.placeholder || field.tooltip;
        // 至少有一个帮助信息
        expect(hasHelp).toBeTruthy();
      });
    });
  });

  test('必填字段有清晰的标签', () => {
    Object.values(providerFieldsConfig).forEach(fields => {
      fields.forEach((field: FieldConfig) => {
        if (field.required) {
          expect(field.label).toBeTruthy();
          expect(field.label.length).toBeGreaterThan(0);
        }
      });
    });
  });
});

describe('默认值验证', () => {
  test('端口默认值是数字', () => {
    const ipideaPort = providerFieldsConfig.ipidea.find((f: FieldConfig) => f.name === 'port');
    expect(typeof ipideaPort?.defaultValue).toBe('number');
    expect(ipideaPort?.defaultValue).toBeGreaterThan(0);
  });

  test('URL 默认值格式正确', () => {
    Object.values(providerFieldsConfig).forEach(fields => {
      fields.forEach((field: FieldConfig) => {
        if (field.type === 'url' && field.defaultValue) {
          expect(field.defaultValue).toMatch(/^https?:\/\//);
        }
      });
    });
  });

  test('select 默认值在 options 中', () => {
    Object.values(providerFieldsConfig).forEach(fields => {
      fields.forEach((field: FieldConfig) => {
        if (field.type === 'select' && field.defaultValue && field.options) {
          const values = field.options.map(opt => opt.value);
          expect(values).toContain(field.defaultValue);
        }
      });
    });
  });
});
