import React from 'react';
import { Modal, Form, InputNumber, Input, Alert, Space, Typography, FormInstance } from 'antd';
import {
  type DeviceTemplate,
  formatConfig,
  batchCreateConfig,
  createTipConfig,
} from '@/utils/templateConfig';

const { Text } = Typography;

interface UseTemplateModalProps {
  visible: boolean;
  loading: boolean;
  template: DeviceTemplate | null;
  form: FormInstance;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * 使用模板弹窗组件
 *
 * 优化点:
 * - 使用 React.memo 优化
 * - 配置驱动（批量创建限制、提示信息）
 * - 模板信息显示
 */
export const UseTemplateModal: React.FC<UseTemplateModalProps> = React.memo(
  ({ visible, loading, template, form, onSubmit, onCancel }) => {
    return (
      <Modal
        title="使用模板创建设备"
        open={visible}
        onOk={onSubmit}
        onCancel={onCancel}
        width={600}
        confirmLoading={loading}
        okText="开始创建"
        cancelText="取消"
      >
        {template && (
          <>
            {/* 模板信息 */}
            <Alert
              message="模板信息"
              description={
                <Space direction="vertical" size="small">
                  <Text>
                    <Text strong>名称：</Text>
                    {template.name}
                  </Text>
                  <Text>
                    <Text strong>配置：</Text>
                    {formatConfig(template)}
                  </Text>
                  <Text>
                    <Text strong>Android版本：</Text>
                    {template.androidVersion}
                  </Text>
                </Space>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            {/* 批量创建表单 */}
            <Form form={form} layout="vertical">
              {/* 创建数量 */}
              <Form.Item
                name="count"
                label="创建数量"
                rules={[
                  { required: true, message: '请输入创建数量' },
                  {
                    type: 'number',
                    min: batchCreateConfig.min,
                    max: batchCreateConfig.max,
                    message: `数量范围：${batchCreateConfig.min}-${batchCreateConfig.max}`,
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={batchCreateConfig.min}
                  max={batchCreateConfig.max}
                  placeholder="批量创建的设备数量"
                />
              </Form.Item>

              {/* 设备名称前缀 */}
              <Form.Item
                name="namePrefix"
                label="设备名称前缀"
                rules={[
                  { required: true, message: '请输入设备名称前缀' },
                  { max: 20, message: '前缀不能超过20个字符' },
                ]}
                extra="设备将自动命名为：前缀-001、前缀-002 ..."
              >
                <Input placeholder="例如：GameDevice" />
              </Form.Item>

              {/* 创建提示 */}
              <Alert
                message={createTipConfig.message}
                description={createTipConfig.description}
                type={createTipConfig.type}
                showIcon
                style={{ marginTop: 16 }}
              />
            </Form>
          </>
        )}
      </Modal>
    );
  }
);

UseTemplateModal.displayName = 'UseTemplateModal';
