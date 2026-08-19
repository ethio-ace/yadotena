import { Order } from "@/types";
import { DateRange, OwnerMetrics, computeCategoryReport, computeCustomers } from "@/lib/owner";

/**
 * Escapes fields for CSV format
 */
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Trigger browser download for a CSV string
 */
export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export any array of objects as a CSV file
 */
export function exportGenericCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines: string[] = [headers.map(escapeCSV).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCSV(row[h])).join(","));
  }
  downloadCSV(`${filename}_${dateSuffix()}.csv`, lines.join("\n"));
}

/**
 * Export Sales Analytics data as CSV
 */
export function exportSalesAnalyticsCSV(data: {
  period: string;
  revenue: { current: number; previous: number };
  orders: { current: number; previous: number };
  avgTicket: { current: number; previous: number };
  itemsSold: { current: number; previous: number };
  hourlySales: { hour: number; revenue: number; orders: number }[];
  categorySales: { category: string; units: number; revenue: number; share: number }[];
}) {
  const lines: string[] = [];

  lines.push("YADOTENA - SALES ANALYTICS REPORT");
  lines.push(`Period: ${data.period.toUpperCase()}`);
  lines.push(`Exported At: ${new Date().toLocaleString()}`);
  lines.push("");

  lines.push("SUMMARY METRICS");
  lines.push("Metric,Current,Previous");
  lines.push(`Total Revenue,${data.revenue.current.toFixed(2)} ETB,${data.revenue.previous.toFixed(2)} ETB`);
  lines.push(`Total Orders,${data.orders.current},${data.orders.previous}`);
  lines.push(`Average Ticket,${data.avgTicket.current.toFixed(2)} ETB,${data.avgTicket.previous.toFixed(2)} ETB`);
  lines.push(`Items Sold,${data.itemsSold.current},${data.itemsSold.previous}`);
  lines.push("");

  lines.push("HOURLY SALES BREAKDOWN");
  lines.push("Hour,Revenue (ETB),Orders");
  for (const h of data.hourlySales) {
    lines.push(`"${fmtHour(h.hour)}",${h.revenue.toFixed(2)},${h.orders}`);
  }
  lines.push("");

  lines.push("CATEGORY PERFORMANCE");
  lines.push("Category,Units Sold,Revenue (ETB),Share (%)");
  for (const c of data.categorySales) {
    lines.push(`"${c.category}",${c.units},${c.revenue.toFixed(2)},${c.share.toFixed(1)}%`);
  }

  downloadCSV(`yadotena_sales_analytics_${data.period}_${dateSuffix()}.csv`, lines.join("\n"));
}

/**
 * Export Reports Hub Active Tab data as CSV
 */
export function exportReportTabCSV(
  activeTab: string,
  range: DateRange,
  metrics: OwnerMetrics,
  orders: Order[],
  rawExpenses?: { id: string; amount: number; category: string; description: string; date: string; paymentMethod?: string }[],
  addonsMap?: Map<string, { name: string; price: number }>
) {
  const lines: string[] = [];
  const rangeLabel = `${range.from} to ${range.to}`;

  if (activeTab === "sales") {
    lines.push("YADOTENA - DAILY SALES BREAKDOWN REPORT");
    lines.push(`Date Range: ${rangeLabel}`);
    lines.push("Date,Revenue (ETB),Expenses (ETB),Net Profit (ETB)");
    metrics.daily.forEach((d, i) => {
      const exp = metrics.dailyExpenses[i]?.amount ?? 0;
      const net = d.revenue - exp;
      lines.push(`"${d.date}",${d.revenue.toFixed(2)},${exp.toFixed(2)},${net.toFixed(2)}`);
    });
  } else if (activeTab === "addons") {
    lines.push("YADOTENA - ADD-ON POPULARITY REPORT");
    lines.push(`Date Range: ${rangeLabel}`);
    lines.push("Add-on Name,Units Sold,Order Count,Est Revenue (ETB)");

    const map = new Map<string, { name: string; units: number; orderCount: number; revenue: number }>();
    const filtered = orders.filter(
      (o) =>
        (o.paymentStatus === "PAID" || o.status === "COMPLETED" || o.status === "SERVED") &&
        o.createdAt &&
        new Date(o.createdAt) >= new Date(range.fromInstant) &&
        new Date(o.createdAt) <= new Date(range.toInstant)
    );

    for (const o of filtered) {
      for (const item of o.items ?? []) {
        const itemQty = item.quantity || 1;
        for (const addonId of item.selectedAddons ?? []) {
          const isObj = typeof addonId === "object" && addonId !== null;
          const id = isObj ? (addonId as any).id || String(addonId) : String(addonId);
          const master = addonsMap?.get(id);
          const name = master?.name || (isObj ? (addonId as any).name : id);
          const price = master?.price ?? (isObj ? (addonId as any).price : 0);

          const cur = map.get(id) ?? { id, name, units: 0, orderCount: 0, revenue: 0 };
          cur.name = name;
          cur.units += itemQty;
          cur.orderCount += 1;
          cur.revenue += price * itemQty;
          map.set(id, cur);
        }
      }
    }

    [...map.values()]
      .sort((a, b) => b.units - a.units)
      .forEach((a) => {
        lines.push(`"${a.name}",${a.units},${a.orderCount},${a.revenue.toFixed(2)}`);
      });
  } else if (activeTab === "categories") {
    lines.push("YADOTENA - CATEGORY PERFORMANCE REPORT");
    lines.push(`Date Range: ${rangeLabel}`);
    lines.push("Category,Units Sold,Revenue (ETB)");
    const cats = computeCategoryReport({ range, orders });
    cats.forEach((c) => {
      lines.push(`"${c.category}",${c.quantity},${c.revenue.toFixed(2)}`);
    });
  } else if (activeTab === "customers") {
    lines.push("YADOTENA - CUSTOMER SALES ATTRIBUTION REPORT");
    lines.push(`Date Range: ${rangeLabel}`);
    lines.push("Customer Name,Phone Number,Total Paid Orders,Total Spent (ETB)");
    const custs = computeCustomers({ range, orders });
    custs.forEach((c) => {
      lines.push(`"${c.name}","${c.phone || "N/A"}",${c.orders},${c.revenue.toFixed(2)}`);
    });
  } else if (activeTab === "expenses") {
    lines.push("YADOTENA - EXPENSE MANAGEMENT REPORT");
    lines.push(`Date Range: ${rangeLabel}`);
    lines.push("Date,Category,Description,Payment Method,Amount (ETB)");
    (rawExpenses || [])
      .filter((e) => e.date >= range.from && e.date <= range.to)
      .forEach((e) => {
        lines.push(`"${e.date}","${e.category}","${e.description}","${e.paymentMethod || "N/A"}",${e.amount.toFixed(2)}`);
      });
  } else {
    // Default summary
    lines.push("YADOTENA - OVERVIEW SUMMARY REPORT");
    lines.push(`Date Range: ${rangeLabel}`);
    lines.push(`Total Revenue: ${metrics.revenue.toFixed(2)} ETB`);
    lines.push(`Total Paid Orders: ${metrics.paidOrders}`);
    lines.push(`Average Ticket: ${metrics.averageTicket.toFixed(2)} ETB`);
    lines.push(`Total Expenses: ${metrics.expenses.toFixed(2)} ETB`);
    lines.push(`Net Operating Profit: ${metrics.revenueMinusExpenses.toFixed(2)} ETB`);
  }

  downloadCSV(`yadotena_report_${activeTab}_${dateSuffix()}.csv`, lines.join("\n"));
}

