/**
 * 无障碍组件库
 *
 * 提供符合 WCAG 2.1 AA 标准的无障碍增强组件
 *
 * 使用方式：
 * ```tsx
 * import {
 *   AccessibleTable,
 *   AccessibleModal,
 *   AccessibleButton,
 * } from '@/components/Accessible';
 * ```
 */

export { default as AccessibleTable } from './AccessibleTable';
export type { AccessibleTableProps } from './AccessibleTable';

export { default as AccessibleModal } from './AccessibleModal';
export type { AccessibleModalProps } from './AccessibleModal';

export { default as AccessibleButton } from './AccessibleButton';
export type { AccessibleButtonProps } from './AccessibleButton';

// 也可以导出辅助工具
export {
  ariaLabels,
  keyboardNav,
  focusManagement,
  VisuallyHidden,
  SkipLink,
  LiveRegion,
  generateUniqueId,
} from '@/utils/accessibility';
