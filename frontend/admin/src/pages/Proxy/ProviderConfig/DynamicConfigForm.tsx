/**
 * 动态配置表单组件
 *
 * 根据提供商类型自动渲染对应的配置字段
 * - 支持多种字段类型（text, password, number, select, url）
 * - 自动字段验证
 * - 提示信息和占位符
 * - 默认值处理
 */

import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Select, Tooltip, Row, Col } from 'antd';
import { QuestionCircleOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import { getProviderFields } from './fieldConfigs';
import type { ProviderType, FieldConfig } from './types';
import { NEUTRAL_LIGHT } from '@/theme';

interface DynamicConfigFormProps {
  form: FormInstance;
  providerType: ProviderType | null;
  isEditing?: boolean;
}

const DynamicConfigForm: React.FC<DynamicConfigFormProps> = ({
  form,
  providerType,
  isEditing = false,
}) => {
  // 当提供商类型改变时，设置默认值
  useEffect(() => {
    if (!providerType) return;

    const fields = getProviderFields(providerType);
    const defaultValues: Record<string, any> = {};

    fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaultValues[field.name] = field.defaultValue;
      }
    });

    // 只在非编辑模式下设置默认值
    if (!isEditing && Object.keys(defaultValues).length > 0) {
      form.setFieldsValue(defaultValues);
    }
  }, [providerType, form, isEditing]);

  if (!providerType) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: NEUTRAL_LIGHT.text.tertiary }}>
        请先选择提供商类型
      </div>
    );
  }

  const fields = getProviderFields(providerType);

  if (fields.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: NEUTRAL_LIGHT.text.tertiary }}>
        该提供商类型暂无配置字段
      </div>
    );
  }

  // 渲染单个字段
  const renderField = (field: FieldConfig) => {
    const { name, label, type = 'text', required, placeholder, tooltip, options, pattern, patternMessage, min, max, addonBefore, addonAfter } = field;

    // 构建验证规则
    const rules: any[] = [];
    if (required) {
      rules.push({ required: true, message: `请输入${label}` });
    }
    if (pattern) {
      rules.push({ pattern, message: patternMessage || `${label}格式不正确` });
    }
    if (type === 'url') {
      rules.push({ type: 'url', message: '请输入有效的 URL' });
    }

    // 渲染字段标签（带提示）
    const fieldLabel = tooltip ? (
      <span>
        {label}{' '}
        <Tooltip title={tooltip}>
          <QuestionCircleOutlined style={{ color: NEUTRAL_LIGHT.text.tertiary, cursor: 'help' }} />
        </Tooltip>
      </span>
    ) : (
      label
    );

    // 根据字段类型渲染不同的输入组件
    let inputComponent: React.ReactNode;

    switch (type) {
      case 'password':
        inputComponent = (
          <Input.Password
            placeholder={placeholder}
            iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            addonBefore={addonBefore}
            addonAfter={addonAfter}
          />
        );
        break;

      case 'number':
        inputComponent = (
          <InputNumber
            placeholder={placeholder}
            min={min}
            max={max}
            style={{ width: '100%' }}
            addonBefore={addonBefore}
            addonAfter={addonAfter}
          />
        );
        break;

      case 'select':
        inputComponent = (
          <Select placeholder={placeholder || `请选择${label}`}>
            {options?.map(option => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        );
        break;

      case 'url':
      case 'text':
      default:
        inputComponent = (
          <Input
            placeholder={placeholder}
            addonBefore={addonBefore}
            addonAfter={addonAfter}
          />
        );
        break;
    }

    return (
      <Form.Item
        key={name}
        name={name}
        label={fieldLabel}
        rules={rules}
      >
        {inputComponent}
      </Form.Item>
    );
  };

  return (
    <div>
      <Row gutter={16}>
        {fields.map((field, index) => {
          // 决定字段占据的列数（某些字段单独一行，某些两列布局）
          const isFullWidth = field.name === 'gateway' || field.name === 'apiUrl' || field.type === 'url';
          const span = isFullWidth ? 24 : 12;

          return (
            <Col span={span} key={field.name}>
              {renderField(field)}
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default DynamicConfigForm;
