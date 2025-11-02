import React from 'react';
import { Card, Table, DatePicker, Space, Tabs } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  MeteringStatsCards,
  ResourceUsageCards,
  useUserMeteringColumns,
  useDeviceMeteringColumns,
  useUserTableSummary,
} from '@/components/Metering';
import { useMeteringDashboard } from '@/hooks/useMeteringDashboard';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const MeteringDashboard: React.FC = () => {
  const {
    overview,
    userMeterings,
    deviceMeterings,
    loading,
    dateRange,
    handleDateRangeChange,
  } = useMeteringDashboard();

  const userColumns = useUserMeteringColumns();
  const deviceColumns = useDeviceMeteringColumns();
  const userTableSummary = useUserTableSummary({ data: userMeterings });

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <MeteringStatsCards overview={overview} />

        <ResourceUsageCards overview={overview} />

        <Card
          title={
            <span>
              <LineChartOutlined /> 计量详情
            </span>
          }
          extra={
            <Space>
              <RangePicker
                value={[dayjs(dateRange[0]), dayjs(dateRange[1])]}
                onChange={handleDateRangeChange}
              />
            </Space>
          }
        >
          <Tabs defaultActiveKey="users">
            <TabPane tab="用户计量" key="users">
              <Table
                columns={userColumns}
                dataSource={userMeterings}
                rowKey="userId"
                loading={loading}
                pagination={{ pageSize: 10 }}
                summary={userTableSummary}
              />
            </TabPane>

            <TabPane tab="设备计量" key="devices">
              <Table
                columns={deviceColumns}
                dataSource={deviceMeterings}
                rowKey="deviceId"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
          </Tabs>
        </Card>
      </Space>
    </div>
  );
};

export default MeteringDashboard;
