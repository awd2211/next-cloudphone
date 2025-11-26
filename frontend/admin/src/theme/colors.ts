/**
 * 统一颜色主题配置
 *
 * 基于 Ant Design 5.x 设计规范
 * 所有组件应使用此文件中定义的颜色常量，而非硬编码颜色值
 */

// ==================== 品牌主色 ====================
export const PRIMARY = {
  main: '#1677ff',        // Ant Design 5.x 默认主色
  light: '#4096ff',       // 悬停状态
  dark: '#0958d9',        // 点击状态
  bg: '#e6f4ff',          // 背景色
  bgHover: '#bae0ff',     // 背景悬停
  border: '#91caff',      // 边框色
};

// ==================== 语义化颜色 ====================
export const SEMANTIC = {
  // 成功 - 绿色系
  success: {
    main: '#52c41a',
    light: '#73d13d',
    dark: '#389e0d',
    bg: '#f6ffed',
    border: '#b7eb8f',
  },
  // 警告 - 橙色系
  warning: {
    main: '#faad14',
    light: '#ffc53d',
    dark: '#d48806',
    bg: '#fffbe6',
    border: '#ffe58f',
  },
  // 错误 - 红色系
  error: {
    main: '#ff4d4f',
    light: '#ff7875',
    dark: '#cf1322',
    bg: '#fff2f0',
    border: '#ffccc7',
  },
  // 信息 - 蓝色系 (与主色一致)
  info: {
    main: '#1677ff',
    light: '#4096ff',
    dark: '#0958d9',
    bg: '#e6f4ff',
    border: '#91caff',
  },
};

// ==================== 中性色 - 亮色主题 ====================
export const NEUTRAL_LIGHT = {
  // 文字颜色
  text: {
    primary: 'rgba(0, 0, 0, 0.88)',     // 主文字
    secondary: 'rgba(0, 0, 0, 0.65)',   // 次要文字
    tertiary: 'rgba(0, 0, 0, 0.45)',    // 辅助文字
    quaternary: 'rgba(0, 0, 0, 0.25)',  // 禁用文字
  },
  // 背景颜色
  bg: {
    container: '#ffffff',               // 容器背景
    elevated: '#ffffff',                // 浮层背景
    layout: '#f5f5f5',                  // 布局背景
    spotlight: '#f0f0f0',               // 高亮背景
    mask: 'rgba(0, 0, 0, 0.45)',        // 遮罩
  },
  // 边框颜色
  border: {
    primary: '#d9d9d9',                 // 主边框
    secondary: '#f0f0f0',               // 次要边框
  },
  // 填充颜色
  fill: {
    primary: 'rgba(0, 0, 0, 0.15)',
    secondary: 'rgba(0, 0, 0, 0.06)',
    tertiary: 'rgba(0, 0, 0, 0.04)',
    quaternary: 'rgba(0, 0, 0, 0.02)',
  },
};

// ==================== 中性色 - 暗色主题 ====================
export const NEUTRAL_DARK = {
  // 文字颜色
  text: {
    primary: 'rgba(255, 255, 255, 0.85)',
    secondary: 'rgba(255, 255, 255, 0.65)',
    tertiary: 'rgba(255, 255, 255, 0.45)',
    quaternary: 'rgba(255, 255, 255, 0.25)',
  },
  // 背景颜色
  bg: {
    container: '#1f1f1f',
    elevated: '#262626',
    layout: '#141414',
    spotlight: '#303030',
    mask: 'rgba(0, 0, 0, 0.65)',
  },
  // 边框颜色
  border: {
    primary: '#424242',
    secondary: '#303030',
  },
  // 填充颜色
  fill: {
    primary: 'rgba(255, 255, 255, 0.18)',
    secondary: 'rgba(255, 255, 255, 0.12)',
    tertiary: 'rgba(255, 255, 255, 0.08)',
    quaternary: 'rgba(255, 255, 255, 0.04)',
  },
};

// ==================== 图表颜色序列 ====================
export const CHART_COLORS = [
  '#1677ff',  // 主色
  '#52c41a',  // 成功
  '#faad14',  // 警告
  '#ff4d4f',  // 错误
  '#722ed1',  // 紫色
  '#13c2c2',  // 青色
  '#eb2f96',  // 粉色
  '#fa8c16',  // 橙色
  '#2f54eb',  // 靛蓝
  '#a0d911',  // 青柠
];

// ==================== 设备状态颜色 ====================
export const DEVICE_STATUS_COLORS = {
  running: SEMANTIC.success.main,
  stopped: SEMANTIC.error.main,
  idle: NEUTRAL_LIGHT.border.primary,
  error: SEMANTIC.warning.main,
  starting: PRIMARY.main,
  stopping: SEMANTIC.warning.dark,
};

// ==================== 支付平台颜色 ====================
export const PAYMENT_PLATFORM_COLORS = {
  alipay: '#1677ff',
  wechat: '#52c41a',
  paypal: '#0070ba',
  stripe: '#635bff',
  card: '#424242',
};

// ==================== 终端/控制台颜色 (VS Code 风格) ====================
export const TERMINAL_COLORS = {
  bg: '#1e1e1e',                    // 终端背景
  text: '#d4d4d4',                  // 默认文字
  prompt: '#4ec9b0',                // 命令提示符 ($)
  command: '#ce9178',               // 用户输入命令
  error: '#f48771',                 // 错误输出
  timestamp: '#666666',             // 时间戳
  placeholder: '#666666',           // 占位符文字
};

// ==================== 快捷访问 - 兼容旧代码 ====================
// 推荐使用 SEMANTIC 对象，以下为兼容旧代码
export const COLOR_SUCCESS = SEMANTIC.success.main;
export const COLOR_WARNING = SEMANTIC.warning.main;
export const COLOR_ERROR = SEMANTIC.error.main;
export const COLOR_INFO = SEMANTIC.info.main;
export const COLOR_PRIMARY = PRIMARY.main;

// 文字颜色快捷访问
export const TEXT_PRIMARY = NEUTRAL_LIGHT.text.primary;
export const TEXT_SECONDARY = NEUTRAL_LIGHT.text.secondary;
export const TEXT_TERTIARY = NEUTRAL_LIGHT.text.tertiary;

// ==================== 辅助函数 ====================
/**
 * 根据主题获取中性色配置
 */
export const getNeutralColors = (isDark: boolean) =>
  isDark ? NEUTRAL_DARK : NEUTRAL_LIGHT;

/**
 * 获取状态颜色
 */
export const getStatusColor = (status: 'success' | 'warning' | 'error' | 'info') =>
  SEMANTIC[status].main;
