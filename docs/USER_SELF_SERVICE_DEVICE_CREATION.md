# 用户自助创建云手机完整方案

## 📋 问题诊断

### 现状分析

经过深入代码检查，发现以下情况：

**✅ Backend API 完整（已实现）**
- `POST /devices` - 设备创建接口完整
- 包含 `@RequirePermission('device.create')` 权限检查
- 包含 `@QuotaGuard` 配额检查
- 使用 Saga 模式确保创建原子性
- 支持多 Provider（Redroid、华为云、阿里云）

**✅ 模板系统完整（已实现）**
- `POST /templates/:id/create-device` - 从模板创建
- `POST /templates/:id/batch-create` - 批量创建
- 热门模板、搜索功能完整

**✅ 配额系统完整（已实现）**
- `GET /quotas/user/:userId` - 查询用户配额
- `POST /quotas/check` - 检查配额是否充足
- `POST /quotas/deduct` - 扣减配额（创建时）
- `POST /quotas/restore` - 恢复配额（删除时）

**✅ 计费套餐完整（已实现）**
- 免费版：1 设备、2核2GB、10GB存储
- 基础版：5 设备、4核4GB、50GB存储（¥99/月）
- 专业版：20 设备、8核8GB、200GB存储（¥299/月）
- 企业版：100 设备、32核32GB、1TB存储（¥999/月）

**⚠️ Admin 前端部分完整**
- `frontend/admin/src/services/device.ts` - 有 `createDevice()` 函数
- `frontend/admin/src/pages/Devices/DeviceListPage.tsx` - 有创建按钮，但只显示 "开发中" 提示

**❌ User 前端缺失（关键问题）**
- `frontend/user/src/pages/MyDevices.tsx` - **无创建按钮**
- `frontend/user/src/services/device.ts` - **无 createDevice 函数**
- 用户无法自助创建设备，这是 SaaS 平台的核心功能缺失

---

## 🎯 解决方案设计

### 方案 A：简化快速创建（推荐用于 MVP）

**特点**：
- 一键创建，使用预设模板
- 适合快速上线 SaaS
- 用户体验最简单

**流程**：
```
用户点击 "创建云手机"
    ↓
选择套餐模板（游戏、办公、测试等）
    ↓
填写设备名称（可选）
    ↓
系统自动配置参数（CPU、内存、分辨率）
    ↓
检查配额 → 创建设备
```

**优点**：
- 开发量小（1-2 天）
- 用户操作简单（3 步完成）
- 适合 80% 的普通用户

**缺点**：
- 配置不够灵活
- 高级用户可能需要更多自定义

---

### 方案 B：向导式创建（推荐用于完整版）

**特点**：
- 分步引导，逐步配置
- 平衡易用性和灵活性
- 适合正式 SaaS 产品

**流程**：
```
Step 1: 选择 Provider 类型
   ├── Redroid（本地容器）
   ├── 华为云 CPH（需要配置云厂商）
   └── 阿里云 ECP（需要配置云厂商）

Step 2: 配置基础信息
   ├── 设备名称
   ├── 描述
   └── 设备类型（手机/平板）

Step 3: 配置硬件规格
   ├── CPU 核心数（根据套餐限制）
   ├── 内存大小（根据套餐限制）
   ├── 存储大小（根据套餐限制）
   ├── 屏幕分辨率（1920x1080, 1280x720 等）
   └── 屏幕 DPI（480, 320, 240）

Step 4: 配置系统参数
   ├── Android 版本（11.0, 12.0, 13.0）
   ├── 是否启用 GPU（专业版+）
   └── 标签（可选）

Step 5: 确认配置
   ├── 显示配置摘要
   ├── 显示预计费用（按小时/天/月）
   └── 检查配额余量

Step 6: 创建中
   ├── 显示 Saga 创建进度
   └── 完成后跳转到设备详情
```

**优点**：
- 配置灵活，满足高级用户需求
- 引导清晰，新手也能完成
- 符合 SaaS 产品标准

**缺点**：
- 开发量中等（3-5 天）
- 步骤较多（6 步）

---

### 方案 C：从模板创建（最快实现）

**特点**：
- 利用现有模板系统
- Backend API 已完整
- 开发量最小

**流程**：
```
用户进入 "我的设备"
    ↓
点击 "创建云手机" → 弹出模板选择对话框
    ↓
显示热门模板列表：
   ├── 🎮 高性能游戏（8核8GB）
   ├── 💼 办公轻量版（2核2GB）
   ├── 🧪 测试开发版（4核4GB）
   └── 📱 社交多开版（4核4GB）
    ↓
点击模板，填写设备名称
    ↓
调用 POST /templates/:id/create-device
    ↓
创建成功，显示在设备列表
```

