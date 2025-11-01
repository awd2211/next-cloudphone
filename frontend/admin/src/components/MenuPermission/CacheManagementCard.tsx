/**
 * CacheManagementCard - 缓存管理卡片组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Card, Row, Col, Statistic, Divider, Space, Button, Tooltip, Badge } from 'antd';
import {
  UserOutlined,
  ReloadOutlined,
  ClearOutlined,
  FireOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import type { MenuCacheStats } from '@/types';

interface CacheManagementCardProps {
  cacheStats: MenuCacheStats | null;
  cacheLoading: boolean;
  onRefreshCache: () => void;
  onClearAllCache: () => void;
  onWarmupCache: () => void;
  onExportCache: () => void;
}

/**
 * CacheManagementCard 组件
 * 缓存管理卡片，显示缓存统计和提供缓存操作
 */
export const CacheManagementCard = memo<CacheManagementCardProps>(
  ({
    cacheStats,
    cacheLoading,
    onRefreshCache,
    onClearAllCache,
    onWarmupCache,
    onExportCache,
  }) => {
    return (
      <Card title="缓存管理">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="已缓存用户"
              value={cacheStats?.totalCached || 0}
              prefix={<UserOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="活跃用户"
              value={cacheStats?.activeUsers || 0}
              prefix={<Badge status="processing" />}
            />
          </Col>
          <Col span={6}>
            <Statistic title="缓存大小" value={cacheStats?.cacheSize || 0} suffix="KB" />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均加载时间"
              value={cacheStats?.avgLoadTime || 0}
              suffix="ms"
              precision={0}
            />
          </Col>
        </Row>

        <Divider />

        <Space wrap>
          <Tooltip title="刷新指定用户的权限缓存">
            <Button icon={<ReloadOutlined />} onClick={onRefreshCache} loading={cacheLoading}>
              刷新用户缓存
            </Button>
          </Tooltip>

          <Tooltip title="清空所有缓存，建议在非高峰期操作">
            <Button danger icon={<ClearOutlined />} onClick={onClearAllCache} loading={cacheLoading}>
              清空所有缓存
            </Button>
          </Tooltip>

          <Tooltip title="为活跃用户预加载权限数据">
            <Button type="primary" icon={<FireOutlined />} onClick={onWarmupCache} loading={cacheLoading}>
              预热缓存
            </Button>
          </Tooltip>

          <Tooltip title="导出缓存数据为JSON文件">
            <Button icon={<ExportOutlined />} onClick={onExportCache} loading={cacheLoading}>
              导出缓存数据
            </Button>
          </Tooltip>
        </Space>
      </Card>
    );
  }
);

CacheManagementCard.displayName = 'CacheManagementCard';
