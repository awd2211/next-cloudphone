import React from 'react';
import { Form, Input, Switch, InputNumber } from 'antd';
import { FORM_FIELDS } from './constants';

const DockerFormFields: React.FC = React.memo(() => {
  const fields = FORM_FIELDS.docker;

  return (
    <>
      <Form.Item
        name="dockerHost"
        label={fields.dockerHost.label}
        rules={[{ required: fields.dockerHost.required }]}
        tooltip={fields.dockerHost.tooltip}
      >
        <Input placeholder={fields.dockerHost.placeholder} />
      </Form.Item>

      <Form.Item name="enableGPU" label="启用 GPU" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item
        name="maxDevices"
        label={fields.maxDevices.label}
        rules={[{ required: fields.maxDevices.required }]}
      >
        <InputNumber
          min={fields.maxDevices.min}
          max={fields.maxDevices.max}
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item name="imageRegistry" label={fields.imageRegistry.label}>
        <Input placeholder={fields.imageRegistry.placeholder} />
      </Form.Item>
    </>
  );
});

DockerFormFields.displayName = 'DockerFormFields';

export default DockerFormFields;
