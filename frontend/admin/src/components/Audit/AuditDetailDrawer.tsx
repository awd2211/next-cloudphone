import { memo } from 'react';
import { Drawer, Descriptions, Tag, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { AuditLog } from '@/types';
import {
  getLevelIcon,
  getLevelColor,
  getLevelLabel,
  getActionLabel,
  getActionCategory,
} from './utils';
import { NEUTRAL_LIGHT } from '@/theme';

const { Text } = Typography;

export interface AuditDetailDrawerProps {
  visible: boolean;
  log: AuditLog | null;
  onClose: () => void;
}

/**
 * 审计日志详情抽屉组件
 */
export const AuditDetailDrawer = memo<AuditDetailDrawerProps>(({ visible, log, onClose }) => {
  return (
    <Drawer title="审计日志详情" open={visible} onClose={onClose} width={800}>
      {log && (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="日志ID" span={2}>
            {log.id}
          </Descriptions.Item>
          <Descriptions.Item label="时间" span={2}>
            {new Date(log.createdAt).toLocaleString('zh-CN')}
          </Descriptions.Item>
          <Descriptions.Item label="级别">
            <Tag icon={getLevelIcon(log.level)} color={getLevelColor(log.level)}>
              {getLevelLabel(log.level)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {log.success ? (
              <Tag icon={<CheckCircleOutlined />} color="success">
                成功
              </Tag>
            ) : (
              <Tag icon={<CloseCircleOutlined />} color="error">
                失败
              </Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="操作类型">{getActionLabel(log.action)}</Descriptions.Item>
          <Descriptions.Item label="操作分类">
            <Tag>{getActionCategory(log.action)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="用户ID">{log.userId}</Descriptions.Item>
          <Descriptions.Item label="目标用户ID">
            {log.targetUserId || <span style={{ color: NEUTRAL_LIGHT.text.tertiary }}>-</span>}
          </Descriptions.Item>
          <Descriptions.Item label="资源类型">
            <Tag color="geekblue">{log.resourceType}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="资源ID">
            {log.resourceId || <span style={{ color: NEUTRAL_LIGHT.text.tertiary }}>-</span>}
          </Descriptions.Item>
          <Descriptions.Item label="IP地址">
            {log.ipAddress || <span style={{ color: NEUTRAL_LIGHT.text.tertiary }}>-</span>}
          </Descriptions.Item>
          <Descriptions.Item label="请求ID">
            {log.requestId || <span style={{ color: NEUTRAL_LIGHT.text.tertiary }}>-</span>}
          </Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            {log.description}
          </Descriptions.Item>
          {log.errorMessage && (
            <Descriptions.Item label="错误信息" span={2}>
              <Text type="danger">{log.errorMessage}</Text>
            </Descriptions.Item>
          )}
          {log.oldValue && Object.keys(log.oldValue).length > 0 && (
            <Descriptions.Item label="旧值" span={2}>
              <pre style={{ background: NEUTRAL_LIGHT.bg.layout, padding: 8, borderRadius: 4 }}>
                {JSON.stringify(log.oldValue, null, 2)}
              </pre>
            </Descriptions.Item>
          )}
          {log.newValue && Object.keys(log.newValue).length > 0 && (
            <Descriptions.Item label="新值" span={2}>
              <pre style={{ background: NEUTRAL_LIGHT.bg.layout, padding: 8, borderRadius: 4 }}>
                {JSON.stringify(log.newValue, null, 2)}
              </pre>
            </Descriptions.Item>
          )}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <Descriptions.Item label="元数据" span={2}>
              <pre style={{ background: NEUTRAL_LIGHT.bg.layout, padding: 8, borderRadius: 4 }}>
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </Descriptions.Item>
          )}
          {log.userAgent && (
            <Descriptions.Item label="User Agent" span={2}>
              <Text ellipsis style={{ fontSize: 12 }}>
                {log.userAgent}
              </Text>
            </Descriptions.Item>
          )}
        </Descriptions>
      )}
    </Drawer>
  );
});

AuditDetailDrawer.displayName = 'AuditDetailDrawer';
