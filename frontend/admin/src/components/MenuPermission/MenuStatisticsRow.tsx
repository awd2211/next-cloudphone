/**
 * MenuStatisticsRow - 菜单统计卡片行组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Row, Col, Card, Statistic , theme } from 'antd';
import {
  AppstoreOutlined,
  LockOutlined,
  InfoCircleOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { MenuCacheStats } from '@/types';
import { SEMANTIC } from '@/theme';

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
    const { token } = theme.useToken();
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
              valueStyle={{ color: token.colorPrimary }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="公开菜单"
              value={totalMenuCount - menusWithPermission}
              prefix={<InfoCircleOutlined />}
              valueStyle={{ color: SEMANTIC.success.main }}
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
                color: cacheStats && cacheStats.hitRate > 80 ? SEMANTIC.success.main : SEMANTIC.warning.main,
              }}
            />
          </Card>
        </Col>
      </Row>
    );
  }
);

MenuStatisticsRow.displayName = 'MenuStatisticsRow';
