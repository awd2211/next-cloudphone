import React, { useState } from 'react';
import {
  Row,
  Col,
  Checkbox,
  Button,
  Space,
  Typography,
  Tag,
  Popconfirm,
  Alert,
  Statistic,
} from 'antd';
import {
  DeleteOutlined,
  ReloadOutlined,
  CheckSquareOutlined,
  BorderOutlined,
} from '@ant-design/icons';
import { InstalledAppCard } from './InstalledAppCard';
import type { InstalledApp } from '@/hooks/useInstalledApps';

const { Text } = Typography;

interface InstalledAppListProps {
  apps: InstalledApp[];
  stats: {
    total: number;
    system: number;
    user: number;
    updatable: number;
  };
  selectedAppIds: string[];
  onSelectApp: (appId: string, checked: boolean) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onUninstall: (appId: string) => void;
  onBatchUninstall: () => void;
  onUpdate: (appId: string) => void;
  onRefresh: () => void;
}

/**
 * 已安装应用列表组件
 *
 * 功能：
 * 1. 卡片式展示已安装应用
 * 2. 多选应用（批量卸载）
 * 3. 单个应用卸载
 * 4. 应用更新
 * 5. 统计信息展示
 */
export const InstalledAppList: React.FC<InstalledAppListProps> = React.memo(
  ({
    apps,
    stats,
    selectedAppIds,
    onSelectApp,
    onSelectAll,
    onClearSelection,
    onUninstall,
    onBatchUninstall,
    onUpdate,
    onRefresh,
  }) => {
    const [showSystemApps, setShowSystemApps] = useState(false);

    // 筛选应用
    const filteredApps = showSystemApps
      ? apps
      : apps.filter((app) => !app.isSystemApp);

    const allSelected =
      filteredApps.length > 0 &&
      filteredApps.every((app) => selectedAppIds.includes(app.packageName));

    return (
      <div>
        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic title="总应用数" value={stats.total} prefix={<BorderOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic
              title="用户应用"
              value={stats.user}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="系统应用"
              value={stats.system}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="可更新"
              value={stats.updatable}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
        </Row>

        {/* 操作工具栏 */}
        <div
          style={{
            padding: '12px 16px',
            background: '#fafafa',
            borderRadius: '8px',
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            <Checkbox
              checked={allSelected}
              indeterminate={
                selectedAppIds.length > 0 &&
                selectedAppIds.length < filteredApps.length
              }
              onChange={(e) => {
                if (e.target.checked) {
                  onSelectAll();
                } else {
                  onClearSelection();
                }
              }}
            >
              全选
            </Checkbox>

            {selectedAppIds.length > 0 && (
              <>
                <Tag color="blue">{selectedAppIds.length} 个已选</Tag>
                <Button size="small" onClick={onClearSelection}>
                  取消选择
                </Button>
              </>
            )}

            <Checkbox
              checked={showSystemApps}
              onChange={(e) => setShowSystemApps(e.target.checked)}
            >
              显示系统应用
            </Checkbox>
          </Space>

          <Space>
            {selectedAppIds.length > 0 && (
              <Popconfirm
                title="确认批量卸载"
                description={
                  <div>
                    <Text>即将卸载 {selectedAppIds.length} 个应用，确定要继续吗？</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      系统应用无法卸载
                    </Text>
                  </div>
                }
                onConfirm={onBatchUninstall}
                okText="确认卸载"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  批量卸载 ({selectedAppIds.length})
                </Button>
              </Popconfirm>
            )}

            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              刷新列表
            </Button>
          </Space>
        </div>

        {/* 可更新应用提示 */}
        {stats.updatable > 0 && (
          <Alert
            message={`有 ${stats.updatable} 个应用可以更新`}
            description="点击应用卡片上的「更新」按钮可更新到最新版本"
            type="info"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 应用列表 */}
        <Row gutter={[16, 16]}>
          {filteredApps.map((app) => (
            <Col key={app.packageName} xs={24} sm={12} md={8} lg={6}>
              <InstalledAppCard
                app={app}
                selected={selectedAppIds.includes(app.packageName)}
                onSelect={(checked) => onSelectApp(app.packageName, checked)}
                onUninstall={() => onUninstall(app.packageName)}
                onUpdate={() => onUpdate(app.packageName)}
              />
            </Col>
          ))}
        </Row>

        {filteredApps.length === 0 && showSystemApps && (
          <Alert
            message="无应用"
            description="该设备暂无已安装应用"
            type="info"
            showIcon
          />
        )}

        {filteredApps.length === 0 && !showSystemApps && (
          <Alert
            message="无用户应用"
            description="该设备暂无用户安装的应用。勾选「显示系统应用」可查看系统预装应用。"
            type="info"
            showIcon
          />
        )}
      </div>
    );
  }
);

InstalledAppList.displayName = 'InstalledAppList';
