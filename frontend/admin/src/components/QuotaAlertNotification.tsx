import React, { useState, useEffect, useCallback } from 'react';
import { notification, Badge, Popover, List, Tag, Button, Divider } from 'antd';
import { BellOutlined, WarningOutlined } from '@ant-design/icons';
import type { QuotaAlert } from '@/types';
import * as quotaService from '@/services/quota';

interface QuotaAlertNotificationProps {
  /**
   * 告警阈值 (默认: 80%)
   */
  threshold?: number;

  /**
   * 刷新间隔 (毫秒, 默认: 30000ms = 30秒)
   */
  refreshInterval?: number;

  /**
   * 是否自动弹出通知 (默认: true)
   */
  autoNotify?: boolean;

  /**
   * 最多显示的告警数量 (默认: 5)
   */
  maxDisplayCount?: number;
}

/**
 * 配额告警通知组件
 *
 * 功能:
 * 1. 定期轮询配额告警API
 * 2. 自动弹出告警通知
 * 3. 显示告警列表弹窗
 * 4. 支持自定义刷新间隔和告警阈值
 */
const QuotaAlertNotification: React.FC<QuotaAlertNotificationProps> = ({
  threshold = 80,
  refreshInterval = 30000,
  autoNotify = true,
  maxDisplayCount = 5,
}) => {
  const [alerts, setAlerts] = useState<QuotaAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifiedAlerts, setNotifiedAlerts] = useState<Set<string>>(new Set());

  // 加载配额告警
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await quotaService.getQuotaAlerts(threshold);
      if (result.success && result.data) {
        const newAlerts = result.data;
        setAlerts(newAlerts);

        // 自动弹出新告警通知
        if (autoNotify) {
          newAlerts.forEach((alert) => {
            const alertKey = `${alert.userId}-${alert.quotaType}`;
            if (!notifiedAlerts.has(alertKey)) {
              showNotification(alert);
              setNotifiedAlerts((prev) => new Set(prev).add(alertKey));
            }
          });
        }
      }
    } catch (error) {
      console.error('加载配额告警失败:', error);
    } finally {
      setLoading(false);
    }
  }, [threshold, autoNotify, notifiedAlerts]);

  // 显示通知
  const showNotification = (alert: QuotaAlert) => {
    const severity = alert.severity || 'warning';
    const notificationType = severity === 'critical' ? 'error' : 'warning';

    notification[notificationType]({
      message: '配额告警',
      description: (
        <div>
          <p>
            <strong>用户:</strong> {alert.userId}
          </p>
          <p>
            <strong>类型:</strong> <Tag color="orange">{getQuotaTypeText(alert.quotaType)}</Tag>
          </p>
          <p>
            <strong>使用率:</strong> {alert.usagePercent}%
          </p>
          <p>{alert.message}</p>
        </div>
      ),
      placement: 'topRight',
      duration: 6,
      icon: <WarningOutlined style={{ color: '#faad14' }} />,
    });
  };

  // 获取配额类型文本
  const getQuotaTypeText = (type: string): string => {
    const typeMap: Record<string, string> = {
      device: '设备',
      cpu: 'CPU',
      memory: '内存',
      storage: '存储',
      bandwidth: '带宽',
      duration: '使用时长',
    };
    return typeMap[type] || type;
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity?: string): string => {
    switch (severity) {
      case 'critical':
        return 'red';
      case 'warning':
        return 'orange';
      case 'info':
        return 'blue';
      default:
        return 'orange';
    }
  };

  // 定期轮询告警
  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, refreshInterval);
    return () => clearInterval(interval);
  }, [loadAlerts, refreshInterval]);

  // 告警列表内容
  const alertListContent = (
    <div style={{ width: 400, maxHeight: 500, overflow: 'auto' }}>
      <div style={{ padding: '8px 16px', fontWeight: 600 }}>配额告警 ({alerts.length})</div>
      <Divider style={{ margin: '8px 0' }} />

      {alerts.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>暂无告警</div>
      ) : (
        <List
          dataSource={alerts.slice(0, maxDisplayCount)}
          loading={loading}
          renderItem={(alert, index) => (
            <List.Item
              key={index}
              style={{
                padding: '12px 16px',
                borderBottom: index < alerts.length - 1 ? '1px solid #f0f0f0' : 'none',
              }}
            >
              <div style={{ width: '100%' }}>
                <div style={{ marginBottom: 8 }}>
                  <Tag color={getSeverityColor(alert.severity)}>
                    {getQuotaTypeText(alert.quotaType)}
                  </Tag>
                  <span style={{ color: '#666', fontSize: 12 }}>用户: {alert.userId}</span>
                </div>
                <div style={{ fontSize: 13, color: '#333' }}>{alert.message}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                  使用率: {alert.usagePercent}%
                </div>
              </div>
            </List.Item>
          )}
        />
      )}

      {alerts.length > maxDisplayCount && (
        <div style={{ padding: '8px 16px', textAlign: 'center' }}>
          <Button type="link" size="small">
            查看全部 {alerts.length} 条告警
          </Button>
        </div>
      )}

      <Divider style={{ margin: '8px 0' }} />
      <div style={{ padding: '8px 16px', textAlign: 'center' }}>
        <Button size="small" onClick={loadAlerts} loading={loading}>
          刷新
        </Button>
      </div>
    </div>
  );

  return (
    <Popover content={alertListContent} title={null} trigger="click" placement="bottomRight">
      <Badge count={alerts.length} offset={[-5, 5]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 48,
          }}
        />
      </Badge>
    </Popover>
  );
};

export default QuotaAlertNotification;
