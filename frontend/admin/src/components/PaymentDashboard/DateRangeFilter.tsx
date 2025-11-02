import React from 'react';
import { Card, Space, DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface DateRangeFilterProps {
  dateRange: [Dayjs, Dayjs];
  onChange: (dates: [Dayjs, Dayjs]) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = React.memo(
  ({ dateRange, onChange }) => {
    const handleChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (dates && dates[0] && dates[1]) {
        onChange([dates[0], dates[1]]);
      }
    };

    return (
      <Card>
        <Space>
          <span>日期范围：</span>
          <RangePicker
            value={dateRange}
            onChange={handleChange}
            format="YYYY-MM-DD"
          />
        </Space>
      </Card>
    );
  }
);

DateRangeFilter.displayName = 'DateRangeFilter';
