import {
  AppstoreOutlined,
  MobileOutlined,
  CopyOutlined,
  StarFilled,
  StarOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Space, Tag, Button, Tooltip, Popconfirm, Typography } from 'antd';

const { Text } = Typography;
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

/**
 * 设备模板配置文件
 *
 * 优化点:
 * 1. ✅ 集中管理所有配置选项（Android、CPU、内存、存储、分辨率、DPI）
 * 2. ✅ 统计图标配置
 * 3. ✅ 工具函数提取（格式化、计算）
 * 4. ✅ 表格列定义工厂函数
 */

// ===== 类型定义 =====
export interface DeviceTemplate {
  id: string;
  name: string;
  description?: string;
  androidVersion: string;
  cpuCores: number;
  memoryMB: number;
  diskGB: number;
  resolution: string;
  dpi: number;
  isSystem: boolean;
  isFavorite: boolean;
  usageCount: number;
  createdAt: string;
  createdBy?: string;
}

export interface TemplateStats {
  total: number;
  system: number;
  custom: number;
  favorite: number;
}

// ===== 配置选项 =====

/**
 * Android 版本选项
 */
export const androidVersionOptions = [
  { label: 'Android 10.0', value: '10.0' },
  { label: 'Android 11.0', value: '11.0' },
  { label: 'Android 12.0', value: '12.0' },
  { label: 'Android 13.0', value: '13.0' },
  { label: 'Android 14.0', value: '14.0' },
];

/**
 * CPU 核心数选项
 */
export const cpuCoresOptions = [
  { label: '1核', value: 1 },
  { label: '2核', value: 2 },
  { label: '3核', value: 3 },
  { label: '4核', value: 4 },
  { label: '6核', value: 6 },
  { label: '8核', value: 8 },
];

/**
 * 内存配置
 */
export const memoryConfig = {
  min: 1024,
  max: 16384,
  step: 1024,
};

/**
 * 存储空间配置
 */
export const diskConfig = {
  min: 8,
  max: 128,
  step: 8,
};

/**
 * 屏幕分辨率选项
 */
export const resolutionOptions = [
  { label: '720x1280 (HD)', value: '720x1280' },
  { label: '1080x1920 (FHD)', value: '1080x1920' },
  { label: '1080x2340 (FHD+)', value: '1080x2340' },
  { label: '1440x2560 (2K)', value: '1440x2560' },
  { label: '1440x3040 (2K+)', value: '1440x3040' },
];

/**
 * 屏幕DPI选项
 */
export const dpiOptions = [
  { label: '320 (XHDPI)', value: 320 },
  { label: '420 (XXHDPI)', value: 420 },
  { label: '480 (XXHDPI)', value: 480 },
  { label: '560 (XXXHDPI)', value: 560 },
];

// ===== 统计配置 =====

/**
 * 统计卡片配置
 */
export const statsCardConfig = [
  {
    key: 'total',
    title: '全部模板',
    icon: <AppstoreOutlined />,
    color: '#1890ff',
  },
  {
    key: 'system',
    title: '系统模板',
    icon: <MobileOutlined />,
    color: '#52c41a',
  },
  {
    key: 'custom',
    title: '自定义模板',
    icon: <CopyOutlined />,
    color: '#722ed1',
  },
  {
    key: 'favorite',
    title: '已收藏',
    icon: <StarFilled />,
    color: '#faad14',
  },
];

// ===== 提示信息配置 =====

export const usageTipConfig = {
  message: '使用提示',
  description: '系统模板由平台提供，无法编辑和删除。您可以创建自定义模板，或从现有设备创建模板。',
  type: 'info' as const,
};

export const createTipConfig = {
  message: '创建提示',
  description: '批量创建设备需要一定时间，请耐心等待。创建完成后可在"我的设备"中查看。',
  type: 'warning' as const,
};

// ===== 工具函数 =====

/**
 * 格式化内存大小（MB 转 GB）
 */
export const formatMemoryMB = (memoryMB: number): string => {
  return `${memoryMB}MB (${(memoryMB / 1024).toFixed(1)}GB)`;
};

/**
 * 格式化配置简要信息
 */
export const formatConfig = (template: DeviceTemplate): string => {
  return `${template.cpuCores}核CPU / ${template.memoryMB}MB内存 / ${template.diskGB}GB存储`;
};

/**
 * 计算统计数据
 */
export const calculateStats = (templates: DeviceTemplate[]): TemplateStats => {
  return {
    total: templates.length,
    system: templates.filter((t) => t.isSystem).length,
    custom: templates.filter((t) => !t.isSystem).length,
    favorite: templates.filter((t) => t.isFavorite).length,
  };
};

/**
 * 格式化日期
 */
export const formatDate = (date: string): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

/**
 * 格式化日期时间
 */
export const formatDateTime = (date: string): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

/**
 * 生成设备名称
 */
