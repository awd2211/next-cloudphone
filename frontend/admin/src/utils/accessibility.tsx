/**
 * 无障碍访问工具函数
 *
 * 提供 ARIA 标签生成、键盘导航辅助等功能
 * 遵循 WCAG 2.1 AA 标准
 */

import React from 'react';

/**
 * 生成唯一的 ID（用于 aria-labelledby 等）
 */
let idCounter = 0;
export function generateUniqueId(prefix = 'aria'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * ARIA 标签生成器
 */
export const ariaLabels = {
  /**
   * 生成表格相关的 ARIA 属性
   */
  table: {
    wrapper: (label: string) => ({
      role: 'region',
      'aria-label': label,
      'aria-live': 'polite' as const,
    }),

    sortButton: (columnName: string, direction?: 'ascending' | 'descending') => ({
      'aria-label': direction
        ? `${columnName}，当前排序：${direction === 'ascending' ? '升序' : '降序'}，点击切换排序`
        : `${columnName}，点击排序`,
      'aria-sort': direction,
    }),

    pagination: {
      wrapper: () => ({
        role: 'navigation',
        'aria-label': '分页导航',
      }),

      button: (page: number, isCurrent: boolean) => ({
        'aria-label': `第 ${page} 页`,
        'aria-current': isCurrent ? ('page' as const) : undefined,
      }),

      prevButton: (disabled: boolean) => ({
        'aria-label': '上一页',
        'aria-disabled': disabled,
      }),

      nextButton: (disabled: boolean) => ({
        'aria-label': '下一页',
        'aria-disabled': disabled,
      }),
    },
  },

  /**
   * 生成表单相关的 ARIA 属性
   */
  form: {
    field: (label: string, required = false, error?: string) => {
      const id = generateUniqueId('field');
      const errorId = error ? generateUniqueId('error') : undefined;

      return {
        id,
        'aria-label': label,
        'aria-required': required,
        'aria-invalid': !!error,
        'aria-describedby': errorId,
        errorId,
      };
    },

    searchInput: (placeholder: string) => ({
      role: 'searchbox',
      'aria-label': placeholder,
      'aria-autocomplete': 'list' as const,
    }),

    combobox: (label: string, expanded: boolean) => ({
      role: 'combobox',
      'aria-label': label,
      'aria-expanded': expanded,
      'aria-haspopup': 'listbox' as const,
    }),
  },

  /**
   * 生成按钮相关的 ARIA 属性
   */
  button: {
    icon: (action: string, description?: string) => ({
      'aria-label': description || action,
      type: 'button' as const,
    }),

    toggle: (label: string, pressed: boolean) => ({
      'aria-label': label,
      'aria-pressed': pressed,
      type: 'button' as const,
    }),

    expandCollapse: (label: string, expanded: boolean) => ({
      'aria-label': label,
      'aria-expanded': expanded,
      type: 'button' as const,
    }),

    menu: (label: string, expanded: boolean) => ({
      'aria-label': label,
      'aria-expanded': expanded,
      'aria-haspopup': 'menu' as const,
      type: 'button' as const,
    }),
  },

  /**
   * 生成模态框相关的 ARIA 属性
   */
  modal: {
    dialog: (_title: string) => {
      const titleId = generateUniqueId('modal-title');
      const descId = generateUniqueId('modal-desc');

      return {
        role: 'dialog',
        'aria-modal': true,
        'aria-labelledby': titleId,
        'aria-describedby': descId,
        titleId,
        descId,
      };
    },

    closeButton: () => ({
      'aria-label': '关闭对话框',
      type: 'button' as const,
    }),
  },

  /**
   * 生成通知/提示相关的 ARIA 属性
   */
  alert: {
    success: (message: string) => ({
      role: 'alert',
      'aria-live': 'polite' as const,
      'aria-label': `成功：${message}`,
    }),

    error: (message: string) => ({
      role: 'alert',
      'aria-live': 'assertive' as const,
      'aria-label': `错误：${message}`,
    }),

    warning: (message: string) => ({
      role: 'alert',
      'aria-live': 'polite' as const,
      'aria-label': `警告：${message}`,
    }),

    info: (message: string) => ({
      role: 'status',
      'aria-live': 'polite' as const,
      'aria-label': `信息：${message}`,
    }),
  },

  /**
   * 生成加载状态相关的 ARIA 属性
   */
  loading: {
    spinner: (label = '加载中') => ({
      role: 'status',
      'aria-live': 'polite' as const,
      'aria-label': label,
      'aria-busy': true,
    }),

    progress: (label: string, value: number, max = 100) => ({
      role: 'progressbar',
      'aria-label': label,
      'aria-valuenow': value,
      'aria-valuemin': 0,
      'aria-valuemax': max,
      'aria-valuetext': `${Math.round((value / max) * 100)}%`,
    }),
  },

  /**
   * 生成导航相关的 ARIA 属性
   */
  navigation: {
    main: () => ({
      role: 'navigation',
      'aria-label': '主导航',
    }),

    breadcrumb: () => ({
      'aria-label': '面包屑导航',
    }),

    tabs: {
      list: (label: string) => ({
        role: 'tablist',
        'aria-label': label,
      }),

      tab: (label: string, selected: boolean, controls: string) => ({
        role: 'tab',
        'aria-label': label,
        'aria-selected': selected,
        'aria-controls': controls,
        tabIndex: selected ? 0 : -1,
      }),

      panel: (id: string, labelledBy: string, hidden: boolean) => ({
        role: 'tabpanel',
        id,
        'aria-labelledby': labelledBy,
        hidden,
        tabIndex: 0,
      }),
    },
  },

  /**
   * 生成状态指示器相关的 ARIA 属性
   */
  status: {
    badge: (label: string, count: number) => ({
      role: 'status',
      'aria-label': `${label}：${count} 个`,
    }),

    tag: (label: string) => ({
      role: 'status',
      'aria-label': label,
    }),
  },
};

/**
 * 键盘导航辅助函数
 */
export const keyboardNav = {
  /**
   * 处理 Enter/Space 键触发点击
   */
  handleActivation: (callback: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  },

  /**
   * 处理 Escape 键关闭
   */
  handleEscape: (callback: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      callback();
    }
  },

  /**
   * 处理箭头键导航（用于菜单、列表等）
   */
  handleArrowNavigation: (
    currentIndex: number,
    maxIndex: number,
    onNavigate: (newIndex: number) => void
  ) => (event: React.KeyboardEvent) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = (currentIndex + 1) % maxIndex;
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = currentIndex === 0 ? maxIndex - 1 : currentIndex - 1;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = maxIndex - 1;
        break;
      default:
        return;
    }

    onNavigate(newIndex);
  },
};

