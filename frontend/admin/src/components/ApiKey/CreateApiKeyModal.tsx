import { memo } from 'react';
import { Modal, Form, Input, Select, Typography, DatePicker } from 'antd';
import { KeyOutlined } from '@ant-design/icons';
import { AVAILABLE_SCOPES, ENVIRONMENT_OPTIONS } from './constants';
import { validateScope, isDateInFuture } from '@/utils/validators';

const { TextArea } = Input;
const { Text } = Typography;

export interface CreateApiKeyModalProps {
  visible: boolean;
  loading: boolean;
  form: any;
  onCancel: () => void;
  onSubmit: () => void;
}

/**
 * 创建 API 密钥模态框组件
 */
export const CreateApiKeyModal = memo<CreateApiKeyModalProps>(
  ({ visible, loading, form, onCancel, onSubmit }) => {
    return (
      <Modal
        title={
          <>
            <KeyOutlined /> 创建 API 密钥
          </>
        }
        open={visible}
        onCancel={onCancel}
        onOk={onSubmit}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            environment: 'prod',
            scopes: ['devices:read'],
          }}
        >
          <Form.Item
            name="name"
            label="密钥名称"
            rules={[{ required: true, message: '请输入密钥名称' }]}
          >
            <Input placeholder="例如: 生产环境密钥" />
          </Form.Item>

          <Form.Item
            name="environment"
            label="环境"
            rules={[{ required: true, message: '请选择环境' }]}
          >
            <Select options={ENVIRONMENT_OPTIONS} />
          </Form.Item>

          <Form.Item
            name="scopes"
            label="权限范围"
            rules={[
              { required: true, message: '请选择至少一个权限' },
              {
                validator: async (_, value) => {
                  if (value && Array.isArray(value)) {
                    const invalidScopes = value.filter((s: string) => !validateScope(s));
                    if (invalidScopes.length > 0) {
                      throw new Error(
                        `权限格式错误: ${invalidScopes.join(', ')}。格式必须为 "resource:action" (小写字母)`
                      );
                    }
                  }
                },
              },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="选择权限范围（例如: device:read, device:write）"
              options={AVAILABLE_SCOPES}
              showSearch
            />
          </Form.Item>

          <Form.Item
            name="expiresAt"
            label="过期时间（可选）"
            rules={[
              {
                validator: async (_, value) => {
                  if (value && !isDateInFuture(value)) {
                    throw new Error('过期时间必须是未来日期');
                  }
                },
              },
            ]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="选择过期时间"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item name="description" label="描述（可选）">
            <TextArea rows={3} placeholder="密钥用途说明" />
          </Form.Item>

          <div
            style={{
              background: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: 4,
              padding: 12,
            }}
          >
            <Text type="warning">⚠️ 注意事项：</Text>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>Secret Key 创建后仅显示一次，请妥善保管</li>
              <li>不要在公开场合或代码仓库中暴露密钥</li>
              <li>建议定期轮换密钥以提高安全性</li>
            </ul>
          </div>
        </Form>
      </Modal>
    );
  },
);

CreateApiKeyModal.displayName = 'CreateApiKeyModal';
