import { memo } from 'react';
import { Modal, Alert, Form, Input, Button, Spin, Table, Tag, Space } from 'antd';
import { ScanOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { statusConfig } from './physicalDeviceUtils';
import { NEUTRAL_LIGHT } from '@/theme';

interface ScanResult {
  serialNumber: string;
  model?: string;
  manufacturer?: string;
  androidVersion?: string;
  ipAddress: string;
  status: 'online' | 'offline';
}

interface ScanNetworkDevicesModalProps {
  visible: boolean;
  form: FormInstance;
  scanResults: ScanResult[];
  isScanning: boolean;
  onCancel: () => void;
  onScan: (values: { networkCidr: string }) => void;
  onRegister: (device: ScanResult) => void;
}

export const ScanNetworkDevicesModal = memo<ScanNetworkDevicesModalProps>(
  ({ visible, form, scanResults, isScanning, onCancel, onScan, onRegister }) => {
    const renderStatus = (status: string) => {
      const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
      return (
        <Tag icon={config.icon} color={config.color}>
          {config.text}
        </Tag>
      );
    };

    const scanColumns: ColumnsType<ScanResult> = [
      {
        title: '序列号',
        dataIndex: 'serialNumber',
        key: 'serialNumber',
        render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
      },
      {
        title: '设备信息',
        key: 'deviceInfo',
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            <span>{record.manufacturer || '-'}</span>
            <span style={{ fontSize: '12px', color: NEUTRAL_LIGHT.text.tertiary }}>{record.model || '-'}</span>
          </Space>
        ),
      },
      {
        title: 'IP 地址',
        dataIndex: 'ipAddress',
        key: 'ipAddress',
      },
      {
        title: 'Android 版本',
        dataIndex: 'androidVersion',
        key: 'androidVersion',
        render: (version) => (version ? <Tag color="blue">Android {version}</Tag> : '-'),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: renderStatus,
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <Button type="primary" size="small" onClick={() => onRegister(record)}>
            注册
          </Button>
        ),
      },
    ];

    return (
      <Modal
        title="扫描网络设备"
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={900}
      >
        <Alert
          message="扫描提示"
          description="请输入要扫描的子网段，例如 192.168.1.0/24。扫描将查找该网段内所有开启了 ADB over TCP/IP (端口 5555) 的 Android 设备。"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <Form form={form} onFinish={onScan} layout="inline" style={{ marginBottom: '16px' }}>
          <Form.Item
            name="networkCidr"
            rules={[{ required: true, message: '请输入子网段' }]}
            initialValue="192.168.1.0/24"
            style={{ flex: 1 }}
          >
            <Input placeholder="例如: 192.168.1.0/24" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<ScanOutlined />} loading={isScanning}>
              开始扫描
            </Button>
          </Form.Item>
        </Form>

        {isScanning && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" tip="正在扫描网络设备，请稍候..." />
          </div>
        )}

        {!isScanning && scanResults.length > 0 && (
          <Table
            columns={scanColumns}
            dataSource={scanResults}
            rowKey="serialNumber"
            size="small"
            pagination={false}
          />
        )}

        {!isScanning && scanResults.length === 0 && form.isFieldsTouched() && (
          <div style={{ textAlign: 'center', padding: '40px', color: NEUTRAL_LIGHT.text.tertiary }}>
            <QuestionCircleOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div>未发现任何设备</div>
          </div>
        )}
      </Modal>
    );
  }
);

ScanNetworkDevicesModal.displayName = 'ScanNetworkDevicesModal';
