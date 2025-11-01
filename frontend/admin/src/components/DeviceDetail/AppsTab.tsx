import React from 'react';
import { Card, Button, List, Popconfirm } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';

interface AppsTabProps {
  installedApps: string[];
  onInstallClick: () => void;
  onUninstall: (app: string) => void;
}

export const AppsTab: React.FC<AppsTabProps> = React.memo(
  ({ installedApps, onInstallClick, onUninstall }) => {
    return (
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<UploadOutlined />} onClick={onInstallClick}>
            安装应用
          </Button>
        </div>
        <List
          dataSource={installedApps}
          renderItem={(app) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="uninstall"
                  title="确定要卸载这个应用吗？"
                  onConfirm={() => onUninstall(app)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button type="link" danger icon={<DeleteOutlined />}>
                    卸载
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta title={app} />
            </List.Item>
          )}
        />
      </Card>
    );
  }
);

AppsTab.displayName = 'AppsTab';
