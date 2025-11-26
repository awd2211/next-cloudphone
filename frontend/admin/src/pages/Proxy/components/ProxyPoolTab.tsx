import { useState, useMemo, useCallback, memo } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Select,
  Modal,
  Tooltip,
  Progress,
  Row,
  Col,
  Card,
  Statistic,
  theme,
} from 'antd';
import { SEMANTIC, NEUTRAL_LIGHT, CHART_COLORS } from '@/theme';
import {
  ReloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  GlobalOutlined,
  SyncOutlined,
  SearchOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import {
  useProxyList,
  useProxyStats,
  useProxyProviders,
  useReleaseProxy,
  useTestProxy,
  useRefreshProxyPool,
  useParseProxyInfo,
  useParseAllProxyInfo,
  type ProxyRecord,
  // type ProxyStats, // Removed: not used in this component
} from '@/hooks/queries/useProxy';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

/**
 * 代理池管理标签页
 *
 * 功能：
 * - 查看所有代理及状态
 * - 按状态、供应商、国家筛选
 * - 释放代理
 * - 测试代理
 * - 刷新代理池
 */
// ✅ 使用 memo 包装组件，避免不必要的重渲染
const ProxyPoolTab: React.FC = memo(() => {
  const { token } = theme.useToken();
  const [filters, setFilters] = useState({
    status: undefined as string | undefined,
    provider: undefined as string | undefined,
    country: undefined as string | undefined,
    protocol: undefined as string | undefined,
    page: 1,
    pageSize: 20,
  });

  // 使用新的 React Query Hooks
  const { data: listData, isLoading, refetch } = useProxyList({
    page: filters.page,
    limit: filters.pageSize,
    status: filters.status,
    provider: filters.provider,
    country: filters.country,
    protocol: filters.protocol,
  });

  const { data: stats } = useProxyStats();
  const { data: providers } = useProxyProviders();
  const releaseMutation = useReleaseProxy();
  const testMutation = useTestProxy();
  const refreshMutation = useRefreshProxyPool();
  const parseInfoMutation = useParseProxyInfo();
  const parseAllInfoMutation = useParseAllProxyInfo();

  // ✅ 使用 useCallback 包装事件处理函数
  const handleReleaseProxy = useCallback((record: ProxyRecord) => {
    Modal.confirm({
      title: '确认释放代理',
      content: `确定要释放代理 ${record.host}:${record.port} 吗？`,
      onOk: () => releaseMutation.mutate(record.id),
    });
  }, [releaseMutation]);

  const handleTestProxy = useCallback((record: ProxyRecord) => {
    testMutation.mutate(record.id);
  }, [testMutation]);

  const handleParseInfo = useCallback((record: ProxyRecord) => {
    parseInfoMutation.mutate(record.id);
  }, [parseInfoMutation]);

  const handleParseAllInfo = useCallback(() => {
    Modal.confirm({
      title: '批量解析代理信息',
      content: '这将解析所有代理的类型和位置信息（从配置解析，无需网络请求，即时完成）。确定要继续吗？',
      onOk: () => parseAllInfoMutation.mutate(),
    });
  }, [parseAllInfoMutation]);

  // ✅ 使用 useCallback 缓存辅助函数
  const getQualityLevel = useCallback((quality: number) => {
    if (quality >= 90) return { text: '优秀', color: 'success' };
    if (quality >= 70) return { text: '良好', color: 'normal' };
    if (quality >= 50) return { text: '一般', color: 'exception' };
    return { text: '差', color: 'exception' };
  }, []);

  const getStatusConfig = useCallback((status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      available: { color: 'success', text: '可用' },
      in_use: { color: 'processing', text: '使用中' },
      unavailable: { color: 'default', text: '不可用' },
    };
    return configs[status] || { color: 'default', text: status };
  }, []);

  // ✅ 使用 useMemo 缓存列定义，避免每次渲染都重新创建
  const columns: ColumnsType<ProxyRecord> = useMemo(() => [
    {
      title: '代理地址',
      key: 'address',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.host}:{record.port}
          </div>
          <Tag color="blue" style={{ marginTop: 4 }}>
            {record.protocol.toUpperCase()}
          </Tag>
        </div>
      ),
    },
    {
      title: '代理类型',
      key: 'proxyType',
      width: 100,
      render: (_, record) => {
        const proxyRecord = record as ProxyRecord & { ispType?: string; proxyTypeDisplay?: string };
        const typeColors: Record<string, string> = {
          residential: 'green',
          datacenter: 'blue',
          mobile: 'orange',
          isp: 'purple',
          unknown: 'default',
        };
        const typeDisplay = proxyRecord.proxyTypeDisplay || {
          residential: '住宅',
          datacenter: '数据中心',
          mobile: '移动',
          isp: 'ISP',
          unknown: '未知',
        }[proxyRecord.ispType || 'unknown'] || '未知';

        return (
          <Tag color={typeColors[proxyRecord.ispType || 'unknown'] || 'default'}>
            {typeDisplay}
          </Tag>
        );
      },
    },
    {
      title: '位置信息',
      key: 'location',
      width: 150,
      render: (_, record) => (
        <div>
          <Tag color="green" icon={<EnvironmentOutlined />}>
            {record.exitCountryName || record.exitCountry || record.country || '未知'}
          </Tag>
          {(record.exitCity || record.city) && (
            <div style={{ fontSize: 11, color: NEUTRAL_LIGHT.text.tertiary, marginTop: 2 }}>
              {record.exitCity || record.city}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '供应商',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
    },
    {
      title: '质量',
      dataIndex: 'quality',
      key: 'quality',
      width: 150,
      sorter: (a, b) => (Number(a.quality) || 0) - (Number(b.quality) || 0),
      render: (quality: number | string) => {
        const numQuality = typeof quality === 'number' ? quality : parseFloat(String(quality)) || 0;
        const level = getQualityLevel(numQuality);
        return (
          <Tooltip title={`质量评分: ${numQuality}/100`}>
            <Progress
              percent={numQuality}
              size="small"
              status={level.color as any}
            />
          </Tooltip>
        );
      },
    },
    {
      title: '延迟',
      dataIndex: 'latency',
      key: 'latency',
      width: 100,
      sorter: (a, b) => (Number(a.latency) || 0) - (Number(b.latency) || 0),
      render: (latency: number | string) => {
        const numLatency = typeof latency === 'number' ? latency : parseFloat(String(latency));
        if (!numLatency || isNaN(numLatency)) return '-';
        return (
          <span style={{ color: numLatency > 1000 ? SEMANTIC.error.main : SEMANTIC.success.main }}>
            {numLatency}ms
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '请求统计',
      key: 'requests',
      width: 120,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>总计: {record.totalRequests}</div>
          <div style={{ color: SEMANTIC.success.main }}>成功: {record.successfulRequests}</div>
          <div style={{ color: SEMANTIC.error.main }}>失败: {record.failedRequests}</div>
        </div>
      ),
    },
    {
      title: '流量',
      dataIndex: 'totalBandwidth',
      key: 'totalBandwidth',
      width: 100,
      sorter: (a, b) => (Number(a.totalBandwidth) || 0) - (Number(b.totalBandwidth) || 0),
      render: (bandwidth: number | string) => {
        const numBandwidth = typeof bandwidth === 'number' ? bandwidth : parseFloat(String(bandwidth));
        return numBandwidth && !isNaN(numBandwidth) ? `${numBandwidth.toFixed(2)} MB` : '-';
      },
    },
    {
      title: '成本',
      dataIndex: 'costPerGB',
      key: 'costPerGB',
      width: 100,
      sorter: (a, b) => (Number(a.costPerGB) || 0) - (Number(b.costPerGB) || 0),
      render: (cost: number | string) => {
        const numCost = typeof cost === 'number' ? cost : parseFloat(String(cost));
        return numCost && !isNaN(numCost) ? `$${numCost.toFixed(2)}/GB` : '-';
      },
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsed',
      key: 'lastUsed',
      width: 180,
      render: (time?: string) =>
        time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="解析代理信息">
            <Button
              type="link"
              size="small"
              icon={<SearchOutlined />}
              onClick={() => handleParseInfo(record)}
              loading={parseInfoMutation.isPending}
            />
          </Tooltip>
          <Tooltip title="测试代理">
            <Button
              type="link"
              size="small"
              icon={<SyncOutlined />}
              onClick={() => handleTestProxy(record)}
              loading={testMutation.isPending}
            />
          </Tooltip>
          {record.status === 'in_use' && (
            <Tooltip title="释放代理">
              <Button
                type="link"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleReleaseProxy(record)}
                loading={releaseMutation.isPending}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ], [getQualityLevel, getStatusConfig, handleTestProxy, handleReleaseProxy, handleParseInfo, testMutation.isPending, releaseMutation.isPending, parseInfoMutation.isPending]);

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总代理数"
              value={stats?.total || 0}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: token.colorPrimary }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="可用代理"
              value={stats?.available || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: SEMANTIC.success.main }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="使用中"
              value={stats?.inUse || 0}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: token.colorPrimary }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="不可用"
              value={stats?.unhealthy ?? stats?.unavailable ?? 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: SEMANTIC.error.main }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均质量"
              value={(stats?.averageQuality ?? stats?.avgQuality ?? 0).toFixed?.(1) || 0}
              suffix="/100"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: SEMANTIC.warning.main }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均延迟"
              value={(stats?.averageLatency ?? stats?.avgLatency ?? 0).toFixed?.(0) || 0}
              suffix="ms"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: CHART_COLORS.purple }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总流量"
              value={stats?.totalBandwidth?.toFixed(2) || 0}
              suffix="GB"
              valueStyle={{ color: CHART_COLORS.cyan }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总成本"
              value={stats?.totalCost?.toFixed(2) || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: CHART_COLORS.magenta }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选区域 */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 120 }}
            placeholder="状态"
            allowClear
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
          >
            <Select.Option value="available">可用</Select.Option>
            <Select.Option value="in_use">使用中</Select.Option>
            <Select.Option value="unavailable">不可用</Select.Option>
          </Select>
          <Select
            style={{ width: 150 }}
            placeholder="供应商"
            allowClear
            value={filters.provider}
            onChange={(value) => setFilters({ ...filters, provider: value, page: 1 })}
          >
            {providers?.filter(p => p.enabled).map((provider) => (
              <Select.Option key={provider.id} value={provider.type}>
                {provider.name}
              </Select.Option>
            ))}
          </Select>
          <Select
            style={{ width: 120 }}
            placeholder="国家"
            allowClear
            value={filters.country}
            onChange={(value) => setFilters({ ...filters, country: value, page: 1 })}
          >
            <Select.Option value="US">美国</Select.Option>
            <Select.Option value="GB">英国</Select.Option>
            <Select.Option value="DE">德国</Select.Option>
            <Select.Option value="JP">日本</Select.Option>
            <Select.Option value="SG">新加坡</Select.Option>
          </Select>
          <Select
            style={{ width: 120 }}
            placeholder="协议"
            allowClear
            value={filters.protocol}
            onChange={(value) => setFilters({ ...filters, protocol: value, page: 1 })}
          >
            <Select.Option value="http">HTTP</Select.Option>
            <Select.Option value="https">HTTPS</Select.Option>
            <Select.Option value="socks5">SOCKS5</Select.Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            onClick={() => refreshMutation.mutate()}
            loading={refreshMutation.isPending}
          >
            刷新代理池
          </Button>
          <Button
            icon={<SearchOutlined />}
            onClick={handleParseAllInfo}
            loading={parseAllInfoMutation.isPending}
          >
            批量解析信息
          </Button>
        </Space>
      </div>

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={listData?.data || []}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1800 }}
        pagination={{
          current: filters.page,
          pageSize: filters.pageSize,
          total: listData?.meta?.total || 0,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个代理`,
          onChange: (page, pageSize) => {
            setFilters({ ...filters, page, pageSize });
          },
        }}
      />
    </div>
  );
});

ProxyPoolTab.displayName = 'ProxyPoolTab';

export default ProxyPoolTab;