**优点**：
- 开发量极小（1 天）
- Backend API 已完整
- 用户体验良好

**缺点**：
- 依赖模板预设
- 无法自定义硬件配置

---

## 🏗️ 技术实现方案（推荐方案 B）

### 1. Frontend User Portal 新增组件

#### 1.1 创建设备 API 函数
**文件**: `frontend/user/src/services/device.ts`

```typescript
// 添加以下函数
import type { CreateDeviceDto } from '@/types';

/**
 * 创建设备
 */
export const createDevice = (data: CreateDeviceDto) => {
  return request.post<{
    success: boolean;
    data: {
      sagaId: string;
      device: Device;
    };
    message: string;
  }>('/devices', data);
};

/**
 * 获取创建进度（Saga 状态查询）
 */
export const getDeviceCreationStatus = (sagaId: string) => {
  return request.get<{
    sagaId: string;
    status: 'pending' | 'completed' | 'failed';
    currentStep: string;
    device?: Device;
    error?: string;
  }>(`/devices/saga/${sagaId}`);
};
```

---

#### 1.2 创建设备向导组件
**文件**: `frontend/user/src/components/CreateDeviceWizard.tsx`

```typescript
import React, { useState } from 'react';
import {
  Modal,
  Steps,
  Form,
  Input,
  Select,
  Slider,
  Radio,
  Button,
  Space,
  Card,
  Alert,
  Spin,
  message,
} from 'antd';
import {
  CloudOutlined,
  DesktopOutlined,
  ApiOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { createDevice, getDeviceCreationStatus } from '@/services/device';
import { getUserQuota } from '@/services/quota';
import type { CreateDeviceDto } from '@/types';

interface CreateDeviceWizardProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (device: Device) => void;
}

const { Step } = Steps;

export const CreateDeviceWizard: React.FC<CreateDeviceWizardProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [quota, setQuota] = useState<any>(null);

  // 加载用户配额
  useEffect(() => {
    if (visible) {
      loadUserQuota();
    }
  }, [visible]);

  const loadUserQuota = async () => {
    try {
      const userId = localStorage.getItem('userId'); // 从 localStorage 或 Context 获取
      const res = await getUserQuota(userId);
      setQuota(res.data);
    } catch (error) {
      message.error('获取配额信息失败');
    }
  };

  const steps = [
    {
      title: 'Provider',
      icon: <CloudOutlined />,
    },
    {
      title: '基础信息',
      icon: <DesktopOutlined />,
    },
    {
      title: '硬件配置',
      icon: <ApiOutlined />,
    },
    {
      title: '确认创建',
      icon: <CheckCircleOutlined />,
    },
  ];

  const handleNext = async () => {
    try {
      await form.validateFields();
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const values = form.getFieldsValue();

      const createDto: CreateDeviceDto = {
        name: values.name,
        description: values.description,
        type: values.type || 'phone',
        providerType: values.providerType || 'redroid',
        cpuCores: values.cpuCores,
        memoryMB: values.memoryMB,
        storageMB: values.storageMB,
        resolution: values.resolution,
        dpi: values.dpi,
        androidVersion: values.androidVersion,
        tags: values.tags || [],
      };

      const res = await createDevice(createDto);

      if (res.success) {
        message.success('设备创建已启动，请稍候...');

        // 轮询 Saga 状态
        const { sagaId, device } = res.data;
        pollCreationStatus(sagaId, device);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建失败');
      setCreating(false);
    }
  };

  const pollCreationStatus = async (sagaId: string, initialDevice: Device) => {
    const maxAttempts = 30; // 最多轮询 30 次（30 秒）
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const statusRes = await getDeviceCreationStatus(sagaId);

        if (statusRes.status === 'completed') {
          clearInterval(interval);
          setCreating(false);
          message.success('设备创建成功！');
          onSuccess(statusRes.device || initialDevice);
          onClose();
          form.resetFields();
          setCurrentStep(0);
        } else if (statusRes.status === 'failed') {
          clearInterval(interval);
          setCreating(false);
          message.error(`创建失败: ${statusRes.error}`);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setCreating(false);
          message.warning('创建超时，请稍后刷新查看');
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    }, 1000);
  };

  // 各步骤的表单渲染
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form.Item
            name="providerType"
            label="Provider 类型"
            rules={[{ required: true, message: '请选择 Provider' }]}
          >
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="redroid">
                  <strong>Redroid</strong> - 本地 Docker 容器（推荐）
                </Radio>
                <Radio value="huawei_cph">
                  <strong>华为云 CPH</strong> - 华为云手机服务
                </Radio>
                <Radio value="alibaba_ecp">
                  <strong>阿里云 ECP</strong> - 阿里云手机服务
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        );

      case 1:
        return (
          <>
            <Form.Item
              name="name"
              label="设备名称"
              rules={[
                { required: true, message: '请输入设备名称' },
                { max: 100, message: '最多 100 字符' },
              ]}
            >
              <Input placeholder="例如：My Phone 1" />
            </Form.Item>

            <Form.Item name="description" label="描述">
              <Input.TextArea
                rows={3}
                placeholder="可选：设备用途描述"
                maxLength={500}
              />
            </Form.Item>

            <Form.Item name="type" label="设备类型" initialValue="phone">
              <Select>
                <Select.Option value="phone">手机</Select.Option>
                <Select.Option value="tablet">平板</Select.Option>
              </Select>
            </Form.Item>
          </>
        );

      case 2:
        return (
          <>
            {quota && (
              <Alert
                message={`当前配额：${quota.usedDevices}/${quota.maxDevices} 设备，CPU ${quota.usedCpuCores}/${quota.maxCpuCores} 核`}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Form.Item
              name="cpuCores"
              label="CPU 核心数"
              initialValue={2}
              rules={[
                { required: true, message: '请选择 CPU 核心数' },
                {
                  validator: (_, value) => {
                    if (quota && value > quota.maxCpuCores - quota.usedCpuCores) {
                      return Promise.reject(`配额不足，剩余可用: ${quota.maxCpuCores - quota.usedCpuCores} 核`);
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Slider min={1} max={16} marks={{ 1: '1', 4: '4', 8: '8', 16: '16' }} />
            </Form.Item>

            <Form.Item
              name="memoryMB"
              label="内存大小（MB）"
              initialValue={2048}
              rules={[{ required: true, message: '请选择内存大小' }]}
            >
              <Slider
                min={512}
                max={32768}
                step={512}
                marks={{
                  512: '512MB',
                  2048: '2GB',
                  4096: '4GB',
                  8192: '8GB',
                  32768: '32GB',
                }}
              />
            </Form.Item>

            <Form.Item
              name="storageMB"
              label="存储大小（MB）"
              initialValue={32768}
              rules={[{ required: true, message: '请选择存储大小' }]}
            >
              <Slider
                min={1024}
                max={1048576}
                step={1024}
                marks={{
                  1024: '1GB',
                  32768: '32GB',
                  102400: '100GB',
                  1048576: '1TB',
                }}
              />
            </Form.Item>

            <Form.Item name="resolution" label="屏幕分辨率" initialValue="1920x1080">
              <Select>
                <Select.Option value="1920x1080">1920x1080 (FHD)</Select.Option>
                <Select.Option value="1280x720">1280x720 (HD)</Select.Option>
                <Select.Option value="2560x1440">2560x1440 (2K)</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="dpi" label="屏幕 DPI" initialValue={480}>
              <Select>
                <Select.Option value={240}>240 (Low)</Select.Option>
                <Select.Option value={320}>320 (Medium)</Select.Option>
                <Select.Option value={480}>480 (High)</Select.Option>
                <Select.Option value={640}>640 (Extra High)</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="androidVersion" label="Android 版本" initialValue="13.0">
              <Select>
                <Select.Option value="11.0">Android 11</Select.Option>
                <Select.Option value="12.0">Android 12</Select.Option>
                <Select.Option value="13.0">Android 13</Select.Option>
              </Select>
            </Form.Item>
          </>
        );

      case 3:
        const values = form.getFieldsValue();
        return (
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <strong>设备名称：</strong> {values.name}
              </div>
              <div>
                <strong>Provider：</strong> {values.providerType || 'redroid'}
              </div>
              <div>
                <strong>配置：</strong> {values.cpuCores || 2} 核 CPU, {(values.memoryMB || 2048) / 1024}GB 内存,{' '}
                {(values.storageMB || 32768) / 1024}GB 存储
              </div>
              <div>
                <strong>屏幕：</strong> {values.resolution || '1920x1080'}, DPI {values.dpi || 480}
              </div>
              <div>
                <strong>Android 版本：</strong> {values.androidVersion || '13.0'}
              </div>
              <Alert
                message="创建后将自动扣减配额，请确认配置信息"
                type="warning"
                showIcon
              />
            </Space>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title="创建云手机"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <Spin spinning={creating} tip="正在创建设备，请稍候...">
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map((item) => (
            <Step key={item.title} title={item.title} icon={item.icon} />
          ))}
        </Steps>

        <Form form={form} layout="vertical">
          {renderStepContent()}
        </Form>

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>上一步</Button>
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
      </Spin>
    </Modal>
  );
};
```

