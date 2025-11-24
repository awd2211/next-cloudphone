/**
 * 颜色常量定义
 *
 * 基于 Ant Design 5.x 官方配色规范
 * 统一管理项目中使用的颜色，确保一致性
 */

// ==================== 主色 ====================

/** Ant Design 5.x 默认蓝色主色 */
export const PRIMARY_COLOR = '#1677ff';
export const PRIMARY_HOVER = '#4096ff';
export const PRIMARY_ACTIVE = '#0958d9';
export const PRIMARY_BG = '#e6f4ff';

// 暗色模式主色
export const PRIMARY_COLOR_DARK = '#1668dc';
export const PRIMARY_HOVER_DARK = '#3c89e8';
export const PRIMARY_ACTIVE_DARK = '#1554ad';
export const PRIMARY_BG_DARK = 'rgba(22, 104, 220, 0.15)';

// ==================== 功能色 ====================

/** 成功色 */
export const SUCCESS_COLOR = '#52c41a';
export const SUCCESS_COLOR_DARK = '#49aa19';

/** 警告色 */
export const WARNING_COLOR = '#faad14';
export const WARNING_COLOR_DARK = '#d89614';

/** 错误色 */
export const ERROR_COLOR = '#ff4d4f';
export const ERROR_COLOR_DARK = '#dc4446';

/** 信息色 */
export const INFO_COLOR = '#1677ff';
export const INFO_COLOR_DARK = '#1668dc';

// ==================== 中性色 ====================

// 亮色模式文字色
export const TEXT_PRIMARY = 'rgba(0, 0, 0, 0.88)';
export const TEXT_SECONDARY = 'rgba(0, 0, 0, 0.65)';
export const TEXT_TERTIARY = 'rgba(0, 0, 0, 0.45)';
export const TEXT_QUATERNARY = 'rgba(0, 0, 0, 0.25)';

// 暗色模式文字色
export const TEXT_PRIMARY_DARK = 'rgba(255, 255, 255, 0.85)';
export const TEXT_SECONDARY_DARK = 'rgba(255, 255, 255, 0.65)';
export const TEXT_TERTIARY_DARK = 'rgba(255, 255, 255, 0.45)';
export const TEXT_QUATERNARY_DARK = 'rgba(255, 255, 255, 0.25)';

// ==================== 边框色 ====================

export const BORDER_COLOR = '#d9d9d9';
export const BORDER_SECONDARY = '#f0f0f0';

export const BORDER_COLOR_DARK = '#424242';
export const BORDER_SECONDARY_DARK = '#303030';

// ==================== 背景色 ====================

// 亮色模式
export const BG_BASE = '#f5f5f5';
export const BG_CONTAINER = '#ffffff';
export const BG_ELEVATED = '#ffffff';
export const BG_SPOTLIGHT = '#ffffff';

// 暗色模式
export const BG_BASE_DARK = '#000000';
export const BG_CONTAINER_DARK = '#141414';
export const BG_ELEVATED_DARK = '#1f1f1f';
export const BG_SPOTLIGHT_DARK = '#262626';

// ==================== 图表色板 ====================

/** 图表主色板 */
export const CHART_COLORS = {
  primary: '#1677ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  purple: '#722ed1',
  cyan: '#13c2c2',
  magenta: '#eb2f96',
  geekblue: '#2f54eb',
  lime: '#a0d911',
  gold: '#faad14',
};

/** 图表主色板 - 暗色模式 */
export const CHART_COLORS_DARK = {
  primary: '#1668dc',
  success: '#49aa19',
  warning: '#d89614',
  error: '#dc4446',
  purple: '#9254de',
  cyan: '#36cfc9',
  magenta: '#f759ab',
  geekblue: '#597ef7',
  lime: '#bae637',
  gold: '#d89614',
};

// ==================== 语义化颜色 (兼容旧代码) ====================

/**
 * @deprecated 使用 PRIMARY_COLOR 替代
 */
export const BRAND_COLOR = PRIMARY_COLOR;

/**
 * @deprecated 使用 PRIMARY_HOVER 替代
 */
export const BRAND_COLOR_HOVER = PRIMARY_HOVER;

// ==================== 工具函数 ====================

/**
 * 根据主题获取主色
 */
export const getPrimaryColor = (isDark: boolean) =>
  isDark ? PRIMARY_COLOR_DARK : PRIMARY_COLOR;

/**
 * 根据主题获取主色悬停色
 */
export const getPrimaryHover = (isDark: boolean) =>
  isDark ? PRIMARY_HOVER_DARK : PRIMARY_HOVER;

/**
 * 根据主题获取成功色
 */
export const getSuccessColor = (isDark: boolean) =>
  isDark ? SUCCESS_COLOR_DARK : SUCCESS_COLOR;

/**
 * 根据主题获取警告色
 */
export const getWarningColor = (isDark: boolean) =>
  isDark ? WARNING_COLOR_DARK : WARNING_COLOR;

/**
 * 根据主题获取错误色
 */
export const getErrorColor = (isDark: boolean) =>
  isDark ? ERROR_COLOR_DARK : ERROR_COLOR;

/**
 * 根据主题获取文字主色
 */
export const getTextPrimary = (isDark: boolean) =>
  isDark ? TEXT_PRIMARY_DARK : TEXT_PRIMARY;

/**
 * 根据主题获取图表色板
 */
export const getChartColors = (isDark: boolean) =>
  isDark ? CHART_COLORS_DARK : CHART_COLORS;
