import React from 'react';
import { Space, Button, Dropdown, Popconfirm, Tag, theme } from 'antd';
import type { MenuProps } from 'antd';
import {
  PlayCircleOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  DeleteOutlined,
  AppstoreAddOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

const { useToken } = theme;

interface BatchOperationToolbarProps {
  selectedCount: number;
  onBatchStart: () => void;
  onBatchStop: () => void;
  onBatchRestart: () => void;
  onBatchDelete: () => void;
  onBatchInstallApp: () => void;
  onClearSelection: () => void;
  loading?: boolean;
}

/**
 * 设备批量操作工具栏
 *
 * 功能：
 * 1. 显示已选设备数量
 * 2. 批量启动/停止/重启
 * 3. 批量删除
 * 4. 批量安装应用
 * 5. 清除选择
 */
export const BatchOperationToolbar: React.FC<BatchOperationToolbarProps> = React.memo(
  ({
    selectedCount,
    onBatchStart,
    onBatchStop,
    onBatchRestart,
    onBatchDelete,
    onBatchInstallApp,
    onClearSelection,
    loading = false,
  }) => {
    const { token } = useToken();

    // 更多操作菜单
    const moreMenuItems: MenuProps['items'] = [
      {
        key: 'install',
        label: '批量安装应用',
        icon: <AppstoreAddOutlined />,
        onClick: onBatchInstallApp,
      },
    ];

    return (
      <div
        style={{
          padding: '12px 16px',
          background: token.colorPrimaryBg,
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space>
          <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
            已选择 {selectedCount} 个设备
          </Tag>
          <Button size="small" onClick={onClearSelection}>
            清除选择
          </Button>
        </Space>

        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={onBatchStart}
            disabled={selectedCount === 0}
            loading={loading}
          >
            批量启动
          </Button>

          <Button
            icon={<PoweroffOutlined />}
            onClick={onBatchStop}
            disabled={selectedCount === 0}
            loading={loading}
          >
            批量停止
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={onBatchRestart}
            disabled={selectedCount === 0}
            loading={loading}
          >
            批量重启
          </Button>

          <Popconfirm
            title="确认删除"
            description={
              <div>
                <p>
                  <ExclamationCircleOutlined style={{ color: token.colorError }} /> 即将删除{' '}
                  <strong>{selectedCount}</strong> 个设备
                </p>
                <p style={{ marginBottom: 0, color: token.colorTextSecondary }}>
                  删除后数据无法恢复，确定要继续吗？
                </p>
              </div>
            }
            onConfirm={onBatchDelete}
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            disabled={selectedCount === 0}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={selectedCount === 0}
              loading={loading}
            >
              批量删除
            </Button>
          </Popconfirm>

          <Dropdown menu={{ items: moreMenuItems }} disabled={selectedCount === 0}>
            <Button icon={<DownOutlined />} loading={loading}>
              更多操作
            </Button>
          </Dropdown>
        </Space>
      </div>
    );
  }
);

BatchOperationToolbar.displayName = 'BatchOperationToolbar';
