/**
 * 自定义仪表盘网格组件
 *
 * 支持拖拽排序的卡片网格布局
 */

import { memo, useCallback, useState } from 'react';
import { Row, Col } from 'antd';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import type { DashboardLayout, DashboardCard } from '@/hooks/useDashboardLayout';

export interface DashboardGridProps {
  /** 布局配置 */
  layout: DashboardLayout;

  /** 可见的卡片列表 */
  cards: DashboardCard[];

  /** 拖拽结束回调 */
  onReorder: (cardIds: string[]) => void;

  /** 渲染单个卡片 */
  renderCard: (card: DashboardCard) => React.ReactNode;
}

/**
 * 计算网格 span
 */
const getColSpan = (columns: number, size?: 'small' | 'default' | 'large'): number => {
  const baseSpan = 24 / columns;

  if (!size || size === 'default') return baseSpan;

  if (size === 'small') {
    // 小卡片占半格
    return Math.max(Math.floor(baseSpan / 2), 6);
  }

  if (size === 'large') {
    // 大卡片占两格
    return Math.min(baseSpan * 2, 24);
  }

  return baseSpan;
};

/**
 * 自定义碰撞检测算法
 * 优化跨列拖拽的精确度
 */
const customCollisionDetection = (args: any) => {
  // 优先使用 pointerWithin (鼠标指针在目标元素内)
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  // 其次使用 rectIntersection (矩形相交)
  const intersectionCollisions = rectIntersection(args);
  if (intersectionCollisions.length > 0) {
    return intersectionCollisions;
  }

  // 最后使用 closestCorners (最近的角)
  return closestCorners(args);
};

/**
 * 自定义仪表盘网格组件
 *
 * @example
 * ```tsx
 * <DashboardGrid
 *   layout={layout}
 *   cards={visibleCards}
 *   onReorder={reorderCards}
 *   renderCard={(card) => <MyCard config={card} />}
 * />
 * ```
 */
export const DashboardGrid = memo<DashboardGridProps>(
  ({ layout, cards, onReorder, renderCard }) => {
    const { columns, draggable } = layout;
    const [activeId, setActiveId] = useState<string | null>(null);

    // 拖拽传感器
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8, // 移动 8px 才开始拖拽,避免误触,提升跨列拖拽准确性
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );

    // 拖拽开始处理
    const handleDragStart = useCallback((event: DragStartEvent) => {
      setActiveId(event.active.id as string);
    }, []);

    // 拖拽结束处理
    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);

        if (!over || active.id === over.id) return;

        const oldIndex = cards.findIndex((card) => card.id === active.id);
        const newIndex = cards.findIndex((card) => card.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const reorderedCards = arrayMove(cards, oldIndex, newIndex);
        const reorderedIds = reorderedCards.map((card) => card.id);

        onReorder(reorderedIds);
      },
      [cards, onReorder]
    );

    // 获取当前拖拽的卡片
    const activeCard = activeId ? cards.find((card) => card.id === activeId) : null;

    // 如果禁用拖拽,直接渲染普通网格
    if (!draggable) {
      return (
        <Row gutter={[16, 16]}>
          {cards.map((card) => (
            <Col
              key={card.id}
              xs={24}
              sm={24}
              md={getColSpan(columns, card.size)}
              lg={getColSpan(columns, card.size)}
              xl={getColSpan(columns, card.size)}
            >
              {renderCard(card)}
            </Col>
          ))}
        </Row>
      );
    }

    // 启用拖拽的网格
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
          <Row gutter={[16, 16]}>
            {cards.map((card) => (
              <Col
                key={card.id}
                xs={24}
                sm={24}
                md={getColSpan(columns, card.size)}
                lg={getColSpan(columns, card.size)}
                xl={getColSpan(columns, card.size)}
              >
                {renderCard(card)}
              </Col>
            ))}
          </Row>
        </SortableContext>

        {/* 拖拽时显示的覆盖层 */}
        <DragOverlay
          dropAnimation={{
            duration: 300,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activeCard ? (
            <div
              style={{
                width: '100%',
                opacity: 0.9,
                transform: 'scale(1.05)',
                transition: 'transform 200ms ease',
                cursor: 'grabbing',
              }}
            >
              {renderCard(activeCard)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }
);

DashboardGrid.displayName = 'DashboardGrid';
