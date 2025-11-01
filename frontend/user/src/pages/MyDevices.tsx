import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, message, Row, Col, Statistic } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import {
  getMyDevices,
  startDevice,
  stopDevice,
  rebootDevice,
  getMyDeviceStats,
} from '@/services/device';
import type { Device } from '@/types';
import { CreateDeviceDialog } from '@/components/CreateDeviceDialog';
import dayjs from 'dayjs';

const MyDevices = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const res = await getMyDevices({ page, pageSize });
      setDevices(res.data.data);
      setTotal(res.data.total);
    } catch (error) {
      message.error('加载设备列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getMyDeviceStats();
      setStats(data);
    } catch (error) {
      console.error('加载统计失败', error);
    }
  };

  useEffect(() => {
    loadDevices();
    loadStats();
  }, [page, pageSize]);

  const handleStart = async (id: string) => {
    try {
      await startDevice(id);
      message.success('设备启动成功');
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('设备启动失败');
    }
  };

  const handleStop = async (id: string) => {
    try {
      await stopDevice(id);
      message.success('设备停止成功');
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('设备停止失败');
    }
  };

  const handleReboot = async (id: string) => {
    try {
      await rebootDevice(id);
      message.success('设备重启中...');
      setTimeout(() => loadDevices(), 2000);
    } catch (error) {
      message.error('设备重启失败');
    }
  };

  const handleCreateSuccess = (device: Device) => {
    message.success(`设备 "${device.name}" 创建成功！`);
    loadDevices();
    loadStats();
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      idle: { color: 'default', text: '空闲' },
      running: { color: 'green', text: '运行中' },
      stopped: { color: 'red', text: '已停止' },
      error: { color: 'red', text: '错误' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<Device> = [
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Android 版本',
      dataIndex: 'androidVersion',
      key: 'androidVersion',
    },
    {
      title: '配置',
      key: 'config',
      render: (_, record) => (
        <span>
          {record.cpuCores}核 / {(record.memoryMB / 1024).toFixed(1)}GB
        </span>
      ),
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
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/devices/${record.id}`)}
          >
            查看
          </Button>
          {record.status !== 'running' ? (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStart(record.id)}
            >
              启动
            </Button>
          ) : (
            <>
              <Button
                type="link"
                size="small"
                icon={<PauseCircleOutlined />}
                onClick={() => handleStop(record.id)}
                danger
              >
                停止
              </Button>
              <Button
                type="link"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => handleReboot(record.id)}
              >
                重启
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>我的设备</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateDialogOpen(true)}
        >
          创建云手机
        </Button>
      </div>

      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic title="总设备数" value={stats.total || 0} />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="运行中"
                value={stats.running || 0}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="已停止"
                value={stats.stopped || 0}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card>
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
        />
      </Card>

      <CreateDeviceDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default MyDevices;
