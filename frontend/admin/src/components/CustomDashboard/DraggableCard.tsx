/**
 * 可拖拽的仪表盘卡片组件
 *
 * 包装卡片内容,添加拖拽功能和交互效果
 */

import { memo, CSSProperties } from 'react';
import { Card , theme } from 'antd';
import { NEUTRAL_LIGHT } from '@/theme';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined } from '@ant-design/icons';
import type { DashboardCard } from '@/hooks/useDashboardLayout';

export interface DraggableCardProps {
  /** 卡片配置 */
  card: DashboardCard;

  /** 是否可拖拽 */
  draggable?: boolean;

  /** 卡片内容 */
  children: React.ReactNode;

  /** 额外操作 (编辑、删除等) */
  extra?: React.ReactNode;
}

/**
 * 可拖拽的仪表盘卡片组件
 *
 * @example
 * ```tsx
 * <DraggableCard
 *   card={cardConfig}
 *   draggable={true}
 *   extra={<Button>配置</Button>}
 * >
 *   <div>卡片内容</div>
 * </DraggableCard>
 * ```
 */
export const DraggableCard = memo<DraggableCardProps>(
  ({ card, draggable = true, children, extra }) => {
    const { token } = theme.useToken();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
      id: card.id,
      disabled: !draggable,
    });

    const style: CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition: transition || 'transform 200ms ease',
      opacity: isDragging ? 0.4 : 1,
      cursor: draggable ? 'grab' : 'default',
      position: 'relative',
      zIndex: isDragging ? 999 : 'auto',
    };

    return (
      <div ref={setNodeRef} style={style}>
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {draggable && (
                <span
                  {...attributes}
                  {...listeners}
                  style={{
                    cursor: 'grab',
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: NEUTRAL_LIGHT.text.tertiary,
                    transition: 'color 0.2s ease',
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = token.colorPrimary;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = NEUTRAL_LIGHT.text.tertiary;
                  }}
                >
                  <HolderOutlined />
                </span>
              )}
              <span>{card.title}</span>
            </div>
          }
          extra={extra}
          hoverable={draggable}
          style={{
            height: '100%',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isDragging
              ? '0 12px 32px rgba(0,0,0,0.2)'
              : isOver
              ? '0 4px 16px rgba(24,144,255,0.2)'
              : undefined,
            border: isOver ? '2px dashed token.colorPrimary' : undefined,
            transform: isDragging ? 'scale(1.03)' : isOver ? 'scale(0.98)' : 'scale(1)',
          }}
        >
          {children}
        </Card>
      </div>
    );
  }
);

DraggableCard.displayName = 'DraggableCard';
