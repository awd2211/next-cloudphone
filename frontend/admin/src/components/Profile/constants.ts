/**
 * Profile 常量和工具函数
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
  twoFactorEnabled?: boolean;
  createdAt: string;
  language?: string;
  theme?: string;
  metadata?: {
    language?: string;
    theme?: string;
  };
}

export const LANGUAGE_OPTIONS = [
  { value: 'zh-CN', label: '🇨🇳 简体中文' },
  { value: 'en-US', label: '🇺🇸 English' },
];

export const THEME_OPTIONS = [
  { value: 'auto', label: '跟随系统', icon: '🎨' },
  { value: 'light', label: '浅色模式', icon: '☀️' },
  { value: 'dark', label: '深色模式', icon: '🌙' },
];

/**
 * 获取语言显示名称
 */
export const getLanguageName = (lang?: string): string => {
  switch (lang) {
    case 'zh-CN':
      return '简体中文';
    case 'en-US':
      return 'English';
    default:
      return '简体中文';
  }
};

/**
 * 获取主题显示名称
 */
export const getThemeName = (theme?: string): string => {
  switch (theme) {
    case 'dark':
      return '深色模式';
    case 'light':
      return '浅色模式';
    case 'auto':
    default:
      return '跟随系统';
  }
};

/**
 * 应用主题设置
 */
export const applyTheme = (theme: string): void => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else if (theme === 'auto') {
    // 跟随系统主题
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
};
