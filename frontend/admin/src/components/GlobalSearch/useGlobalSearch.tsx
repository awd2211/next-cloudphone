/**
 * 全局搜索 Hook
 *
 * 管理全局搜索模态框的显示状态和快捷键监听
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseGlobalSearchOptions {
  /** 是否启用 (默认 true) */
  enabled?: boolean;

  /** 自定义快捷键 (默认 'k') */
  shortcutKey?: string;
}

export interface UseGlobalSearchResult {
  /** 搜索框是否可见 */
  visible: boolean;

  /** 打开搜索框 */
  open: () => void;

  /** 关闭搜索框 */
  close: () => void;

  /** 切换搜索框显示状态 */
  toggle: () => void;
}

/**
 * 全局搜索 Hook
 *
 * 自动监听 Cmd/Ctrl + K 快捷键
 *
 * @example
 * ```tsx
 * const { visible, close } = useGlobalSearch();
 *
 * return <GlobalSearchModal visible={visible} onClose={close} />;
 * ```
 */
export const useGlobalSearch = (
  options: UseGlobalSearchOptions = {}
): UseGlobalSearchResult => {
  const { enabled = true, shortcutKey = 'k' } = options;
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const toggle = useCallback(() => setVisible(prev => !prev), []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === shortcutKey) {
        e.preventDefault();
        open();
      }

      // Esc 关闭
      if (e.key === 'Escape' && visible) {
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, shortcutKey, visible, open, close]);

  return {
    visible,
    open,
    close,
    toggle,
  };
};
