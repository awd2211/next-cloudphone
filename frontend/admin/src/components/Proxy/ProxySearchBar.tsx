import { Card, Row, Col, Select, InputNumber, Button, Space } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import {
  STATUS_LABELS,
  PROTOCOL_LABELS,
  PROVIDER_LABELS,
  COMMON_COUNTRIES,
} from './constants';
import type { ProxyStatus, ProxyProtocol, ProxyProvider } from './types';

interface ProxySearchBarProps {
  status?: ProxyStatus;
  protocol?: ProxyProtocol;
  provider?: ProxyProvider;
  country?: string;
  minQuality?: number;
  maxLatency?: number;
  onStatusChange: (value?: ProxyStatus) => void;
  onProtocolChange: (value?: ProxyProtocol) => void;
  onProviderChange: (value?: ProxyProvider) => void;
  onCountryChange: (value?: string) => void;
  onMinQualityChange: (value: number | null) => void;
  onMaxLatencyChange: (value: number | null) => void;
  onSearch: () => void;
  onReset: () => void;
  onRefreshPool: () => void;
}

/**
 * 代理IP搜索栏组件
 */
const ProxySearchBar: React.FC<ProxySearchBarProps> = ({
  status,
  protocol,
  provider,
  country,
  minQuality,
  maxLatency,
  onStatusChange,
  onProtocolChange,
  onProviderChange,
  onCountryChange,
  onMinQualityChange,
  onMaxLatencyChange,
  onSearch,
  onReset,
  onRefreshPool,
}) => {
  return (
    <Card style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="状态"
            allowClear
            value={status}
            onChange={onStatusChange}
            style={{ width: '100%' }}
            options={Object.entries(STATUS_LABELS).map(([key, label]) => ({
              label,
              value: key,
            }))}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="协议"
            allowClear
            value={protocol}
            onChange={onProtocolChange}
            style={{ width: '100%' }}
            options={Object.entries(PROTOCOL_LABELS).map(([key, label]) => ({
              label,
              value: key,
            }))}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="供应商"
            allowClear
            value={provider}
            onChange={onProviderChange}
            style={{ width: '100%' }}
            options={Object.entries(PROVIDER_LABELS).map(([key, label]) => ({
              label,
              value: key,
            }))}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="国家"
            allowClear
            showSearch
            value={country}
            onChange={onCountryChange}
            style={{ width: '100%' }}
            options={COMMON_COUNTRIES.map((c) => ({
              label: c.name,
              value: c.code,
            }))}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <InputNumber
            placeholder="最低质量"
            min={0}
            max={100}
            value={minQuality}
            onChange={onMinQualityChange}
            style={{ width: '100%' }}
            addonAfter="/100"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <InputNumber
            placeholder="最大延迟"
            min={0}
            value={maxLatency}
            onChange={onMaxLatencyChange}
            style={{ width: '100%' }}
            addonAfter="ms"
          />
        </Col>
        <Col xs={24} sm={24} md={12}>
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
              搜索
            </Button>
            <Button icon={<ReloadOutlined />} onClick={onReset}>
              重置
            </Button>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={onRefreshPool}
            >
              刷新代理池
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

export default ProxySearchBar;
