import { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Select,
  Switch,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Plan, CreatePlanDto } from '@/types';
import dayjs from 'dayjs';
import {
  usePlans,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
  useTogglePlanStatus,
} from '@/hooks/usePlans';

/**
 * 套餐列表页面（优化版 - 使用 React Query）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 乐观更新（状态切换）
 * 5. ✅ 自动缓存失效和重新获取
 */
const PlanList = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form] = Form.useForm();

  // ✅ 使用 React Query hooks 替换手动状态管理
  const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const { data, isLoading } = usePlans(params);

  // Mutations
  const createMutation = useCreatePlan();
  const updateMutation = useUpdatePlan();
  const deleteMutation = useDeletePlan();
  const toggleStatusMutation = useTogglePlanStatus();

  const plans = data?.data || [];
  const total = data?.total || 0;

  // ✅ useCallback 优化事件处理函数
  const handleSubmit = useCallback(
    async (values: CreatePlanDto) => {
      if (editingPlan) {
        await updateMutation.mutateAsync({ id: editingPlan.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setModalVisible(false);
      setEditingPlan(null);
      form.resetFields();
    },
    [editingPlan, createMutation, updateMutation, form]
  );

  const handleEdit = useCallback(
    (plan: Plan) => {
      setEditingPlan(plan);
      form.setFieldsValue(plan);
      setModalVisible(true);
    },
    [form]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const handleToggleStatus = useCallback(
    async (id: string, isActive: boolean) => {
      await toggleStatusMutation.mutateAsync({ id, isActive });
    },
    [toggleStatusMutation]
  );

  const handleCreate = useCallback(() => {
    setEditingPlan(null);
    form.resetFields();
    setModalVisible(true);
  }, [form]);

  const handleModalCancel = useCallback(() => {
    setModalVisible(false);
    setEditingPlan(null);
    form.resetFields();
  }, [form]);

  // ✅ useMemo 优化类型映射
  const typeMap = useMemo(
    () => ({
      monthly: '月付',
      yearly: '年付',
      'one-time': '一次性',
    }),
    []
  );

  // ✅ useMemo 优化表格列配置
  const columns: ColumnsType<Plan> = useMemo(
    () => [
      {
        title: '套餐名称',
        dataIndex: 'name',
        key: 'name',
        fixed: 'left',
        sorter: (a, b) => a.name.localeCompare(b.name),
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => typeMap[type] || type,
        sorter: (a, b) => a.type.localeCompare(b.type),
      },
      {
        title: '价格',
        dataIndex: 'price',
        key: 'price',
        render: (price: string | number) => `¥${(Number(price) || 0).toFixed(2)}`,
        sorter: (a, b) => Number(a.price) - Number(b.price),
      },
      {
        title: '时长(天)',
        dataIndex: 'duration',
        key: 'duration',
        sorter: (a, b) => a.duration - b.duration,
      },
      {
        title: '设备数量',
        dataIndex: 'deviceLimit',
        key: 'deviceLimit',
        sorter: (a, b) => a.deviceLimit - b.deviceLimit,
      },
      {
        title: '状态',
        dataIndex: 'isActive',
        key: 'isActive',
        render: (isActive: boolean, record) => (
          <Switch
            checked={isActive}
            onChange={(checked) => handleToggleStatus(record.id, checked)}
            checkedChildren="启用"
            unCheckedChildren="禁用"
            loading={toggleStatusMutation.isPending}
          />
        ),
        sorter: (a, b) => Number(a.isActive) - Number(b.isActive),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要删除这个套餐吗?"
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
    ],
    [typeMap, handleEdit, handleDelete, handleToggleStatus, toggleStatusMutation.isPending]
  );

  return (
    <div>
      <h2>套餐管理</h2>

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建套餐
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={plans}
        rowKey="id"
        loading={isLoading}
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

      {/* 创建/编辑套餐对话框 */}
      <Modal
        title={editingPlan ? '编辑套餐' : '创建套餐'}
        open={modalVisible}
        onCancel={handleModalCancel}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            label="套餐名称"
            name="name"
            rules={[{ required: true, message: '请输入套餐名称' }]}
          >
            <Input placeholder="例如：基础版" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="套餐描述" rows={3} />
          </Form.Item>

          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请选择套餐类型' }]}
          >
            <Select placeholder="请选择">
              <Select.Option value="monthly">月付</Select.Option>
              <Select.Option value="yearly">年付</Select.Option>
              <Select.Option value="one-time">一次性</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="价格(元)"
            name="price"
            rules={[{ required: true, message: '请输入价格' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>

          <Form.Item
            label="时长(天)"
            name="duration"
            rules={[{ required: true, message: '请输入时长' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="30" />
          </Form.Item>

          <Form.Item
            label="设备数量"
            name="deviceLimit"
            rules={[{ required: true, message: '请输入设备数量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="5" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PlanList;
