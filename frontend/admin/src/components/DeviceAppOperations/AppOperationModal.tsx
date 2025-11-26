import React, { useState } from 'react';
import { Modal, Form, Input, Select, message, Space, Alert } from 'antd';
import { PlayCircleOutlined, StopOutlined, DeleteOutlined } from '@ant-design/icons';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';

interface AppOperationModalProps {
  visible: boolean;
  deviceId: string;
  deviceName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type OperationType = 'start' | 'stop' | 'clear-data';

const AppOperationModal: React.FC<AppOperationModalProps> = ({
  visible,
  deviceId,
  deviceName,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [operationType, setOperationType] = useState<OperationType>('start');

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const endpoints = {
        start: `/devices/${deviceId}/apps/start`,
        stop: `/devices/${deviceId}/apps/stop`,
        'clear-data': `/devices/${deviceId}/apps/clear-data`,
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoints[operationType]}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ packageName: values.packageName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '操作失败');
      }

      message.success(data.message || '操作成功');
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const operationConfig = {
    start: {
      title: '启动应用',
      icon: <PlayCircleOutlined />,
      description: '启动设备上已安装的应用',
      color: SEMANTIC.success.main,
    },
    stop: {
      title: '停止应用',
      icon: <StopOutlined />,
      description: '强制停止正在运行的应用',
      color: SEMANTIC.warning.main,
    },
    'clear-data': {
      title: '清除应用数据',
      icon: <DeleteOutlined />,
      description: '清除应用的所有数据和缓存 (不会卸载应用)',
      color: SEMANTIC.error.main,
    },
  };

  const config = operationConfig[operationType];

  return (
    <Modal
      title={`应用操作 - ${deviceName}`}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      okText="执行"
      cancelText="取消"
      width={600}
    >
      <Alert
        message="仅阿里云 ECP 设备支持"
        description="应用操作功能仅支持阿里云弹性云手机,华为云手机不支持此功能"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="operationType"
          label="操作类型"
          initialValue="start"
          rules={[{ required: true, message: '请选择操作类型' }]}
        >
          <Select
            onChange={(value) => setOperationType(value as OperationType)}
            options={[
              {
                label: (
                  <Space>
                    <PlayCircleOutlined style={{ color: SEMANTIC.success.main }} />
                    启动应用
                  </Space>
                ),
                value: 'start',
              },
              {
                label: (
                  <Space>
                    <StopOutlined style={{ color: SEMANTIC.warning.main }} />
                    停止应用
                  </Space>
                ),
                value: 'stop',
              },
              {
                label: (
                  <Space>
                    <DeleteOutlined style={{ color: SEMANTIC.error.main }} />
                    清除应用数据
                  </Space>
                ),
                value: 'clear-data',
              },
            ]}
          />
        </Form.Item>

        <Alert
          message={config.title}
          description={config.description}
          type="warning"
          showIcon
          icon={config.icon}
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          name="packageName"
          label="应用包名"
          rules={[
            { required: true, message: '请输入应用包名' },
            {
              pattern: /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/,
              message: '请输入有效的应用包名 (例如: com.tencent.mm)',
            },
          ]}
          tooltip="Android 应用的唯一标识符,通常采用反向域名格式"
        >
          <Input
            placeholder="例如: com.tencent.mm"
            prefix={<span style={{ color: NEUTRAL_LIGHT.text.tertiary }}>📦</span>}
          />
        </Form.Item>

        <Alert
          message="常用应用包名示例"
          description={
            <div>
              <div>• 微信: com.tencent.mm</div>
              <div>• QQ: com.tencent.mobileqq</div>
              <div>• 抖音: com.ss.android.ugc.aweme</div>
              <div>• Chrome: com.android.chrome</div>
            </div>
          }
          type="info"
          style={{ marginTop: 8 }}
        />
      </Form>
    </Modal>
  );
};

export default AppOperationModal;
