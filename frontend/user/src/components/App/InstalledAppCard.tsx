import React from 'react';
import {
  Card,
  Checkbox,
  Button,
  Space,
  Typography,
  Tag,
  Popconfirm,
  Tooltip,
  theme,
} from 'antd';
import {
  DeleteOutlined,
  CloudUploadOutlined,
  AndroidOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { InstalledAppInfo } from '@/services/app';

const { Text, Paragraph } = Typography;
const { useToken } = theme;

interface InstalledAppCardProps {
  app: InstalledAppInfo;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onUninstall: () => void;
  onUpdate: () => void;
}

/**
 * 已安装应用卡片组件
 *
 * 功能：
 * 1. 显示应用图标、名称、版本
 * 2. 显示应用大小
 * 3. 标识系统应用
 * 4. 显示可更新标签
 * 5. 卸载按钮
 * 6. 更新按钮
 * 7. 多选复选框
 */
export const InstalledAppCard: React.FC<InstalledAppCardProps> = React.memo(
  ({ app, selected, onSelect, onUninstall, onUpdate }) => {
    const { token } = useToken();

    const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    };

    return (
      <Card
        hoverable
        style={{
          height: '100%',
          border: selected ? `2px solid ${token.colorPrimary}` : undefined,
        }}
        styles={{ body: { padding: 12 } }}
      >
        <div style={{ position: 'relative' }}>
          {/* 复选框 */}
          <div style={{ position: 'absolute', top: 0, left: 0 }}>
            <Checkbox checked={selected} onChange={(e) => onSelect(e.target.checked)} />
          </div>

          {/* 应用图标 */}
          <div style={{ textAlign: 'center', marginBottom: 12, paddingTop: 24 }}>
            {app.icon ? (
              <img
                src={app.icon}
                alt={app.name}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  // 图标加载失败时显示默认图标
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    const icon = document.createElement('div');
                    icon.style.cssText =
                      `width: 64px; height: 64px; border-radius: 12px; background: ${token.colorBgLayout}; display: flex; align-items: center; justify-content: center; font-size: 32px; color: ${token.colorPrimary};`;
                    icon.innerHTML = '<span>📱</span>';
                    parent.appendChild(icon);
                  }
                }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  background: token.colorBgLayout,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                }}
              >
                <AndroidOutlined style={{ color: token.colorPrimary }} />
              </div>
            )}
          </div>

          {/* 应用名称 */}
          <Tooltip title={app.name}>
            <Paragraph
              ellipsis={{ rows: 1 }}
              strong
              style={{ marginBottom: 4, textAlign: 'center' }}
            >
              {app.name}
            </Paragraph>
          </Tooltip>

          {/* 包名 */}
          <Tooltip title={app.packageName}>
            <Text
              type="secondary"
              style={{
                fontSize: 11,
                display: 'block',
                textAlign: 'center',
                marginBottom: 8,
              }}
              ellipsis
            >
              {app.packageName}
            </Text>
          </Tooltip>

          {/* 标签 */}
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <Space size={4} wrap>
              {app.isSystemApp && (
                <Tag color="default" style={{ fontSize: 10, margin: 0 }}>
                  系统应用
                </Tag>
              )}
              {app.hasUpdate && (
                <Tag color="success" style={{ fontSize: 10, margin: 0 }}>
                  可更新
                </Tag>
              )}
            </Space>
          </div>

          {/* 版本和大小 */}
          <div
            style={{
              background: token.colorBgLayout,
              padding: 8,
              borderRadius: 4,
              marginBottom: 12,
            }}
          >
            <Space
              direction="vertical"
              size={2}
              style={{ width: '100%', fontSize: 11 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <Text type="secondary">版本:</Text>
                <Text>{app.version}</Text>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <Text type="secondary">大小:</Text>
                <Text>{formatSize(app.size)}</Text>
              </div>
            </Space>
          </div>

          {/* 操作按钮 */}
          <Space style={{ width: '100%' }} direction="vertical" size={8}>
            {app.hasUpdate && (
              <Button
                type="primary"
                block
                size="small"
                icon={<CloudUploadOutlined />}
                onClick={onUpdate}
              >
                更新
              </Button>
            )}

            {!app.isSystemApp && (
              <Popconfirm
                title="确认卸载"
                description={
                  <div style={{ maxWidth: 200 }}>
                    <Text>确定要卸载 "{app.name}" 吗？</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      卸载后应用数据将被清除
                    </Text>
                  </div>
                }
                onConfirm={onUninstall}
                okText="确认卸载"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  block
                  size="small"
                  icon={<DeleteOutlined />}
                >
                  卸载
                </Button>
              </Popconfirm>
            )}

            {app.isSystemApp && (
              <Tooltip title="系统应用无法卸载">
                <Button
                  block
                  size="small"
                  icon={<InfoCircleOutlined />}
                  disabled
                >
                  系统应用
                </Button>
              </Tooltip>
            )}
          </Space>
        </div>
      </Card>
    );
  }
);

InstalledAppCard.displayName = 'InstalledAppCard';