---

#### 1.3 修改 MyDevices 页面添加创建按钮
**文件**: `frontend/user/src/pages/MyDevices.tsx`

```typescript
import { CreateDeviceWizard } from '@/components/CreateDeviceWizard';

const MyDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [createVisible, setCreateVisible] = useState(false);

  // 在返回的 JSX 中添加创建按钮
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>我的设备</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateVisible(true)}
        >
          创建云手机
        </Button>
      </div>

      {/* 设备列表 */}
      <Card>
        <Table columns={columns} dataSource={devices} />
      </Card>

      {/* 创建设备向导 */}
      <CreateDeviceWizard
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSuccess={(device) => {
          setDevices([device, ...devices]);
        }}
      />
    </div>
  );
};
```

---

### 2. Backend 修改（验证权限配置）

#### 2.1 确保普通用户有 device.create 权限

**文件**: `backend/user-service/src/seeds/permissions.seed.ts`

确保默认角色（user）包含 `device.create` 权限：

```typescript
// 普通用户角色权限
{
  roleName: 'user',
  permissions: [
    'device.read',
    'device.create',    // ✅ 确保包含此权限
    'device.update',
    'device.delete',
    'device.control',
    'device.list',
    'device.start',
    'device.stop',
    'device.reboot',
    // ...
  ],
}
```

