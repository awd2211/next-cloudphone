import React from 'react';
import { Card, Input, Select, Button, Space } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import type { TicketDetail } from '@/types/ticket';

const { TextArea } = Input;
const { Option } = Select;

interface ReplyFormProps {
  replyContent: string;
  onReplyContentChange: (value: string) => void;
  newStatus: TicketDetail['status'];
  onStatusChange: (status: TicketDetail['status']) => void;
  isInternalNote: boolean;
  onInternalNoteChange: (isInternal: boolean) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export const ReplyForm: React.FC<ReplyFormProps> = ({
  replyContent,
  onReplyContentChange,
  newStatus,
  onStatusChange,
  isInternalNote,
  onInternalNoteChange,
  onSubmit,
  submitting,
}) => {
  return (
    <Card title="添加回复">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <TextArea
          rows={6}
          placeholder="请输入回复内容..."
          value={replyContent}
          onChange={(e) => onReplyContentChange(e.target.value)}
        />
        <Space>
          <Select style={{ width: 150 }} value={newStatus} onChange={onStatusChange}>
            <Option value="open">待处理</Option>
            <Option value="in_progress">处理中</Option>
            <Option value="waiting_customer">等待客户</Option>
            <Option value="resolved">已解决</Option>
          </Select>
          <Select
            style={{ width: 150 }}
            value={isInternalNote ? 'internal' : 'public'}
            onChange={(value) => onInternalNoteChange(value === 'internal')}
          >
            <Option value="public">公开回复</Option>
            <Option value="internal">内部备注</Option>
          </Select>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            onClick={onSubmit}
          >
            提交回复
          </Button>
        </Space>
      </Space>
    </Card>
  );
};
