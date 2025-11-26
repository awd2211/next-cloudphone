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
  return (
    <>
      <Form.Item
        name="accessKeyId"
        label="AccessKey ID"
        rules={[{ required: true, message: '请输入 AccessKey ID' }]}
        tooltip="阿里云 RAM 用户的 AccessKey ID"
      >
        <Input placeholder="例如: LTAI5txxxxxxxxxx" />
      </Form.Item>
      <Form.Item
        name="accessKeySecret"
        label="AccessKey Secret"
        rules={[{ required: true, message: '请输入 AccessKey Secret' }]}
        tooltip="阿里云 RAM 用户的 AccessKey Secret"
      >
        <Input.Password placeholder="请输入 AccessKey Secret" />
      </Form.Item>
      <Form.Item
        name="regionId"
        label="区域"
        rules={[{ required: true, message: '请选择区域' }]}
        tooltip="云手机实例所在区域"
      >
        <Input placeholder="例如: ap-southeast-1 (新加坡)" />
      </Form.Item>
      <Form.Item
        name="endpoint"
        label="API 端点"
        tooltip="可选，留空则根据区域自动生成"
      >
        <Input placeholder="例如: eds-aic.ap-southeast-1.aliyuncs.com" />
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

// AWS Device Farm 配置字段
export const AwsFormFields: React.FC = React.memo(() => {
  return (
    <>
      <Form.Item
        name="accessKeyId"
        label="Access Key ID"
        rules={[{ required: true, message: '请输入 AWS Access Key ID' }]}
        tooltip="AWS IAM 用户的 Access Key ID"
      >
        <Input placeholder="例如: AKIAIOSFODNN7EXAMPLE" />
      </Form.Item>
      <Form.Item
        name="secretAccessKey"
        label="Secret Access Key"
        rules={[{ required: true, message: '请输入 AWS Secret Access Key' }]}
        tooltip="AWS IAM 用户的 Secret Access Key"
      >
        <Input.Password placeholder="请输入 Secret Access Key" />
      </Form.Item>
      <Form.Item
        name="region"
        label="区域"
        rules={[{ required: true, message: '请选择区域' }]}
        tooltip="AWS Device Farm 支持的区域"
        initialValue="us-west-2"
      >
        <Input placeholder="例如: us-west-2 (美国西部-俄勒冈)" />
      </Form.Item>
      <Form.Item
        name="projectArn"
        label="项目 ARN"
        tooltip="Device Farm 项目的 ARN（可选，留空则使用默认项目）"
      >
        <Input placeholder="例如: arn:aws:devicefarm:us-west-2:..." />
      </Form.Item>
    </>
  );
});
AwsFormFields.displayName = 'AwsFormFields';

// 腾讯云游戏配置字段
export const TencentFormFields: React.FC = React.memo(() => {
  return (
    <>
      <Form.Item
        name="secretId"
        label="SecretId"
        rules={[{ required: true, message: '请输入腾讯云 SecretId' }]}
        tooltip="腾讯云 API 密钥的 SecretId"
      >
        <Input placeholder="请输入腾讯云 SecretId" />
      </Form.Item>
      <Form.Item
        name="secretKey"
        label="SecretKey"
        rules={[{ required: true, message: '请输入腾讯云 SecretKey' }]}
        tooltip="腾讯云 API 密钥的 SecretKey"
      >
        <Input.Password placeholder="请输入 SecretKey" />
      </Form.Item>
      <Form.Item
        name="region"
        label="区域"
        rules={[{ required: true, message: '请选择区域' }]}
        tooltip="云游戏服务所在区域"
        initialValue="ap-guangzhou"
      >
        <Input placeholder="例如: ap-guangzhou (广州), ap-shanghai (上海)" />
      </Form.Item>
      <Form.Item
        name="endpoint"
        label="API 端点"
        tooltip="可选，留空则使用默认端点"
      >
        <Input placeholder="例如: gs.tencentcloudapi.com" />
      </Form.Item>
    </>
  );
});
TencentFormFields.displayName = 'TencentFormFields';

// 百度云配置字段
export const BaiduFormFields: React.FC = React.memo(() => {
  return (
    <>
      <Form.Item
        name="accessKey"
        label="Access Key"
        rules={[{ required: true, message: '请输入百度云 Access Key' }]}
        tooltip="百度云 Access Key (AK)"
      >
        <Input placeholder="请输入 Access Key" />
      </Form.Item>
      <Form.Item
        name="secretKey"
        label="Secret Key"
        rules={[{ required: true, message: '请输入百度云 Secret Key' }]}
        tooltip="百度云 Secret Key (SK)"
      >
        <Input.Password placeholder="请输入 Secret Key" />
      </Form.Item>
      <Form.Item
        name="region"
        label="区域"
        rules={[{ required: true, message: '请选择区域' }]}
        tooltip="百度 AICloud 服务所在区域"
        initialValue="bj"
      >
        <Input placeholder="例如: bj (北京), gz (广州), su (苏州)" />
      </Form.Item>
      <Form.Item
        name="endpoint"
        label="API 端点"
        tooltip="可选，留空则使用默认端点"
      >
        <Input placeholder="例如: bac.bj.baidubce.com" />
      </Form.Item>
    </>
  );
});
BaiduFormFields.displayName = 'BaiduFormFields';

// BrowserStack 配置字段
export const BrowserStackFormFields: React.FC = React.memo(() => {
  return (
    <>
      <Form.Item
        name="username"
        label="用户名"
        rules={[{ required: true, message: '请输入 BrowserStack 用户名' }]}
        tooltip="BrowserStack 账户用户名"
      >
        <Input placeholder="请输入 BrowserStack 用户名" />
      </Form.Item>
      <Form.Item
        name="accessKey"
        label="Access Key"
        rules={[{ required: true, message: '请输入 BrowserStack Access Key' }]}
        tooltip="BrowserStack Access Key（可在 Account Settings 中获取）"
      >
        <Input.Password placeholder="请输入 Access Key" />
      </Form.Item>
      <Form.Item
        name="defaultDevice"
        label="默认设备"
        tooltip="默认使用的设备型号"
      >
        <Input placeholder="例如: Samsung Galaxy S23" />
      </Form.Item>
      <Form.Item
        name="defaultOsVersion"
        label="默认 Android 版本"
        tooltip="默认使用的 Android 版本"
        initialValue="13.0"
      >
        <Input placeholder="例如: 13.0, 12.0, 11.0" />
      </Form.Item>
    </>
  );
});
BrowserStackFormFields.displayName = 'BrowserStackFormFields';

// Genymotion Cloud 配置字段
export const GenymotionFormFields: React.FC = React.memo(() => {
  return (
    <>
      <Form.Item
        name="email"
        label="邮箱"
        rules={[
          { required: true, message: '请输入 Genymotion Cloud 账户邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' },
        ]}
        tooltip="Genymotion Cloud 账户邮箱"
      >
        <Input placeholder="请输入邮箱地址" />
      </Form.Item>
      <Form.Item
        name="password"
        label="密码"
        rules={[{ required: true, message: '请输入 Genymotion Cloud 账户密码' }]}
        tooltip="Genymotion Cloud 账户密码"
      >
        <Input.Password placeholder="请输入密码" />
      </Form.Item>
      <Form.Item
        name="apiToken"
        label="API Token"
        tooltip="可选的 API Token（推荐使用，比密码更安全）"
      >
        <Input.Password placeholder="请输入 API Token（可选）" />
      </Form.Item>
      <Form.Item
        name="region"
        label="区域"
        tooltip="Genymotion Cloud 实例所在区域"
        initialValue="us-west-2"
      >
        <Input placeholder="例如: us-west-2, eu-west-1, ap-northeast-1" />
      </Form.Item>
      <Form.Item
        name="defaultRecipe"
        label="默认配方"
        tooltip="默认使用的 Android 虚拟机配方"
        initialValue="android-13-google-apis"
      >
        <Input placeholder="例如: android-13-google-apis" />
      </Form.Item>
    </>
  );
});
GenymotionFormFields.displayName = 'GenymotionFormFields';
