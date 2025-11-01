import React from 'react';
import { Modal, Form, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';

interface InstallAppModalProps {
  visible: boolean;
  fileList: UploadFile[];
  onOk: () => void;
  onCancel: () => void;
  onFileChange: (fileList: UploadFile[]) => void;
  form: any;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = React.memo(
  ({ visible, fileList, onOk, onCancel, onFileChange, form }) => {
    return (
      <Modal title="安装应用" open={visible} onCancel={onCancel} onOk={onOk}>
        <Form form={form} layout="vertical">
          <Form.Item label="APK 文件" required>
            <Upload
              fileList={fileList}
              beforeUpload={(file) => {
                if (!file.name.endsWith('.apk')) {
                  message.error('只能上传 APK 文件');
                  return false;
                }
                onFileChange([file]);
                return false;
              }}
              onRemove={() => onFileChange([])}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>选择 APK 文件</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

InstallAppModal.displayName = 'InstallAppModal';
