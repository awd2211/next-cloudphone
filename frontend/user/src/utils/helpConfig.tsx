import React from 'react';
import {
  BookOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  CustomerServiceOutlined,
  FireOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  LikeOutlined,
} from '@ant-design/icons';

/**
 * 帮助中心配置工具
 */

// 分类图标映射
export const categoryIcons: Record<string, React.ReactNode> = {
  'getting-started': <BookOutlined />,
  account: <BookOutlined />,
  device: <BookOutlined />,
  app: <BookOutlined />,
  billing: <BookOutlined />,
  technical: <BookOutlined />,
  security: <BookOutlined />,
};

// 分类颜色映射
export const categoryColors: Record<string, string> = {
  'getting-started': '#1677ff',
  account: '#52c41a',
  device: '#faad14',
  app: '#13c2c2',
  billing: '#eb2f96',
  technical: '#722ed1',
  security: '#f5222d',
};

// 快速入口配置
export interface QuickLink {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
  path: string;
}

export const quickLinks: QuickLink[] = [
  {
    icon: <FileTextOutlined style={{ fontSize: 48 }} />,
    iconColor: '#1677ff',
    title: '帮助文档',
    description: '查看详细的产品使用文档',
    path: '/help/articles',
  },
  {
    icon: <QuestionCircleOutlined style={{ fontSize: 48 }} />,
    iconColor: '#52c41a',
    title: '常见问题',
    description: '快速找到常见问题的答案',
    path: '/help/faqs',
  },
  {
    icon: <BookOutlined style={{ fontSize: 48 }} />,
    iconColor: '#faad14',
    title: '视频教程',
    description: '通过视频学习产品功能',
    path: '/help/tutorials',
  },
  {
    icon: <CustomerServiceOutlined style={{ fontSize: 48 }} />,
    iconColor: '#722ed1',
    title: '联系客服',
    description: '提交工单获得专业支持',
    path: '/tickets',
  },
];

// 导出图标常量供组件使用
export const icons = {
  fire: FireOutlined,
  clock: ClockCircleOutlined,
  eye: EyeOutlined,
  like: LikeOutlined,
  question: QuestionCircleOutlined,
  customerService: CustomerServiceOutlined,
};
