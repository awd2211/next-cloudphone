import React, { useState, useEffect } from 'react';
import { Modal, Select, Form, Alert, Space, Typography } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import { getAppList } from '@/services/app';

const { Text } = Typography;

interface App {
  id: string;
  name: string;
  packageName: string;
  version: string;
  iconUrl?: string;
}

interface BatchInstallAppModalProps {
  open: boolean;
  deviceCount: number;
  onConfirm: (appId: string) => void;
  onCancel: () => void;
}

/**
 * 批量安装应用模态框
 *
 * 功能：
 * 1. 选择要安装的应用
 * 2. 显示应用详细信息
 * 3. 确认批量安装
 */
export const BatchInstallAppModal: React.FC<BatchInstallAppModalProps> = React.memo(
  ({ open, deviceCount, onConfirm, onCancel }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [apps, setApps] = useState<App[]>([]);
    const [selectedApp, setSelectedApp] = useState<App | null>(null);

    // 加载应用列表
    useEffect(() => {
      if (open) {
        fetchApps();
      }
    }, [open]);

    const fetchApps = async () => {
      setLoading(true);
      try {
        const data = await getAppList({ status: 'published' });
        setApps(data.items || []);
      } catch (error) {
        console.error('Failed to fetch apps:', error);
        setApps([]);
      } finally {
        setLoading(false);
      }
    };

    const handleAppSelect = (appId: string) => {
      const app = apps.find((a) => a.id === appId);
      setSelectedApp(app || null);
    };

    const handleConfirm = () => {
      form.validateFields().then((values) => {
        onConfirm(values.appId);
        form.resetFields();
        setSelectedApp(null);
      });
    };

    const handleCancel = () => {
      onCancel();
      form.resetFields();
      setSelectedApp(null);
    };

    return (
      <Modal
        title={
          <Space>
            <AppstoreOutlined style={{ color: '#1890ff' }} />
            <span>批量安装应用</span>
          </Space>
        }
        open={open}
        onOk={handleConfirm}
        onCancel={handleCancel}
        okText="开始安装"
        cancelText="取消"
        width={600}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message={
              <div>
                将为 <Text strong>{deviceCount}</Text> 个设备安装选定的应用
              </div>
            }
            type="info"
            showIcon
          />

          <Form form={form} layout="vertical">
            <Form.Item
              label="选择应用"
              name="appId"
              rules={[{ required: true, message: '请选择要安装的应用' }]}
            >
              <Select
                placeholder="请选择应用"
                loading={loading}
                showSearch
                optionFilterProp="children"
                onChange={handleAppSelect}
                size="large"
              >
                {apps.map((app) => (
                  <Select.Option key={app.id} value={app.id}>
                    <Space>
                      {app.iconUrl && (
                        <img
                          src={app.iconUrl}
                          alt={app.name}
                          style={{ width: 24, height: 24, borderRadius: 4 }}
                        />
                      )}
                      <div>
                        <div>{app.name}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {app.packageName} v{app.version}
                        </Text>
                      </div>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Form>

          {selectedApp && (
            <Alert
              message="应用信息"
              description={
                <Space direction="vertical" size={4}>
                  <div>
                    <Text type="secondary">应用名称: </Text>
                    <Text>{selectedApp.name}</Text>
                  </div>
                  <div>
                    <Text type="secondary">包名: </Text>
                    <Text code>{selectedApp.packageName}</Text>
                  </div>
                  <div>
                    <Text type="secondary">版本: </Text>
                    <Text>{selectedApp.version}</Text>
                  </div>
                </Space>
              }
              type="success"
              showIcon
            />
          )}

          <Alert
            message="注意事项"
            description={
              <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                <li>安装过程可能需要几分钟，请耐心等待</li>
                <li>已安装该应用的设备将跳过</li>
                <li>如果设备处于关机状态，安装会失败</li>
              </ul>
            }
            type="warning"
            showIcon
          />
        </Space>
      </Modal>
    );
  }
);

BatchInstallAppModal.displayName = 'BatchInstallAppModal';
