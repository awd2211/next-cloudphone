/**
 * 骨架屏加载组件集合
 *
 * 提供多种场景下的加载占位符组件：
 * - StatCardSkeleton: 统计卡片骨架屏
 * - DeviceCardSkeleton: 设备卡片骨架屏
 * - DeviceTableSkeleton: 设备表格骨架屏
 * - ChartSkeleton: 图表骨架屏
 * - GroupPanelSkeleton: 分组面板骨架屏
 */

import { Skeleton, Card, Row, Col, Space, Table } from 'antd';

// ================== 统计卡片骨架屏 ==================

interface StatCardSkeletonProps {
  count?: number;
  span?: number;
}

export const StatCardSkeleton: React.FC<StatCardSkeletonProps> = ({
  count = 4,
  span = 6,
}) => {
  return (
    <Row gutter={16}>
      {Array.from({ length: count }).map((_, index) => (
        <Col span={span} key={index}>
          <Card>
            <Space>
              <Skeleton.Avatar active size={40} shape="square" />
              <Space direction="vertical" size={4}>
                <Skeleton.Input active size="small" style={{ width: 60, height: 14 }} />
                <Skeleton.Input active size="small" style={{ width: 80, height: 28 }} />
              </Space>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

// ================== 设备卡片骨架屏 ==================

interface DeviceCardSkeletonProps {
  count?: number;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export const DeviceCardSkeleton: React.FC<DeviceCardSkeletonProps> = ({
  count = 6,
  cols = { xs: 24, sm: 12, md: 8, lg: 6, xl: 4 },
}) => {
  return (
    <Row gutter={[12, 12]}>
      {Array.from({ length: count }).map((_, index) => (
        <Col key={index} {...cols}>
          <Card
            cover={
              <div
                style={{
                  height: 180,
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Skeleton.Image active style={{ width: 120, height: 120 }} />
              </div>
            }
            actions={[
              <Skeleton.Button key="1" active size="small" />,
              <Skeleton.Button key="2" active size="small" />,
              <Skeleton.Button key="3" active size="small" />,
            ]}
          >
            <Card.Meta
              avatar={<Skeleton.Avatar active size="small" />}
              title={<Skeleton.Input active size="small" style={{ width: 120 }} />}
              description={<Skeleton.Input active size="small" style={{ width: 80, height: 14 }} />}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

// ================== 设备表格骨架屏 ==================

interface DeviceTableSkeletonProps {
  rows?: number;
}

export const DeviceTableSkeleton: React.FC<DeviceTableSkeletonProps> = ({
  rows = 5,
}) => {
  const columns = [
    {
      title: <Skeleton.Input active size="small" style={{ width: 60 }} />,
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: () => (
        <Space>
          <Skeleton.Avatar active size="small" shape="square" />
          <Skeleton.Input active size="small" style={{ width: 100 }} />
        </Space>
      ),
    },
    {
      title: <Skeleton.Input active size="small" style={{ width: 40 }} />,
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: () => <Skeleton.Button active size="small" style={{ width: 60 }} />,
    },
    {
      title: <Skeleton.Input active size="small" style={{ width: 80 }} />,
      dataIndex: 'version',
      key: 'version',
      width: 120,
      render: () => <Skeleton.Button active size="small" style={{ width: 80 }} />,
    },
    {
      title: <Skeleton.Input active size="small" style={{ width: 40 }} />,
      dataIndex: 'config',
      key: 'config',
      width: 140,
      render: () => (
        <Space direction="vertical" size={2}>
          <Skeleton.Input active size="small" style={{ width: 80, height: 14 }} />
          <Skeleton.Input active size="small" style={{ width: 60, height: 14 }} />
        </Space>
      ),
    },
    {
      title: <Skeleton.Input active size="small" style={{ width: 60 }} />,
      dataIndex: 'connection',
      key: 'connection',
      width: 200,
      render: () => <Skeleton.Input active size="small" style={{ width: 140 }} />,
    },
    {
      title: <Skeleton.Input active size="small" style={{ width: 60 }} />,
      dataIndex: 'proxy',
      key: 'proxy',
      width: 140,
      render: () => <Skeleton.Button active size="small" style={{ width: 80 }} />,
    },
    {
      title: <Skeleton.Input active size="small" style={{ width: 60 }} />,
      dataIndex: 'action',
      key: 'action',
      width: 240,
      render: () => (
        <Space>
          <Skeleton.Button active size="small" />
          <Skeleton.Button active size="small" />
          <Skeleton.Button active size="small" shape="circle" />
        </Space>
      ),
    },
  ];

  const dataSource = Array.from({ length: rows }).map((_, index) => ({
    key: `skeleton-${index}`,
  }));

  return (
    <Card>
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        scroll={{ x: 1400 }}
        size="middle"
      />
    </Card>
  );
};

// ================== 图表骨架屏 ==================

interface ChartSkeletonProps {
  height?: number;
  type?: 'area' | 'pie' | 'column' | 'line';
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  height = 200,
  type = 'area',
}) => {
  return (
    <Card>
      <div
        style={{
          height,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {type === 'pie' ? (
          <Skeleton.Avatar active size={120} shape="circle" />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, width: '100%', paddingLeft: 24 }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Skeleton.Button
                    active
                    size="small"
                    style={{
                      width: '80%',
                      height: Math.random() * 80 + 40,
                    }}
                  />
                  <Skeleton.Input active size="small" style={{ width: 30, height: 12 }} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

// ================== 分组面板骨架屏 ==================

interface GroupPanelSkeletonProps {
  itemCount?: number;
}

export const GroupPanelSkeleton: React.FC<GroupPanelSkeletonProps> = ({
  itemCount = 5,
}) => {
  return (
    <Card
      title={
        <Space>
          <Skeleton.Avatar active size="small" shape="square" />
          <Skeleton.Input active size="small" style={{ width: 60 }} />
        </Space>
      }
      extra={<Skeleton.Button active size="small" shape="circle" />}
      size="small"
      style={{ height: '100%' }}
      styles={{
        body: {
          padding: '8px 0',
        },
      }}
    >
      <Space direction="vertical" style={{ width: '100%', padding: '0 16px' }} size={8}>
        {Array.from({ length: itemCount }).map((_, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
            }}
          >
            <Space>
              <Skeleton.Avatar active size="small" shape="square" />
              <Skeleton.Input active size="small" style={{ width: 80 }} />
            </Space>
            <Skeleton.Button active size="small" style={{ width: 30 }} />
          </div>
        ))}
      </Space>
    </Card>
  );
};

// ================== Dashboard 骨架屏 ==================

export const DashboardSkeleton: React.FC = () => {
  return (
    <div style={{ padding: 0 }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Skeleton.Input active size="large" style={{ width: 200, marginBottom: 8 }} />
        <Skeleton.Input active size="small" style={{ width: 300, height: 16 }} />
      </div>

      {/* 统计卡片 */}
      <div style={{ marginBottom: 24 }}>
        <StatCardSkeleton count={4} span={6} />
      </div>

      {/* 图表区域 */}
      <Row gutter={[16, 16]}>
        <Col span={16}>
          <ChartSkeleton height={300} type="area" />
        </Col>
        <Col span={8}>
          <ChartSkeleton height={300} type="pie" />
        </Col>
      </Row>

      {/* 底部图表 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <ChartSkeleton height={200} type="column" />
        </Col>
        <Col span={12}>
          <ChartSkeleton height={200} type="area" />
        </Col>
      </Row>
    </div>
  );
};

// ================== 设备列表页骨架屏 ==================

export const DeviceListSkeleton: React.FC = () => {
  return (
    <Row gutter={16}>
      {/* 左侧分组面板 */}
      <Col xs={24} sm={24} md={6} lg={5} xl={4}>
        <GroupPanelSkeleton itemCount={5} />
      </Col>

      {/* 右侧主内容区 */}
      <Col xs={24} sm={24} md={18} lg={19} xl={20}>
        {/* 页面标题 */}
        <div style={{ marginBottom: 24 }}>
          <Skeleton.Input active size="large" style={{ width: 150, marginBottom: 8 }} />
          <Skeleton.Input active size="small" style={{ width: 250, height: 16 }} />
        </div>

        {/* 统计卡片 */}
        <div style={{ marginBottom: 24 }}>
          <StatCardSkeleton count={4} span={6} />
        </div>

        {/* 操作栏 */}
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Skeleton.Input active size="default" style={{ width: 200 }} />
                <Skeleton.Button active size="default" style={{ width: 100 }} />
                <Skeleton.Button active size="default" style={{ width: 120 }} />
              </Space>
            </Col>
            <Col>
              <Space>
                <Skeleton.Button active size="default" />
                <Skeleton.Button active size="default" />
                <Skeleton.Button active size="default" style={{ width: 100 }} />
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 设备表格 */}
        <DeviceTableSkeleton rows={5} />
      </Col>
    </Row>
  );
};

export default {
  StatCardSkeleton,
  DeviceCardSkeleton,
  DeviceTableSkeleton,
  ChartSkeleton,
  GroupPanelSkeleton,
  DashboardSkeleton,
  DeviceListSkeleton,
};
