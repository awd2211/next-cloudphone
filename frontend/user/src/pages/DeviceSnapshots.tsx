import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  message,
  Space,
  Tag,
  Popconfirm,
  Alert,
  Typography,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CameraOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons';
import { getDevice } from '@/services/device';
import {
  getDeviceSnapshots,
  createSnapshot,
  restoreSnapshot,
  deleteSnapshot,
} from '@/services/snapshot';
import type { Device } from '@/types';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

interface Snapshot {
  id: string;
  deviceId: string;
  name: string;
  description?: string;
  size: number;
  createdAt: string;
  status: string;
}

const DeviceSnapshots = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDevice();
    loadSnapshots();
  }, [id]);

  const loadDevice = async () => {
    if (!id) return;
    try {
      const res = await getDevice(id);
      setDevice(res.data);
    } catch (error) {
      message.error('加载设备信息失败');
    }
  };

  const loadSnapshots = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getDeviceSnapshots(id);
      setSnapshots(res.data || []);
    } catch (error) {
      message.error('加载快照列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async (values: { name: string; description?: string }) => {
    if (!id) return;
    try {
      await createSnapshot(id, values);
      message.success('快照创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadSnapshots();
    } catch (error: any) {
      message.error(error.message || '快照创建失败');
    }
  };

  const handleRestoreSnapshot = async () => {
    if (!selectedSnapshot) return;
    try {
      await restoreSnapshot(selectedSnapshot.id);
      message.success('快照恢复成功，设备正在重启...');
      setRestoreModalVisible(false);
      setSelectedSnapshot(null);
      setTimeout(() => {
        loadDevice();
      }, 2000);
    } catch (error: any) {
      message.error(error.message || '快照恢复失败');
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    try {
      await deleteSnapshot(snapshotId);
      message.success('快照删除成功');
      loadSnapshots();
    } catch (error: any) {
      message.error(error.message || '快照删除失败');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      active: { color: 'green', text: '可用' },
      creating: { color: 'blue', text: '创建中' },
      restoring: { color: 'orange', text: '恢复中' },
      failed: { color: 'red', text: '失败' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '快照名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size: number) => formatSize(size),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Snapshot) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<CloudDownloadOutlined />}
            onClick={() => {
              setSelectedSnapshot(record);
              setRestoreModalVisible(true);
            }}
            disabled={record.status !== 'active'}
          >
            恢复
          </Button>
          <Popconfirm
            title="确定要删除此快照吗？"
            description="删除后无法恢复"
            onConfirm={() => handleDeleteSnapshot(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const totalSize = snapshots.reduce((sum, snapshot) => sum + snapshot.size, 0);

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/devices/${id}`)}>
          返回设备详情
        </Button>
      </Space>

      <Title level={2}>
        <CameraOutlined /> 设备快照管理
      </Title>
      <Paragraph type="secondary">快照可以保存设备的完整状态，包括系统、应用和数据</Paragraph>

      {device && (
        <Alert
          message={`设备: ${device.name}`}
          description={`当前状态: ${device.status === 'running' ? '运行中' : '已停止'}`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="快照总数" value={snapshots.length} suffix="个" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="可用快照"
              value={snapshots.filter((s) => s.status === 'active').length}
              suffix="个"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="总占用空间" value={formatSize(totalSize)} />
          </Card>
        </Col>
      </Row>

      {/* 快照列表 */}
      <Card
        title="快照列表"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
            disabled={device?.status !== 'running' && device?.status !== 'stopped'}
          >
            创建快照
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={snapshots}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 创建快照模态框 */}
      <Modal
        title="创建快照"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => form.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Alert
          message="注意"
          description="创建快照会暂停设备运行，完成后自动恢复"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical" onFinish={handleCreateSnapshot}>
          <Form.Item
            label="快照名称"
            name="name"
            rules={[
              { required: true, message: '请输入快照名称' },
              { max: 50, message: '名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="例如：系统配置备份-20240101" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="记录此快照的用途或包含的内容" maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 恢复快照模态框 */}
      <Modal
        title="恢复快照"
        open={restoreModalVisible}
        onCancel={() => {
          setRestoreModalVisible(false);
          setSelectedSnapshot(null);
        }}
        onOk={handleRestoreSnapshot}
        okText="确认恢复"
        okButtonProps={{ danger: true }}
        cancelText="取消"
      >
        <Alert
          message="警告"
          description={
            <div>
              <p>恢复快照将：</p>
              <ul style={{ marginBottom: 0 }}>
                <li>覆盖设备当前的所有数据</li>
                <li>恢复到快照创建时的状态</li>
                <li>无法撤销此操作</li>
              </ul>
            </div>
          }
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
        {selectedSnapshot && (
          <div>
            <Text strong>快照信息：</Text>
            <div style={{ marginTop: 8 }}>
              <p>名称: {selectedSnapshot.name}</p>
              <p>描述: {selectedSnapshot.description || '无'}</p>
              <p>创建时间: {dayjs(selectedSnapshot.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* 使用说明 */}
      <Card title="使用说明" style={{ marginTop: 24 }} bordered={false}>
        <ul>
          <li>快照会保存设备的完整系统状态、已安装应用和数据</li>
          <li>创建快照时设备会暂时停止，完成后自动恢复</li>
          <li>恢复快照会覆盖设备当前的所有内容，请谨慎操作</li>
          <li>快照会占用存储空间，建议定期清理不需要的快照</li>
          <li>建议在重要操作前创建快照，以便出现问题时快速恢复</li>
        </ul>
      </Card>
    </div>
  );
};

export default DeviceSnapshots;
