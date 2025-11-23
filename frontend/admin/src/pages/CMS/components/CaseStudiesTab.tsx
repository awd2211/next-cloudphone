/**
 * 客户案例管理 Tab
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
import { PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as cmsService from '@/services/cms';
import type { CaseStudy } from '@/services/cms';

const { TextArea } = Input;

const CaseStudiesTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CaseStudy[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await cmsService.getAllCaseStudies();
      setData(result);
    } catch (error) {
      message.error('加载案例失败');
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
      isFeatured: false,
      sortOrder: data.length + 1,
    });
    setModalOpen(true);
  };

  const handleEdit = (record: CaseStudy) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      results: record.results ? JSON.stringify(record.results, null, 2) : '',
      testimonial: record.testimonial ? JSON.stringify(record.testimonial, null, 2) : '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await cmsService.deleteCaseStudy(id);
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
        results: values.results ? JSON.parse(values.results) : null,
        testimonial: values.testimonial ? JSON.parse(values.testimonial) : null,
      };

      if (editingId) {
        await cmsService.updateCaseStudy(editingId, payload);
        message.success('更新成功');
      } else {
        await cmsService.createCaseStudy(payload);
        message.success('创建成功');
      }

      setModalOpen(false);
      loadData();
    } catch (error: any) {
      if (error.message?.includes('JSON')) {
        message.error('JSON 格式错误，请检查');
      } else {
        message.error('操作失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<CaseStudy> = [
    {
      title: '客户名称',
      dataIndex: 'clientName',
      key: 'clientName',
      width: 150,
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
      width: 120,
    },
    {
      title: '挑战',
      dataIndex: 'challenge',
      key: 'challenge',
      width: 200,
      ellipsis: true,
    },
    {
      title: '解决方案',
      dataIndex: 'solution',
      key: 'solution',
      width: 200,
      ellipsis: true,
    },
    {
      title: '推荐',
      dataIndex: 'isFeatured',
      key: 'isFeatured',
      width: 80,
      render: (featured: boolean) =>
        featured ? <StarOutlined style={{ color: '#faad14' }} /> : null,
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
          <Popconfirm title="确定要删除这个案例吗？" onConfirm={() => handleDelete(record.id)}>
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
          添加案例
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
        title={editingId ? '编辑案例' : '添加案例'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="clientName" label="客户名称" rules={[{ required: true }]} style={{ width: 200 }}>
              <Input placeholder="请输入客户名称" />
            </Form.Item>
            <Form.Item name="industry" label="行业" rules={[{ required: true }]} style={{ width: 200 }}>
              <Input placeholder="电商、游戏、社交等" />
            </Form.Item>
            <Form.Item name="clientLogo" label="Logo URL" style={{ width: 250 }}>
              <Input placeholder="https://..." />
            </Form.Item>
          </Space>

          <Form.Item name="challenge" label="客户挑战" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="描述客户面临的挑战和痛点" />
          </Form.Item>

          <Form.Item name="solution" label="解决方案" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="描述我们提供的解决方案" />
          </Form.Item>

          <Form.Item
            name="results"
            label="成果数据 (JSON)"
            tooltip='例如: {"efficiency": "+300%", "cost": "-50%"}'
          >
            <TextArea rows={4} placeholder='{"效率提升": "+300%", "成本降低": "-50%"}' />
          </Form.Item>

          <Form.Item
            name="testimonial"
            label="客户评价 (JSON)"
            tooltip='例如: {"quote": "...", "author": "张三", "title": "CTO"}'
          >
            <TextArea rows={4} placeholder='{"quote": "评价内容...", "author": "张三", "title": "CTO"}' />
          </Form.Item>

          <Space>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="isFeatured" label="推荐展示" valuePropName="checked">
              <Switch />
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

export default CaseStudiesTab;
