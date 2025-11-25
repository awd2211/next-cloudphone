import { useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Space,
  message,
  Divider,
  Alert,
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/utils/request';

const { Option } = Select;
const { TextArea } = Input;

// 云手机提供商类型配置（物理设备在设备中心单独管理）
const PROVIDER_TYPES = [
  { value: 'redroid', label: 'Redroid (Docker容器)' },
  { value: 'huawei_cph', label: '华为云手机' },
  { value: 'aliyun_ecp', label: '阿里云手机' },
];

// 不同云手机提供商的配置字段
const PROVIDER_CONFIG_FIELDS: Record<string, any> = {
  redroid: [
    { name: 'dockerHost', label: 'Docker Host', placeholder: 'unix:///var/run/docker.sock', required: true },
    { name: 'imageRegistry', label: '镜像仓库', placeholder: 'registry.hub.docker.com' },
    { name: 'defaultImage', label: '默认镜像', placeholder: 'redroid/redroid:latest' },
    { name: 'adbPortStart', label: 'ADB 起始端口', type: 'number', placeholder: '5555' },
    { name: 'adbPortEnd', label: 'ADB 结束端口', type: 'number', placeholder: '5655' },
  ],
  huawei_cph: [
    { name: 'region', label: '区域', placeholder: 'cn-north-4', required: true },
    { name: 'accessKeyId', label: 'Access Key ID', required: true, password: true },
    { name: 'accessKeySecret', label: 'Access Key Secret', required: true, password: true },
    { name: 'apiEndpoint', label: 'API Endpoint', placeholder: 'https://cph.myhuaweicloud.com' },
    { name: 'projectId', label: 'Project ID' },
    { name: 'serverId', label: 'Server ID' },
    { name: 'imageId', label: 'Image ID' },
  ],
  aliyun_ecp: [
    { name: 'region', label: '区域', placeholder: 'cn-hangzhou', required: true },
    { name: 'accessKeyId', label: 'Access Key ID', required: true, password: true },
    { name: 'accessKeySecret', label: 'Access Key Secret', required: true, password: true },
    { name: 'apiEndpoint', label: 'API Endpoint', placeholder: 'https://ecp.aliyuncs.com' },
    { name: 'officeSiteId', label: 'Office Site ID', placeholder: 'os-xxxxx' },
    { name: 'vSwitchId', label: 'VSwitch ID', placeholder: 'vsw-xxxxx' },
    { name: 'keyPairId', label: 'Key Pair ID', placeholder: 'kp-xxxxx' },
    { name: 'imageId', label: 'Image ID', placeholder: 'img-xxxxx' },
  ],
};

export default function ProviderConfigForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const providerType = Form.useWatch('providerType', form);

  // 获取配置详情（编辑模式）
  const { data: configData, isLoading } = useQuery({
    queryKey: ['providerConfig', id],
    queryFn: async () => {
      const { data } = await axios.get(`/admin/providers/configs/${id}`);
      return data.data;
    },
    enabled: isEdit,
  });

  // 创建/更新配置
  const mutation = useMutation({
    mutationFn: async (values: any) => {
      if (isEdit) {
        await axios.put(`/admin/providers/configs/${id}`, values);
      } else {
        await axios.post('/admin/providers/configs', values);
      }
    },
    onSuccess: () => {
      message.success(isEdit ? '配置更新成功' : '配置创建成功');
      queryClient.invalidateQueries({ queryKey: ['providerConfigs'] });
      navigate('/provider-configs');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '操作失败');
    },
  });

  // 填充表单（编辑模式）
  useEffect(() => {
    if (configData) {
      form.setFieldsValue({
        name: configData.name,
        providerType: configData.providerType,
        tenantId: configData.tenantId,
        enabled: configData.enabled,
        priority: configData.priority,
        maxDevices: configData.maxDevices,
        description: configData.description,
        isDefault: configData.isDefault,
        ...configData.config,
      });
    }
  }, [configData, form]);

  const onFinish = (values: any) => {
    // 提取提供商特定配置
    const configFields = PROVIDER_CONFIG_FIELDS[values.providerType] || [];
    const config: Record<string, any> = {};
    configFields.forEach((field: any) => {
      if (values[field.name] !== undefined) {
        config[field.name] = values[field.name];
      }
    });

    const payload = {
      name: values.name,
      providerType: values.providerType,
      tenantId: values.tenantId || undefined,
      enabled: values.enabled ?? true,
      priority: values.priority ?? 1,
      maxDevices: values.maxDevices ?? 100,
      description: values.description || undefined,
      isDefault: values.isDefault ?? false,
      config,
    };

    mutation.mutate(payload);
  };

  return (
    <Card
      title={isEdit ? '编辑提供商配置' : '新建提供商配置'}
      loading={isLoading}
      extra={
        <Button onClick={() => navigate('/provider-configs')}>返回</Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          enabled: true,
          priority: 1,
          maxDevices: 100,
          isDefault: false,
        }}
      >
        <Alert
          message="配置说明"
          description="每个提供商类型可以有多个配置（支持多账号）。标记为默认的配置将在创建设备时自动使用。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Divider>基本信息</Divider>

        <Form.Item
          label="配置名称"
          name="name"
          rules={[{ required: true, message: '请输入配置名称' }]}
        >
          <Input placeholder="例如：阿里云-主账号" />
        </Form.Item>

        <Form.Item
          label="提供商类型"
          name="providerType"
          rules={[{ required: true, message: '请选择提供商类型' }]}
        >
          <Select
            placeholder="请选择提供商类型"
            disabled={isEdit}
            onChange={() => {
              // 清空提供商特定配置
              const currentValues = form.getFieldsValue();
              const keysToKeep = ['name', 'providerType', 'tenantId', 'enabled', 'priority', 'maxDevices', 'description', 'isDefault'];
              const newValues: any = {};
              keysToKeep.forEach(key => {
                newValues[key] = currentValues[key];
              });
              form.setFieldsValue(newValues);
            }}
          >
            {PROVIDER_TYPES.map((type) => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="租户 ID" name="tenantId">
          <Input placeholder="留空为全局配置" />
        </Form.Item>

        <Form.Item label="描述" name="description">
          <TextArea rows={3} placeholder="可选的配置描述" />
        </Form.Item>

        <Space size="large">
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="设为默认" name="isDefault" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>

        <Form.Item
          label="优先级"
          name="priority"
          tooltip="数字越小优先级越高"
          rules={[{ required: true, message: '请输入优先级' }]}
        >
          <InputNumber min={0} max={100} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="最大设备数"
          name="maxDevices"
          rules={[{ required: true, message: '请输入最大设备数' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        {/* 提供商特定配置 */}
        {providerType && (
          <>
            <Divider>提供商配置 - {PROVIDER_TYPES.find(t => t.value === providerType)?.label}</Divider>
            {PROVIDER_CONFIG_FIELDS[providerType]?.map((field: any) => (
              <Form.Item
                key={field.name}
                label={field.label}
                name={field.name}
                rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
              >
                {field.type === 'number' ? (
                  <InputNumber style={{ width: '100%' }} placeholder={field.placeholder} />
                ) : field.type === 'boolean' ? (
                  <Switch />
                ) : field.password ? (
                  <Input.Password placeholder={field.placeholder} />
                ) : (
                  <Input placeholder={field.placeholder} />
                )}
              </Form.Item>
            ))}
          </>
        )}

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={mutation.isPending}>
              {isEdit ? '更新配置' : '创建配置'}
            </Button>
            <Button onClick={() => navigate('/provider-configs')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
