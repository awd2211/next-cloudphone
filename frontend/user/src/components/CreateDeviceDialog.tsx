import React, { useState } from 'react';
import {
  Modal,
  Steps,
  Form,
  Input,
  Select,
  Slider,
  Button,
  Alert,
  Space,
  Typography,
} from 'antd';
import { createDevice, getDeviceCreationStatus, type CreateDeviceDto } from '@/services/device';

const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface CreateDeviceDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (device: any) => void;
}

const steps = [
  { title: '基础信息' },
  { title: '硬件配置' },
  { title: '确认创建' },
];

export const CreateDeviceDialog: React.FC<CreateDeviceDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 表单数据（用于最后一步的确认显示）
  const [formData, setFormData] = useState<CreateDeviceDto>({
    name: '',
    description: '',
    type: 'phone',
    providerType: 'redroid',
    cpuCores: 2,
    memoryMB: 2048,
    storageMB: 32768,
    resolution: '1920x1080',
    dpi: 480,
    androidVersion: '13.0',
  });

  const handleNext = async () => {
    try {
      // 验证当前步骤的字段
      if (currentStep === 0) {
        await form.validateFields(['name', 'description', 'type', 'providerType']);
      } else if (currentStep === 1) {
        await form.validateFields([
          'cpuCores',
          'memoryMB',
          'storageMB',
          'resolution',
          'androidVersion',
        ]);
      }

      // 保存表单数据
      const values = form.getFieldsValue();
      setFormData({ ...formData, ...values });
      setErrorMsg(null);
      setCurrentStep(currentStep + 1);
    } catch (error) {
      // 验证失败
      console.error('Validation failed:', error);
    }
  };

  const handlePrev = () => {
    setErrorMsg(null);
    setCurrentStep(currentStep - 1);
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      setErrorMsg(null);

      // 获取最终的表单数据
      const finalData = form.getFieldsValue();
      const createDto: CreateDeviceDto = { ...formData, ...finalData };

      const res = await createDevice(createDto);

      if (res.data.success) {
        // 轮询 Saga 状态
        const { sagaId, device } = res.data.data;
        await pollCreationStatus(sagaId, device);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || '创建失败');
      setCreating(false);
    }
  };

  const pollCreationStatus = async (sagaId: string, initialDevice: any) => {
    const maxAttempts = 30; // 最多轮询 30 次（30 秒）
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const statusRes = await getDeviceCreationStatus(sagaId);

        if (statusRes.data.status === 'completed') {
          clearInterval(interval);
          setCreating(false);
          onSuccess(statusRes.data.device || initialDevice);
          handleReset();
          onClose();
        } else if (statusRes.data.status === 'failed') {
          clearInterval(interval);
          setCreating(false);
          setErrorMsg(`创建失败: ${statusRes.data.error}`);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setCreating(false);
          setErrorMsg('创建超时，请稍后刷新查看');
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    }, 1000);
  };

  const handleReset = () => {
    form.resetFields();
    setCurrentStep(0);
    setFormData({
      name: '',
      description: '',
      type: 'phone',
      providerType: 'redroid',
      cpuCores: 2,
      memoryMB: 2048,
      storageMB: 32768,
      resolution: '1920x1080',
      dpi: 480,
      androidVersion: '13.0',
    });
    setErrorMsg(null);
  };

  const handleCancel = () => {
    if (!creating) {
      handleReset();
      onClose();
    }
  };

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <Form.Item
              name="name"
              label="设备名称"
              rules={[{ required: true, message: '请输入设备名称' }]}
              initialValue={formData.name}
            >
              <Input placeholder="例如：My Phone 1" />
            </Form.Item>

            <Form.Item
              name="description"
              label="描述"
              initialValue={formData.description}
            >
              <TextArea rows={3} placeholder="可选：设备用途描述" />
            </Form.Item>

            <Form.Item
              name="type"
              label="设备类型"
              initialValue={formData.type}
            >
              <Select>
                <Option value="phone">手机</Option>
                <Option value="tablet">平板</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="providerType"
              label="Provider 类型"
              initialValue={formData.providerType}
            >
              <Select>
                <Option value="redroid">Redroid - 本地 Docker 容器（推荐）</Option>
                <Option value="huawei_cph">华为云 CPH</Option>
                <Option value="alibaba_ecp">阿里云 ECP</Option>
              </Select>
            </Form.Item>
          </>
        );

      case 1:
        return (
          <>
            <Form.Item
              name="cpuCores"
              label={`CPU 核心数: ${form.getFieldValue('cpuCores') || 2} 核`}
              initialValue={formData.cpuCores}
            >
              <Slider
                min={1}
                max={16}
                marks={{
                  1: '1',
                  4: '4',
                  8: '8',
                  16: '16',
                }}
              />
            </Form.Item>

            <Form.Item
              name="memoryMB"
              label={`内存大小: ${((form.getFieldValue('memoryMB') || 2048) / 1024).toFixed(1)} GB`}
              initialValue={formData.memoryMB}
            >
              <Slider
                min={512}
                max={32768}
                step={512}
                marks={{
                  512: '0.5GB',
                  2048: '2GB',
                  4096: '4GB',
                  8192: '8GB',
                }}
              />
            </Form.Item>

            <Form.Item
              name="storageMB"
              label={`存储大小: ${((form.getFieldValue('storageMB') || 32768) / 1024).toFixed(0)} GB`}
              initialValue={formData.storageMB}
            >
              <Slider
                min={1024}
                max={102400}
                step={1024}
                marks={{
                  1024: '1GB',
                  32768: '32GB',
                  102400: '100GB',
                }}
              />
            </Form.Item>

            <Form.Item
              name="resolution"
              label="屏幕分辨率"
              initialValue={formData.resolution}
            >
              <Select>
                <Option value="1920x1080">1920x1080 (FHD)</Option>
                <Option value="1280x720">1280x720 (HD)</Option>
                <Option value="2560x1440">2560x1440 (2K)</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="androidVersion"
              label="Android 版本"
              initialValue={formData.androidVersion}
            >
              <Select>
                <Option value="11.0">Android 11</Option>
                <Option value="12.0">Android 12</Option>
                <Option value="13.0">Android 13</Option>
              </Select>
            </Form.Item>
          </>
        );

      case 2:
        const finalData = { ...formData, ...form.getFieldsValue() };
        return (
          <div>
            <Alert
              message="请确认配置信息，创建后将自动扣减配额"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Text strong>设备名称：</Text>
                <Text>{finalData.name}</Text>
              </div>
              <div>
                <Text strong>Provider：</Text>
                <Text>{finalData.providerType || 'redroid'}</Text>
              </div>
              <div>
                <Text strong>配置：</Text>
                <Text>
                  {finalData.cpuCores || 2} 核 CPU,{' '}
                  {((finalData.memoryMB || 2048) / 1024).toFixed(1)}GB 内存,{' '}
                  {((finalData.storageMB || 32768) / 1024).toFixed(0)}GB 存储
                </Text>
              </div>
              <div>
                <Text strong>屏幕：</Text>
                <Text>
                  {finalData.resolution || '1920x1080'}, DPI {finalData.dpi || 480}
                </Text>
              </div>
              <div>
                <Text strong>Android 版本：</Text>
                <Text>{finalData.androidVersion || '13.0'}</Text>
              </div>
            </Space>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title="创建云手机"
      open={open}
      onCancel={handleCancel}
      width={700}
      closable={!creating}
      maskClosable={!creating}
      footer={null}
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map((step) => (
          <Step key={step.title} title={step.title} />
        ))}
      </Steps>

      {errorMsg && (
        <Alert
          message={errorMsg}
          type="error"
          showIcon
          closable
          onClose={() => setErrorMsg(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {creating ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Space direction="vertical">
            <div className="spinner" />
            <Text>正在创建设备，请稍候...</Text>
          </Space>
        </div>
      ) : (
        <Form form={form} layout="vertical">
          {renderStepContent()}
        </Form>
      )}

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button onClick={handleCancel} disabled={creating}>
            取消
          </Button>
          {currentStep > 0 && (
            <Button onClick={handlePrev} disabled={creating}>
              上一步
            </Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button type="primary" onClick={handleNext}>
              下一步
            </Button>
          )}
          {currentStep === steps.length - 1 && (
            <Button type="primary" onClick={handleCreate} loading={creating}>
              确认创建
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  );
};
