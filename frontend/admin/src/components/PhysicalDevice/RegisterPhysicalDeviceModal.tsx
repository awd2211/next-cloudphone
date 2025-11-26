import { memo } from 'react';
import { Modal, Form, Input, Select, Descriptions, Alert } from 'antd';
import type { FormInstance } from 'antd';
import { NEUTRAL_LIGHT } from '@/theme';

const { Option } = Select;

interface ScanResult {
  serialNumber: string;
  model?: string;
  manufacturer?: string;
  androidVersion?: string;
  ipAddress: string;
  status: 'online' | 'offline';
}

interface RegisterPhysicalDeviceModalProps {
  visible: boolean;
  form: FormInstance;
  selectedDevice: ScanResult | null;
  isRegistering: boolean;
  onCancel: () => void;
  onFinish: (values: any) => void;
}

export const RegisterPhysicalDeviceModal = memo<RegisterPhysicalDeviceModalProps>(
  ({ visible, form, selectedDevice, isRegistering, onCancel, onFinish }) => {
    return (
      <Modal
        title={selectedDevice ? '注册发现的设备' : '手动注册设备'}
        open={visible}
        onCancel={onCancel}
        onOk={() => form.submit()}
        confirmLoading={isRegistering}
        width={600}
      >
        {selectedDevice && (
          <Descriptions column={2} size="small" bordered style={{ marginBottom: '16px' }}>
            <Descriptions.Item label="序列号" span={2}>
              {selectedDevice.serialNumber}
            </Descriptions.Item>
            <Descriptions.Item label="厂商">{selectedDevice.manufacturer || '-'}</Descriptions.Item>
            <Descriptions.Item label="型号">{selectedDevice.model || '-'}</Descriptions.Item>
            <Descriptions.Item label="Android 版本">
              {selectedDevice.androidVersion || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="IP 地址">{selectedDevice.ipAddress}</Descriptions.Item>
          </Descriptions>
        )}

        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            label="设备序列号"
            name="serialNumber"
            rules={[{ required: true, message: '请输入设备序列号' }]}
          >
            <Input placeholder="运行 adb devices 获取序列号" disabled={!!selectedDevice} />
          </Form.Item>

          <Form.Item label="设备名称" name="name">
            <Input placeholder="为设备起一个易识别的名称" />
          </Form.Item>

          <Form.Item
            label="连接方式"
            name="connectionType"
            rules={[{ required: true, message: '请选择连接方式' }]}
            initialValue="network"
          >
            <Select disabled={!!selectedDevice}>
              <Option value="usb">USB 直连</Option>
              <Option value="network">网络 ADB</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.connectionType !== curr.connectionType}
          >
            {({ getFieldValue }) =>
              getFieldValue('connectionType') === 'network' ? (
                <>
                  <Form.Item
                    label="IP 地址"
                    name="ipAddress"
                    rules={[{ required: true, message: '请输入 IP 地址' }]}
                  >
                    <Input placeholder="设备的 IP 地址" disabled={!!selectedDevice} />
                  </Form.Item>
                  <Form.Item
                    label="ADB 端口"
                    name="adbPort"
                    rules={[{ required: true, message: '请输入 ADB 端口' }]}
                    initialValue={5555}
                  >
                    <Input type="number" placeholder="默认为 5555" disabled={!!selectedDevice} />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>
        </Form>

        {!selectedDevice && (
          <Alert
            message="网络 ADB 设置方法"
            description={
              <div>
                <p>1. 在设备上开启 ADB over TCP/IP:</p>
                <pre style={{ background: NEUTRAL_LIGHT.bg.layout, padding: '8px', borderRadius: '4px' }}>
                  adb tcpip 5555
                </pre>
                <p>2. 查看设备 IP 地址（设置 → 关于手机 → 状态信息）</p>
                <p>3. 在此页面注册设备</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}
      </Modal>
    );
  }
);

RegisterPhysicalDeviceModal.displayName = 'RegisterPhysicalDeviceModal';
