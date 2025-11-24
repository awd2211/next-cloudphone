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
 * Ant Design 5.x 标准配色系统
 *
 * 亮色主题使用默认的蓝色主色 #1677ff
 * 暗色主题使用官方推荐的暗色适配色
 */

// 暗色主题颜色常量 (基于 Ant Design 5.x 官方暗色规范)
const DARK_COLORS = {
  // 背景色 - 使用官方暗色层级
  bgBase: '#000000',           // Layout 背景
  bgContainer: '#141414',      // 容器背景
  bgElevated: '#1f1f1f',       // 浮层背景
  bgSpotlight: '#262626',      // 聚焦/高亮背景
  bgMask: 'rgba(0, 0, 0, 0.45)', // 遮罩背景

  // 边框色
  border: '#424242',           // 主边框
  borderSecondary: '#303030',  // 次要边框

  // 文字色 - 使用官方透明度
  text: 'rgba(255, 255, 255, 0.85)',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
  textTertiary: 'rgba(255, 255, 255, 0.45)',
  textQuaternary: 'rgba(255, 255, 255, 0.25)',

  // 主色 - Ant Design 5.x 暗色模式适配色
  primaryColor: '#1668dc',     // 暗色主色
  primaryHover: '#3c89e8',     // 悬停色
  primaryActive: '#1554ad',    // 激活色
  primaryBg: 'rgba(22, 104, 220, 0.15)', // 主色背景

  // 成功/警告/错误色 - 暗色适配
  successColor: '#49aa19',
  warningColor: '#d89614',
  errorColor: '#dc4446',
  infoColor: '#1668dc',
};

