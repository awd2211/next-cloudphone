import React from 'react';
import { Form, Input, Switch, InputNumber } from 'antd';
import { FORM_FIELDS } from './constants';

// Docker/Redroid 配置字段
export const DockerFormFields: React.FC = React.memo(() => {
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
        <InputNumber min={fields.maxDevices.min} max={fields.maxDevices.max} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="imageRegistry" label={fields.imageRegistry.label}>
        <Input placeholder={fields.imageRegistry.placeholder} />
      </Form.Item>
    </>
  );
});
DockerFormFields.displayName = 'DockerFormFields';

// 华为云配置字段
export const HuaweiFormFields: React.FC = React.memo(() => {
  const fields = FORM_FIELDS.huawei;
  return (
    <>
      <Form.Item
        name="projectId"
        label={fields.projectId.label}
        rules={[{ required: fields.projectId.required }]}
        tooltip={fields.projectId.tooltip}
      >
        <Input placeholder={fields.projectId.placeholder} />
      </Form.Item>
      <Form.Item name="accessKeyId" label={fields.accessKeyId.label} rules={[{ required: fields.accessKeyId.required }]}>
        <Input placeholder={fields.accessKeyId.placeholder} />
      </Form.Item>
      <Form.Item name="secretAccessKey" label={fields.secretAccessKey.label} rules={[{ required: fields.secretAccessKey.required }]}>
        <Input.Password placeholder={fields.secretAccessKey.placeholder} />
      </Form.Item>
      <Form.Item name="region" label={fields.region.label} rules={[{ required: fields.region.required }]}>
        <Input placeholder={fields.region.placeholder} />
      </Form.Item>
      <Form.Item name="endpoint" label={fields.endpoint.label}>
        <Input placeholder={fields.endpoint.placeholder} />
      </Form.Item>
      <Form.Item name="defaultServerId" label="默认服务器 ID">
        <Input />
      </Form.Item>
      <Form.Item name="defaultImageId" label="默认镜像 ID">
        <Input />
      </Form.Item>
      <Form.Item name="enableSync" label="启用自动同步" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="syncInterval" label={fields.syncInterval.label}>
        <InputNumber min={fields.syncInterval.min} max={fields.syncInterval.max} style={{ width: '100%' }} />
      </Form.Item>
    </>
  );
});
HuaweiFormFields.displayName = 'HuaweiFormFields';

// 阿里云配置字段
export const AliyunFormFields: React.FC = React.memo(() => {
  const fields = FORM_FIELDS.aliyun;
  return (
    <>
      <Form.Item name="accessKeyId" label={fields.accessKeyId.label} rules={[{ required: fields.accessKeyId.required }]}>
        <Input placeholder={fields.accessKeyId.placeholder} />
      </Form.Item>
      <Form.Item name="accessKeySecret" label={fields.accessKeySecret.label} rules={[{ required: fields.accessKeySecret.required }]}>
        <Input.Password placeholder={fields.accessKeySecret.placeholder} />
      </Form.Item>
      <Form.Item name="region" label={fields.region.label} rules={[{ required: fields.region.required }]}>
        <Input placeholder={fields.region.placeholder} />
      </Form.Item>
      <Form.Item name="endpoint" label={fields.endpoint.label}>
        <Input placeholder={fields.endpoint.placeholder} />
      </Form.Item>
      <Form.Item name="defaultImageId" label="默认镜像 ID">
        <Input />
      </Form.Item>
      <Form.Item name="defaultInstanceType" label={fields.defaultInstanceType.label}>
        <Input placeholder={fields.defaultInstanceType.placeholder} />
      </Form.Item>
      <Form.Item name="enableSync" label="启用自动同步" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="syncInterval" label={fields.syncInterval.label}>
        <InputNumber min={fields.syncInterval.min} max={fields.syncInterval.max} style={{ width: '100%' }} />
      </Form.Item>
    </>
  );
});
AliyunFormFields.displayName = 'AliyunFormFields';

// 物理设备配置字段
export const PhysicalFormFields: React.FC = React.memo(() => {
  const fields = FORM_FIELDS.physical;
  return (
    <>
      <Form.Item name="enableMDNS" label="启用 mDNS 发现" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="scanSubnet" label={fields.scanSubnet.label}>
        <Input placeholder={fields.scanSubnet.placeholder} />
      </Form.Item>
      <Form.Item name="adbPort" label={fields.adbPort.label} initialValue={fields.adbPort.defaultValue}>
        <InputNumber min={fields.adbPort.min} max={fields.adbPort.max} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="scrcpyPort" label={fields.scrcpyPort.label} initialValue={fields.scrcpyPort.defaultValue}>
        <InputNumber min={fields.scrcpyPort.min} max={fields.scrcpyPort.max} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="maxBitrate" label={fields.maxBitrate.label} initialValue={fields.maxBitrate.defaultValue}>
        <InputNumber min={fields.maxBitrate.min} max={fields.maxBitrate.max} step={fields.maxBitrate.step} style={{ width: '100%' }} />
      </Form.Item>
    </>
  );
});
PhysicalFormFields.displayName = 'PhysicalFormFields';
