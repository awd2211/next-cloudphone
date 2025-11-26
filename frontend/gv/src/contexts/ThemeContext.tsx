/**
 * 主题上下文 - 管理应用的亮色/暗色模式切换
 *
 * 功能：
 * 1. 支持亮色/暗色/跟随系统三种模式
 * 2. 持久化主题偏好到 localStorage
 * 3. 监听系统主题变化
 * 4. 提供便捷的主题切换 Hook
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { theme } from 'antd';

// 主题模式类型
export type ThemeMode = 'light' | 'dark' | 'system';

// 实际应用的主题类型
export type ActualTheme = 'light' | 'dark';

// 主题上下文值
interface ThemeContextValue {
  // 当前主题模式设置
  mode: ThemeMode;
  // 实际应用的主题（解析 system 后的值）
  actualTheme: ActualTheme;
  // 是否为暗色主题
  isDark: boolean;
  // 切换主题模式
  setMode: (mode: ThemeMode) => void;
  // 快速切换亮/暗
  toggleTheme: () => void;
  // Ant Design 主题算法
  algorithm: typeof theme.defaultAlgorithm | typeof theme.darkAlgorithm;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'theme-mode';

// 获取系统主题偏好
const getSystemTheme = (): ActualTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// 获取保存的主题设置
const getSavedMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'light';
};

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
}

export function ThemeProvider({ children, defaultMode }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => defaultMode ?? getSavedMode());
  const [systemTheme, setSystemTheme] = useState<ActualTheme>(getSystemTheme);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // 兼容旧版浏览器
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // 计算实际主题
  const actualTheme = useMemo<ActualTheme>(() => {
    if (mode === 'system') {
      return systemTheme;
    }
    return mode;
  }, [mode, systemTheme]);

  // 是否为暗色主题
  const isDark = actualTheme === 'dark';

  // 设置主题模式
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  // 快速切换
  const toggleTheme = useCallback(() => {
    setMode(actualTheme === 'light' ? 'dark' : 'light');
  }, [actualTheme, setMode]);

  // Ant Design 算法
  const algorithm = isDark ? theme.darkAlgorithm : theme.defaultAlgorithm;

  // 应用 body 样式
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', actualTheme);
    document.body.style.colorScheme = actualTheme;

    // 设置 meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#141414' : '#ffffff');
    }
  }, [actualTheme, isDark]);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    actualTheme,
    isDark,
    setMode,
    toggleTheme,
    algorithm,
  }), [mode, actualTheme, isDark, setMode, toggleTheme, algorithm]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// 使用主题的 Hook
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// 导出默认值，用于 SSR 或无 Provider 场景
export const defaultThemeValue: ThemeContextValue = {
  mode: 'light',
  actualTheme: 'light',
  isDark: false,
  setMode: () => {},
  toggleTheme: () => {},
  algorithm: theme.defaultAlgorithm,
};
