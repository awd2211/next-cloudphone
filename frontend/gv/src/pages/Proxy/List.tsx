/**
 * 代理管理页面
 *
 * 功能增强:
 * 1. 世界地图可视化代理分布
 * 2. 代理质量监控面板
 * 3. 批量操作支持
 * 4. 高级筛选
 * 5. 代理使用统计图表
 */

import { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  message,
  Row,
  Col,
  Statistic,
  Typography,
  Progress,
  Tooltip,
  Popconfirm,
  Tabs,
  Badge,
  Input,
  Divider,
  Alert,
  Dropdown,
  Segmented,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  TableOutlined,
  AppstoreOutlined,
  FilterOutlined,
  ExportOutlined,
  WarningOutlined,
  EnvironmentOutlined,
  WifiOutlined,
  ClockCircleOutlined,
  DownOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TableRowSelection } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proxyApi } from '@/services/api';
import type { ProxyConfig, AcquireProxyDto } from '@/types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// 世界地图 SVG 组件 - 简化版
const WorldMap = ({
  proxies,
  onCountryClick,
}: {
  proxies: ProxyConfig[];
  onCountryClick?: (country: string) => void;
}) => {
  // 按国家统计代理数量
  const countryStats = useMemo(() => {
    const stats: Record<string, { count: number; quality: number }> = {};
    proxies.forEach((proxy) => {
      if (!stats[proxy.country]) {
        stats[proxy.country] = { count: 0, quality: 0 };
      }
      stats[proxy.country].count++;
      stats[proxy.country].quality += proxy.quality;
    });
    Object.keys(stats).forEach((country) => {
      stats[country].quality = Math.round(stats[country].quality / stats[country].count);
    });
    return stats;
  }, [proxies]);

  // 国家坐标 (简化的地图坐标)
  const countryPositions: Record<string, { x: number; y: number; name: string }> = {
    美国: { x: 120, y: 140, name: '美国' },
    加拿大: { x: 130, y: 90, name: '加拿大' },
    英国: { x: 330, y: 110, name: '英国' },
    德国: { x: 360, y: 120, name: '德国' },
    法国: { x: 340, y: 135, name: '法国' },
    日本: { x: 590, y: 140, name: '日本' },
    韩国: { x: 570, y: 150, name: '韩国' },
    新加坡: { x: 535, y: 220, name: '新加坡' },
    香港: { x: 545, y: 175, name: '香港' },
    台湾: { x: 560, y: 175, name: '台湾' },
    澳大利亚: { x: 580, y: 290, name: '澳大利亚' },
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0c1426 0%, #1a2942 100%)',
        borderRadius: 8,
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景网格 */}
      <svg
        width="100%"
        height="360"
        viewBox="0 0 700 360"
        style={{ position: 'absolute', top: 0, left: 0, opacity: 0.1 }}
      >
        {/* 经线 */}
        {[...Array(15)].map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 50}
            y1="0"
            x2={i * 50}
            y2="360"
            stroke="#4096ff"
            strokeWidth="1"
          />
        ))}
        {/* 纬线 */}
        {[...Array(8)].map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={i * 50}
            x2="700"
            y2={i * 50}
            stroke="#4096ff"
            strokeWidth="1"
          />
        ))}
      </svg>

      {/* 标题 */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 20,
          zIndex: 10,
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: 600 }}>
          <GlobalOutlined style={{ marginRight: 8 }} />
          全球代理分布
        </Text>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 }}>
          点击标记查看详情
        </div>
      </div>

      {/* 统计信息 */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 20,
          zIndex: 10,
          display: 'flex',
          gap: 16,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#52c41a', fontSize: 24, fontWeight: 600 }}>
            {proxies.length}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>总代理数</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#1677ff', fontSize: 24, fontWeight: 600 }}>
            {Object.keys(countryStats).length}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>覆盖地区</div>
        </div>
      </div>

      {/* 简化世界地图轮廓 */}
      <svg width="100%" height="360" viewBox="0 0 700 360">
        {/* 简化大陆轮廓 - 北美 */}
        <path
          d="M50 100 Q80 80 140 90 Q180 100 200 130 Q220 160 210 190 Q190 200 160 190 Q130 180 100 170 Q70 160 50 140 Z"
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
        {/* 南美 */}
        <path
          d="M150 220 Q170 210 190 220 Q200 250 195 280 Q185 310 170 320 Q155 310 150 280 Q145 250 150 220 Z"
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
        {/* 欧洲 */}
        <path
          d="M310 90 Q350 80 380 90 Q400 100 395 120 Q385 140 360 145 Q340 145 320 135 Q305 120 310 90 Z"
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
        {/* 非洲 */}
        <path
          d="M340 160 Q370 155 390 170 Q400 200 395 240 Q380 280 360 285 Q340 275 330 240 Q325 200 340 160 Z"
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
        {/* 亚洲 */}
        <path
          d="M420 80 Q480 70 550 80 Q600 100 620 140 Q630 180 610 200 Q570 210 530 195 Q490 180 460 160 Q430 140 420 100 Z"
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
        {/* 澳大利亚 */}
        <path
          d="M540 260 Q580 250 610 265 Q625 285 615 310 Q590 325 560 315 Q540 300 540 275 Z"
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />

        {/* 代理节点标记 */}
        {Object.entries(countryPositions).map(([country, pos]) => {
          const stats = countryStats[country];
          if (!stats) return null;

          const size = Math.min(20, 8 + stats.count * 3);
          const color =
            stats.quality >= 90 ? '#52c41a' : stats.quality >= 70 ? '#faad14' : '#ff4d4f';

          return (
            <g
              key={country}
              style={{ cursor: 'pointer' }}
              onClick={() => onCountryClick?.(country)}
            >
              {/* 脉冲动画圈 */}
              <circle cx={pos.x} cy={pos.y} r={size + 10} fill={color} opacity="0.2">
                <animate
                  attributeName="r"
                  values={`${size};${size + 20};${size}`}
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.3;0;0.3"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* 主标记 */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={size}
                fill={color}
                stroke="#fff"
                strokeWidth="2"
                opacity="0.9"
              />
              {/* 数量标签 */}
              <text
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                fill="#fff"
                fontSize="10"
                fontWeight="bold"
              >
                {stats.count}
              </text>
              {/* 国家名称 */}
              <text
                x={pos.x}
                y={pos.y + size + 14}
                textAnchor="middle"
                fill="rgba(255,255,255,0.8)"
                fontSize="11"
              >
                {pos.name}
              </text>
            </g>
          );
        })}

        {/* 连接线 (从中国出发) */}
        {Object.entries(countryPositions)
          .filter(([country]) => countryStats[country])
          .map(([country, pos]) => (
            <line
              key={`line-${country}`}
              x1="480"
              y1="160"
              x2={pos.x}
              y2={pos.y}
              stroke="rgba(22, 119, 255, 0.3)"
              strokeWidth="1"
              strokeDasharray="4,4"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="0;8"
                dur="1s"
                repeatCount="indefinite"
              />
            </line>
          ))}

        {/* 中国中心点 */}
        <circle cx="480" cy="160" r="6" fill="#1677ff" stroke="#fff" strokeWidth="2" />
        <text x="480" y="148" textAnchor="middle" fill="#1677ff" fontSize="11" fontWeight="bold">
          中国
        </text>
      </svg>

      {/* 图例 */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 20,
          display: 'flex',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{ width: 12, height: 12, borderRadius: '50%', background: '#52c41a' }}
          />
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>优质 (90+)</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{ width: 12, height: 12, borderRadius: '50%', background: '#faad14' }}
          />
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>良好 (70-89)</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff4d4f' }}
          />
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>较差 (&lt;70)</Text>
        </div>
      </div>
    </div>
  );
};