#### 2.2 验证配额守卫正常工作

**文件**: `backend/device-service/src/quota/quota.guard.ts`

确保 QuotaGuard 正确从 JWT 中提取 userId：

```typescript
@Injectable()
export class QuotaGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // ✅ 确保从 JWT 正确提取 userId
    const userId = user?.userId || user?.sub;

    if (!userId) {
      throw new UnauthorizedException('用户未认证');
    }

    // 检查配额
    const quotaCheck = await this.checkUserQuota(userId);

    if (!quotaCheck.allowed) {
      throw new ForbiddenException(`配额不足: ${quotaCheck.reason}`);
    }

    return true;
  }
}
```

---

### 3. API Gateway 路由确认

**文件**: `backend/api-gateway/src/proxy/proxy.controller.ts`

确保 `/devices` 路由正确代理到 device-service：

```typescript
// ✅ 设备路由（已存在，无需修改）
@UseGuards(JwtAuthGuard)
@All('devices')
async proxyDevicesExact(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy('devices', req, res);
}

@UseGuards(JwtAuthGuard)
@All('devices/*path')
async proxyDevices(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy('devices', req, res);
}
```

---

## 🧪 测试计划

### 1. Backend API 测试

```bash
# 1. 获取 JWT Token（普通用户）
TOKEN=$(curl -X POST http://localhost:30000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password"}' \
  | jq -r '.access_token')

# 2. 检查配额
curl -X GET "http://localhost:30000/quotas/user/USER_ID" \
  -H "Authorization: Bearer $TOKEN"

# 3. 创建设备
curl -X POST http://localhost:30000/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Phone 1",
    "description": "测试设备",
    "type": "phone",
    "providerType": "redroid",
    "cpuCores": 2,
    "memoryMB": 2048,
    "storageMB": 32768,
    "resolution": "1920x1080",
    "dpi": 480,
    "androidVersion": "13.0"
  }'

# 4. 查询 Saga 状态
curl -X GET "http://localhost:30000/devices/saga/SAGA_ID" \
  -H "Authorization: Bearer $TOKEN"

# 5. 查询用户设备列表
curl -X GET "http://localhost:30000/devices?userId=USER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Frontend E2E 测试

1. 用户登录 User Portal
2. 进入 "我的设备" 页面
3. 点击 "创建云手机" 按钮
4. 完成向导步骤：
   - Step 1：选择 Provider（Redroid）
   - Step 2：填写设备名称
   - Step 3：配置硬件（2核2GB）
   - Step 4：确认并创建
5. 等待创建完成（约 10-30 秒）
6. 验证设备出现在列表中
7. 验证配额已扣减

### 3. 配额限制测试

1. 创建设备直到达到配额上限
2. 验证再次创建时：
   - 前端显示配额不足提示
   - Backend 返回 403 Forbidden
3. 删除一个设备
4. 验证配额恢复
5. 验证可以再次创建

---

## 📅 实施计划

### Phase 1: Backend 验证（0.5 天）
- ✅ 验证权限配置（device.create 权限）
- ✅ 测试 API `/devices` 创建流程
- ✅ 测试配额检查和扣减

### Phase 2: Frontend 实现（2-3 天）
- Day 1: 实现 CreateDeviceWizard 组件（6-8 小时）
- Day 2: 修改 MyDevices 页面添加创建按钮（2 小时）
- Day 2: 添加 createDevice API 函数（1 小时）
- Day 2: 测试和调试（2-3 小时）

### Phase 3: 测试和优化（1 天）
- 端到端测试
- 配额边界测试
- 性能测试（并发创建）
- UI/UX 优化

### Phase 4: 文档和发布（0.5 天）
- 用户使用文档
- API 文档更新
- 发布到生产环境

**总计：4-5 天完成**

---

## 🎁 额外优化建议

### 1. 预估费用计算

在 Step 3（硬件配置）实时显示预计费用：

```typescript
const calculateEstimatedCost = (cpuCores, memoryMB, storageMB) => {
  // 按小时计费
  const cpuCost = cpuCores * 0.05;  // ¥0.05/核/小时
  const memoryCost = (memoryMB / 1024) * 0.02;  // ¥0.02/GB/小时
  const storageCost = (storageMB / 1024) * 0.01;  // ¥0.01/GB/小时

  const hourly = cpuCost + memoryCost + storageCost;
  const daily = hourly * 24;
  const monthly = daily * 30;

  return {
    hourly: hourly.toFixed(2),
    daily: daily.toFixed(2),
    monthly: monthly.toFixed(2),
  };
};
```

### 2. 模板快速创建

在 MyDevices 页面添加 "快速创建" 区域，展示热门模板：

```typescript
<div style={{ marginBottom: 16 }}>
  <h3>快速创建</h3>
  <Space>
    <Card
      hoverable
      style={{ width: 200 }}
      onClick={() => createFromTemplate('gaming-template')}
    >
      <Card.Meta
        avatar={<TrophyOutlined style={{ fontSize: 32, color: '#fa8c16' }} />}
        title="高性能游戏"
        description="8核8GB，适合运行大型游戏"
      />
    </Card>
    <Card
      hoverable
      style={{ width: 200 }}
      onClick={() => createFromTemplate('office-template')}
    >
      <Card.Meta
        avatar={<LaptopOutlined style={{ fontSize: 32, color: '#1890ff' }} />}
        title="办公轻量版"
        description="2核2GB，适合日常办公"
      />
    </Card>
    <Card
      hoverable
      style={{ width: 200 }}
      onClick={() => createFromTemplate('test-template')}
    >
      <Card.Meta
        avatar={<ExperimentOutlined style={{ fontSize: 32, color: '#52c41a' }} />}
        title="测试开发版"
        description="4核4GB，适合应用测试"
      />
    </Card>
  </Space>
