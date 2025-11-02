import React from 'react';
import { Space, Avatar, Tag, Tooltip } from 'antd';
import { UserOutlined, ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import type { AuditLog } from '@/types/auditLog';
import { getLevelColor } from '@/utils/auditLog';

interface LogRowProps {
  log: AuditLog;
  style: React.CSSProperties;
}

export const LogRow: React.FC<LogRowProps> = ({ log, style }) => {
  return (
    <div style={style} className="audit-log-row">
      <div className="audit-log-item">
        <div className="log-header">
          <Space size="middle">
            <Avatar icon={<UserOutlined />} size="small" />
            <span className="log-user">{log.userName}</span>
            <Tag color={getLevelColor(log.level)}>{log.level.toUpperCase()}</Tag>
          </Space>
          <span className="log-time">
            <ClockCircleOutlined /> {new Date(log.timestamp).toLocaleString('zh-CN')}
          </span>
        </div>
        <div className="log-content">
          <Space>
            <Tag color="blue">{log.action}</Tag>
            <span>
              {log.resourceType}/{log.resourceId}
            </span>
          </Space>
        </div>
        <div className="log-footer">
          <Tooltip title={log.userAgent}>
            <span className="log-ip">
              <EnvironmentOutlined /> {log.ip}
            </span>
          </Tooltip>
          <span className="log-details">{log.details}</span>
        </div>
      </div>
    </div>
  );
};