// 代理卡片组件
const ProxyCard = ({
  proxy,
  selected,
  onSelect,
  onTest,
  onRelease,
}: {
  proxy: ProxyConfig;
  selected: boolean;
  onSelect: () => void;
  onTest: () => void;
  onRelease: () => void;
}) => {
  const getQualityColor = (quality: number) => {
    if (quality >= 90) return '#52c41a';
    if (quality >= 70) return '#faad14';
    return '#ff4d4f';
  };

  const statusMap: Record<string, { text: string; color: string }> = {
    available: { text: '可用', color: 'success' },
    in_use: { text: '使用中', color: 'processing' },
    unavailable: { text: '不可用', color: 'default' },
  };

  return (
    <Card
      size="small"
      hoverable
      style={{
        borderRadius: 8,
        border: selected ? '2px solid #1677ff' : '1px solid #f0f0f0',
        background: selected ? '#e6f4ff' : '#fff',
      }}
      onClick={onSelect}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Space>
          <Tag color={statusMap[proxy.status]?.color || 'default'}>
            {statusMap[proxy.status]?.text || '未知'}
          </Tag>
          <Tag color="blue">{proxy.protocol.toUpperCase()}</Tag>
        </Space>
        <Tag color={proxy.provider === 'IPIDEA' ? 'purple' : 'cyan'}>{proxy.provider}</Tag>
      </div>

      <div style={{ marginBottom: 12 }}>
        <code style={{ fontSize: 14, fontWeight: 600, color: '#262626' }}>
          {proxy.host}:{proxy.port}
        </code>
      </div>

      <Row gutter={8} style={{ marginBottom: 12 }}>
        <Col span={12}>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            <EnvironmentOutlined style={{ marginRight: 4 }} />
            {proxy.country}
            {proxy.city && ` · ${proxy.city}`}
          </div>
        </Col>
        <Col span={12}>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            <WifiOutlined style={{ marginRight: 4 }} />
            {proxy.latency || '-'}ms
          </div>
        </Col>
      </Row>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>质量评分</span>
          <span
            style={{ fontSize: 12, fontWeight: 600, color: getQualityColor(proxy.quality) }}
          >
            {proxy.quality}%
          </span>
        </div>
        <Progress
          percent={proxy.quality}
          size="small"
          showInfo={false}
          strokeColor={getQualityColor(proxy.quality)}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button size="small" icon={<ApiOutlined />} onClick={(e) => { e.stopPropagation(); onTest(); }}>
          测试
        </Button>
        <Popconfirm
          title="确定释放此代理？"
          onConfirm={(e) => { e?.stopPropagation(); onRelease(); }}
          onCancel={(e) => e?.stopPropagation()}
        >
          <Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()}>
            释放
          </Button>
        </Popconfirm>
      </div>
    </Card>
  );
};

