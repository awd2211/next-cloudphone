/**
 * LiveChat 客服分组管理页面
 *
 * 功能:
 * - 查看所有客服分组
 * - 创建/编辑/删除分组
 * - 设置默认分组
 * - 查看分组内客服数量
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
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
  const { data: groups = [], isLoading, error, refetch } = useQuery({
    queryKey: ['livechat-agent-groups'],
    queryFn: getAgentGroups,
  });

  // 统计数据
  const stats = useMemo(() => ({
    total: groups.length,
    defaultCount: groups.filter((g) => g.isDefault).length,
  }), [groups]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新...');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleOpenModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refetch]);

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
    <ErrorBoundary boundaryName="GroupList">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ marginBottom: 0 }}>
            <TeamOutlined style={{ marginRight: 8 }} />
            客服分组管理
            <Tag
              icon={<ReloadOutlined spin={isLoading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={() => refetch()}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
          <span style={{ fontSize: 12, color: '#999' }}>Ctrl+N 新建</span>
        </div>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card size="small">
              <Statistic title="分组总数" value={stats.total} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Statistic title="默认分组" value={stats.defaultCount} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
        </Row>

        <Card>
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
              新建分组
            </Button>
          </Space>

          <LoadingState
            loading={isLoading}
            error={error}
            empty={!isLoading && !error && groups.length === 0}
            onRetry={refetch}
            loadingType="skeleton"
            skeletonRows={5}
            emptyDescription="暂无分组数据"
          >
            <Table
              columns={columns}
              dataSource={groups}
              rowKey="id"
              loading={false}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
            />
          </LoadingState>
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
    </ErrorBoundary>
  );
};

export default GroupListPage;
