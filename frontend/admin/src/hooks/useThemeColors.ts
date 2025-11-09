/**
 * 主题颜色 Hook
 *
 * 提供统一的主题颜色访问，自动适配亮色/暗色主题
 * 用于替代硬编码颜色值
 */

import { theme } from 'antd';

export interface ThemeColors {
  /** 主色调 */
  primary: string;
  /** 主色调悬停态 */
  primaryHover: string;
  /** 主色调激活态 */
  primaryActive: string;
  /** 成功色 */
  success: string;
  /** 警告色 */
  warning: string;
  /** 错误色 */
  error: string;
  /** 信息色 */
  info: string;
  /** 文本主色 */
  text: string;
  /** 文本次要色 */
  textSecondary: string;
  /** 文本禁用色 */
  textDisabled: string;
  /** 背景色 */
  bg: string;
  /** 背景悬停色 */
  bgHover: string;
  /** 边框色 */
  border: string;
  /** 链接色 */
  link: string;
}

/**
 * 使用主题颜色
 *
 * @example
 * ```tsx
 * import { useThemeColors } from '@/hooks/useThemeColors';
 *
 * const MyComponent = () => {
 *   const colors = useThemeColors();
 *
 *   return (
 *     <Statistic
 *       valueStyle={{ color: colors.primary }}
 *     />
 *   );
 * };
 * ```
 */
export const useThemeColors = (): ThemeColors => {
  const { token } = theme.useToken();

  return {
    primary: token.colorPrimary,
    primaryHover: token.colorPrimaryHover,
    primaryActive: token.colorPrimaryActive,
    success: token.colorSuccess,
    warning: token.colorWarning,
    error: token.colorError,
    info: token.colorInfo,
    text: token.colorText,
    textSecondary: token.colorTextSecondary,
    textDisabled: token.colorTextDisabled,
    bg: token.colorBgContainer,
    bgHover: token.colorBgTextHover,
    border: token.colorBorder,
    link: token.colorLink,
  };
};
