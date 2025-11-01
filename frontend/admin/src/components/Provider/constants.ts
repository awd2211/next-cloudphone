import { DeviceProvider } from '@/types/provider';

/**
 * Provider 配置页面常量
 */

// 默认表单值
export const DEFAULT_FORM_VALUES = {
  [DeviceProvider.DOCKER]: {
    dockerHost: '/var/run/docker.sock',
    enableGPU: false,
    maxDevices: 100,
  },
  [DeviceProvider.PHYSICAL]: {
    enableMDNS: true,
    adbPort: 5555,
    scrcpyPort: 27183,
    maxBitrate: 8000000,
  },
};

// 表单字段配置
export const FORM_FIELDS = {
  docker: {
    dockerHost: {
      label: 'Docker 主机',
      placeholder: '/var/run/docker.sock 或 tcp://host:2375',
      tooltip: 'Docker socket 路径或 TCP 地址',
      required: true,
    },
    maxDevices: {
      label: '最大设备数',
      min: 1,
      max: 1000,
      required: true,
    },
    imageRegistry: {
      label: '镜像仓库',
      placeholder: 'registry.example.com',
    },
  },
  huawei: {
    projectId: {
      label: 'Project ID',
      placeholder: '输入华为云 Project ID',
      tooltip: '华为云项目 ID',
      required: true,
    },
    accessKeyId: {
      label: 'Access Key ID',
      placeholder: 'AK****************',
      required: true,
    },
    secretAccessKey: {
      label: 'Secret Access Key',
      placeholder: 'SK****************',
      required: true,
    },
    region: {
      label: '区域',
      placeholder: 'cn-north-4',
      required: true,
    },
    endpoint: {
      label: 'Endpoint',
      placeholder: 'https://cph.cn-north-4.myhuaweicloud.com',
    },
    syncInterval: {
      label: '同步间隔 (分钟)',
      min: 1,
      max: 60,
    },
  },
  aliyun: {
    accessKeyId: {
      label: 'Access Key ID',
      placeholder: 'LTAI****************',
      required: true,
    },
    accessKeySecret: {
      label: 'Access Key Secret',
      placeholder: '输入 Access Key Secret',
      required: true,
    },
    region: {
      label: '区域',
      placeholder: 'cn-hangzhou',
      required: true,
    },
    endpoint: {
      label: 'Endpoint',
      placeholder: 'ecp.cn-hangzhou.aliyuncs.com',
    },
    defaultInstanceType: {
      label: '默认实例类型',
      placeholder: 'ecp.ce.large',
    },
    syncInterval: {
      label: '同步间隔 (分钟)',
      min: 1,
      max: 60,
    },
  },
  physical: {
    scanSubnet: {
      label: '扫描子网',
      placeholder: '192.168.1.0/24',
    },
    adbPort: {
      label: 'ADB 端口',
      defaultValue: 5555,
      min: 1,
      max: 65535,
    },
    scrcpyPort: {
      label: 'Scrcpy 端口',
      defaultValue: 27183,
      min: 1,
      max: 65535,
    },
    maxBitrate: {
      label: '最大码率 (bps)',
      defaultValue: 8000000,
      min: 1000000,
      max: 50000000,
      step: 1000000,
    },
  },
};

// Alert 消息配置
export const ALERT_MESSAGES = {
  [DeviceProvider.DOCKER]: {
    message: '本地 Redroid 配置',
    description: '配置本地 Docker 环境的 Redroid 容器',
  },
  [DeviceProvider.HUAWEI]: {
    message: '华为云 CPH 配置',
    description: '配置华为云手机服务 API 凭证和参数',
  },
  [DeviceProvider.ALIYUN]: {
    message: '阿里云 ECP 配置',
    description: '配置阿里云弹性云手机服务 API 凭证和参数',
  },
  [DeviceProvider.PHYSICAL]: {
    message: '物理设备配置',
    description: '配置物理 Android 设备连接参数',
  },
};
