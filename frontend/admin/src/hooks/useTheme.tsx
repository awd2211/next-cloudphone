/**
 * 主题切换 Hook
 *
 * 管理全局主题状态 (亮色/暗色),支持 localStorage 持久化
 */

import { useState, useEffect, useCallback } from 'react';
import { theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';

const { darkAlgorithm, defaultAlgorithm } = antdTheme;

export type ThemeMode = 'light' | 'dark' | 'auto';

const THEME_STORAGE_KEY = 'cloudphone-theme-mode';

/**
 * 获取系统主题偏好
 */
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';

  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  return darkModeQuery.matches ? 'dark' : 'light';
};

/**
 * 获取保存的主题模式
 */
const getSavedThemeMode = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && ['light', 'dark', 'auto'].includes(saved)) {
      return saved as ThemeMode;
    }
  } catch (_error) {
    console.warn('Failed to load theme mode from localStorage:', error);
  }
  return 'auto'; // 默认跟随系统
};

/**
 * 计算实际使用的主题
 */
const getActualTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'auto') {
    return getSystemTheme();
  }
  return mode;
};

export interface UseThemeResult {
  /** 当前主题模式 (light/dark/auto) */
  mode: ThemeMode;

  /** 实际使用的主题 (light/dark) */
  actualTheme: 'light' | 'dark';

  /** 是否为暗色主题 */
  isDark: boolean;

  /** 切换主题模式 */
  setMode: (mode: ThemeMode) => void;

  /** 切换主题 (light ⇄ dark) */
  toggleTheme: () => void;

  /** Ant Design 主题配置 */
  antdTheme: ThemeConfig;
}

/**
 * 主题切换 Hook
 *
 * @example
 * ```tsx
 * const { mode, actualTheme, isDark, setMode, toggleTheme, antdTheme } = useTheme();
 *
 * return (
 *   <ConfigProvider theme={antdTheme}>
 *     <Button onClick={toggleTheme}>
 *       {isDark ? '切换到亮色' : '切换到暗色'}
 *     </Button>
 *   </ConfigProvider>
 * );
 * ```
 */
export const useTheme = (): UseThemeResult => {
  const [mode, setModeState] = useState<ThemeMode>(getSavedThemeMode);
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(() => getActualTheme(mode));

  // 保存主题模式到 localStorage
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (_error) {
      console.warn('Failed to save theme mode to localStorage:', error);
    }
  }, []);

  // 切换主题 (light ⇄ dark)
  const toggleTheme = useCallback(() => {
    if (mode === 'auto') {
      // 如果当前是自动模式,先切换到手动模式
      const current = getSystemTheme();
      const next = current === 'light' ? 'dark' : 'light';
      setMode(next);
    } else {
      // 如果是手动模式,直接切换
      setMode(mode === 'light' ? 'dark' : 'light');
    }
  }, [mode, setMode]);

  // 监听系统主题变化 (仅在 auto 模式下)
  useEffect(() => {
    if (mode !== 'auto') {
      setActualTheme(mode);
      return;
    }

    // 初始设置
    setActualTheme(getSystemTheme());

    // 监听系统主题变化
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setActualTheme(e.matches ? 'dark' : 'light');
    };

    darkModeQuery.addEventListener('change', handleChange);
    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, [mode]);

  // 更新 HTML 根元素的主题类
  useEffect(() => {
    const root = document.documentElement;
    if (actualTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, [actualTheme]);

  // Ant Design 主题配置
  const antdTheme: ThemeConfig = {
    algorithm: actualTheme === 'dark' ? darkAlgorithm : defaultAlgorithm,
    token: {
      colorPrimary: '#1890ff', // 使用 Ant Design 默认主色
      borderRadius: 6,
      // 暗色主题特殊配置
      ...(actualTheme === 'dark' && {
        colorBgContainer: '#1f1f1f',
        colorBgElevated: '#262626',
        colorBgLayout: '#141414',
      }),
    },
    components: {
      Layout: {
        headerBg: actualTheme === 'dark' ? '#1f1f1f' : '#001529',
        siderBg: actualTheme === 'dark' ? '#1f1f1f' : '#001529',
        bodyBg: actualTheme === 'dark' ? '#141414' : '#f0f2f5',
      },
      Menu: {
        darkItemBg: actualTheme === 'dark' ? '#1f1f1f' : '#001529',
        darkSubMenuItemBg: actualTheme === 'dark' ? '#141414' : '#000c17',
      },
    },
  };

  return {
    mode,
    actualTheme,
    isDark: actualTheme === 'dark',
    setMode,
    toggleTheme,
    antdTheme,
  };
};
