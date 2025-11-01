/**
 * ECharts 按需加载配置
 *
 * 优化前: 全量导入 echarts (1.1MB)
 * 优化后: 按需导入需要的图表类型 (预计 400-500KB，减少 50-60%)
 *
 * 使用的图表类型:
 * - LineChart: 折线图 (用于收入趋势、用户增长等)
 * - BarChart: 柱状图 (用于新增用户统计等)
 * - PieChart: 饼图 (用于设备状态分布、套餐分布等)
 *
 * 使用的组件:
 * - TitleComponent: 图表标题
 * - TooltipComponent: 提示框
 * - GridComponent: 网格
 * - LegendComponent: 图例
 * - DataZoomComponent: 数据缩放 (QuotaUsageTrend 中使用)
 */

import * as echarts from 'echarts/core';
import {
  LineChart,
  BarChart,
  PieChart,
  LineSeriesOption,
  BarSeriesOption,
  PieSeriesOption,
} from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  TitleComponentOption,
  TooltipComponentOption,
  GridComponentOption,
  LegendComponentOption,
  DataZoomComponentOption,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 组合 option 类型
export type ECOption = echarts.ComposeOption<
  | LineSeriesOption
  | BarSeriesOption
  | PieSeriesOption
  | TitleComponentOption
  | TooltipComponentOption
  | GridComponentOption
  | LegendComponentOption
  | DataZoomComponentOption
>;

// 注册必需的组件
echarts.use([
  // 图表类型
  LineChart,
  BarChart,
  PieChart,
  // 组件
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  // 渲染器
  CanvasRenderer,
]);

export default echarts;
