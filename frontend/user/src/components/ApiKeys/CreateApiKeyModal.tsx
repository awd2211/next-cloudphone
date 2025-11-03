import { memo } from 'react';
import {
  Modal,
  Form,
  Input,
  Checkbox,
  DatePicker,
  Alert,
  Space,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd';
import dayjs from 'dayjs';
import { API_SCOPES } from '@/hooks/useApiKeys';

const { TextArea } = Input;
const { Text } = Typography;

interface CreateApiKeyModalProps {
  visible: boolean;
  loading: boolean;
  form: FormInstance;
  onSubmit: () => void;
  onClose: () => void;
}

export const CreateApiKeyModal = memo<CreateApiKeyModalProps>(
  ({ visible, loading, form, onSubmit, onClose }) => {
    return (
      <Modal
        title="创建 API Key"
        open={visible}
        onOk={onSubmit}
        onCancel={onClose}
        width={600}
        confirmLoading={loading}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="密钥名称"
            rules={[
              { required: true, message: '请输入密钥名称' },
              { max: 50, message: '名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="例如：生产环境密钥" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="描述该密钥的用途" maxLength={200} />
          </Form.Item>

          <Form.Item
            name="scope"
            label="权限范围"
            rules={[{ required: true, message: '请至少选择一个权限' }]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {API_SCOPES.map((scope) => (
                  <Checkbox key={scope.value} value={scope.value}>
                    <Space direction="vertical" size={0}>
                      <Text strong>{scope.label}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {scope.description}
                      </Text>
                    </Space>
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item name="expiresAt" label="过期时间" extra="留空表示永久有效">
            <DatePicker
              style={{ width: '100%' }}
              placeholder="选择过期日期"
              disabledDate={(current) => current && current < dayjs().endOf('day')}
            />
          </Form.Item>

          <Alert
            message="创建后您将只能看到一次完整的 API Key，请务必保存"
            type="info"
            showIcon
          />
        </Form>
      </Modal>
    );
  }
);

CreateApiKeyModal.displayName = 'CreateApiKeyModal';
