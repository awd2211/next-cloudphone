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

// 阿里云配置字段（基于 2023-09-30 API）
export const AliyunFormFields: React.FC = React.memo(() => {
  const fields = FORM_FIELDS.aliyun;
  return (
    <>
      <Form.Item name="accessKeyId" label="AccessKey ID" rules={[{ required: true, message: '请输入 AccessKey ID' }]} tooltip="阿里云账号的 AccessKey ID">
        <Input placeholder="请输入阿里云 AccessKey ID" />
      </Form.Item>
      <Form.Item name="accessKeySecret" label="AccessKey Secret" rules={[{ required: true, message: '请输入 AccessKey Secret' }]} tooltip="阿里云账号的 AccessKey Secret">
        <Input.Password placeholder="请输入阿里云 AccessKey Secret" />
      </Form.Item>
      <Form.Item name="regionId" label="区域 (Region ID)" rules={[{ required: true, message: '请输入区域' }]} tooltip="如 cn-hangzhou, ap-southeast-1">
        <Input placeholder="例如: cn-hangzhou" />
      </Form.Item>
      <Form.Item name="endpoint" label="API 端点" tooltip="可选，留空使用默认端点">
        <Input placeholder="例如: eds-aic.cn-hangzhou.aliyuncs.com" />
      </Form.Item>
      <Form.Item name="timeout" label="超时时间 (ms)" initialValue={30000} tooltip="API 请求超时时间，单位：毫秒">
        <InputNumber min={5000} max={60000} step={1000} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="defaultOfficeSiteId" label="默认网络 ID" tooltip="默认的 Office Site ID（网络 ID）">
        <Input placeholder="请输入默认网络 ID" />
      </Form.Item>
      <Form.Item name="defaultVSwitchId" label="默认虚拟交换机 ID" tooltip="默认的 VSwitch ID">
        <Input placeholder="请输入虚拟交换机 ID" />
      </Form.Item>
      <Form.Item name="defaultKeyPairId" label="默认密钥对 ID" tooltip="用于 ADB 连接的密钥对">
        <Input placeholder="请输入密钥对 ID" />
      </Form.Item>
      <Form.Item name="defaultImageId" label="默认镜像 ID" tooltip="默认的 Android 镜像 ID">
        <Input placeholder="请输入镜像 ID" />
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
