import React from 'react';
import {
  DateRangeFilter,
  StatisticsCards,
  DailyRevenueTable,
  PlanRevenueTable,
} from '@/components/RevenueReport';
import { useRevenueReport } from '@/hooks/useRevenueReport';

const RevenueReport: React.FC = () => {
  const {
    loading,
    dateRange,
    setDateRange,
    totalRevenue,
    totalOrders,
    avgOrderValue,
    dailyStats,
    planStats,
    handleExport,
  } = useRevenueReport();

  return (
    <div>
      <h2>收入统计报表</h2>

      <DateRangeFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={handleExport}
      />

      <StatisticsCards
        loading={loading}
        totalRevenue={totalRevenue}
        totalOrders={totalOrders}
        avgOrderValue={avgOrderValue}
      />

      <div style={{ marginBottom: 24 }}>
        <DailyRevenueTable loading={loading} data={dailyStats} />
      </div>

      <PlanRevenueTable loading={loading} data={planStats} totalRevenue={totalRevenue} />
    </div>
  );
};

export default RevenueReport;