/**
 * 焦点管理工具
 */
export const focusManagement = {
  /**
   * 捕获焦点在元素内（用于模态框）
   */
  trapFocus: (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);

    // 自动聚焦到第一个元素
    firstElement?.focus();

    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  },

  /**
   * 保存并恢复焦点（用于模态框打开/关闭）
   */
  saveFocus: () => {
    const previousFocus = document.activeElement as HTMLElement;

    return () => {
      previousFocus?.focus();
    };
  },
};

/**
 * 屏幕阅读器辅助文本组件
 */
export const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: 0,
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: 0,
    }}
  >
    {children}
  </span>
);

/**
 * 跳过导航链接（用于键盘用户快速跳转到主内容）
 */
export const SkipLink: React.FC<{ href: string; children: React.ReactNode }> = ({
  href,
  children,
}) => (
  <a
    href={href}
    style={{
      position: 'absolute',
      left: '-9999px',
      zIndex: 999,
      padding: '1em',
      backgroundColor: '#000',
      color: '#fff',
      textDecoration: 'none',
      // 当获得焦点时显示
      ...(document.activeElement === document.querySelector(`a[href="${href}"]`) && {
        left: '0',
        top: '0',
      }),
    }}
    onFocus={(e) => {
      (e.target as HTMLElement).style.left = '0';
      (e.target as HTMLElement).style.top = '0';
    }}
    onBlur={(e) => {
      (e.target as HTMLElement).style.left = '-9999px';
    }}
  >
    {children}
  </a>
);

/**
 * 实时区域通知组件（用于动态内容更新）
 */
export const LiveRegion: React.FC<{
  children: React.ReactNode;
  level?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
}> = ({ children, level = 'polite', atomic = false }) => (
  <div
    role="status"
    aria-live={level}
    aria-atomic={atomic}
    style={{
      position: 'absolute',
      left: '-9999px',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);
