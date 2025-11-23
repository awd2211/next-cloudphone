/**
 * 定价方案管理 Tab
 */
import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  InputNumber,
  message,
  Tag,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as cmsService from '@/services/cms';
import type { PricingPlan } from '@/services/cms';

const { TextArea } = Input;

const PricingPlansTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PricingPlan[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await cmsService.getAllPricingPlans();
      setData(result);
    } catch (error) {
      message.error('加载定价方案失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      isCustomPrice: false,
      sortOrder: data.length + 1,
    });
    setModalOpen(true);
  };

  const handleEdit = (record: PricingPlan) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      features: JSON.stringify(record.features, null, 2),
      highlightFeatures: record.highlightFeatures?.join('\n'),
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await cmsService.deletePricingPlan(id);
      message.success('删除成功');
      loadData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        ...values,
        features: values.features ? JSON.parse(values.features) : [],
        highlightFeatures: values.highlightFeatures
          ?.split('\n')
          .map((s: string) => s.trim())
          .filter(Boolean),
      };

      if (editingId) {
        await cmsService.updatePricingPlan(editingId, payload);
        message.success('更新成功');
      } else {
        await cmsService.createPricingPlan(payload);
        message.success('创建成功');
      }

      setModalOpen(false);
      loadData();
    } catch (error: any) {
      if (error.message?.includes('JSON')) {
        message.error('功能列表 JSON 格式错误');
      } else {
        message.error('操作失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<PricingPlan> = [
    {
      title: '方案名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (name: string, record: PricingPlan) => (
        <Space>
          {name}
          {record.tag && <Tag color="orange">{record.tag}</Tag>}
        </Space>
      ),
    },
    {
      title: '月付价格',
      dataIndex: 'monthlyPrice',
      key: 'monthlyPrice',
      width: 120,
      render: (price: string, record: PricingPlan) =>
        record.isCustomPrice ? <Tag>定制</Tag> : price ? `¥${price}` : '-',
    },
    {
      title: '年付价格',
      dataIndex: 'yearlyPrice',
      key: 'yearlyPrice',
      width: 120,
      render: (price: string, record: PricingPlan) =>
        record.isCustomPrice ? <Tag>定制</Tag> : price ? `¥${price}` : '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: '亮点功能',
      dataIndex: 'highlightFeatures',
      key: 'highlightFeatures',
      width: 200,
      render: (features: string[]) =>
        features?.slice(0, 3).map((f) => (
          <Tag key={f} style={{ marginBottom: 4 }}>
            {f}
          </Tag>
        )),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>{active ? '上线' : '下线'}</Tag>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除这个方案吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加方案
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        scroll={{ x: 1100 }}
      />

      <Modal
        title={editingId ? '编辑方案' : '添加方案'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="name" label="方案名称" rules={[{ required: true }]} style={{ width: 200 }}>
              <Input placeholder="基础版" />
            </Form.Item>
            <Form.Item name="tag" label="标签" style={{ width: 150 }}>
              <Input placeholder="热门" />
            </Form.Item>
            <Form.Item name="isCustomPrice" label="定制价格" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="monthlyPrice" label="月付价格" style={{ width: 150 }}>
              <Input placeholder="99.00" addonBefore="¥" />
            </Form.Item>
            <Form.Item name="yearlyPrice" label="年付价格" style={{ width: 150 }}>
              <Input placeholder="999.00" addonBefore="¥" />
            </Form.Item>
          </Space>

          <Form.Item name="description" label="方案描述" rules={[{ required: true }]}>
            <Input placeholder="适合个人用户和小型团队" />
          </Form.Item>

          <Form.Item
            name="features"
            label="功能列表 (JSON 数组)"
            rules={[{ required: true }]}
            tooltip='[{"name": "云手机数量", "limit": "5台", "included": true}]'
          >
            <TextArea
              rows={8}
              placeholder='[
  {"name": "云手机数量", "limit": "5台", "included": true},
  {"name": "存储空间", "limit": "50GB", "included": true},
  {"name": "API访问", "included": false}
]'
            />
          </Form.Item>

          <Form.Item name="highlightFeatures" label="亮点功能" tooltip="每行一个亮点">
            <TextArea rows={3} placeholder="5台云手机&#10;50GB存储&#10;工单支持" />
          </Form.Item>

          <Space>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="isActive" label="是否上线" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default PricingPlansTab;
