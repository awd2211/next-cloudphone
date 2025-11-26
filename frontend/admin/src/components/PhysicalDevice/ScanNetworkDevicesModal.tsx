import { memo, useState, useCallback } from 'react';
import { Modal, Alert, Form, Input, InputNumber, Button, Spin, Table, Tag, Space, Progress, Typography, Collapse, Statistic, Row, Col } from 'antd';
import { ScanOutlined, QuestionCircleOutlined, CheckCircleOutlined, WifiOutlined, ApiOutlined, SettingOutlined, DesktopOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { statusConfig } from './physicalDeviceUtils';
import { ScreenMirrorModal } from './ScreenMirrorModal';
import { NEUTRAL_LIGHT } from '@/theme';

const { Text } = Typography;

interface ScanResult {
  serialNumber: string;
  model?: string;
  manufacturer?: string;
  androidVersion?: string;
  ipAddress: string;
  status: 'online' | 'offline';
}

/** 扫描统计信息 */
interface ScanStatistics {
  totalIps: number;
  scannedIps: number;
  hostsAlive?: number;
  portsOpen: number;
  adbConnected: number;
  devicesFound: number;
  errors: number;
  startTime: number;
}

/** 扫描阶段 */
type ScanPhase = 'alive_check' | 'adb_check';

interface ScanProgress {
  scannedIps: number;
  totalIps: number;
  foundDevices: number;
  currentIp?: string;
  phase?: ScanPhase;
  aliveHosts?: number;
  checkedHosts?: number;
  statistics?: ScanStatistics;
}

/** 扫描参数 */
interface ScanParams {
  networkCidr: string;
  concurrency?: number;
  timeoutMs?: number;
}

interface ScanNetworkDevicesModalProps {
  visible: boolean;
  form: FormInstance;
  scanResults: ScanResult[];
  isScanning: boolean;
  scanProgress?: ScanProgress;
  onCancel: () => void;
  onScan: (values: ScanParams) => void;
  onRegister: (device: ScanResult) => void;
}

export const ScanNetworkDevicesModal = memo<ScanNetworkDevicesModalProps>(
  ({ visible, form, scanResults, isScanning, scanProgress, onCancel, onScan, onRegister }) => {
    // 屏幕映射状态
    const [mirrorDevice, setMirrorDevice] = useState<ScanResult | null>(null);

    // 打开屏幕映射
    const handleOpenMirror = useCallback((device: ScanResult) => {
      setMirrorDevice(device);
    }, []);

    // 关闭屏幕映射
    const handleCloseMirror = useCallback(() => {
      setMirrorDevice(null);
    }, []);

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
          <Space size="small">
            <Button
              type="default"
              size="small"
              icon={<DesktopOutlined />}
              onClick={() => handleOpenMirror(record)}
              disabled={record.status !== 'online'}
            >
              屏幕
            </Button>
            <Button type="primary" size="small" onClick={() => onRegister(record)}>
              注册
            </Button>
          </Space>
        ),
      },
    ];

    // 计算扫描进度百分比
    const getProgressPercent = () => {
      if (!scanProgress) return 0;
      if (scanProgress.phase === 'alive_check') {
        // 阶段1占 30%
        return Math.round((scanProgress.scannedIps / scanProgress.totalIps) * 30);
      } else if (scanProgress.phase === 'adb_check' && scanProgress.aliveHosts) {
        // 阶段2占 70%
        const phase2Progress = scanProgress.checkedHosts !== undefined
          ? (scanProgress.checkedHosts / scanProgress.aliveHosts) * 70
          : 0;
        return Math.round(30 + phase2Progress);
      }
      // 兼容旧版本进度
      return Math.round((scanProgress.scannedIps / scanProgress.totalIps) * 100);
    };

    // 获取阶段显示文字
    const getPhaseText = () => {
      if (!scanProgress?.phase) return '扫描中...';
      if (scanProgress.phase === 'alive_check') {
        return '阶段 1/2：探测存活主机';
      }
      return `阶段 2/2：检测 ADB 端口 (${scanProgress.aliveHosts || 0} 个存活主机)`;
    };

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
          description={
            <div>
              <p style={{ margin: 0 }}>
                扫描将分两阶段进行：1) 快速探测存活主机 2) 检测 ADB 端口 (5555)
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: NEUTRAL_LIGHT.text.tertiary }}>
                确保设备已开启 ADB over TCP/IP：<code>adb tcpip 5555</code>
              </p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <Form form={form} onFinish={onScan} layout="vertical" style={{ marginBottom: '16px' }}>
          <Form.Item
            name="networkCidr"
            label="子网段"
            rules={[
              { required: true, message: '请输入子网段' },
              { pattern: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/, message: '请输入有效的 CIDR 格式' },
            ]}
            initialValue="192.168.102.0/23"
          >
            <Input placeholder="例如: 192.168.102.0/23" style={{ maxWidth: 300 }} />
          </Form.Item>

          <Collapse
            ghost
            items={[
              {
                key: 'advanced',
                label: <span><SettingOutlined /> 高级选项</span>,
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="concurrency"
                        label="并发数"
                        initialValue={50}
                        tooltip="同时扫描的 IP 数量，越大越快但可能导致误判"
                      >
                        <InputNumber min={10} max={200} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="timeoutMs"
                        label="超时时间 (毫秒)"
                        initialValue={5000}
                        tooltip="每个 IP 的连接超时时间，网络延迟高时需增大"
                      >
                        <InputNumber min={1000} max={30000} step={500} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />

          <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" icon={<ScanOutlined />} loading={isScanning}>
              开始扫描
            </Button>
          </Form.Item>
        </Form>

        {isScanning && (
          <div style={{ padding: '16px', background: NEUTRAL_LIGHT.bg.secondary, borderRadius: 8, marginBottom: scanResults.length > 0 ? 16 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Spin size="small" />
              <Text strong>{getPhaseText()}</Text>
            </div>
            {scanProgress && (
              <>
                <Progress
                  percent={getProgressPercent()}
                  status="active"
                  strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                  style={{ marginBottom: 12 }}
                />

                {/* 统计信息 - 紧凑布局 */}
                {scanProgress.statistics && (
                  <Row gutter={8} style={{ marginBottom: 8 }}>
                    <Col span={6}>
                      <Statistic
                        title="总 IP"
                        value={scanProgress.statistics.totalIps}
                        valueStyle={{ fontSize: 14 }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title={<><WifiOutlined /> 存活</>}
                        value={scanProgress.statistics.hostsAlive || 0}
                        valueStyle={{ fontSize: 14, color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title={<><ApiOutlined /> ADB</>}
                        value={scanProgress.statistics.portsOpen}
                        valueStyle={{ fontSize: 14, color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title={<><CheckCircleOutlined /> 设备</>}
                        value={scanProgress.statistics.devicesFound}
                        valueStyle={{ fontSize: 14, color: '#722ed1' }}
                      />
                    </Col>
                  </Row>
                )}

                {scanProgress.currentIp && (
                  <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    当前: {scanProgress.currentIp}
                  </Text>
                )}
              </>
            )}
          </div>
        )}

        {/* 实时显示发现的设备 - 扫描中和扫描完成都显示 */}
        {scanResults.length > 0 && (
          <Table
            columns={scanColumns}
            dataSource={scanResults}
            rowKey="serialNumber"
            size="small"
            pagination={false}
            scroll={{ y: 300 }}
          />
        )}

        {!isScanning && scanResults.length === 0 && form.isFieldsTouched() && (
          <div style={{ textAlign: 'center', padding: '40px', color: NEUTRAL_LIGHT.text.tertiary }}>
            <QuestionCircleOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div>未发现任何设备</div>
          </div>
        )}

        {/* 屏幕映射模态框 */}
        <ScreenMirrorModal
          visible={!!mirrorDevice}
          deviceSerial={mirrorDevice ? `${mirrorDevice.ipAddress}:5555` : ''}
          deviceName={mirrorDevice ?
            `${mirrorDevice.manufacturer || ''} ${mirrorDevice.model || ''}`.trim() || mirrorDevice.serialNumber
            : undefined
          }
          onClose={handleCloseMirror}
        />
      </Modal>
    );
  }
);

ScanNetworkDevicesModal.displayName = 'ScanNetworkDevicesModal';
