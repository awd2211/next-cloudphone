import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Badge, Alert, theme } from 'antd';
import {
  UserOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { getQuotaSummary, getQuotaMetrics } from '@/services/quota';
import { useRealtimeQuota } from '@/hooks/useRealtimeQuota';

interface QuotaSummary {
  total: number;
  byStatus: Record<string, number>;
  avgUsage: {
    devices: number;
    cpu: number;
    memory: number;
    storage: number;
    traffic: number;
  };
  alerts: {
    high: number;
    critical: number;
  };
}

/**
 * 配额实时监控组件
 *
 * ✅ 优化: 使用 WebSocket 实时推送替代轮询
 * - 移除 30 秒轮询间隔
 * - 使用 useRealtimeQuota Hook 订阅配额事件
 * - 配额变更时自动刷新数据
 */
const QuotaRealTimeMonitor: React.FC = () => {
  const { token } = theme.useToken();
  const [summary, setSummary] = useState<QuotaSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ 开启配额实时推送
  useRealtimeQuota(undefined, false); // 不显示独立通知，避免重复

  // 加载配额摘要
  const loadSummary = async () => {
    try {
      const data = await getQuotaSummary();
      setSummary(data);
    } catch (error) {
      console.error('加载配额摘要失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
    // ✅ 移除轮询 - 使用 WebSocket 实时推送
  }, []);

  if (loading || !summary) {
    return <Card loading />;
  }

  // 计算配额健康度
  const calculateHealthScore = () => {
    const criticalWeight = summary.alerts.critical * 10;
    const highWeight = summary.alerts.high * 5;
    const totalWeight = criticalWeight + highWeight;

    if (totalWeight === 0) return 100;
    if (summary.total === 0) return 100;

    const score = Math.max(0, 100 - (totalWeight / summary.total) * 100);
    return Math.round(score);
  };

  const healthScore = calculateHealthScore();

  const getHealthStatus = (score: number) => {
    if (score >= 90) return { color: 'success', text: '健康' };
    if (score >= 70) return { color: 'warning', text: '注意' };
    return { color: 'error', text: '危险' };
  };

  const healthStatus = getHealthStatus(healthScore);

  // 获取使用率颜色
  const getUsageColor = (percent: number) => {
    if (percent >= 95) return '#ff4d4f'; // 红色
    if (percent >= 80) return '#faad14'; // 橙色
    if (percent >= 60) return token.colorPrimary; // 蓝色
    return '#52c41a'; // 绿色
  };

  return (
    <Card title="📊 配额实时监控" bordered={false}>
      {/* 告警提示 */}
      {(summary.alerts.critical > 0 || summary.alerts.high > 0) && (
        <Alert
          message="配额告警"
          description={
            <>
              {summary.alerts.critical > 0 && (
                <div>
                  🔴 <strong>{summary.alerts.critical}</strong> 个配额达到危险阈值 (≥95%)
                </div>
              )}
              {summary.alerts.high > 0 && (
                <div>
                  🟡 <strong>{summary.alerts.high}</strong> 个配额达到警告阈值 (≥80%)
                </div>
              )}
            </>
          }
          type={summary.alerts.critical > 0 ? 'error' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 配额概览 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Statistic
            title="总配额数"
            value={summary.total}
            prefix={<UserOutlined />}
            suffix="个"
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="活跃配额"
            value={summary.byStatus.active || 0}
            valueStyle={{ color: '#3f8600' }}
            prefix={<CheckCircleOutlined />}
            suffix="个"
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="超额配额"
            value={summary.byStatus.exceeded || 0}
            valueStyle={{ color: '#cf1322' }}
            prefix={<WarningOutlined />}
            suffix="个"
          />
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="配额健康度"
              value={healthScore}
              suffix="%"
              valueStyle={{ color: healthStatus.color === 'success' ? '#3f8600' : '#cf1322' }}
            />
            <Badge
              status={healthStatus.color as any}
              text={healthStatus.text}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 平均使用率 */}
      <Card title="📈 平均资源使用率" size="small">
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <div style={{ marginBottom: 8 }}>
              <strong>设备配额</strong>
              <span style={{ float: 'right' }}>
                {summary.avgUsage.devices.toFixed(1)}%
              </span>
            </div>
            <Progress
              percent={summary.avgUsage.devices}
              strokeColor={getUsageColor(summary.avgUsage.devices)}
              showInfo={false}
            />
          </Col>

          <Col span={12}>
            <div style={{ marginBottom: 8 }}>
              <strong>CPU 配额</strong>
              <span style={{ float: 'right' }}>
                {summary.avgUsage.cpu.toFixed(1)}%
              </span>
            </div>
            <Progress
              percent={summary.avgUsage.cpu}
              strokeColor={getUsageColor(summary.avgUsage.cpu)}
              showInfo={false}
            />
          </Col>

          <Col span={12}>
            <div style={{ marginBottom: 8 }}>
              <strong>内存配额</strong>
              <span style={{ float: 'right' }}>
                {summary.avgUsage.memory.toFixed(1)}%
              </span>
            </div>
            <Progress
              percent={summary.avgUsage.memory}
              strokeColor={getUsageColor(summary.avgUsage.memory)}
              showInfo={false}
            />
          </Col>

          <Col span={12}>
            <div style={{ marginBottom: 8 }}>
              <strong>存储配额</strong>
              <span style={{ float: 'right' }}>
                {summary.avgUsage.storage.toFixed(1)}%
              </span>
            </div>
            <Progress
              percent={summary.avgUsage.storage}
              strokeColor={getUsageColor(summary.avgUsage.storage)}
              showInfo={false}
            />
          </Col>

          <Col span={24}>
            <div style={{ marginBottom: 8 }}>
              <strong>流量配额</strong>
              <span style={{ float: 'right' }}>
                {summary.avgUsage.traffic.toFixed(1)}%
              </span>
            </div>
            <Progress
              percent={summary.avgUsage.traffic}
              strokeColor={getUsageColor(summary.avgUsage.traffic)}
              showInfo={false}
            />
          </Col>
        </Row>
      </Card>

      {/* 状态分布 */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="活跃"
              value={summary.byStatus.active || 0}
              valueStyle={{ color: '#3f8600', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="超额"
              value={summary.byStatus.exceeded || 0}
              valueStyle={{ color: '#cf1322', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已过期"
              value={summary.byStatus.expired || 0}
              valueStyle={{ color: '#8c8c8c', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已暂停"
              value={summary.byStatus.suspended || 0}
              valueStyle={{ color: '#faad14', fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default React.memo(QuotaRealTimeMonitor);
