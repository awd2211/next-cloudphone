import { memo } from 'react';
import { Drawer, Timeline, Space, Tag, Button } from 'antd';
import { NEUTRAL_LIGHT } from '@/theme';
import type { NotificationTemplate, NotificationTemplateVersion } from '@/types';
import dayjs from 'dayjs';

interface TemplateVersionDrawerProps {
  visible: boolean;
  template: NotificationTemplate | null;
  versions: NotificationTemplateVersion[];
  onClose: () => void;
  onRevert: (versionId: string) => void;
}

export const TemplateVersionDrawer = memo<TemplateVersionDrawerProps>(
  ({ visible, template, versions, onClose, onRevert }) => {
    return (
      <Drawer
        title={`版本历史: ${template?.name}`}
        open={visible}
        onClose={onClose}
        width={600}
      >
        <Timeline>
          {versions.map((version) => (
            <Timeline.Item
              key={version.id}
              color={version.version === template?.version ? 'green' : 'blue'}
            >
              <div>
                <Space>
                  <strong>v{version.version}</strong>
                  {version.version === template?.version && <Tag color="green">当前版本</Tag>}
                </Space>
                <div style={{ marginTop: '8px', fontSize: '12px', color: NEUTRAL_LIGHT.text.tertiary }}>
                  {dayjs(version.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  {version.createdBy && ` · ${version.createdBy}`}
                </div>
                {version.changeNote && <div style={{ marginTop: '4px' }}>{version.changeNote}</div>}
                {version.version !== template?.version && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => onRevert(version.id)}
                    style={{ marginTop: '8px', padding: 0 }}
                  >
                    回滚到此版本
                  </Button>
                )}
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Drawer>
    );
  }
);

TemplateVersionDrawer.displayName = 'TemplateVersionDrawer';
