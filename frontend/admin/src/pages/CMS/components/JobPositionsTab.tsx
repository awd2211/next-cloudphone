/**
 * 招聘职位管理 Tab
 */
import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  message,
  Tag,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as cmsService from '@/services/cms';
import type { JobPosition } from '@/services/cms';

const { TextArea } = Input;
const { Option } = Select;

const JobPositionsTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<JobPosition[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await cmsService.getAllJobPositions();
      setData(result);
    } catch (error) {
      message.error('加载职位失败');
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
      sortOrder: data.length + 1,
      employmentType: 'full-time',
    });
    setModalOpen(true);
  };

  const handleEdit = (record: JobPosition) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      requirements: record.requirements?.join('\n'),
      responsibilities: record.responsibilities?.join('\n'),
      tags: record.tags?.join(','),
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await cmsService.deleteJobPosition(id);
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
        requirements: values.requirements
          ?.split('\n')
          .map((s: string) => s.trim())
          .filter(Boolean),
        responsibilities: values.responsibilities
          ?.split('\n')
          .map((s: string) => s.trim())
          .filter(Boolean),
        tags: values.tags
          ?.split(',')
          .map((s: string) => s.trim())
          .filter(Boolean),
      };

      if (editingId) {
        await cmsService.updateJobPosition(editingId, payload);
        message.success('更新成功');
      } else {
        await cmsService.createJobPosition(payload);
        message.success('创建成功');
      }

      setModalOpen(false);
      loadData();
    } catch (error) {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<JobPosition> = [
    {
      title: '职位名称',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 120,
    },
    {
      title: '地点',
      dataIndex: 'location',
      key: 'location',
      width: 150,
    },
    {
      title: '薪资范围',
      dataIndex: 'salaryRange',
      key: 'salaryRange',
      width: 120,
    },
    {
      title: '类型',
      dataIndex: 'employmentType',
      key: 'employmentType',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          'full-time': { text: '全职', color: 'blue' },
          'part-time': { text: '兼职', color: 'orange' },
          contract: { text: '合同', color: 'purple' },
          intern: { text: '实习', color: 'green' },
        };
        const config = typeMap[type] || { text: type, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) =>
        tags?.map((tag) => (
          <Tag key={tag} style={{ marginBottom: 4 }}>
            {tag}
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
          <Popconfirm title="确定要删除这个职位吗？" onConfirm={() => handleDelete(record.id)}>
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
          添加职位
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
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingId ? '编辑职位' : '添加职位'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="职位名称" rules={[{ required: true }]}>
            <Input placeholder="请输入职位名称" />
          </Form.Item>

          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="department" label="部门" rules={[{ required: true }]} style={{ width: 200 }}>
              <Input placeholder="技术部" />
            </Form.Item>
            <Form.Item name="location" label="工作地点" rules={[{ required: true }]} style={{ width: 200 }}>
              <Input placeholder="北京 / 上海 / 远程" />
            </Form.Item>
            <Form.Item name="salaryRange" label="薪资范围" style={{ width: 150 }}>
              <Input placeholder="20K-35K" />
            </Form.Item>
          </Space>

          <Form.Item name="description" label="职位描述" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="请输入职位描述" />
          </Form.Item>

          <Form.Item name="requirements" label="职位要求" tooltip="每行一条要求">
            <TextArea rows={5} placeholder="每行输入一条要求，例如：&#10;3年以上后端开发经验&#10;精通Node.js/NestJS" />
          </Form.Item>

          <Form.Item name="responsibilities" label="工作职责" tooltip="每行一条职责">
            <TextArea rows={4} placeholder="每行输入一条职责" />
          </Form.Item>

          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="employmentType" label="雇佣类型" style={{ width: 150 }}>
              <Select>
                <Option value="full-time">全职</Option>
                <Option value="part-time">兼职</Option>
                <Option value="contract">合同</Option>
                <Option value="intern">实习</Option>
              </Select>
            </Form.Item>
            <Form.Item name="tags" label="标签" tooltip="用逗号分隔" style={{ width: 300 }}>
              <Input placeholder="React,TypeScript,Node.js" />
            </Form.Item>
          </Space>

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

export default JobPositionsTab;