// 亮色主题颜色常量 (基于 Ant Design 5.x 官方规范)
const LIGHT_COLORS = {
  // 背景色
  bgBase: '#f5f5f5',           // Layout 背景
  bgContainer: '#ffffff',      // 容器背景
  bgElevated: '#ffffff',       // 浮层背景
  bgSpotlight: '#ffffff',      // 聚焦背景
  bgMask: 'rgba(0, 0, 0, 0.45)', // 遮罩背景

  // 边框色
  border: '#d9d9d9',           // 主边框
  borderSecondary: '#f0f0f0',  // 次要边框

  // 文字色 - 使用官方透明度
  text: 'rgba(0, 0, 0, 0.88)',
  textSecondary: 'rgba(0, 0, 0, 0.65)',
  textTertiary: 'rgba(0, 0, 0, 0.45)',
  textQuaternary: 'rgba(0, 0, 0, 0.25)',

  // 主色 - Ant Design 5.x 默认蓝色
  primaryColor: '#1677ff',     // 官方默认主色
  primaryHover: '#4096ff',     // 悬停色
  primaryActive: '#0958d9',    // 激活色
  primaryBg: '#e6f4ff',        // 主色背景

  // 成功/警告/错误色
  successColor: '#52c41a',
  warningColor: '#faad14',
  errorColor: '#ff4d4f',
  infoColor: '#1677ff',
};

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
  } catch (error) {
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
    } catch (error) {
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

  const isDark = actualTheme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  // Ant Design 主题配置 - 完整版 (Ant Design 5.x 标准)
  const antdThemeConfig: ThemeConfig = {
    algorithm: isDark ? darkAlgorithm : defaultAlgorithm,
    token: {
      // 主色
      colorPrimary: colors.primaryColor,
      colorLink: colors.primaryColor,
      colorLinkHover: colors.primaryHover,
      colorLinkActive: colors.primaryActive,

      // 功能色
      colorSuccess: colors.successColor,
      colorWarning: colors.warningColor,
      colorError: colors.errorColor,
      colorInfo: colors.infoColor,

      // 圆角
      borderRadius: 6,

      // 背景色
      colorBgContainer: colors.bgContainer,
      colorBgElevated: colors.bgElevated,
      colorBgLayout: colors.bgBase,
      colorBgSpotlight: colors.bgSpotlight,
      colorBgMask: colors.bgMask,

      // 边框色
      colorBorder: colors.border,
      colorBorderSecondary: colors.borderSecondary,

      // 文字色
      colorText: colors.text,
      colorTextSecondary: colors.textSecondary,
      colorTextTertiary: colors.textTertiary,
      colorTextQuaternary: colors.textQuaternary,
    },
    components: {
      // 布局
      Layout: {
        headerBg: colors.bgContainer,
        bodyBg: colors.bgBase,
        footerBg: isDark ? colors.bgElevated : '#f0f2f5',
      },
      // 菜单
      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        itemSelectedBg: colors.primaryBg,
        itemHoverBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        horizontalItemSelectedColor: colors.primaryColor,
      },
      // 卡片
      Card: {
        colorBgContainer: colors.bgContainer,
        colorBorderSecondary: colors.border,
      },
      // 表格
      Table: {
        colorBgContainer: colors.bgContainer,
        headerBg: isDark ? colors.bgElevated : '#fafafa',
        rowHoverBg: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
        borderColor: colors.border,
      },
      // 输入框
      Input: {
        colorBgContainer: isDark ? colors.bgElevated : colors.bgContainer,
        colorBorder: colors.border,
        hoverBorderColor: colors.primaryColor,
        activeBorderColor: colors.primaryColor,
      },
      // 选择器
      Select: {
        colorBgContainer: isDark ? colors.bgElevated : colors.bgContainer,
        colorBgElevated: colors.bgContainer,
        colorBorder: colors.border,
        optionSelectedBg: colors.primaryBg,
      },
      // 日期选择器
      DatePicker: {
        colorBgContainer: isDark ? colors.bgElevated : colors.bgContainer,
        colorBgElevated: colors.bgContainer,
      },
      // 模态框
      Modal: {
        contentBg: colors.bgContainer,
        headerBg: colors.bgContainer,
        footerBg: colors.bgContainer,
      },
      // 抽屉
      Drawer: {
        colorBgElevated: colors.bgContainer,
      },
      // 按钮
      Button: {
        colorBgContainer: isDark ? colors.bgElevated : colors.bgContainer,
        defaultBorderColor: colors.border,
      },
      // 开关
      Switch: {
        colorPrimary: colors.primaryColor,
        colorPrimaryHover: colors.primaryHover,
      },
      // 标签页
      Tabs: {
        cardBg: isDark ? colors.bgElevated : '#fafafa',
        itemSelectedColor: colors.primaryColor,
        inkBarColor: colors.primaryColor,
      },
      // 分页
      Pagination: {
        itemBg: 'transparent',
        itemActiveBg: colors.primaryColor,
      },
      // 下拉菜单
      Dropdown: {
        colorBgElevated: colors.bgContainer,
      },
      // 提示框
      Tooltip: {
        colorBgSpotlight: isDark ? colors.bgElevated : 'rgba(0, 0, 0, 0.75)',
      },
      // 气泡卡片
      Popover: {
        colorBgElevated: colors.bgContainer,
      },
      // 消息提示
      Message: {
        contentBg: colors.bgContainer,
      },
      // 通知
      Notification: {
        colorBgElevated: colors.bgContainer,
      },
      // 警告提示 - 使用功能色的透明背景
      Alert: {
        colorInfoBg: isDark ? 'rgba(22, 104, 220, 0.15)' : '#e6f4ff',
        colorSuccessBg: isDark ? 'rgba(73, 170, 25, 0.15)' : '#f6ffed',
        colorWarningBg: isDark ? 'rgba(216, 150, 20, 0.15)' : '#fffbe6',
        colorErrorBg: isDark ? 'rgba(220, 68, 70, 0.15)' : '#fff2f0',
      },
      // 标签
      Tag: {
        defaultBg: isDark ? colors.bgElevated : '#fafafa',
      },
      // 徽标
      Badge: {
        colorBgContainer: colors.bgContainer,
      },
      // 列表
      List: {
        colorBgContainer: colors.bgContainer,
      },
      // 描述列表
      Descriptions: {
        colorBgContainer: colors.bgContainer,
        labelBg: isDark ? colors.bgElevated : '#fafafa',
      },
      // 分割线
      Divider: {
        colorSplit: colors.border,
      },
      // 骨架屏
      Skeleton: {
        gradientFromColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        gradientToColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.15)',
      },
      // 空状态
      Empty: {
        colorTextDescription: colors.textSecondary,
      },
      // 结果页
      Result: {
        colorTextHeading: colors.text,
        colorTextDescription: colors.textSecondary,
      },
      // 步骤
      Steps: {
        colorTextDescription: colors.textSecondary,
      },
      // 时间线
      Timeline: {
        dotBg: colors.bgContainer,
      },
      // 折叠面板
      Collapse: {
        headerBg: isDark ? colors.bgElevated : '#fafafa',
        contentBg: colors.bgContainer,
      },
      // 树形控件
      Tree: {
        colorBgContainer: colors.bgContainer,
        nodeHoverBg: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
        nodeSelectedBg: colors.primaryBg,
      },
      // 穿梭框
      Transfer: {
        colorBgContainer: colors.bgContainer,
      },
      // 上传
      Upload: {
        colorBgContainer: colors.bgContainer,
      },
      // 表单
      Form: {
        labelColor: colors.text,
      },
      // 头像
      Avatar: {
        colorBgBase: isDark ? colors.bgElevated : '#ccc',
      },
      // 进度条
      Progress: {
        remainingColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      },
      // 统计数值
      Statistic: {
        colorTextDescription: colors.textSecondary,
      },
      // 日历
      Calendar: {
        colorBgContainer: colors.bgContainer,
      },
      // 锚点
      Anchor: {
        colorBgContainer: colors.bgContainer,
      },
      // 回到顶部
      BackTop: {
        colorBgContainer: colors.bgContainer,
      },
    },
  };

  return {
    mode,
    actualTheme,
    isDark,
    setMode,
    toggleTheme,
    antdTheme: antdThemeConfig,
  };
};
