/**
 * 仪表盘布局管理 Hook
 *
 * 管理自定义仪表盘的卡片布局和配置,支持拖拽排序、显示/隐藏、持久化存储
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * 卡片配置接口
 */
export interface DashboardCard {
  /** 唯一标识符 */
  id: string;

  /** 卡片标题 */
  title: string;

  /** 卡片类型 (用于渲染不同的组件) */
  type: string;

  /** 是否可见 */
  visible: boolean;

  /** 排序顺序 (数字越小越靠前) */
  order: number;

  /** 卡片尺寸 */
  size?: 'small' | 'default' | 'large';

  /** 额外配置 */
  config?: Record<string, any>;
}

/**
 * 布局配置接口
 */
export interface DashboardLayout {
  /** 卡片列表 */
  cards: DashboardCard[];

  /** 列数 (1-4) */
  columns: 1 | 2 | 3 | 4;

  /** 是否启用拖拽 */
  draggable: boolean;

  /** 最后更新时间 */
  updatedAt?: string;
}

/**
 * 默认卡片配置
 */
export const DEFAULT_DASHBOARD_CARDS: DashboardCard[] = [
  {
    id: 'stats-overview',
    title: '数据概览',
    type: 'stats',
    visible: true,
    order: 0,
    size: 'default',
  },
  {
    id: 'device-status',
    title: '设备状态',
    type: 'device-status',
    visible: true,
    order: 1,
    size: 'default',
  },
  {
    id: 'recent-activities',
    title: '最近活动',
    type: 'activities',
    visible: true,
    order: 2,
    size: 'default',
  },
  {
    id: 'user-growth',
    title: '用户增长',
    type: 'chart',
    visible: true,
    order: 3,
    size: 'default',
    config: { chartType: 'line' },
  },
  {
    id: 'revenue-chart',
    title: '营收趋势',
    type: 'chart',
    visible: true,
    order: 4,
    size: 'default',
    config: { chartType: 'area' },
  },
  {
    id: 'quick-actions',
    title: '快速操作',
    type: 'quick-actions',
    visible: true,
    order: 5,
    size: 'small',
  },
  {
    id: 'system-health',
    title: '系统健康',
    type: 'health',
    visible: true,
    order: 6,
    size: 'default',
  },
  {
    id: 'notifications',
    title: '系统通知',
    type: 'notifications',
    visible: false, // 默认隐藏
    order: 7,
    size: 'default',
  },
];

/**
 * 默认布局配置
 */
export const DEFAULT_LAYOUT: DashboardLayout = {
  cards: DEFAULT_DASHBOARD_CARDS,
  columns: 3,
  draggable: true,
};

export interface UseDashboardLayoutOptions {
  /** LocalStorage 存储键 */
  storageKey?: string;

  /** 初始布局配置 */
  initialLayout?: Partial<DashboardLayout>;
}

export interface UseDashboardLayoutResult {
  /** 当前布局配置 */
  layout: DashboardLayout;

  /** 可见的卡片列表 (已排序) */
  visibleCards: DashboardCard[];

  /** 更新卡片顺序 */
  reorderCards: (cardIds: string[]) => void;

  /** 切换卡片可见性 */
  toggleCardVisibility: (cardId: string) => void;

  /** 更新卡片配置 */
  updateCard: (cardId: string, updates: Partial<DashboardCard>) => void;

  /** 设置列数 */
  setColumns: (columns: 1 | 2 | 3 | 4) => void;

  /** 启用/禁用拖拽 */
  setDraggable: (draggable: boolean) => void;

  /** 重置为默认布局 */
  resetLayout: () => void;

  /** 显示所有卡片 */
  showAllCards: () => void;

  /** 隐藏所有卡片 */
  hideAllCards: () => void;
}

/**
 * 仪表盘布局管理 Hook
 *
 * @example
 * ```tsx
 * const { layout, visibleCards, reorderCards, toggleCardVisibility } = useDashboardLayout({
 *   storageKey: 'my-dashboard-layout',
 * });
 *
 * return (
 *   <DashboardGrid layout={layout} onReorder={reorderCards}>
 *     {visibleCards.map(card => (
 *       <DashboardCard key={card.id} config={card} />
 *     ))}
 *   </DashboardGrid>
 * );
 * ```
 */
