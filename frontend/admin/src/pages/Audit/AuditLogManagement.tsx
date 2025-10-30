import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Row,
  Col,
  Statistic,
  Select,
  Input,
  DatePicker,
  Drawer,
  Descriptions,
  Badge,
  Typography,
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { AuditLog, AuditAction, AuditLevel, AuditLogStatistics } from '@/types';
import {
  searchAuditLogs,
  getUserAuditLogs,
  getResourceAuditLogs,
  getAuditLogStatistics,
} from '@/services/auditLog';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const AuditLogManagement: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<AuditLogStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [filterAction, setFilterAction] = useState<AuditAction | undefined>(undefined);
  const [filterLevel, setFilterLevel] = useState<AuditLevel | undefined>(undefined);
  const [filterResourceType, setFilterResourceType] = useState<string>('');
  const [filterSuccess, setFilterSuccess] = useState<boolean | undefined>(undefined);
  const [filterDateRange, setFilterDateRange] = useState<[string, string] | null>(null);

  useEffect(() => {
    loadLogs();
    loadStatistics();
  }, [
    filterUserId,
    filterAction,
    filterLevel,
    filterResourceType,
    filterSuccess,
    filterDateRange,
  ]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterUserId) params.userId = filterUserId;
      if (filterAction) params.action = filterAction;
      if (filterLevel) params.level = filterLevel;
      if (filterResourceType) params.resourceType = filterResourceType;
      if (filterSuccess !== undefined) params.success = filterSuccess;
      if (filterDateRange) {
        params.startDate = filterDateRange[0];
        params.endDate = filterDateRange[1];
      }

      const res = await searchAuditLogs(params);
      if (res.success) {
        setLogs(res.data);
      }
    } catch (error) {
      message.error('加载审计日志失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const res = await getAuditLogStatistics();
      if (res.success) {
        setStatistics(res.data);
      }
    } catch (error) {
      console.error('加载统计数据失败', error);
    }
  };

  const handleViewDetail = (record: AuditLog) => {
    setSelectedLog(record);
    setIsDetailDrawerVisible(true);
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setFilterDateRange([
        dates[0].toISOString(),
        dates[1].toISOString(),
      ]);
    } else {
      setFilterDateRange(null);
    }
  };

  const getLevelColor = (level: AuditLevel) => {
    const colors: Record<AuditLevel, string> = {
      info: 'blue',
      warning: 'orange',
      error: 'red',
      critical: 'purple',
    };
    return colors[level] || 'default';
  };

  const getLevelIcon = (level: AuditLevel) => {
    const icons: Record<AuditLevel, React.ReactNode> = {
      info: <InfoCircleOutlined />,
      warning: <WarningOutlined />,
      error: <CloseCircleOutlined />,
      critical: <ExclamationCircleOutlined />,
    };
    return icons[level];
  };

  const getLevelLabel = (level: AuditLevel) => {
    const labels: Record<AuditLevel, string> = {
      info: '信息',
      warning: '警告',
      error: '错误',
      critical: '严重',
    };
    return labels[level] || level;
  };

  const getActionLabel = (action: AuditAction) => {
    const labels: Record<AuditAction, string> = {
      // 用户操作
      user_login: '用户登录',
      user_logout: '用户登出',
      user_register: '用户注册',
      user_update: '用户更新',
      user_delete: '用户删除',
      password_change: '密码修改',
      password_reset: '密码重置',
      // 配额操作
      quota_create: '配额创建',
      quota_update: '配额更新',
      quota_deduct: '配额扣除',
      quota_restore: '配额恢复',
      // 余额操作
      balance_recharge: '余额充值',
      balance_consume: '余额消费',
      balance_adjust: '余额调整',
      balance_freeze: '余额冻结',
      balance_unfreeze: '余额解冻',
      // 设备操作
      device_create: '设备创建',
      device_start: '设备启动',
      device_stop: '设备停止',
      device_delete: '设备删除',
      device_update: '设备更新',
      // 权限操作
      role_assign: '角色分配',
      role_revoke: '角色撤销',
      permission_grant: '权限授予',
      permission_revoke: '权限撤销',
      // 系统操作
      config_update: '配置更新',
      system_maintenance: '系统维护',
      // API 操作
      api_key_create: 'API密钥创建',
      api_key_revoke: 'API密钥撤销',
    };
    return labels[action] || action;
  };

  const getActionCategory = (action: AuditAction): string => {
    if (action.startsWith('user_') || action.startsWith('password_')) return '用户';
    if (action.startsWith('quota_')) return '配额';
    if (action.startsWith('balance_')) return '余额';
    if (action.startsWith('device_')) return '设备';
    if (action.startsWith('role_') || action.startsWith('permission_')) return '权限';
    if (action.startsWith('config_') || action.startsWith('system_')) return '系统';
    if (action.startsWith('api_')) return 'API';
    return '其他';
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
      sorter: (a: AuditLog, b: AuditLog) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: AuditLevel) => (
        <Tag icon={getLevelIcon(level)} color={getLevelColor(level)}>
          {getLevelLabel(level)}
        </Tag>
      ),
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 150,
      render: (action: AuditAction) => (
        <Space direction="vertical" size={0}>
          <Text strong>{getActionLabel(action)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {getActionCategory(action)}
          </Text>
        </Space>
      ),
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
      ellipsis: true,
    },
    {
      title: '资源类型',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 120,
      render: (type: string) => <Tag color="geekblue">{type}</Tag>,
    },
    {
      title: '资源ID',
      dataIndex: 'resourceId',
      key: 'resourceId',
      width: 120,
      ellipsis: true,
      render: (id?: string) => id || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: true,
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
      render: (ip?: string) => ip || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      width: 80,
      render: (success: boolean) =>
        success ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            成功
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            失败
          </Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: AuditLog) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总日志数"
              value={statistics?.total || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="成功率"
              value={statistics?.successRate || 0}
              suffix="%"
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日活动"
              value={statistics?.recentActivity.day || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本周活动"
              value={statistics?.recentActivity.week || 0}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="审计日志"
        extra={
          <Space wrap>
            <Input
              placeholder="用户ID"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              style={{ width: 150 }}
              allowClear
            />
            <Select
              placeholder="级别"
              value={filterLevel}
              onChange={setFilterLevel}
              style={{ width: 120 }}
              allowClear
            >
              <Select.Option value="info">信息</Select.Option>
              <Select.Option value="warning">警告</Select.Option>
              <Select.Option value="error">错误</Select.Option>
              <Select.Option value="critical">严重</Select.Option>
            </Select>
            <Input
              placeholder="资源类型"
              value={filterResourceType}
              onChange={(e) => setFilterResourceType(e.target.value)}
              style={{ width: 120 }}
              allowClear
            />
            <Select
              placeholder="状态"
              value={filterSuccess}
              onChange={setFilterSuccess}
              style={{ width: 100 }}
              allowClear
            >
              <Select.Option value={true}>成功</Select.Option>
              <Select.Option value={false}>失败</Select.Option>
            </Select>
            <RangePicker
              showTime
              onChange={handleDateRangeChange}
              style={{ width: 350 }}
            />
            <Button icon={<ReloadOutlined />} onClick={loadLogs}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1600 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Drawer
        title="审计日志详情"
        open={isDetailDrawerVisible}
        onClose={() => setIsDetailDrawerVisible(false)}
        width={800}
      >
        {selectedLog && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="日志ID" span={2}>
                {selectedLog.id}
              </Descriptions.Item>
              <Descriptions.Item label="时间" span={2}>
                {new Date(selectedLog.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="级别">
                <Tag icon={getLevelIcon(selectedLog.level)} color={getLevelColor(selectedLog.level)}>
                  {getLevelLabel(selectedLog.level)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {selectedLog.success ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    成功
                  </Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="error">
                    失败
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="操作类型">
                {getActionLabel(selectedLog.action)}
              </Descriptions.Item>
              <Descriptions.Item label="操作分类">
                <Tag>{getActionCategory(selectedLog.action)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="用户ID">
                {selectedLog.userId}
              </Descriptions.Item>
              <Descriptions.Item label="目标用户ID">
                {selectedLog.targetUserId || <span style={{ color: '#999' }}>-</span>}
              </Descriptions.Item>
              <Descriptions.Item label="资源类型">
                <Tag color="geekblue">{selectedLog.resourceType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="资源ID">
                {selectedLog.resourceId || <span style={{ color: '#999' }}>-</span>}
              </Descriptions.Item>
              <Descriptions.Item label="IP地址">
                {selectedLog.ipAddress || <span style={{ color: '#999' }}>-</span>}
              </Descriptions.Item>
              <Descriptions.Item label="请求ID">
                {selectedLog.requestId || <span style={{ color: '#999' }}>-</span>}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {selectedLog.description}
              </Descriptions.Item>
              {selectedLog.errorMessage && (
                <Descriptions.Item label="错误信息" span={2}>
                  <Text type="danger">{selectedLog.errorMessage}</Text>
                </Descriptions.Item>
              )}
              {selectedLog.oldValue && Object.keys(selectedLog.oldValue).length > 0 && (
                <Descriptions.Item label="旧值" span={2}>
                  <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                    {JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </Descriptions.Item>
              )}
              {selectedLog.newValue && Object.keys(selectedLog.newValue).length > 0 && (
                <Descriptions.Item label="新值" span={2}>
                  <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                    {JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </Descriptions.Item>
              )}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <Descriptions.Item label="元数据" span={2}>
                  <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </Descriptions.Item>
              )}
              {selectedLog.userAgent && (
                <Descriptions.Item label="User Agent" span={2}>
                  <Text ellipsis style={{ fontSize: 12 }}>
                    {selectedLog.userAgent}
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default AuditLogManagement;
