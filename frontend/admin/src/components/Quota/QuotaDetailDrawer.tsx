/**
 * QuotaDetailDrawer - 配额详情抽屉组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo, useMemo } from 'react';
import { Drawer, Card, Row, Col, Tag, Statistic } from 'antd';
import ReactECharts from '@/components/ReactECharts';
import type { Quota, QuotaStatistics } from '@/types';
import { QUOTA_STATUS_CONFIG } from './QuotaStatusTag';

interface QuotaDetailDrawerProps {
  visible: boolean;
  quota: Quota | null;
  statistics: QuotaStatistics | null;
  onClose: () => void;
}

/**
 * QuotaDetailDrawer 组件
 * 配额详情抽屉，包含基本信息、配额限制、当前使用、趋势图表
 */
export const QuotaDetailDrawer = memo<QuotaDetailDrawerProps>(
  ({ visible, quota, statistics, onClose }) => {
    // 使用趋势图表配置
    const usageTrendOption = useMemo(() => {
      if (!statistics) return null;

      return {
        title: {
          text: '配额使用趋势',
          left: 'center',
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
          },
        },
        legend: {
          data: ['设备', 'CPU(核)', '内存(GB)', '存储(GB)'],
          bottom: 10,
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: statistics.dailyUsage?.map((item) => item.date) || [],
        },
        yAxis: {
          type: 'value',
        },
        series: [
          {
            name: '设备',
            type: 'line',
            data: statistics.dailyUsage?.map((item) => item.devices) || [],
            smooth: true,
          },
          {
            name: 'CPU(核)',
            type: 'line',
            data: statistics.dailyUsage?.map((item) => item.cpuCores) || [],
            smooth: true,
          },
          {
            name: '内存(GB)',
            type: 'line',
            data: statistics.dailyUsage?.map((item) => item.memoryGB) || [],
            smooth: true,
          },
          {
            name: '存储(GB)',
            type: 'line',
            data: statistics.dailyUsage?.map((item) => item.storageGB) || [],
            smooth: true,
          },
        ],
      };
    }, [statistics]);

    // 配额分布饼图配置
    const distributionOption = useMemo(() => {
      if (!statistics) return null;

      return {
        title: {
          text: '当前资源使用分布',
          left: 'center',
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)',
        },
        legend: {
          orient: 'vertical',
          left: 'left',
        },
        series: [
          {
            name: '资源使用',
            type: 'pie',
            radius: '50%',
            data: [
              { value: statistics.currentUsage?.devices || 0, name: '设备数' },
              { value: statistics.currentUsage?.cpuCores || 0, name: 'CPU核数' },
              { value: statistics.currentUsage?.memoryGB || 0, name: '内存(GB)' },
              { value: statistics.currentUsage?.storageGB || 0, name: '存储(GB)' },
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      };
    }, [statistics]);

    return (
      <Drawer title="配额详情" width={720} open={visible} onClose={onClose}>
        {quota && (
          <div>
            <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <p>
                    <strong>用户ID:</strong> {quota.userId}
                  </p>
                  <p>
                    <strong>状态:</strong>{' '}
                    <Tag color={QUOTA_STATUS_CONFIG[quota.status as keyof typeof QUOTA_STATUS_CONFIG]?.color}>
                      {QUOTA_STATUS_CONFIG[quota.status as keyof typeof QUOTA_STATUS_CONFIG]?.text || quota.status}
                    </Tag>
                  </p>
                </Col>
                <Col span={12}>
                  <p>
                    <strong>创建时间:</strong> {new Date(quota.createdAt).toLocaleString()}
                  </p>
                  <p>
                    <strong>更新时间:</strong> {new Date(quota.updatedAt).toLocaleString()}
                  </p>
                </Col>
              </Row>
            </Card>

            <Card title="配额限制" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title="最大设备数" value={quota.limits.maxDevices} />
                </Col>
                <Col span={12}>
                  <Statistic title="最大并发设备" value={quota.limits.maxConcurrentDevices} />
                </Col>
                <Col span={8}>
                  <Statistic title="总CPU(核)" value={quota.limits.totalCpuCores} />
                </Col>
                <Col span={8}>
                  <Statistic title="总内存(GB)" value={quota.limits.totalMemoryGB} />
                </Col>
                <Col span={8}>
                  <Statistic title="总存储(GB)" value={quota.limits.totalStorageGB} />
                </Col>
              </Row>
            </Card>

            <Card title="当前使用" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="当前设备数"
                    value={quota.usage.currentDevices}
                    suffix={`/ ${quota.limits.maxDevices}`}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="并发设备"
                    value={quota.usage.currentConcurrentDevices}
                    suffix={`/ ${quota.limits.maxConcurrentDevices}`}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="已用CPU(核)"
                    value={quota.usage.usedCpuCores}
                    suffix={`/ ${quota.limits.totalCpuCores}`}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="已用内存(GB)"
                    value={quota.usage.usedMemoryGB}
                    suffix={`/ ${quota.limits.totalMemoryGB}`}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="已用存储(GB)"
                    value={quota.usage.usedStorageGB}
                    suffix={`/ ${quota.limits.totalStorageGB}`}
                  />
                </Col>
              </Row>
            </Card>

            {/* 使用趋势图 */}
            {usageTrendOption && (
              <Card title="使用趋势" size="small" style={{ marginBottom: 16 }}>
                <ReactECharts option={usageTrendOption} style={{ height: 300 }} />
              </Card>
            )}

            {/* 资源分布图 */}
            {distributionOption && (
              <Card title="资源分布" size="small">
                <ReactECharts option={distributionOption} style={{ height: 300 }} />
              </Card>
            )}
          </div>
        )}
      </Drawer>
    );
  }
);

QuotaDetailDrawer.displayName = 'QuotaDetailDrawer';
