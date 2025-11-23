import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Empty, Typography, Divider, Row, Col, message } from 'antd';
import { ArrowLeftOutlined, DashboardOutlined } from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  HeaderActions,
  MonitorAlert,
  StatsCards,
  ChartCard,
  NetworkStats,
} from '@/components/Monitor';
import { useDeviceMonitor } from '@/hooks/useDeviceMonitor';

const { Title } = Typography;

/**
 * 设备监控页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 工具函数提取到配置文件
 * 5. ✅ 图表配置使用 useMemo 缓存
 * 6. ✅ 定时器逻辑封装在 hook 中
 * 7. ✅ 代码从 398 行减少到 ~110 行
 */
const DeviceMonitor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    device,
    stats,
    loading,
    autoRefresh,
    historyData,
    cpuChartConfig,
    memoryChartConfig,
    loadStats,
    toggleAutoRefresh,
    goBack,
  } = useDeviceMonitor(id);

  // 快捷键支持：Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        loadStats();
        message.info('正在刷新监控数据...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadStats]);

  // 加载中状态
  if (loading && !stats) {
    return (
      <ErrorBoundary>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="加载中..." />
        </div>
      </ErrorBoundary>
    );
  }

  // 空状态
  if (!device || !stats) {
    return (
      <ErrorBoundary>
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/devices')}
            style={{ marginBottom: 16 }}
          >
            返回设备列表
          </Button>
          <Empty description="设备不存在或暂无监控数据" />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        {/* 头部操作按钮 */}
        <HeaderActions
          deviceId={id!}
          loading={loading}
          autoRefresh={autoRefresh}
          onBack={goBack}
          onRefresh={loadStats}
          onToggleAutoRefresh={toggleAutoRefresh}
        />

        {/* 页面标题 */}
        <Title level={2}>
          <DashboardOutlined /> 设备监控: {device.name}
        </Title>

        {/* 实时监控提示 */}
        <MonitorAlert autoRefresh={autoRefresh} />

        {/* 基本统计卡片 */}
        <StatsCards stats={stats} />

        <Divider />

        {/* 实时图表 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <ChartCard title="CPU使用率趋势" data={historyData} config={cpuChartConfig} />
          </Col>

          <Col xs={24} lg={12}>
            <ChartCard title="内存使用率趋势" data={historyData} config={memoryChartConfig} />
          </Col>
        </Row>

        <Divider />

        {/* 网络流量统计 */}
        <NetworkStats networkIn={stats.networkIn} networkOut={stats.networkOut} />
      </div>
    </ErrorBoundary>
  );
};

export default DeviceMonitor;
