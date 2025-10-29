import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, message, Tag, Select, Popconfirm, Progress, Badge } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, PauseCircleOutlined, AppstoreAddOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import request from '@/utils/request';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  deviceCount: number;
  tags?: string[];
  createdAt: string;
}

const DeviceGroupManagement = () => {
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [batchOpVisible, setBatchOpVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DeviceGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<DeviceGroup | null>(null);
  const [batchProgress, setBatchProgress] = useState(0);

  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();

  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await request.get('/devices/groups');
      setGroups(res);
    } catch (error) {
      message.error('加载分组失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const openModal = (group?: DeviceGroup) => {
    if (group) {
      setEditingGroup(group);
      form.setFieldsValue({
        name: group.name,
        description: group.description,
        tags: group.tags,
      });
    } else {
      setEditingGroup(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingGroup) {
        await request.put(`/devices/groups/${editingGroup.id}`, values);
        message.success('分组更新成功');
      } else {
        await request.post('/devices/groups', values);
        message.success('分组创建成功');
      }
      setModalVisible(false);
      loadGroups();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await request.delete(`/devices/groups/${id}`);
      message.success('分组删除成功');
      loadGroups();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const openBatchOperation = (group: DeviceGroup) => {
    setSelectedGroup(group);
    setBatchOpVisible(true);
    batchForm.resetFields();
    setBatchProgress(0);
  };

  const handleBatchOperation = async () => {
    try {
      const values = await batchForm.validateFields();
      const res = await request.post('/devices/groups/batch-operation', {
        groupId: selectedGroup!.id,
        operation: values.operation,
        params: values.params ? JSON.parse(values.params) : {},
      });

      // 模拟进度
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setBatchProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          message.success('批量操作完成');
          setBatchOpVisible(false);
        }
      }, 500);
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('操作失败');
    }
  };

  const columns: ColumnsType<DeviceGroup> = [
    {
      title: '分组名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <Space direction="vertical" size={0}>
          <strong>{name}</strong>
          {record.description && (
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.description}</span>
          )}
        </Space>
      ),
    },
    {
      title: '设备数量',
      dataIndex: 'deviceCount',
      key: 'deviceCount',
      width: 120,
      align: 'center',
      render: (count) => <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }} />,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 250,
      render: (tags: string[]) =>
        tags?.length ? (
          <Space wrap size="small">
            {tags.map((tag) => (
              <Tag key={tag} color="blue">
                {tag}
              </Tag>
            ))}
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (time) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 300,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => openBatchOperation(record)}
          >
            批量操作
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除此分组？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
            设备分组管理 ({groups.length} 个分组)
          </span>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            新建分组
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={groups}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingGroup ? '编辑分组' : '创建分组'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="分组名称"
            name="name"
            rules={[{ required: true, message: '请输入分组名称' }]}
          >
            <Input placeholder="例如: 生产环境设备" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <TextArea rows={2} placeholder="分组说明" />
          </Form.Item>
          <Form.Item label="标签" name="tags">
            <Select mode="tags" placeholder="添加标签">
              <Option value="production">生产</Option>
              <Option value="testing">测试</Option>
              <Option value="development">开发</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`批量操作: ${selectedGroup?.name}`}
        open={batchOpVisible}
        onCancel={() => setBatchOpVisible(false)}
        onOk={handleBatchOperation}
      >
        <Form form={batchForm} layout="vertical">
          <Form.Item
            label="操作类型"
            name="operation"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select placeholder="选择操作">
              <Option value="start">启动所有设备</Option>
              <Option value="stop">停止所有设备</Option>
              <Option value="restart">重启所有设备</Option>
              <Option value="install-app">批量安装应用</Option>
              <Option value="update-config">批量更新配置</Option>
            </Select>
          </Form.Item>
          <Form.Item label="参数 (JSON)" name="params">
            <TextArea rows={4} placeholder='{"appId": "xxx"}' />
          </Form.Item>
        </Form>
        {batchProgress > 0 && <Progress percent={batchProgress} />}
      </Modal>
    </div>
  );
};

export default DeviceGroupManagement;
