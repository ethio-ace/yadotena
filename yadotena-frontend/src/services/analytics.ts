/**
 * Yadotena Analytics API Client
 * 
 * All analytics endpoints use consistent period parameters:
 * ?period=today|yesterday|this_week|last_week|this_month|last_month|this_year|custom
 * &start=YYYY-MM-DD&end=YYYY-MM-DD (for custom)
 * &comp_start=YYYY-MM-DD&comp_end=YYYY-MM-DD (for custom comparison)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export type PeriodPreset = 
  | "today" 
  | "yesterday" 
  | "this_week" 
  | "last_week" 
  | "this_month" 
  | "last_month" 
  | "this_year" 
  | "custom";

export interface DateRange {
  start: string;
  end: string;
}

export interface MetricDelta {
  current: number;
  previous: number;
  delta: number;
  pctChange: number;
}

export interface TrendPoint {
  label: string;
  value: number;
  compare?: number;
}

export interface TopSeller {
  name: string;
  category: string;
  units: number;
  revenue: number;
}

export interface ActivityItem {
  time: string;
  action: string;
  staff: string;
  entity: string;
  entityType: string;
}

export interface OverviewResponse {
  revenue: MetricDelta;
  orders: MetricDelta;
  avgTicket: MetricDelta;
  unpaidAmount: number;
  activeTables: number;
  preparingOrders: number;
  readyOrders: number;
  unpaidOrders: number;
  pendingRequests: number;
  revenueTrend: TrendPoint[];
  topSellers: TopSeller[];
  recentActivity: ActivityItem[];
}

export interface HourlySalesPoint {
  hour: number;
  revenue: number;
  orders: number;
}

export interface CategorySales {
  category: string;
  units: number;
  revenue: number;
  share: number;
}

export interface SalesAnalytics {
  revenue: MetricDelta;
  orders: MetricDelta;
  avgTicket: MetricDelta;
  itemsSold: MetricDelta;
  revenueTrend: TrendPoint[];
  hourlySales: HourlySalesPoint[];
  categorySales: CategorySales[];
}

export interface MenuItemAnalytics {
  id: string;
  name: string;
  category: string;
  type: string;
  unitsSold: number;
  revenue: number;
  avgPrice: number;
  share: number;
}

export interface MenuAnalytics {
  totalItemsSold: number;
  menuRevenue: number;
  bestSeller: string;
  items: MenuItemAnalytics[];
}

export interface PaymentMethodBreakdown {
  method: string;
  transactions: number;
  amount: number;
  share: number;
}

export interface PaymentAnalytics {
  collected: number;
  outstanding: number;
  paymentCount: number;
  avgPayment: number;
  methods: PaymentMethodBreakdown[];
}

function buildParams(period: PeriodPreset, range?: DateRange, compRange?: DateRange): string {
  const params = new URLSearchParams({ period });
  if (period === "custom" && range) {
    params.set("start", range.start);
    params.set("end", range.end);
  }
  if (compRange) {
    params.set("comp_start", compRange.start);
    params.set("comp_end", compRange.end);
  }
  return params.toString();
}

async function fetchAnalytics<T>(endpoint: string, period: PeriodPreset, range?: DateRange, compRange?: DateRange): Promise<T> {
  const params = buildParams(period, range, compRange);
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token") || localStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    }
  }
  const res = await fetch(`${API_BASE}/api/v1/analytics/${endpoint}?${params}`, { headers });
  if (!res.ok) throw new Error(`Analytics fetch failed: ${res.status}`);
  return res.json();
}

export const analytics = {
  overview: (period: PeriodPreset, range?: DateRange, compRange?: DateRange) =>
    fetchAnalytics<OverviewResponse>("overview", period, range, compRange),
  
  sales: (period: PeriodPreset, range?: DateRange, compRange?: DateRange) =>
    fetchAnalytics<SalesAnalytics>("sales", period, range, compRange),
  
  menu: (period: PeriodPreset, range?: DateRange, compRange?: DateRange) =>
    fetchAnalytics<MenuAnalytics>("menu", period, range, compRange),
  
  payments: (period: PeriodPreset, range?: DateRange, compRange?: DateRange) =>
    fetchAnalytics<PaymentAnalytics>("payments", period, range, compRange),
};
