import { useState, useEffect } from 'react';
import { Table, Tag, Space, Button, Modal, message, Card, Row, Col, Select, Input, DatePicker, Descriptions, Dropdown } from 'antd';
import { EyeOutlined, DownloadOutlined, DeleteOutlined, SearchOutlined, DownOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { getAuditLogs, type AuditLog, type LogParams, exportAuditLogs, cleanExpiredLogs } from '@/services/log';
import dayjs from 'dayjs';
import { exportToExcel } from '@/utils/export';

const { Search } = Input;
const { RangePicker } = DatePicker;

const AuditLogList = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  const [resourceFilter, setResourceFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: LogParams = { page, pageSize };
      if (searchKeyword) params.search = searchKeyword;
      if (actionFilter) params.action = actionFilter;
      if (resourceFilter) params.resource = resourceFilter;
      if (dateRange) {
        params.startDate = dateRange[0];
        params.endDate = dateRange[1];
      }
      const res = await getAuditLogs(params);
      setLogs(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, pageSize, searchKeyword, actionFilter, resourceFilter, dateRange]);

  // 导出当前列表
  const handleExportExcel = () => {
    const exportData = logs.map(log => ({
      '日志ID': log.id,
      '用户': log.user?.username || '-',
      '操作': log.action,
      '资源': log.resource,
      '资源ID': log.resourceId || '-',
      '请求方法': log.method,
      '请求路径': log.path,
      'IP地址': log.ip,
      '响应状态': log.responseStatus,
      '耗时(ms)': log.duration,
      '操作时间': dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    }));
    exportToExcel(exportData, `操作日志_${dayjs().format('YYYYMMDD_HHmmss')}`, '操作日志');
    message.success('导出成功');
  };

  // 清理过期日志
  const handleCleanLogs = () => {
    Modal.confirm({
      title: '清理过期日志',
      content: '确定要清理30天前的日志吗？此操作不可恢复。',
      onOk: async () => {
        try {
          await cleanExpiredLogs(30);
          message.success('清理成功');
          loadLogs();
        } catch (error) {
          message.error('清理失败');
        }
      },
    });
  };

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'excel',
      label: '导出为Excel',
      icon: <DownloadOutlined />,
      onClick: handleExportExcel,
    },
  ];

  const columns: ColumnsType<AuditLog> = [
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      sorter: (a, b) => (a.user?.username || '').localeCompare(b.user?.username || ''),
      render: (user: any) => user?.username || '-',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      sorter: (a, b) => a.action.localeCompare(b.action),
      render: (action: string) => {
        const actionColors: Record<string, string> = {
          create: 'green',
          update: 'blue',
          delete: 'red',
          read: 'default',
          login: 'cyan',
          logout: 'purple',
        };
        return <Tag color={actionColors[action.toLowerCase()] || 'default'}>{action}</Tag>;
      },
    },
    {
      title: '资源',
      dataIndex: 'resource',
      key: 'resource',
      width: 120,
      sorter: (a, b) => a.resource.localeCompare(b.resource),
    },
    {
      title: '资源ID',
      dataIndex: 'resourceId',
      key: 'resourceId',
      width: 100,
      ellipsis: true,
      render: (id: string) => id || '-',
    },
    {
      title: '请求方法',
      dataIndex: 'method',
      key: 'method',
      width: 100,
      sorter: (a, b) => a.method.localeCompare(b.method),
      render: (method: string) => {
        const methodColors: Record<string, string> = {
          GET: 'blue',
          POST: 'green',
          PUT: 'orange',
          PATCH: 'cyan',
          DELETE: 'red',
        };
        return <Tag color={methodColors[method]}>{method}</Tag>;
      },
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 130,
      sorter: (a, b) => a.ip.localeCompare(b.ip),
    },
    {
      title: '状态码',
      dataIndex: 'responseStatus',
      key: 'responseStatus',
      width: 90,
      sorter: (a, b) => a.responseStatus - b.responseStatus,
      render: (status: number) => {
        const color = status >= 200 && status < 300 ? 'green' : status >= 400 ? 'red' : 'orange';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: '耗时(ms)',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      sorter: (a, b) => a.duration - b.duration,
      render: (duration: number) => {
        const color = duration < 100 ? 'green' : duration < 500 ? 'orange' : 'red';
        return <Tag color={color}>{duration}</Tag>;
      },
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedLog(record);
            setDetailModalVisible(true);
          }}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <h2>操作日志</h2>

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="搜索用户名/IP/路径"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={(value) => {
                setSearchKeyword(value);
                setPage(1);
              }}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="操作类型"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => {
                setActionFilter(value);
                setPage(1);
              }}
            >
              <Select.Option value="create">创建</Select.Option>
              <Select.Option value="update">更新</Select.Option>
              <Select.Option value="delete">删除</Select.Option>
              <Select.Option value="read">查看</Select.Option>
              <Select.Option value="login">登录</Select.Option>
              <Select.Option value="logout">登出</Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="资源类型"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => {
                setResourceFilter(value);
                setPage(1);
              }}
            >
              <Select.Option value="users">用户</Select.Option>
              <Select.Option value="devices">设备</Select.Option>
              <Select.Option value="orders">订单</Select.Option>
              <Select.Option value="roles">角色</Select.Option>
              <Select.Option value="settings">设置</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={10}>
            <RangePicker
              style={{ width: '100%' }}
              showTime
              placeholder={['开始时间', '结束时间']}
              onChange={(dates) => {
                if (dates) {
                  setDateRange([
                    dates[0]!.format('YYYY-MM-DD HH:mm:ss'),
                    dates[1]!.format('YYYY-MM-DD HH:mm:ss'),
                  ]);
                } else {
                  setDateRange(null);
                }
                setPage(1);
              }}
            />
          </Col>
        </Row>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Dropdown menu={{ items: exportMenuItems }} placement="bottomLeft">
            <Button icon={<DownloadOutlined />}>
              导出数据 <DownOutlined />
            </Button>
          </Dropdown>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleCleanLogs}
          >
            清理过期日志
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          },
        }}
        scroll={{ x: 1400 }}
      />

      {/* 日志详情对话框 */}
      <Modal
        title="日志详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedLog && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="日志ID" span={2}>
              {selectedLog.id}
            </Descriptions.Item>
            <Descriptions.Item label="用户">
              {selectedLog.user?.username || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="用户邮箱">
              {selectedLog.user?.email || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="操作">
              {selectedLog.action}
            </Descriptions.Item>
            <Descriptions.Item label="资源">
              {selectedLog.resource}
            </Descriptions.Item>
            <Descriptions.Item label="资源ID" span={2}>
              {selectedLog.resourceId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="请求方法">
              {selectedLog.method}
            </Descriptions.Item>
            <Descriptions.Item label="请求路径">
              {selectedLog.path}
            </Descriptions.Item>
            <Descriptions.Item label="IP地址">
              {selectedLog.ip}
            </Descriptions.Item>
            <Descriptions.Item label="响应状态">
              {selectedLog.responseStatus}
            </Descriptions.Item>
            <Descriptions.Item label="耗时">
              {selectedLog.duration} ms
            </Descriptions.Item>
            <Descriptions.Item label="操作时间">
              {dayjs(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="User Agent" span={2}>
              {selectedLog.userAgent}
            </Descriptions.Item>
            {selectedLog.requestBody && (
              <Descriptions.Item label="请求数据" span={2}>
                <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f5f5f5', padding: 8 }}>
                  {JSON.stringify(selectedLog.requestBody, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogList;
