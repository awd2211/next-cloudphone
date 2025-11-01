/**
 * MenuStatisticsRow - 菜单统计卡片行组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  AppstoreOutlined,
  LockOutlined,
  InfoCircleOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { MenuCacheStats } from '@/types';

interface MenuStatisticsRowProps {
  totalMenuCount: number;
  menusWithPermission: number;
  cacheStats: MenuCacheStats | null;
}

/**
 * MenuStatisticsRow 组件
 * 显示菜单统计信息（总数、需要权限、公开菜单、缓存命中率）
 */
export const MenuStatisticsRow = memo<MenuStatisticsRowProps>(
  ({ totalMenuCount, menusWithPermission, cacheStats }) => {
    return (
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="菜单总数" value={totalMenuCount} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="需要权限"
              value={menusWithPermission}
              prefix={<LockOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="公开菜单"
              value={totalMenuCount - menusWithPermission}
              prefix={<InfoCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="缓存命中率"
              value={cacheStats?.hitRate || 0}
              suffix="%"
              precision={1}
              prefix={<DashboardOutlined />}
              valueStyle={{
                color: cacheStats && cacheStats.hitRate > 80 ? '#52c41a' : '#faad14',
              }}
            />
          </Card>
        </Col>
      </Row>
    );
  }
);

MenuStatisticsRow.displayName = 'MenuStatisticsRow';
