import React from 'react';
import { DatePicker, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface DateRangeFilterProps {
  dateRange: [Dayjs, Dayjs];
  onDateRangeChange: (dates: [Dayjs, Dayjs]) => void;
  onExport: (format: 'excel' | 'csv') => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  dateRange,
  onDateRangeChange,
  onExport,
}) => {
  return (
    <div
      style={{
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <RangePicker
        value={dateRange}
        onChange={(dates) => dates && onDateRangeChange(dates as [Dayjs, Dayjs])}
        format="YYYY-MM-DD"
      />
      <div>
        <Button
          icon={<DownloadOutlined />}
          onClick={() => onExport('excel')}
          style={{ marginRight: 8 }}
        >
          导出 Excel
        </Button>
        <Button icon={<DownloadOutlined />} onClick={() => onExport('csv')}>
          导出 CSV
        </Button>
      </div>
    </div>
  );
};