/**
 * Export Full Multi-Section Reports Hub Document as CSV
 */
export function exportFullReportCSV(
  range: DateRange,
  metrics: OwnerMetrics,
  orders: Order[],
  rawExpenses?: { id: string; amount: number; category: string; description: string; date: string; paymentMethod?: string }[]
) {
  const lines: string[] = [];
  const rangeLabel = `${range.from} to ${range.to}`;

  lines.push("=========================================================");
  lines.push("YADOTENA RESTAURANT & SHOP - FULL OPERATIONAL & FINANCIAL REPORT");
  lines.push(`Date Range: ${rangeLabel}`);
  lines.push(`Generated At: ${new Date().toLocaleString()}`);
  lines.push("=========================================================");
  lines.push("");

  lines.push("SECTION 1: KEY PERFORMANCE INDICATORS");
  lines.push(`Gross Sales Revenue,${metrics.revenue.toFixed(2)} ETB`);
  lines.push(`Paid Orders Count,${metrics.paidOrders}`);
  lines.push(`Average Order Ticket,${metrics.averageTicket.toFixed(2)} ETB`);
  lines.push(`Total Recorded Expenses,${metrics.expenses.toFixed(2)} ETB`);
  lines.push(`Net Operating Profit,${metrics.revenueMinusExpenses.toFixed(2)} ETB`);
  lines.push(`Unpaid Orders Count,${metrics.unpaidOrders}`);
  lines.push("");

  lines.push("SECTION 2: DAILY SALES BREAKDOWN");
  lines.push("Date,Revenue (ETB),Expenses (ETB),Net Profit (ETB)");
  metrics.daily.forEach((d, i) => {
    const exp = metrics.dailyExpenses[i]?.amount ?? 0;
    const net = d.revenue - exp;
    lines.push(`"${d.date}",${d.revenue.toFixed(2)},${exp.toFixed(2)},${net.toFixed(2)}`);
  });
  lines.push("");

  lines.push("SECTION 3: CATEGORY SALES PERFORMANCE");
  lines.push("Category,Units Sold,Revenue (ETB)");
  const cats = computeCategoryReport({ range, orders });
  cats.forEach((c) => {
    lines.push(`"${c.category}",${c.quantity},${c.revenue.toFixed(2)}`);
  });
  lines.push("");

  lines.push("SECTION 4: CUSTOMER ATTRIBUTION");
  lines.push("Customer Name,Phone,Paid Orders,Total Spend (ETB)");
  const custs = computeCustomers({ range, orders });
  custs.forEach((c) => {
    lines.push(`"${c.name}","${c.phone || ""}",${c.orders},${c.revenue.toFixed(2)}`);
  });
  lines.push("");

  lines.push("SECTION 5: EXPENSES LOG");
  lines.push("Date,Category,Description,Method,Amount (ETB)");
  (rawExpenses || [])
    .filter((e) => e.date >= range.from && e.date <= range.to)
    .forEach((e) => {
      lines.push(`"${e.date}","${e.category}","${e.description}","${e.paymentMethod || "N/A"}",${e.amount.toFixed(2)}`);
    });

  downloadCSV(`yadotena_full_report_${dateSuffix()}.csv`, lines.join("\n"));
}

function fmtHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function dateSuffix(): string {
  return new Date().toISOString().slice(0, 10);
}