const ProxyList = () => {
  const queryClient = useQueryClient();
  const [acquireModalVisible, setAcquireModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filterCountry, setFilterCountry] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  // 获取代理列表
  const { data: proxiesData, isLoading, refetch } = useQuery({
    queryKey: ['proxies'],
    queryFn: () => proxyApi.list({ page: 1, pageSize: 100 }),
    refetchInterval: 30000, // 每30秒自动刷新
  });

  // 获取代理统计
  const { data: stats } = useQuery({
    queryKey: ['proxyStats'],
    queryFn: proxyApi.stats,
    refetchInterval: 30000,
  });

  // 申请代理
  const acquireMutation = useMutation({
    mutationFn: proxyApi.acquire,
    onSuccess: () => {
      message.success('代理申请成功');
      setAcquireModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['proxies'] });
      queryClient.invalidateQueries({ queryKey: ['proxyStats'] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // 释放代理
  const releaseMutation = useMutation({
    mutationFn: proxyApi.release,
    onSuccess: () => {
      message.success('代理已释放');
      queryClient.invalidateQueries({ queryKey: ['proxies'] });
      queryClient.invalidateQueries({ queryKey: ['proxyStats'] });
    },
  });

  // 测试代理
  const testMutation = useMutation({
    mutationFn: proxyApi.test,
    onSuccess: (data) => {
      if (data.success) {
        message.success(`代理连接正常，延迟: ${data.latency}ms`);
      } else {
        message.error('代理连接失败');
      }
    },
  });

  // 过滤后的代理列表
  const filteredProxies = useMemo(() => {
    let result = proxiesData?.data || [];
    if (filterCountry) {
      result = result.filter((p) => p.country === filterCountry);
    }
    if (filterStatus) {
      result = result.filter((p) => p.status === filterStatus);
    }
    if (searchText) {
      const text = searchText.toLowerCase();
      result = result.filter(
        (p) =>
          p.host.toLowerCase().includes(text) ||
          p.country.toLowerCase().includes(text) ||
          (p.city && p.city.toLowerCase().includes(text))
      );
    }
    return result;
  }, [proxiesData?.data, filterCountry, filterStatus, searchText]);

  // 选中的代理
  const selectedProxies = useMemo(() => {
    return filteredProxies.filter((p) => selectedRowKeys.includes(p.id));
  }, [filteredProxies, selectedRowKeys]);

  // 处理申请代理
  const handleAcquire = async (values: AcquireProxyDto) => {
    acquireMutation.mutate(values);
  };

  // 批量释放
  const handleBatchRelease = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要释放的代理');
      return;
    }
    Modal.confirm({
      title: '批量释放代理',
      content: `确定要释放选中的 ${selectedRowKeys.length} 个代理吗？`,
      onOk: async () => {
        const hide = message.loading('正在释放...', 0);
        for (const id of selectedRowKeys) {
          await releaseMutation.mutateAsync(id as string);
        }
        hide();
        setSelectedRowKeys([]);
        message.success('批量释放完成');
      },
    });
  };

  // 批量测试
  const handleBatchTest = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要测试的代理');
      return;
    }
    const hide = message.loading(`正在测试 ${selectedRowKeys.length} 个代理...`, 0);
    let successCount = 0;
    for (const id of selectedRowKeys) {
      const result = await testMutation.mutateAsync(id as string);
      if (result.success) successCount++;
    }
    hide();
    message.info(`测试完成: ${successCount}/${selectedRowKeys.length} 个代理正常`);
  };

  // 导出
  const handleExport = () => {
    const data = filteredProxies.map((p) => ({
      地址: `${p.host}:${p.port}`,
      协议: p.protocol,
      国家: p.country,
      城市: p.city || '',
      供应商: p.provider,
      质量: p.quality,
      延迟: p.latency || '',
      状态: p.status,
    }));
    const csv =
      Object.keys(data[0] || {}).join(',') +
      '\n' +
      data.map((row) => Object.values(row).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proxies_${dayjs().format('YYYYMMDD_HHmmss')}.csv`;
    a.click();
  };

  // 获取质量颜色
  const getQualityStatus = (quality: number) => {
    if (quality >= 90) return 'success';
    if (quality >= 70) return 'normal';
    return 'exception';
  };

  // 获取延迟颜色
  const getLatencyColor = (latency?: number) => {
    if (!latency) return '#999';
    if (latency < 100) return '#52c41a';
    if (latency < 200) return '#faad14';
    return '#ff4d4f';
  };

  // 表格行选择配置
  const rowSelection: TableRowSelection<ProxyConfig> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
      {
        key: 'selectAvailable',
        text: '选择可用',
        onSelect: () => {
          const keys = filteredProxies.filter((p) => p.status === 'available').map((p) => p.id);
          setSelectedRowKeys(keys);
        },
      },
      {
        key: 'selectHighQuality',
        text: '选择优质 (90+)',
        onSelect: () => {
          const keys = filteredProxies.filter((p) => p.quality >= 90).map((p) => p.id);
          setSelectedRowKeys(keys);
        },
      },
    ],
  };

  // 表格列定义
  const columns: ColumnsType<ProxyConfig> = [
    {
      title: '代理地址',
      key: 'address',
      width: 200,
      render: (_, record) => (
        <div>
          <code style={{ fontSize: 13, fontWeight: 500 }}>
            {record.host}:{record.port}
          </code>
          <div style={{ marginTop: 4 }}>
            <Tag color="blue">{record.protocol.toUpperCase()}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: '位置',
      key: 'location',
      width: 140,
      filters: [
        { text: '美国', value: '美国' },
        { text: '日本', value: '日本' },
        { text: '英国', value: '英国' },
        { text: '德国', value: '德国' },
        { text: '香港', value: '香港' },
      ],
      onFilter: (value, record) => record.country === value,
      render: (_, record) => (
        <div>
          <GlobalOutlined style={{ marginRight: 8, color: '#1677ff' }} />
          <span style={{ fontWeight: 500 }}>{record.country}</span>
          {record.city && (
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              {record.city}
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
      filters: [
        { text: 'IPIDEA', value: 'IPIDEA' },
        { text: 'Luminati', value: 'Luminati' },
        { text: 'ProxyRack', value: 'ProxyRack' },
        { text: 'SmartProxy', value: 'SmartProxy' },
      ],
      onFilter: (value, record) => record.provider === value,
      render: (provider: string) => (
        <Tag color={provider === 'IPIDEA' ? 'purple' : provider === 'Luminati' ? 'cyan' : 'blue'}>
          {provider}
        </Tag>
      ),
    },
    {
      title: '质量',
      dataIndex: 'quality',
      key: 'quality',
      width: 120,
      sorter: (a, b) => a.quality - b.quality,
      render: (quality: number) => (
        <Tooltip title={`质量评分: ${quality}/100`}>
          <Progress
            percent={quality}
            size="small"
            status={getQualityStatus(quality) as 'success' | 'normal' | 'exception'}
            strokeWidth={6}
          />
        </Tooltip>
      ),
    },
    {
      title: '延迟',
      dataIndex: 'latency',
      key: 'latency',
      width: 100,
      sorter: (a, b) => (a.latency ?? 0) - (b.latency ?? 0),
      render: (latency?: number) => (
        <span style={{ color: getLatencyColor(latency), fontWeight: 500 }}>
          {latency ?? '-'}ms
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: '可用', value: 'available' },
        { text: '使用中', value: 'in_use' },
        { text: '不可用', value: 'unavailable' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          available: { text: '可用', color: 'success' },
          in_use: { text: '使用中', color: 'processing' },
          unavailable: { text: '不可用', color: 'default' },
        };
        const config = statusMap[status] || { text: '未知', color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '到期时间',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      width: 160,
      sorter: (a, b) => new Date(a.expiresAt || 0).getTime() - new Date(b.expiresAt || 0).getTime(),
      render: (time?: string) => {
        if (!time) return '-';
        const isExpiring = dayjs(time).diff(dayjs(), 'day') <= 3;
        const isExpired = dayjs(time).isBefore(dayjs());
        return (
          <Space>
            <span style={{ color: isExpired ? '#ff4d4f' : isExpiring ? '#faad14' : undefined }}>
              {dayjs(time).format('MM-DD HH:mm')}
            </span>
            {isExpiring && !isExpired && (
              <Tooltip title="即将到期">
                <WarningOutlined style={{ color: '#faad14' }} />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<ApiOutlined />}
            loading={testMutation.isPending}
            onClick={() => testMutation.mutate(record.id)}
          >
            测试
          </Button>
          <Popconfirm
            title="确定释放此代理？"
            onConfirm={() => releaseMutation.mutate(record.id)}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 国家选项
  const countryOptions = [
    { value: '美国', label: '🇺🇸 美国' },
    { value: '英国', label: '🇬🇧 英国' },
    { value: '德国', label: '🇩🇪 德国' },
    { value: '法国', label: '🇫🇷 法国' },
    { value: '日本', label: '🇯🇵 日本' },
    { value: '韩国', label: '🇰🇷 韩国' },
    { value: '新加坡', label: '🇸🇬 新加坡' },
    { value: '香港', label: '🇭🇰 香港' },
    { value: '台湾', label: '🇹🇼 台湾' },
    { value: '加拿大', label: '🇨🇦 加拿大' },
    { value: '澳大利亚', label: '🇦🇺 澳大利亚' },
  ];

  // 计算即将到期的代理数量
  const expiringCount = useMemo(() => {
    return (proxiesData?.data || []).filter((p) => {
      if (!p.expiresAt) return false;
      const daysLeft = dayjs(p.expiresAt).diff(dayjs(), 'day');
      return daysLeft >= 0 && daysLeft <= 3;
    }).length;
  }, [proxiesData?.data]);

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          代理管理
        </Title>
        <Text type="secondary">管理家宽代理资源，为设备配置网络出口</Text>
      </div>

      {/* 即将到期提醒 */}
      {expiringCount > 0 && (
        <Alert
          message={
            <span>
              <WarningOutlined style={{ marginRight: 8 }} />
              有 {expiringCount} 个代理将在 3 天内到期，请及时续费或更换
            </span>
          }
          type="warning"
          showIcon={false}
          banner
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="代理总数"
              value={stats?.total || 0}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="使用中"
              value={stats?.active || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="可用"
              value={(stats?.total || 0) - (stats?.active || 0)}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="带宽消耗"
              value={stats?.totalBandwidthUsed || 0}
              suffix="MB"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 世界地图 */}
      <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: 0 }}>
        <WorldMap
          proxies={proxiesData?.data || []}
          onCountryClick={(country) => {
            setFilterCountry(country);
            message.info(`已筛选: ${country}`);
          }}
        />
      </Card>

      {/* 代理列表 */}
      <Card
        title={
          <Space>
            <span>代理列表</span>
            <Badge count={filteredProxies.length} style={{ backgroundColor: '#1677ff' }} />
          </Space>
        }
        extra={
          <Space>
            {/* 搜索 */}
            <Input
              placeholder="搜索 IP/国家/城市"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 180 }}
              allowClear
            />

            {/* 筛选 */}
            <Select
              placeholder="按国家筛选"
              value={filterCountry}
              onChange={setFilterCountry}
              options={[{ value: undefined, label: '全部国家' }, ...countryOptions]}
              style={{ width: 140 }}
              allowClear
            />
            <Select
              placeholder="按状态筛选"
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 120 }}
              allowClear
              options={[
                { value: undefined, label: '全部状态' },
                { value: 'available', label: '可用' },
                { value: 'in_use', label: '使用中' },
                { value: 'unavailable', label: '不可用' },
              ]}
            />

            <Divider type="vertical" />

            {/* 视图切换 */}
            <Segmented
              value={viewMode}
              onChange={(v) => setViewMode(v as 'table' | 'card')}
              options={[
                { value: 'table', icon: <TableOutlined /> },
                { value: 'card', icon: <AppstoreOutlined /> },
              ]}
            />

            <Divider type="vertical" />

            {/* 批量操作 */}
            {selectedRowKeys.length > 0 && (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'test',
                      label: '批量测试',
                      icon: <ApiOutlined />,
                      onClick: handleBatchTest,
                    },
                    {
                      key: 'release',
                      label: '批量释放',
                      icon: <DeleteOutlined />,
                      danger: true,
                      onClick: handleBatchRelease,
                    },
                  ],
                }}
              >
                <Button>
                  批量操作 ({selectedRowKeys.length}) <DownOutlined />
                </Button>
              </Dropdown>
            )}

            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出
            </Button>

            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              刷新
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAcquireModalVisible(true)}
            >
              申请代理
            </Button>
          </Space>
        }
      >
        {viewMode === 'table' ? (
          <Table<ProxyConfig>
            rowSelection={rowSelection}
            columns={columns}
            dataSource={filteredProxies}
            rowKey="id"
            loading={isLoading}
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个代理`,
            }}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredProxies.map((proxy) => (
              <Col key={proxy.id} xs={24} sm={12} md={8} lg={6}>
                <ProxyCard
                  proxy={proxy}
                  selected={selectedRowKeys.includes(proxy.id)}
                  onSelect={() => {
                    if (selectedRowKeys.includes(proxy.id)) {
                      setSelectedRowKeys(selectedRowKeys.filter((k) => k !== proxy.id));
                    } else {
                      setSelectedRowKeys([...selectedRowKeys, proxy.id]);
                    }
                  }}
                  onTest={() => testMutation.mutate(proxy.id)}
                  onRelease={() => releaseMutation.mutate(proxy.id)}
                />
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* 申请代理弹窗 */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            申请新代理
          </Space>
        }
        open={acquireModalVisible}
        onCancel={() => setAcquireModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={acquireMutation.isPending}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleAcquire}>
          <Form.Item
            label="目标国家/地区"
            name="country"
            rules={[{ required: true, message: '请选择国家/地区' }]}
          >
            <Select placeholder="请选择" options={countryOptions} size="large" />
          </Form.Item>
          <Form.Item label="协议类型" name="protocol" initialValue="socks5">
            <Select size="large">
              <Select.Option value="http">HTTP - 适合网页访问</Select.Option>
              <Select.Option value="https">HTTPS - 加密传输</Select.Option>
              <Select.Option value="socks5">SOCKS5 - 全协议支持 (推荐)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="最低质量要求" name="minQuality" initialValue={80}>
            <Select size="large">
              <Select.Option value={90}>
                <Space>
                  <span style={{ color: '#52c41a' }}>●</span>
                  优秀 (90+) - 稳定性最高
                </Space>
              </Select.Option>
              <Select.Option value={80}>
                <Space>
                  <span style={{ color: '#1677ff' }}>●</span>
                  良好 (80+) - 性价比最优
                </Space>
              </Select.Option>
              <Select.Option value={70}>
                <Space>
                  <span style={{ color: '#faad14' }}>●</span>
                  一般 (70+) - 基础使用
                </Space>
              </Select.Option>
              <Select.Option value={60}>
                <Space>
                  <span style={{ color: '#ff4d4f' }}>●</span>
                  较低 (60+) - 仅测试用途
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>

          <Alert
            message="提示"
            description="申请的代理将自动分配最优节点，默认有效期30天。高质量代理资源有限，请根据实际需求选择。"
            type="info"
            showIcon
          />
        </Form>
      </Modal>
    </div>
  );
};

export default ProxyList;
