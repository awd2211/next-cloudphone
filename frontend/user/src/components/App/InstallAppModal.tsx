import React, { useMemo } from 'react';
import { Modal, Form, Select, FormInstance } from 'antd';
import type { Application, Device } from '@/types';

interface InstallAppModalProps {
  visible: boolean;
  app: Application | null;
  devices: Device[];
  form: FormInstance;
  onConfirm: (values: { deviceId: string }) => void;
  onCancel: () => void;
}

/**
 * 安装应用弹窗组件
 * 用于选择设备并安装应用
 */
export const InstallAppModal: React.FC<InstallAppModalProps> = React.memo(({
  visible,
  app,
  devices,
  form,
  onConfirm,
  onCancel,
}) => {
  // 格式化文件大小
  const formattedSize = useMemo(() => {
    if (!app) return '';
    if (app.size < 1024 * 1024) {
      return (app.size / 1024).toFixed(2) + ' KB';
    }
    return (app.size / 1024 / 1024).toFixed(2) + ' MB';
  }, [app]);

  return (
    <Modal
      title="安装应用"
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Form form={form} onFinish={onConfirm} layout="vertical">
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>应用信息：</div>
          <div>名称: {app?.name}</div>
          <div>版本: {app?.version}</div>
          <div>大小: {formattedSize}</div>
        </div>

        <Form.Item
          label="选择设备"
          name="deviceId"
          rules={[{ required: true, message: '请选择要安装的设备' }]}
        >
          <Select
            placeholder="请选择设备"
            options={devices.map((d) => ({
              label: `${d.name} (${d.status === 'running' ? '运行中' : '已停止'})`,
              value: d.id,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
});

InstallAppModal.displayName = 'InstallAppModal';
