/**
 * LiveChat 客服分组管理页面
 *
 * 功能:
 * - 查看所有客服分组
 * - 创建/编辑/删除分组
 * - 设置默认分组
 * - 查看分组内客服数量
 */
import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getAgentGroups,
  createAgentGroup,
  updateAgentGroup,
  deleteAgentGroup,
  type AgentGroup,
} from '@/services/livechat';

const { TextArea } = Input;

const GroupListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // 状态管理
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AgentGroup | null>(null);

  // 获取分组列表
  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ['livechat-agent-groups'],
    queryFn: getAgentGroups,
  });

  // 创建分组
  const createMutation = useMutation({
    mutationFn: createAgentGroup,
    onSuccess: () => {
      message.success('分组创建成功');
      setModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['livechat-agent-groups'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '创建失败');
    },
  });

  // 更新分组
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AgentGroup> }) =>
      updateAgentGroup(id, data),
    onSuccess: () => {
      message.success('分组更新成功');
      setModalVisible(false);
      setEditingGroup(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['livechat-agent-groups'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  // 删除分组
  const deleteMutation = useMutation({
    mutationFn: deleteAgentGroup,
    onSuccess: () => {
      message.success('分组删除成功');
      queryClient.invalidateQueries({ queryKey: ['livechat-agent-groups'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  // 打开新建/编辑弹窗
  const handleOpenModal = (group?: AgentGroup) => {
    if (group) {
      setEditingGroup(group);
      form.setFieldsValue({
        name: group.name,
        description: group.description,
        isDefault: group.isDefault,
      });
    } else {
      setEditingGroup(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    if (editingGroup) {
      await updateMutation.mutateAsync({ id: editingGroup.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  // 表格列定义
  const columns: ColumnsType<AgentGroup> = [
    {
      title: '分组名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record) => (
        <Space>
          <TeamOutlined />
          <span style={{ fontWeight: 500 }}>{name}</span>
          {record.isDefault && <Tag color="blue">默认</Tag>}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => desc || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除该分组吗？"
            description={
              record.isDefault
                ? '这是默认分组，删除后需要设置新的默认分组'
                : '删除后该分组内的客服将变为无分组状态'
            }
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={deleteMutation.isPending}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>
        <TeamOutlined style={{ marginRight: 8 }} />
        客服分组管理
      </h2>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            新建分组
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={groups}
          rowKey="id"
          loading={isLoading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editingGroup ? '编辑分组' : '新建分组'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingGroup(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="分组名称"
            rules={[{ required: true, message: '请输入分组名称' }]}
          >
            <Input placeholder="如：技术支持组、售前咨询组" />
          </Form.Item>

          <Form.Item name="description" label="分组描述">
            <TextArea rows={3} placeholder="分组的职责描述" />
          </Form.Item>

          <Form.Item
            name="isDefault"
            label="设为默认分组"
            valuePropName="checked"
            tooltip="新客服默认加入此分组"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GroupListPage;