export const useDashboardLayout = (
  options: UseDashboardLayoutOptions = {}
): UseDashboardLayoutResult => {
  const { storageKey = 'dashboard-layout', initialLayout = {} } = options;

  // 从 localStorage 加载或使用默认配置
  const loadLayout = useCallback((): DashboardLayout => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedLayout = JSON.parse(saved) as DashboardLayout;

        // 合并保存的布局与默认卡片 (处理新增的卡片)
        const savedCardMap = new Map(parsedLayout.cards.map((c) => [c.id, c]));
        const mergedCards = DEFAULT_DASHBOARD_CARDS.map((defaultCard) => {
          const savedCard = savedCardMap.get(defaultCard.id);
          return savedCard || defaultCard;
        });

        // 添加旧布局中存在但默认配置中没有的卡片 (用户自定义)
        parsedLayout.cards.forEach((card) => {
          if (!mergedCards.find((c) => c.id === card.id)) {
            mergedCards.push(card);
          }
        });

        return {
          ...parsedLayout,
          cards: mergedCards,
        };
      }
    } catch (error) {
      console.warn('Failed to load dashboard layout from localStorage:', error);
    }

    return { ...DEFAULT_LAYOUT, ...initialLayout };
  }, [storageKey, initialLayout]);

  const [layout, setLayout] = useState<DashboardLayout>(loadLayout);

  // 保存到 localStorage
  useEffect(() => {
    try {
      const layoutToSave: DashboardLayout = {
        ...layout,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(layoutToSave));
    } catch (error) {
      console.warn('Failed to save dashboard layout to localStorage:', error);
    }
  }, [layout, storageKey]);

  // 计算可见卡片 (已排序)
  const visibleCards = layout.cards
    .filter((card) => card.visible)
    .sort((a, b) => a.order - b.order);

  // 重新排序卡片
  const reorderCards = useCallback((cardIds: string[]) => {
    setLayout((prev) => {
      const cardMap = new Map(prev.cards.map((c) => [c.id, c]));
      const reorderedCards = cardIds
        .map((id, index) => {
          const card = cardMap.get(id);
          return card ? { ...card, order: index } : null;
        })
        .filter((c): c is DashboardCard => c !== null);

      // 保留不在 cardIds 中的卡片
      const remainingCards = prev.cards.filter((c) => !cardIds.includes(c.id));

      return {
        ...prev,
        cards: [...reorderedCards, ...remainingCards],
      };
    });
  }, []);

  // 切换卡片可见性
  const toggleCardVisibility = useCallback((cardId: string) => {
    setLayout((prev) => ({
      ...prev,
      cards: prev.cards.map((card) =>
        card.id === cardId ? { ...card, visible: !card.visible } : card
      ),
    }));
  }, []);

  // 更新卡片配置
  const updateCard = useCallback((cardId: string, updates: Partial<DashboardCard>) => {
    setLayout((prev) => ({
      ...prev,
      cards: prev.cards.map((card) => (card.id === cardId ? { ...card, ...updates } : card)),
    }));
  }, []);

  // 设置列数
  const setColumns = useCallback((columns: 1 | 2 | 3 | 4) => {
    setLayout((prev) => ({ ...prev, columns }));
  }, []);

  // 启用/禁用拖拽
  const setDraggable = useCallback((draggable: boolean) => {
    setLayout((prev) => ({ ...prev, draggable }));
  }, []);

  // 重置为默认布局
  const resetLayout = useCallback(() => {
    setLayout({ ...DEFAULT_LAYOUT, ...initialLayout });
  }, [initialLayout]);

  // 显示所有卡片
  const showAllCards = useCallback(() => {
    setLayout((prev) => ({
      ...prev,
      cards: prev.cards.map((card) => ({ ...card, visible: true })),
    }));
  }, []);

  // 隐藏所有卡片
  const hideAllCards = useCallback(() => {
    setLayout((prev) => ({
      ...prev,
      cards: prev.cards.map((card) => ({ ...card, visible: false })),
    }));
  }, []);

  return {
    layout,
    visibleCards,
    reorderCards,
    toggleCardVisibility,
    updateCard,
    setColumns,
    setDraggable,
    resetLayout,
    showAllCards,
    hideAllCards,
  };
};