export const generateDeviceName = (prefix: string, index: number): string => {
  const paddedIndex = String(index).padStart(3, '0');
  return `${prefix}-${paddedIndex}`;
};

/**
 * 生成默认名称前缀
 */
export const generateDefaultPrefix = (): string => {
  return `Device-${dayjs().format('YYYYMMDD')}`;
};

// ===== 表格列定义工厂函数 =====

export interface TemplateTableHandlers {
  onViewDetail: (template: DeviceTemplate) => void;
  onToggleFavorite: (id: string) => void;
  onUseTemplate: (template: DeviceTemplate) => void;
  onEdit: (template: DeviceTemplate) => void;
  onDelete: (id: string) => void;
}

/**
 * 创建模板表格列定义
 */
export const createTemplateColumns = (
  handlers: TemplateTableHandlers
): ColumnsType<DeviceTemplate> => {
  const { onViewDetail, onToggleFavorite, onUseTemplate, onEdit, onDelete } = handlers;

  return [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: DeviceTemplate) => (
        <Space>
          {record.isFavorite ? (
            <StarFilled style={{ color: '#faad14' }} />
          ) : (
            <StarOutlined style={{ color: '#d9d9d9' }} />
          )}
          <Text strong>{text}</Text>
          {record.isSystem && <Tag color="blue">系统</Tag>}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text?: string) => <Text type="secondary">{text || '-'}</Text>,
    },
    {
      title: 'Android版本',
      dataIndex: 'androidVersion',
      key: 'androidVersion',
      width: 120,
      render: (text: string) => <Tag color="green">Android {text}</Tag>,
    },
    {
      title: '配置',
      key: 'config',
      width: 200,
      render: (_: any, record: DeviceTemplate) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>
            CPU: {record.cpuCores}核 | 内存: {record.memoryMB}MB
          </Text>
          <Text style={{ fontSize: 12 }}>
            存储: {record.diskGB}GB | 分辨率: {record.resolution}
          </Text>
        </Space>
      ),
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 100,
      sorter: (a: DeviceTemplate, b: DeviceTemplate) => a.usageCount - b.usageCount,
      render: (count: number) => <Text>{count}</Text>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (text: string) => formatDate(text),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: DeviceTemplate) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={() => onViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title={record.isFavorite ? '取消收藏' : '收藏'}>
            <Button
              type="link"
              size="small"
              icon={record.isFavorite ? <StarFilled /> : <StarOutlined />}
              onClick={() => onToggleFavorite(record.id)}
            />
          </Tooltip>
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() => onUseTemplate(record)}
          >
            使用
          </Button>
          {!record.isSystem && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              />
              <Popconfirm
                title="确认删除"
                description="删除后无法恢复，确定要删除此模板吗？"
                onConfirm={() => onDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];
};

// ===== 批量创建配置 =====

export const batchCreateConfig = {
  min: 1,
  max: 100,
  defaultCount: 1,
};

// ===== 模拟数据（仅用于开发） =====

export const mockTemplates: DeviceTemplate[] = [
  {
    id: 'sys-1',
    name: '标准版 Android 11',
    description: '适用于大多数应用的标准配置',
    androidVersion: '11.0',
    cpuCores: 2,
    memoryMB: 4096,
    diskGB: 32,
    resolution: '1080x1920',
    dpi: 480,
    isSystem: true,
    isFavorite: true,
    usageCount: 1245,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'sys-2',
    name: '高性能 Android 12',
    description: '适用于大型游戏和高性能应用',
    androidVersion: '12.0',
    cpuCores: 4,
    memoryMB: 8192,
    diskGB: 64,
    resolution: '1440x2560',
    dpi: 560,
    isSystem: true,
    isFavorite: false,
    usageCount: 856,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'sys-3',
    name: '轻量版 Android 10',
    description: '适用于简单应用和测试',
    androidVersion: '10.0',
    cpuCores: 1,
    memoryMB: 2048,
    diskGB: 16,
    resolution: '720x1280',
    dpi: 320,
    isSystem: true,
    isFavorite: false,
    usageCount: 432,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'custom-1',
    name: '游戏工作室专用',
    description: '针对某款游戏优化的配置',
    androidVersion: '11.0',
    cpuCores: 3,
    memoryMB: 6144,
    diskGB: 48,
    resolution: '1080x1920',
    dpi: 480,
    isSystem: false,
    isFavorite: true,
    usageCount: 89,
    createdAt: '2024-02-15T10:30:00Z',
    createdBy: 'user@example.com',
  },
  {
    id: 'custom-2',
    name: '测试模板',
    description: '用于App兼容性测试',
    androidVersion: '12.0',
    cpuCores: 2,
    memoryMB: 4096,
    diskGB: 32,
    resolution: '1080x2340',
    dpi: 420,
    isSystem: false,
    isFavorite: false,
    usageCount: 34,
    createdAt: '2024-03-10T14:20:00Z',
    createdBy: 'user@example.com',
  },
];
