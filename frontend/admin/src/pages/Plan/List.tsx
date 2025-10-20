import { useState, useEffect } from 'react';
import { Table, Tag, Space, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Select, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getPlans, createPlan, updatePlan, deletePlan, togglePlanStatus } from '@/services/plan';
import type { Plan, CreatePlanDto } from '@/types';
import dayjs from 'dayjs';

const PlanList = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form] = Form.useForm();

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await getPlans({ page, pageSize });
      setPlans(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载套餐列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [page, pageSize]);

  const handleSubmit = async (values: CreatePlanDto) => {
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, values);
        message.success('更新套餐成功');
      } else {
        await createPlan(values);
        message.success('创建套餐成功');
      }
      setModalVisible(false);
      setEditingPlan(null);
      form.resetFields();
      loadPlans();
    } catch (error) {
      message.error(editingPlan ? '更新套餐失败' : '创建套餐失败');
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    form.setFieldsValue(plan);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePlan(id);
      message.success('删除套餐成功');
      loadPlans();
    } catch (error) {
      message.error('删除套餐失败');
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      await togglePlanStatus(id, isActive);
      message.success(isActive ? '启用套餐成功' : '禁用套餐成功');
      loadPlans();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns: ColumnsType<Plan> = [
    {
      title: '套餐名称',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
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
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          monthly: '月付',
          yearly: '年付',
          'one-time': '一次性',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
    {
      title: '时长(天)',
      dataIndex: 'duration',
      key: 'duration',
    },
    {
      title: '设备数量',
      dataIndex: 'deviceLimit',
      key: 'deviceLimit',
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
        />
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
  ];

  return (
    <div>
      <h2>套餐管理</h2>

      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingPlan(null);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          创建套餐
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={plans}
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

      {/* 创建/编辑套餐对话框 */}
      <Modal
        title={editingPlan ? '编辑套餐' : '创建套餐'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingPlan(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
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
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item
            label="时长(天)"
            name="duration"
            rules={[{ required: true, message: '请输入时长' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="30"
            />
          </Form.Item>

          <Form.Item
            label="设备数量"
            name="deviceLimit"
            rules={[{ required: true, message: '请输入设备数量' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="5"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PlanList;
