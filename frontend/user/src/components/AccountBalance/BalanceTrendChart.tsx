import { memo } from 'react';
import { Card, Space, Typography } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/charts';

const { Text } = Typography;

interface BalanceTrendChartProps {
  lineChartConfig: any;
}

export const BalanceTrendChart = memo<BalanceTrendChartProps>(({ lineChartConfig }) => {
  return (
    <Card
      title={
        <Space>
          <LineChartOutlined />
          <Text strong>余额趋势（最近30天）</Text>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      <Line {...lineChartConfig} />
    </Card>
  );
});

BalanceTrendChart.displayName = 'BalanceTrendChart';
