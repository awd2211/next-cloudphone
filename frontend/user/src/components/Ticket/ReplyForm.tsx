import React from 'react';
import { Card, Input, Space, Upload, Button, Alert } from 'antd';
import { PaperClipOutlined, SendOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';

const { TextArea } = Input;

interface ReplyFormProps {
  replyContent: string;
  fileList: UploadFile[];
  submitLoading: boolean;
  onReplyChange: (value: string) => void;
  onFileListChange: (fileList: UploadFile[]) => void;
  onUpload: (options: any) => Promise<void>;
  onRemove: (file: UploadFile) => void;
  onSubmit: () => void;
}

/**
 * 添加回复表单组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 文件上传和回复提交逻辑分离
 */
export const ReplyForm: React.FC<ReplyFormProps> = React.memo(
  ({
    replyContent,
    fileList,
    submitLoading,
    onReplyChange,
    onFileListChange,
    onUpload,
    onRemove,
    onSubmit,
  }) => {
    return (
      <Card title="添加回复">
        {/* 回复文本域 */}
        <TextArea
          rows={4}
          value={replyContent}
          onChange={(e) => onReplyChange(e.target.value)}
          placeholder="输入您的回复..."
          maxLength={2000}
          showCount
        />

        {/* 操作按钮 */}
        <div style={{ marginTop: '16px' }}>
          <Space>
            {/* 附件上传 */}
            <Upload
              fileList={fileList}
              customRequest={onUpload}
              onChange={({ fileList }) => onFileListChange(fileList)}
              onRemove={onRemove}
              accept="image/*,.pdf,.doc,.docx,.txt,.log"
              maxCount={3}
            >
              <Button icon={<PaperClipOutlined />}>添加附件</Button>
            </Upload>

            {/* 提交按钮 */}
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={onSubmit}
              loading={submitLoading}
            >
              提交回复
            </Button>
          </Space>
        </div>

        {/* 提示信息 */}
        <Alert
          message="提示"
          description="您的回复会立即通知客服团队，我们会尽快为您处理。"
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      </Card>
    );
  }
);

ReplyForm.displayName = 'ReplyForm';
