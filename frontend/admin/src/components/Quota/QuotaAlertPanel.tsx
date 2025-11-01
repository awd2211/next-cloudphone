/**
 * QuotaAlertPanel - 配额告警面板组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Alert, Space, Tag, Button } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import type { QuotaAlert } from '@/types';

interface QuotaAlertPanelProps {
  alerts: QuotaAlert[];
}

/**
 * QuotaAlertPanel 组件
 * 显示配额告警信息
 */
export const QuotaAlertPanel = memo<QuotaAlertPanelProps>(({ alerts }) => {
  if (alerts.length === 0) return null;

  return (
    <Alert
      message={
        <Space>
          <WarningOutlined />
          <span>配额告警 ({alerts.length})</span>
        </Space>
      }
      description={
        <div>
          {alerts.slice(0, 3).map((alert, index) => (
            <div key={index} style={{ marginBottom: 8 }}>
              <Tag color="orange">{alert.quotaType}</Tag>
              <span>用户 {alert.userId}: </span>
              <span>
                {alert.message} (使用率: {alert.usagePercent}%)
              </span>
            </div>
          ))}
          {alerts.length > 3 && (
            <Button type="link" size="small">
              查看全部 {alerts.length} 条告警
            </Button>
          )}
        </div>
      }
      type="warning"
      showIcon
      closable
      style={{ marginBottom: 16 }}
    />
  );
});

QuotaAlertPanel.displayName = 'QuotaAlertPanel';
