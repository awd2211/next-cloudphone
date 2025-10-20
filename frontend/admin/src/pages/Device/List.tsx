import { useState, useEffect } from 'react';
import { Table, Tag, Space, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Card, Statistic, Row, Col } from 'antd';
import { PlusOutlined, PlayCircleOutlined, StopOutlined, ReloadOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getDevices, createDevice, deleteDevice, startDevice, stopDevice, rebootDevice, getDeviceStats } from '@/services/device';
import type { Device, CreateDeviceDto, DeviceStats } from '@/types';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const DeviceList = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<DeviceStats>();
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 加载设备列表
  const loadDevices = async () => {
    setLoading(true);
    try {
      const res = await getDevices({ page, pageSize });
      setDevices(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载设备列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计数据
  const loadStats = async () => {
    try {
      const data = await getDeviceStats();
      setStats(data);
    } catch (error) {
      console.error('加载统计数据失败', error);
    }
  };

  useEffect(() => {
    loadDevices();
    loadStats();
  }, [page, pageSize]);

  // 创建设备
  const handleCreate = async (values: CreateDeviceDto) => {
    try {
      await createDevice(values);
      message.success('创建设备成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('创建设备失败');
    }
  };

  // 启动设备
  const handleStart = async (id: string) => {
    try {
      await startDevice(id);
      message.success('设备启动成功');
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('启动设备失败');
    }
  };

  // 停止设备
  const handleStop = async (id: string) => {
    try {
      await stopDevice(id);
      message.success('设备停止成功');
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('停止设备失败');
    }
  };

  // 重启设备
  const handleReboot = async (id: string) => {
    try {
      await rebootDevice(id);
      message.success('设备重启中...');
      setTimeout(() => loadDevices(), 2000);
    } catch (error) {
      message.error('重启设备失败');
    }
  };

  // 删除设备
  const handleDelete = async (id: string) => {
    try {
      await deleteDevice(id);
      message.success('删除设备成功');
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('删除设备失败');
    }
  };

  const columns: ColumnsType<Device> = [
    {
      title: '设备 ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      ellipsis: true,
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          idle: { color: 'default', text: '空闲' },
          running: { color: 'green', text: '运行中' },
          stopped: { color: 'red', text: '已停止' },
          error: { color: 'error', text: '错误' },
        };
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '安卓版本',
      dataIndex: 'androidVersion',
      key: 'androidVersion',
    },
    {
      title: 'CPU',
      dataIndex: 'cpuCores',
      key: 'cpuCores',
      render: (cores: number) => `${cores} 核`,
    },
    {
      title: '内存',
      dataIndex: 'memoryMB',
      key: 'memoryMB',
      render: (memory: number) => `${(memory / 1024).toFixed(1)} GB`,
    },
    {
      title: 'IP 地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/devices/${record.id}`)}
          >
            详情
          </Button>
          {record.status === 'stopped' || record.status === 'idle' ? (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStart(record.id)}
            >
              启动
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleStop(record.id)}
              danger
            >
              停止
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleReboot(record.id)}
          >
            重启
          </Button>
          <Popconfirm
            title="确定要删除这个设备吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>设备管理</h2>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic title="总设备数" value={stats.total} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="运行中" value={stats.running} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="空闲" value={stats.idle} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="已停止" value={stats.stopped} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
        </Row>
      )}

      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          创建设备
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={devices}
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
        scroll={{ x: 1200 }}
      />

      {/* 创建设备对话框 */}
      <Modal
        title="创建设备"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item
            label="用户 ID"
            name="userId"
            rules={[{ required: true, message: '请输入用户 ID' }]}
          >
            <Input placeholder="请输入用户 ID" />
          </Form.Item>

          <Form.Item label="设备名称" name="name">
            <Input placeholder="可选，不填则自动生成" />
          </Form.Item>

          <Form.Item label="安卓版本" name="androidVersion" initialValue="11">
            <Input placeholder="例如: 11" />
          </Form.Item>

          <Form.Item label="CPU 核心数" name="cpuCores" initialValue={4}>
            <InputNumber min={1} max={16} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="内存 (MB)" name="memoryMB" initialValue={4096}>
            <InputNumber min={1024} max={16384} step={1024} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="存储 (MB)" name="storageMB" initialValue={8192}>
            <InputNumber min={2048} max={65536} step={1024} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceList;
