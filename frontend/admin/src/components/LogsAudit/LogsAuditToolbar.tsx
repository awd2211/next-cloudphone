import React from 'react';
import { Space, Button, Dropdown } from 'antd';
import { DownloadOutlined, DeleteOutlined, DownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

interface LogsAuditToolbarProps {
  onExportExcel: () => void;
  onCleanLogs: () => void;
}

export const LogsAuditToolbar: React.FC<LogsAuditToolbarProps> = React.memo(
  ({ onExportExcel, onCleanLogs }) => {
    const exportMenuItems: MenuProps['items'] = [
      {
        key: 'excel',
        label: '导出为Excel',
        icon: <DownloadOutlined />,
        onClick: onExportExcel,
      },
    ];

    return (
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Dropdown menu={{ items: exportMenuItems }} placement="bottomLeft">
            <Button icon={<DownloadOutlined />}>
              导出数据 <DownOutlined />
            </Button>
          </Dropdown>
          <Button danger icon={<DeleteOutlined />} onClick={onCleanLogs}>
            清理过期日志
          </Button>
        </Space>
      </div>
    );
  }
);

LogsAuditToolbar.displayName = 'LogsAuditToolbar';
