import { Card, Skeleton, Space } from 'antd';

/**
 * 页面加载骨架屏 - 用于路由懒加载的 Suspense fallback
 *
 * 提供更好的加载体验，替代简单的 Spin 组件
 * 模拟页面的基本布局结构
 */
export const PageLoadingSkeleton = () => {
  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 页面标题区域 */}
      <div style={{ marginBottom: 24 }}>
        <Skeleton.Input active style={{ width: 200, height: 32 }} />
      </div>

      {/* 操作栏区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle">
          <Skeleton.Button active style={{ width: 100 }} />
          <Skeleton.Button active style={{ width: 100 }} />
          <Skeleton.Input active style={{ width: 300 }} />
        </Space>
      </Card>

      {/* 主内容区域 - 表格骨架 */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space size="middle">
            <Skeleton.Button active style={{ width: 80 }} />
            <Skeleton.Button active style={{ width: 80 }} />
            <Skeleton.Button active style={{ width: 80 }} />
          </Space>
        </div>

        {/* 表格行骨架 */}
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            style={{
              padding: '12px 0',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <Skeleton active paragraph={{ rows: 1 }} />
          </div>
        ))}

        {/* 分页器骨架 */}
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Skeleton.Button active style={{ width: 200 }} />
        </div>
      </Card>
    </div>
  );
};

/**
 * 简单的加载骨架屏 - 用于小型组件
 */
export const SimpleLoadingSkeleton = () => {
  return (
    <div style={{ padding: 24 }}>
      <Skeleton active paragraph={{ rows: 4 }} />
    </div>
  );
};

/**
 * 卡片加载骨架屏 - 用于卡片列表
 */
export const CardLoadingSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index}>
            <Skeleton active avatar paragraph={{ rows: 2 }} />
          </Card>
        ))}
      </Space>
    </div>
  );
};

/**
 * 表格加载骨架屏 - 用于表格页面
 */
export const TableLoadingSkeleton = ({ rows = 10 }: { rows?: number }) => {
  return (
    <Card style={{ margin: 24 }}>
      {/* 表格标题栏 */}
      <div style={{ marginBottom: 16 }}>
        <Skeleton.Input active style={{ width: 200 }} />
      </div>

      {/* 表格行 */}
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          style={{
            padding: '12px 0',
            borderBottom: index < rows - 1 ? '1px solid #f0f0f0' : 'none',
          }}
        >
          <Skeleton active paragraph={{ rows: 1 }} />
        </div>
      ))}
    </Card>
  );
};

/**
 * Dashboard 加载骨架屏 - 用于仪表板页面
 */
export const DashboardLoadingSkeleton = () => {
  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 统计卡片行 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        ))}
      </div>

      {/* 图表区域 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
        }}
      >
        <Card>
          <Skeleton.Input
            active
            style={{ width: '100%', height: 300, marginBottom: 16 }}
          />
          <Skeleton active paragraph={{ rows: 1 }} />
        </Card>
        <Card>
          <Skeleton.Input
            active
            style={{ width: '100%', height: 300, marginBottom: 16 }}
          />
          <Skeleton active paragraph={{ rows: 1 }} />
        </Card>
      </div>
    </div>
  );
};

/**
 * 表单加载骨架屏 - 用于表单页面
 */
export const FormLoadingSkeleton = () => {
  return (
    <Card style={{ margin: 24, maxWidth: 800 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index}>
            <Skeleton.Input
              active
              style={{ width: 120, height: 14, marginBottom: 8 }}
            />
            <Skeleton.Input active style={{ width: '100%', height: 32 }} />
          </div>
        ))}

        <div style={{ marginTop: 16 }}>
          <Space>
            <Skeleton.Button active style={{ width: 100 }} />
            <Skeleton.Button active style={{ width: 100 }} />
          </Space>
        </div>
      </Space>
    </Card>
  );
};

export default PageLoadingSkeleton;
