/**
 * 仪表盘设置面板
 *
 * 管理卡片显示/隐藏、列数、拖拽等配置
 */

import { memo } from 'react';
import { Drawer, Space, Button, Checkbox, Radio, Divider, Typography } from 'antd';
import {
  SettingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { DashboardCard } from '@/hooks/useDashboardLayout';

const { Text } = Typography;

export interface DashboardSettingsProps {
  /** 是否显示 */
  visible: boolean;

  /** 关闭回调 */
  onClose: () => void;

  /** 所有卡片配置 */
  cards: DashboardCard[];

  /** 列数 */
  columns: 1 | 2 | 3 | 4;

  /** 是否启用拖拽 */
  draggable: boolean;

  /** 切换卡片可见性 */
  onToggleCard: (cardId: string) => void;

  /** 设置列数 */
  onSetColumns: (columns: 1 | 2 | 3 | 4) => void;

  /** 启用/禁用拖拽 */
  onSetDraggable: (draggable: boolean) => void;

  /** 重置布局 */
  onReset: () => void;

  /** 显示所有卡片 */
  onShowAll: () => void;

  /** 隐藏所有卡片 */
  onHideAll: () => void;
}

/**
 * 仪表盘设置面板
 *
 * @example
 * ```tsx
 * <DashboardSettings
 *   visible={settingsVisible}
 *   onClose={() => setSettingsVisible(false)}
 *   cards={layout.cards}
 *   columns={layout.columns}
 *   draggable={layout.draggable}
 *   onToggleCard={toggleCardVisibility}
 *   onSetColumns={setColumns}
 *   onSetDraggable={setDraggable}
 *   onReset={resetLayout}
 *   onShowAll={showAllCards}
 *   onHideAll={hideAllCards}
 * />
 * ```
 */
export const DashboardSettings = memo<DashboardSettingsProps>(
  ({
    visible,
    onClose,
    cards,
    columns,
    draggable,
    onToggleCard,
    onSetColumns,
    onSetDraggable,
    onReset,
    onShowAll,
    onHideAll,
  }) => {
    const visibleCount = cards.filter((c) => c.visible).length;
    const totalCount = cards.length;

    return (
      <Drawer
        title={
          <span>
            <SettingOutlined style={{ marginRight: 8 }} />
            仪表盘设置
          </span>
        }
        placement="right"
        onClose={onClose}
        open={visible}
        width={360}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 卡片显示/隐藏 */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text strong>
                卡片显示 ({visibleCount}/{totalCount})
              </Text>
              <Space size="small">
                <Button type="link" size="small" onClick={onShowAll} icon={<EyeOutlined />}>
                  全部显示
                </Button>
                <Button
                  type="link"
                  size="small"
                  onClick={onHideAll}
                  icon={<EyeInvisibleOutlined />}
                  danger
                >
                  全部隐藏
                </Button>
              </Space>
            </div>

            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {cards
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((card) => (
                  <Checkbox
                    key={card.id}
                    checked={card.visible}
                    onChange={() => onToggleCard(card.id)}
                  >
                    {card.title}
                  </Checkbox>
                ))}
            </Space>
          </div>

          <Divider />

          {/* 列数设置 */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>
              列数设置
            </Text>
            <Radio.Group value={columns} onChange={(e) => onSetColumns(e.target.value)}>
              <Space direction="vertical">
                <Radio value={1}>1 列 (单列布局)</Radio>
                <Radio value={2}>2 列 (双列布局)</Radio>
                <Radio value={3}>3 列 (三列布局)</Radio>
                <Radio value={4}>4 列 (四列布局)</Radio>
              </Space>
            </Radio.Group>
          </div>

          <Divider />

          {/* 拖拽开关 */}
          <div>
            <Checkbox checked={draggable} onChange={(e) => onSetDraggable(e.target.checked)}>
              <Text strong>启用拖拽排序</Text>
            </Checkbox>
            <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 12 }}>
              {draggable
                ? '拖动卡片标题左侧的 ≡ 图标可以重新排序'
                : '禁用拖拽后卡片位置固定'}
            </div>
          </div>

          <Divider />

          {/* 重置按钮 */}
          <Button block icon={<ReloadOutlined />} onClick={onReset}>
            重置为默认布局
          </Button>
        </Space>
      </Drawer>
    );
  }
);

DashboardSettings.displayName = 'DashboardSettings';
