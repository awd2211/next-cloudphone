import { Tag, Badge, Space, Button, Tooltip, Progress, theme } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';
import type { ColumnsType } from 'antd/es/table';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PROTOCOL_LABELS,
  PROVIDER_LABELS,
  PROVIDER_COLORS,
  getQualityLevel,
} from './constants';
import type { ProxyRecord } from './types';
import dayjs from 'dayjs';

interface UseProxyColumnsProps {
  onRelease: (record: ProxyRecord) => void;
  onTest: (record: ProxyRecord) => void;
}

/**
 * 代理IP表格列定义
 */
export const useProxyColumns = ({
  onRelease,
  onTest,
}: UseProxyColumnsProps): ColumnsType<ProxyRecord> => {
  const { token } = theme.useToken();

  return [
  {
    title: '代理地址',
    dataIndex: 'host',
    key: 'host',
    width: 180,
    fixed: 'left',
    sorter: (a, b) => a.host.localeCompare(b.host),
    render: (host: string, record) => (
      <div>
        <div style={{ fontWeight: 500 }}>{host}:{record.port}</div>
        <div style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.tertiary }}>
          {PROTOCOL_LABELS[record.protocol]}
        </div>
      </div>
    ),
  },
  {
    title: '位置',
    dataIndex: 'country',
    key: 'country',
    width: 150,
    sorter: (a, b) => a.country.localeCompare(b.country),
    render: (country: string, record) => (
      <div>
        <div>{country}</div>
        {record.city && (
          <div style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.tertiary }}>{record.city}</div>
        )}
      </div>
    ),
  },
  {
    title: '供应商',
    dataIndex: 'provider',
    key: 'provider',
    width: 120,
    sorter: (a, b) => a.provider.localeCompare(b.provider),
    render: (provider: string) => (
      <Tag color={PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS]}>
        {PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS]}
      </Tag>
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    sorter: (a, b) => a.status.localeCompare(b.status),
    render: (status: string) => (
      <Badge
        status={STATUS_COLORS[status as keyof typeof STATUS_COLORS] as any}
        text={STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
      />
    ),
  },
  {
    title: '质量评分',
    dataIndex: 'quality',
    key: 'quality',
    width: 150,
    sorter: (a, b) => a.quality - b.quality,
    render: (quality: number) => {
      const level = getQualityLevel(quality);
      return (
        <div>
          <Progress
            percent={quality}
            size="small"
            status={level.color as any}
            strokeColor={
              level.color === 'success'
                ? SEMANTIC.success.main
                : level.color === 'processing'
                ? token.colorPrimary
                : level.color === 'warning'
                ? SEMANTIC.warning.main
                : SEMANTIC.error.main
            }
          />
          <div style={{ fontSize: 12, marginTop: 4 }}>
            <Tag color={level.color}>{level.label}</Tag>
          </div>
        </div>
      );
    },
  },
  {
    title: '延迟',
    dataIndex: 'latency',
    key: 'latency',
    width: 100,
    sorter: (a, b) => a.latency - b.latency,
    render: (latency: number) => (
      <span style={{ color: latency > 1000 ? SEMANTIC.error.main : SEMANTIC.success.main }}>
        {latency}ms
      </span>
    ),
  },
  {
    title: '请求统计',
    key: 'requests',
    width: 180,
    render: (_, record) => {
      const successRate =
        record.totalRequests > 0
          ? ((record.successfulRequests / record.totalRequests) * 100).toFixed(1)
          : '0';
      return (
        <div>
          <div style={{ fontSize: 12 }}>
            总计: {record.totalRequests} | 成功率: {successRate}%
          </div>
          <div style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.tertiary, marginTop: 4 }}>
            <CheckCircleOutlined style={{ color: SEMANTIC.success.main }} />{' '}
            {record.successfulRequests}{' '}
            <CloseCircleOutlined style={{ color: SEMANTIC.error.main, marginLeft: 8 }} />{' '}
            {record.failedRequests}
          </div>
        </div>
      );
    },
  },
  {
    title: '流量/成本',
    key: 'bandwidth',
    width: 150,
    render: (_, record) => (
      <div>
        <div>{record.totalBandwidth.toFixed(2)} GB</div>
        <div style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.tertiary, marginTop: 4 }}>
          ${(record.totalBandwidth * record.costPerGB).toFixed(2)}
        </div>
      </div>
    ),
  },
  {
    title: '最后检查',
    dataIndex: 'lastChecked',
    key: 'lastChecked',
    width: 160,
    sorter: (a, b) => new Date(a.lastChecked).getTime() - new Date(b.lastChecked).getTime(),
    render: (lastChecked: string) => (
      <Tooltip title={dayjs(lastChecked).format('YYYY-MM-DD HH:mm:ss')}>
        {dayjs(lastChecked).fromNow()}
      </Tooltip>
    ),
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    render: (createdAt: string) => dayjs(createdAt).format('YYYY-MM-DD HH:mm'),
  },
  {
    title: '操作',
    key: 'action',
    fixed: 'right',
    width: 180,
    render: (_, record) => (
      <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<SyncOutlined />}
          onClick={() => onTest(record)}
        >
          测试
        </Button>
        {record.status === 'in_use' && (
          <Button
            type="link"
            size="small"
            danger
            onClick={() => onRelease(record)}
          >
            释放
          </Button>
        )}
      </Space>
    ),
  },
  ];
};
