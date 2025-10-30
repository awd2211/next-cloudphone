/**
 * 环境变量验证工具
 *
 * 确保所有必需的环境变量在应用启动时都已配置
 */

interface EnvConfig {
  VITE_API_BASE_URL: string;
  VITE_WS_URL: string;
}

/**
 * 验证必需的环境变量
 * @throws {Error} 如果缺少必需的环境变量
 */
export function validateEnv(): EnvConfig {
  const requiredEnvVars = ['VITE_API_BASE_URL', 'VITE_WS_URL'] as const;

  const missing: string[] = [];

  for (const key of requiredEnvVars) {
    if (!import.meta.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `缺少必需的环境变量: ${missing.join(', ')}\n` +
      `请检查 .env 文件并确保所有必需的变量都已配置。`
    );
  }

  return {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_WS_URL: import.meta.env.VITE_WS_URL,
  };
}

/**
 * 获取环境变量（带类型安全）
 */
export const env = {
  get apiBaseUrl(): string {
    return import.meta.env.VITE_API_BASE_URL || '';
  },
  get wsUrl(): string {
    return import.meta.env.VITE_WS_URL || '';
  },
  get isDev(): boolean {
    return import.meta.env.DEV;
  },
  get isProd(): boolean {
    return import.meta.env.PROD;
  },
};
