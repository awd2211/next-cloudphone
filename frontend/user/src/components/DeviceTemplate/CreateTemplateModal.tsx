import React from 'react';
import { Modal, Form, Input, Select, InputNumber, Row, Col, FormInstance } from 'antd';
import {
  type DeviceTemplate,
  androidVersionOptions,
  cpuCoresOptions,
  resolutionOptions,
  dpiOptions,
  memoryConfig,
  diskConfig,
} from '@/utils/templateConfig';

const { TextArea } = Input;

interface CreateTemplateModalProps {
  visible: boolean;
  loading: boolean;
  isEditing: boolean;
  form: FormInstance;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * 创建/编辑模板弹窗组件
 *
 * 优化点:
 * - 使用 React.memo 优化
 * - 配置驱动（所有选项从配置获取）
 * - 表单布局优化（Row + Col）
 * - 表单验证规则集中管理
 */
export const CreateTemplateModal: React.FC<CreateTemplateModalProps> = React.memo(
  ({ visible, loading, isEditing, form, onSubmit, onCancel }) => {
    return (
      <Modal
        title={isEditing ? '编辑模板' : '创建自定义模板'}
        open={visible}
        onOk={onSubmit}
        onCancel={onCancel}
        width={600}
        confirmLoading={loading}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {/* 模板名称 */}
          <Form.Item
            name="name"
            label="模板名称"
            rules={[
              { required: true, message: '请输入模板名称' },
              { max: 50, message: '名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="例如：游戏专用配置" />
          </Form.Item>

          {/* 模板描述 */}
          <Form.Item name="description" label="模板描述">
            <TextArea
              rows={3}
              placeholder="描述模板的用途和特点"
              maxLength={200}
            />
          </Form.Item>

          {/* Android版本 + CPU核心数 */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="androidVersion"
                label="Android版本"
                rules={[{ required: true, message: '请选择Android版本' }]}
              >
                <Select placeholder="选择版本" options={androidVersionOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="cpuCores"
                label="CPU核心数"
                rules={[{ required: true, message: '请选择CPU核心数' }]}
              >
                <Select placeholder="选择核心数" options={cpuCoresOptions} />
              </Form.Item>
            </Col>
          </Row>

          {/* 内存 + 存储空间 */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="memoryMB"
                label="内存 (MB)"
                rules={[{ required: true, message: '请输入内存大小' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={memoryConfig.min}
                  max={memoryConfig.max}
                  step={memoryConfig.step}
                  placeholder="例如：4096"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="diskGB"
                label="存储空间 (GB)"
                rules={[{ required: true, message: '请输入存储空间' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={diskConfig.min}
                  max={diskConfig.max}
                  step={diskConfig.step}
                  placeholder="例如：32"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 屏幕分辨率 + DPI */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="resolution"
                label="屏幕分辨率"
                rules={[{ required: true, message: '请选择分辨率' }]}
              >
                <Select placeholder="选择分辨率" options={resolutionOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dpi"
                label="屏幕DPI"
                rules={[{ required: true, message: '请选择DPI' }]}
              >
                <Select placeholder="选择DPI" options={dpiOptions} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    );
  }
);

CreateTemplateModal.displayName = 'CreateTemplateModal';
