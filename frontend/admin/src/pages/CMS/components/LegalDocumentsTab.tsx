/**
 * 法律文档管理 Tab
 */
import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Tag, DatePicker } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as cmsService from '@/services/cms';
import type { LegalDocument } from '@/services/cms';

const { TextArea } = Input;
const { Option } = Select;

const LegalDocumentsTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LegalDocument[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await cmsService.getLegalDocuments();
      setData(result);
    } catch (error) {
      message.error('加载法律文档失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = (record: LegalDocument) => {
    setEditingType(record.type);
    form.setFieldsValue({
      ...record,
      effectiveDate: record.effectiveDate ? dayjs(record.effectiveDate) : null,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        ...values,
        effectiveDate: values.effectiveDate?.format('YYYY-MM-DD'),
      };

      await cmsService.updateLegalDocument(editingType!, payload);
      message.success('更新成功');
      setModalOpen(false);
      loadData();
    } catch (error) {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabels: Record<string, { text: string; color: string }> = {
    privacy: { text: '隐私政策', color: 'blue' },
    terms: { text: '服务条款', color: 'green' },
    refund: { text: '退款政策', color: 'orange' },
    sla: { text: '服务水平协议', color: 'purple' },
    security: { text: '安全说明', color: 'cyan' },
  };

  const columns: ColumnsType<LegalDocument> = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type: string) => {
        const config = typeLabels[type] || { text: type, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: '内容格式',
      dataIndex: 'contentType',
      key: 'contentType',
      width: 100,
      render: (type: string) => (
        <Tag>{type === 'html' ? 'HTML' : 'Markdown'}</Tag>
      ),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      width: 120,
      render: (date: string) => date || '-',
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
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
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
      />

      <Modal
        title="编辑法律文档"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="请输入标题" />
          </Form.Item>

          <Form.Item name="content" label="内容" rules={[{ required: true }]}>
            <TextArea rows={15} placeholder="请输入内容（支持 HTML 或 Markdown）" />
          </Form.Item>

          <Form.Item name="contentType" label="内容格式">
            <Select style={{ width: 150 }}>
              <Option value="html">HTML</Option>
              <Option value="markdown">Markdown</Option>
            </Select>
          </Form.Item>

          <Form.Item name="version" label="版本号">
            <Input placeholder="1.0" style={{ width: 150 }} />
          </Form.Item>

          <Form.Item name="effectiveDate" label="生效日期">
            <DatePicker format="YYYY-MM-DD" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LegalDocumentsTab;
