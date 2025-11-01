/**
 * PageHeaderSection - 页面头部区域组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Card, Alert } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import type { MenuCacheStats } from '@/types';
import { MenuStatisticsRow } from './MenuStatisticsRow';

interface PageHeaderSectionProps {
  totalMenuCount: number;
  menusWithPermission: number;
  cacheStats: MenuCacheStats | null;
}

/**
 * PageHeaderSection 组件
 * 包含页面标题、说明和统计信息
 */
export const PageHeaderSection = memo<PageHeaderSectionProps>(
  ({ totalMenuCount, menusWithPermission, cacheStats }) => {
    return (
      <Card bordered={false}>
        <h2 style={{ marginBottom: 16 }}>
          <AppstoreOutlined style={{ marginRight: 8 }} />
          菜单权限管理
        </h2>
        <Alert
          message="系统说明"
          description={
            <div>
              <p>
                📋 当前为<strong>只读模式</strong>，可以查看菜单结构和权限配置，但不支持直接编辑。
              </p>
              <p>🔧 菜单结构当前在后端代码中定义，完整的CRUD功能需要后端实现数据库持久化。</p>
              <p>✨ 您可以：查看菜单树、测试用户访问权限、管理权限缓存。</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 统计信息 */}
        <MenuStatisticsRow
          totalMenuCount={totalMenuCount}
          menusWithPermission={menusWithPermission}
          cacheStats={cacheStats}
        />
      </Card>
    );
  }
);

PageHeaderSection.displayName = 'PageHeaderSection';
