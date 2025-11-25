import { memo, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, Radio, Space, Divider } from 'antd';
import type { FormInstance } from 'antd';
import type { CreateDeviceDto } from '@/types';
import { DeviceProvider, ProviderNames } from '@/types/provider';
import { HuaweiSpecSelector } from '@/components/Provider';

interface CreateDeviceModalProps {
  visible: boolean;
  form: FormInstance;
  loading: boolean;
  onOk: () => void;
  onCancel: () => void;
  onFinish: (values: CreateDeviceDto) => void;
}

/**
 * 创建设备弹窗组件
 * 支持多提供商: Redroid, 华为云, 阿里云, 物理设备
 *
 * Phase 3: 集成华为云手机创建
 */
export const CreateDeviceModal = memo<CreateDeviceModalProps>(
  ({ visible, form, loading, onOk, onCancel, onFinish }) => {
    // 当前选中的提供商类型
    const [providerType, setProviderType] = useState<DeviceProvider>(DeviceProvider.DOCKER);

    // 处理提供商类型变更
    const handleProviderChange = (provider: DeviceProvider) => {
      setProviderType(provider);
      // 清空表单中与提供商相关的字段
      form.setFieldsValue({
        cpuCores: provider === DeviceProvider.DOCKER ? 2 : undefined,
        memoryMB: provider === DeviceProvider.DOCKER ? 4096 : undefined,
        storageMB: provider === DeviceProvider.DOCKER ? 10240 : undefined,
        providerSpecificConfig: undefined, // 清空整个 providerSpecificConfig 对象
      });
    };

    // 处理华为云规格选择
    const handleHuaweiSpecChange = (specId: string, spec: any) => {
      form.setFieldsValue({
        providerSpecificConfig: {
          specId,
        },
        cpuCores: spec.cpuCores,
        memoryMB: spec.memoryMB,
      });
    };

    return (
      <Modal
        title="创建设备"
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
        confirmLoading={loading}
        width={700}
        bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          {/* 设备名称 */}
          <Form.Item
            label="设备名称"
            name="name"
            rules={[{ required: true, message: '请输入设备名称' }]}
          >
            <Input placeholder="例如: MyDevice-001" />
          </Form.Item>

          {/* 提供商类型选择 */}
          <Form.Item
            label="提供商类型"
            name="provider"
            initialValue={DeviceProvider.DOCKER}
            rules={[{ required: true, message: '请选择提供商类型' }]}
          >
            <Radio.Group onChange={(e) => handleProviderChange(e.target.value)}>
              <Space direction="vertical">
                <Radio value={DeviceProvider.DOCKER}>{ProviderNames[DeviceProvider.DOCKER]}</Radio>
                <Radio value={DeviceProvider.HUAWEI}>{ProviderNames[DeviceProvider.HUAWEI]}</Radio>
                <Radio value={DeviceProvider.ALIYUN}>{ProviderNames[DeviceProvider.ALIYUN]}</Radio>
                <Radio value={DeviceProvider.PHYSICAL}>{ProviderNames[DeviceProvider.PHYSICAL]}</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Divider />

          {/* Redroid (Docker) 配置 */}
          {providerType === DeviceProvider.DOCKER && (
            <>
              <Form.Item
                label="模板"
                name="template"
                rules={[{ required: true, message: '请选择模板' }]}
              >
                <Select
                  placeholder="选择Android版本模板"
                  options={[
                    { label: 'Android 12', value: 'android-12' },
                    { label: 'Android 13', value: 'android-13' },
                    { label: 'Android 14', value: 'android-14' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                label="CPU 核心数"
                name="cpuCores"
                initialValue={2}
                rules={[{ required: true, message: '请输入CPU核心数' }]}
              >
                <InputNumber min={1} max={16} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label="内存 (MB)"
                name="memoryMB"
                initialValue={4096}
                rules={[{ required: true, message: '请输入内存大小' }]}
              >
                <InputNumber min={1024} max={32768} step={1024} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label="存储 (MB)"
                name="storageMB"
                initialValue={10240}
                rules={[{ required: true, message: '请输入存储大小' }]}
              >
                <InputNumber min={2048} max={102400} step={1024} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}

          {/* 华为云 CPH 配置 */}
          {providerType === DeviceProvider.HUAWEI && (
            <>
              {/* 规格选择器 */}
              <Form.Item
                label="云手机规格"
                name={['providerSpecificConfig', 'specId']}
                rules={[{ required: true, message: '请选择云手机规格' }]}
              >
                <HuaweiSpecSelector onChange={handleHuaweiSpecChange} />
              </Form.Item>

              {/* 隐藏字段: CPU 和内存会被规格选择器自动填充 */}
              <Form.Item name="cpuCores" hidden>
                <InputNumber />
              </Form.Item>
              <Form.Item name="memoryMB" hidden>
                <InputNumber />
              </Form.Item>

              {/* 镜像 ID (可选) */}
              <Form.Item
                label="镜像 ID"
                name={['providerSpecificConfig', 'imageId']}
                tooltip="留空使用默认镜像。如需使用特定镜像,请输入镜像ID。"
              >
                <Input placeholder="留空使用默认镜像" />
              </Form.Item>

              {/* 服务器 ID (可选) */}
              <Form.Item
                label="服务器 ID"
                name={['providerSpecificConfig', 'serverId']}
                tooltip="留空自动分配服务器。如需指定服务器,请输入服务器ID。"
              >
                <Input placeholder="留空自动分配" />
              </Form.Item>
            </>
          )}

          {/* 阿里云 ECP 配置 */}
          {providerType === DeviceProvider.ALIYUN && (
            <>
              <Form.Item
                label="实例类型"
                name={['providerSpecificConfig', 'instanceType']}
                rules={[{ required: true, message: '请选择实例类型' }]}
              >
                <Select
                  placeholder="选择实例类型"
                  options={[
                    { label: 'eds-aic.s1.medium (2核4G)', value: 'eds-aic.s1.medium' },
                    { label: 'eds-aic.s1.large (4核8G)', value: 'eds-aic.s1.large' },
                    { label: 'eds-aic.s1.xlarge (8核16G)', value: 'eds-aic.s1.xlarge' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                label="镜像 ID"
                name={['providerSpecificConfig', 'imageId']}
                tooltip="留空使用默认镜像"
              >
                <Input placeholder="留空使用默认镜像" />
              </Form.Item>
            </>
          )}

          {/* 物理设备配置 */}
          {providerType === DeviceProvider.PHYSICAL && (
            <>
              <Form.Item
                label="设备序列号"
                name={['providerSpecificConfig', 'serialNumber']}
                rules={[{ required: true, message: '请输入设备序列号' }]}
                tooltip="物理设备的序列号,可通过 adb devices 查看"
              >
                <Input placeholder="例如: 1234567890ABCDEF" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    );
  }
);

CreateDeviceModal.displayName = 'CreateDeviceModal';
