export interface DailyStats {
  date: string;
  revenue: number;
  orders: number;
}

export interface PlanStats {
  planId: string;
  planName: string;
  revenue: number;
  orders: number;
}

export interface RevenueStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  dailyStats: DailyStats[];
  planStats: PlanStats[];
}
