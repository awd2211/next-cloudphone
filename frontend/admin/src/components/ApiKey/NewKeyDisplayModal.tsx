import { memo } from 'react';
import { Modal, Alert, Typography, Space, Divider } from 'antd';

const { Paragraph, Text, Title } = Typography;

interface NewKeyDisplayModalProps {
  visible: boolean;
  newKeyData: {
    name: string;
    key: string;
    prefix: string;
  } | null;
  onClose: () => void;
}

export const NewKeyDisplayModal = memo<NewKeyDisplayModalProps>(({
  visible,
  newKeyData,
  onClose,
}) => {
  if (!newKeyData) return null;

  return (
    <Modal
      title="API密钥创建成功"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Alert
          message="重要提示"
          description="此密钥仅显示一次，请立即复制并妥善保管。关闭此窗口后将无法再次查看完整密钥。"
          type="error"
          showIcon
        />

        <div>
          <Title level={5}>密钥名称</Title>
          <Text>{newKeyData.name}</Text>
        </div>

        <div>
          <Title level={5}>API密钥</Title>
          <Paragraph
            copyable={{ text: newKeyData.key }}
            style={{
              background: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              fontFamily: 'monospace',
            }}
          >
            <Text code>{newKeyData.key}</Text>
          </Paragraph>
        </div>

        <Divider />

        <div>
          <Title level={5}>使用示例</Title>
          <Paragraph
            copyable
            style={{
              background: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              fontFamily: 'monospace',
            }}
          >
            <Text code>
              {`curl -H "Authorization: Bearer ${newKeyData.key}" https://api.example.com/v1/devices`}
            </Text>
          </Paragraph>
        </div>

        <Alert
          message="请在应用程序中使用 Authorization: Bearer {API_KEY} 的方式传递密钥"
          type="info"
        />
      </Space>
    </Modal>
  );
});

NewKeyDisplayModal.displayName = 'NewKeyDisplayModal';