</div>
```

### 3. 创建历史记录

在用户个人中心添加 "创建历史" 页面，记录所有设备创建操作：

```typescript
interface DeviceCreationHistory {
  id: string;
  deviceName: string;
  createdAt: Date;
  status: 'success' | 'failed';
  configuration: CreateDeviceDto;
  errorMessage?: string;
}
```

### 4. 套餐升级引导

当用户配额不足时，引导升级套餐：

```typescript
if (quotaInsufficient) {
  Modal.confirm({
    title: '配额不足',
    content: '您当前配额已用完，是否升级套餐以获得更多资源？',
    okText: '查看套餐',
    onOk: () => {
      navigate('/billing/plans');
    },
  });
}
```

---

## 📊 预期效果

实施后，用户将能够：

1. ✅ 自助创建云手机（SaaS 核心功能）
2. ✅ 实时查看配额使用情况
3. ✅ 根据需求灵活配置硬件
4. ✅ 选择不同 Provider（Redroid/华为/阿里）
5. ✅ 查看预估费用
6. ✅ 通过模板快速创建

**SaaS 平台成熟度提升**：
- 从 85/100 → **95/100**
- 自助服务能力：50% → **100%**

---

## 🔗 相关文档

- Backend API 文档：`/docs/API.md`
- 配额系统文档：`/backend/user-service/src/quotas/README.md`
- 设备模板文档：`/backend/device-service/src/templates/README.md`
- 计费系统文档：`/backend/billing-service/README.md`

---

**设计完成时间**：2025-01-XX
**预计实施时间**：4-5 天
**优先级**：P0（SaaS 核心功能）
