import {
  MobileOutlined,
  CloudServerOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  GlobalOutlined,
  ApiOutlined,
  RocketOutlined,
  TeamOutlined,
  LineChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';

/**
 * 产品介绍页面数据配置
 */

export const coreFeatures = [
  {
    icon: <MobileOutlined style={{ fontSize: 48, color: '#1677ff' }} />,
    title: '真实Android环境',
    description:
      '基于Redroid容器技术，提供完整的Android系统环境，100%兼容原生应用，支持Android 7-13多版本。',
    tags: ['原生系统', '完全兼容', '多版本'],
  },
  {
    icon: <CloudServerOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
    title: '弹性云端部署',
    description:
      '秒级创建和销毁设备，按需使用按需付费，无需购买昂贵的物理设备，支持批量管理数百台设备。',
    tags: ['按需使用', '秒级创建', '批量管理'],
  },
  {
    icon: <ThunderboltOutlined style={{ fontSize: 48, color: '#faad14' }} />,
    title: '极致性能体验',
    description:
      '基于高性能服务器，GPU加速渲染，WebRTC低延迟投屏，网络延迟<150ms，帧率稳定60fps。',
    tags: ['GPU加速', '低延迟', '高帧率'],
  },
  {
    icon: <SafetyOutlined style={{ fontSize: 48, color: '#f5222d' }} />,
    title: '企业级安全',
    description:
      '数据加密传输，设备隔离部署，完善的权限管理，支持VPN专线接入，符合等保三级标准。',
    tags: ['数据加密', '设备隔离', '等保认证'],
  },
  {
    icon: <GlobalOutlined style={{ fontSize: 48, color: '#722ed1' }} />,
    title: '全球节点覆盖',
    description:
      '在全球20+个地区部署节点，智能路由就近接入，支持海外应用测试和跨国业务部署。',
    tags: ['全球部署', '智能路由', '海外支持'],
  },
  {
    icon: <ApiOutlined style={{ fontSize: 48, color: '#13c2c2' }} />,
    title: '开放API接口',
    description:
      '提供完善的RESTful API和SDK，支持自动化脚本，轻松集成到现有系统，支持Webhook回调。',
    tags: ['RESTful API', 'SDK支持', 'Webhook'],
  },
];

export const useCases = [
  {
    icon: <RocketOutlined style={{ fontSize: 32, color: '#1677ff' }} />,
    title: 'App自动化测试',
    description:
      '在云端批量创建测试设备，执行UI自动化测试、兼容性测试、性能测试，大幅提升测试效率。',
    benefits: ['节省80%测试成本', '支持并发测试', '自动化脚本'],
  },
  {
    icon: <TeamOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
    title: '游戏托管代练',
    description:
      '7×24小时云端挂机，支持多开，不占用本地设备，电脑关机也能持续运行，自动完成任务。',
    benefits: ['24小时在线', '支持多开', '节省电费'],
  },
  {
    icon: <LineChartOutlined style={{ fontSize: 32, color: '#faad14' }} />,
    title: '移动办公协作',
    description:
      '远程访问企业应用，统一管理移动设备，数据不落地保障安全，支持多人协同办公。',
    benefits: ['远程访问', '数据安全', '协同办公'],
  },
  {
    icon: <SettingOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
    title: '应用分发测试',
    description:
      '快速验证应用在不同设备和系统版本上的表现，进行灰度发布测试，提前发现兼容性问题。',
    benefits: ['多版本测试', '灰度发布', '兼容性验证'],
  },
];

export const platformStats = [
  { title: '全球用户', value: '10000+', suffix: '' },
  { title: '设备总数', value: '500000+', suffix: '' },
  { title: '月活跃度', value: '95', suffix: '%' },
  { title: '服务可用性', value: '99.95', suffix: '%' },
];

export const techStack = [
  { name: 'Redroid', description: '容器化Android运行时' },
  { name: 'WebRTC', description: '低延迟实时通信' },
  { name: 'Docker', description: '容器编排管理' },
  { name: 'Kubernetes', description: '自动化部署和扩展' },
  { name: 'PostgreSQL', description: '高性能数据库' },
  { name: 'Redis', description: '高速缓存系统' },
  { name: 'RabbitMQ', description: '消息队列服务' },
  { name: 'MinIO', description: '对象存储服务' },
];

export const roadmapItems = [
  {
    title: '2024 Q1',
    children: [
      '✅ 基础功能上线',
      '✅ WebRTC实时投屏',
      '✅ 批量操作功能',
      '✅ API接口开放',
    ],
  },
  {
    title: '2024 Q2',
    children: [
      '✅ 设备快照备份',
      '✅ 自动化脚本支持',
      '✅ 全球节点部署',
      '✅ 企业版功能',
    ],
  },
  {
    title: '2024 Q3',
    children: [
      '🔄 AI智能助手',
      '🔄 5G网络支持',
      '🔄 IoT设备接入',
      '🔄 边缘计算节点',
    ],
  },
  {
    title: '2024 Q4',
    children: [
      '📅 AR/VR应用支持',
      '📅 区块链集成',
      '📅 量子加密通信',
      '📅 自动驾驶测试',
    ],
  },
];
