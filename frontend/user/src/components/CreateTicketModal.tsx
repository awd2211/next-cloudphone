import React, { useState } from 'react';
import { Modal, Form, Input, Select, Upload, message, Tag, Space } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import {
  createTicket,
  uploadAttachment,
  TicketType,
  TicketPriority,
  type CreateTicketDto,
  type Attachment,
} from '@/services/ticket';

const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

interface CreateTicketModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

// 工单类型选项
const ticketTypeOptions = [
  { value: TicketType.TECHNICAL, label: '技术问题', color: 'blue' },
  { value: TicketType.BILLING, label: '账单问题', color: 'orange' },
  { value: TicketType.DEVICE, label: '设备问题', color: 'purple' },
  { value: TicketType.APP, label: '应用问题', color: 'cyan' },
  { value: TicketType.FEATURE, label: '功能建议', color: 'green' },
  { value: TicketType.OTHER, label: '其他', color: 'default' },
];

// 优先级选项
const priorityOptions = [
  { value: TicketPriority.LOW, label: '低', color: 'default' },
  { value: TicketPriority.MEDIUM, label: '中', color: 'blue' },
  { value: TicketPriority.HIGH, label: '高', color: 'orange' },
  { value: TicketPriority.URGENT, label: '紧急', color: 'red' },
];

// 常用标签
const commonTags = [
  '无法登录',
  '设备卡顿',
  '应用崩溃',
  '充值问题',
  '扣费异常',
  '性能优化',
  '功能请求',
  '其他',
];

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 处理文件上传
  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess: onUploadSuccess, onError } = options;

    try {
      const attachment = await uploadAttachment(file as File);
      setUploadedAttachments([...uploadedAttachments, attachment]);
      onUploadSuccess?.(attachment);
      message.success('文件上传成功');
    } catch (error) {
      onError?.(error as Error);
      message.error('文件上传失败');
    }
  };

  // 处理文件列表变化
  const handleFileChange: UploadProps['onChange'] = (info) => {
    setFileList(info.fileList);
  };

  // 处理文件移除
  const handleFileRemove = (file: UploadFile) => {
    const attachment = uploadedAttachments.find((att) => att.id === file.response?.id);
    if (attachment) {
      setUploadedAttachments(uploadedAttachments.filter((att) => att.id !== attachment.id));
    }
  };

  // 处理标签选择
  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // 提交工单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const ticketData: CreateTicketDto = {
        title: values.title,
        type: values.type,
        priority: values.priority,
        description: values.description,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        attachmentIds: uploadedAttachments.map((att) => att.id),
      };

      await createTicket(ticketData);
      message.success('工单提交成功，我们会尽快处理');

      // 重置表单
      form.resetFields();
      setFileList([]);
      setUploadedAttachments([]);
      setSelectedTags([]);

      onSuccess();
    } catch (error: any) {
      if (error.errorFields) {
        message.error('请填写完整信息');
      } else {
        message.error(error.message || '提交失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    form.resetFields();
    setFileList([]);
    setUploadedAttachments([]);
    setSelectedTags([]);
    onCancel();
  };

  return (
    <Modal
      title="提交工单"
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      okText="提交"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: TicketType.TECHNICAL,
          priority: TicketPriority.MEDIUM,
        }}
      >
        <Form.Item
          name="title"
          label="工单标题"
          rules={[
            { required: true, message: '请输入工单标题' },
            { max: 100, message: '标题不能超过100个字符' },
          ]}
        >
          <Input placeholder="简要描述您的问题" maxLength={100} showCount />
        </Form.Item>

        <Form.Item
          name="type"
          label="问题类型"
          rules={[{ required: true, message: '请选择问题类型' }]}
        >
          <Select placeholder="选择问题类型">
            {ticketTypeOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                <Tag color={option.color}>{option.label}</Tag>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="priority"
          label="优先级"
          rules={[{ required: true, message: '请选择优先级' }]}
        >
          <Select placeholder="选择优先级">
            {priorityOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                <Tag color={option.color}>{option.label}</Tag>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="标签（可选）">
          <Space wrap>
            {commonTags.map((tag) => (
              <Tag
                key={tag}
                color={selectedTags.includes(tag) ? 'blue' : 'default'}
                style={{ cursor: 'pointer' }}
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </Tag>
            ))}
          </Space>
        </Form.Item>

        <Form.Item
          name="description"
          label="详细描述"
          rules={[
            { required: true, message: '请详细描述您的问题' },
            { min: 10, message: '描述至少需要10个字符' },
            { max: 2000, message: '描述不能超过2000个字符' },
          ]}
        >
          <TextArea
            rows={6}
            placeholder="请详细描述您遇到的问题，包括：&#10;1. 问题发生的时间&#10;2. 具体的错误信息&#10;3. 已经尝试的解决方法&#10;4. 其他相关信息"
            maxLength={2000}
            showCount
          />
        </Form.Item>

        <Form.Item label="附件（可选）">
          <Dragger
            name="file"
            multiple
            fileList={fileList}
            customRequest={handleUpload}
            onChange={handleFileChange}
            onRemove={handleFileRemove}
            accept="image/*,.pdf,.doc,.docx,.txt,.log"
            maxCount={5}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持图片、PDF、Word文档、文本文件等，最多上传5个文件</p>
          </Dragger>
        </Form.Item>

        <div
          style={{
            background: '#f0f2f5',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666',
          }}
        >
          <p style={{ margin: 0, marginBottom: '8px' }}>
            <strong>提示：</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>我们会在 24 小时内响应您的工单</li>
            <li>紧急问题请选择"紧急"优先级</li>
            <li>提供详细信息有助于我们更快解决问题</li>
            <li>您可以随时在工单详情中添加更多信息</li>
          </ul>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateTicketModal;
