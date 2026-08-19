import { Order } from "@/types";
import { DateRange, OwnerMetrics, computeCategoryReport, parseDate } from "@/lib/owner";
import { formatETB } from "./currency";

/**
 exportFullReportPDF generates a clean, executive-styled printable PDF report
 containing complete operational & financial metrics for the selected range.
 Uses window.open() + window.print() for 100% sharp browser PDF generation.
 */
export function exportFullReportPDF(
  range: DateRange,
  metrics: OwnerMetrics,
  orders: Order[],
  rawExpenses?: { id: string; amount: number; category: string; description: string; date: string; paymentMethod?: string }[]
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to export the PDF report.");
    return;
  }

  const rangeLabel = range.display || `${range.from} to ${range.to}`;
  const generatedAt = new Date().toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "medium",
  });

  const categories = computeCategoryReport({ range, orders });
  const filteredExpenses = (rawExpenses || []).filter(
    (e) => e.date >= range.from && e.date <= range.to
  );

  const marginPct =
    metrics.revenue > 0
      ? (((metrics.revenue - metrics.expenses) / metrics.revenue) * 100).toFixed(1)
      : "0.0";

  // Paid orders channel breakdown
  const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");
  const dineIn = paidOrders.filter((o) => o.type === "DINE_IN");
  const takeaway = paidOrders.filter((o) => o.type === "TAKEAWAY");
  const delivery = paidOrders.filter((o) => o.type === "DELIVERY");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Yadotena Executive Operations Report - ${rangeLabel}</title>
  <style>
    @media print {
      @page { margin: 15mm; size: A4 portrait; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #f59e0b;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand span { color: #f59e0b; }
    .title {
      font-size: 14px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .meta {
      text-align: right;
      font-size: 12px;
      color: #475569;
    }
    .meta strong { color: #0f172a; }
    
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 28px;
      margin-bottom: 12px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .kpi-val {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      margin-top: 4px;
    }
    .kpi-sub {
      font-size: 10px;
      color: #16a34a;
      font-weight: 700;
      margin-top: 2px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 8px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      text-align: left;
      padding: 8px 10px;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    .text-right { text-align: right; }
    
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    .print-btn {
      position: fixed;
      top: 16px;
      right: 16px;
      background: #f59e0b;
      color: #78350f;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <button onclick="window.print()" class="print-btn no-print">Print / Download PDF</button>

  <div class="header">
    <div>
      <div class="brand">YADOTENA <span>MANAGEMENT</span></div>
      <div class="title">Official Executive Operations & Financial Report</div>
    </div>
    <div class="meta">
      <div>Reporting Period: <strong>${rangeLabel}</strong></div>
      <div>Generated On: <strong>${generatedAt}</strong></div>
    </div>
  </div>

  <div class="section-title">1. Executive Financial Snapshot</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Gross Revenue</div>
      <div class="kpi-val">${formatETB(metrics.revenue)}</div>
      <div class="kpi-sub">Total Paid Volume</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Operating Net Profit</div>
      <div class="kpi-val">${formatETB(metrics.revenueMinusExpenses)}</div>
      <div class="kpi-sub">${marginPct}% Operating Margin</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Paid Orders</div>
      <div class="kpi-val">${metrics.paidOrders}</div>
      <div class="kpi-sub">Completed Transactions</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Average Order Ticket</div>
      <div class="kpi-val">${formatETB(metrics.averageTicket)}</div>
      <div class="kpi-sub">Avg Spend / Guest</div>
    </div>
  </div>

  <div class="section-title">2. Fulfillment & Channel Distribution</div>
  <table>
    <thead>
      <tr>
        <th>Channel / Order Type</th>
        <th class="text-right">Completed Orders</th>
        <th class="text-right">Share of Orders (%)</th>
        <th class="text-right">Gross Revenue (ETB)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Dine-In Restaurant</strong></td>
        <td class="text-right">${dineIn.length}</td>
        <td class="text-right">${paidOrders.length > 0 ? Math.round((dineIn.length / paidOrders.length) * 100) : 0}%</td>
        <td class="text-right">${formatETB(dineIn.reduce((sum, o) => sum + (o.total || 0), 0))}</td>
      </tr>
      <tr>
        <td><strong>Takeaway & Over-the-Counter</strong></td>
        <td class="text-right">${takeaway.length}</td>
        <td class="text-right">${paidOrders.length > 0 ? Math.round((takeaway.length / paidOrders.length) * 100) : 0}%</td>
        <td class="text-right">${formatETB(takeaway.reduce((sum, o) => sum + (o.total || 0), 0))}</td>
      </tr>
      <tr>
        <td><strong>Door Delivery Service</strong></td>
        <td class="text-right">${delivery.length}</td>
        <td class="text-right">${paidOrders.length > 0 ? Math.round((delivery.length / paidOrders.length) * 100) : 0}%</td>
        <td class="text-right">${formatETB(delivery.reduce((sum, o) => sum + (o.total || 0), 0))}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">3. Category Sales Performance</div>
  <table>
    <thead>
      <tr>
        <th>Product Category</th>
        <th class="text-right">Total Units Sold</th>
        <th class="text-right">Gross Revenue (ETB)</th>
        <th class="text-right">Category Share (%)</th>
      </tr>
    </thead>
    <tbody>
      ${categories
        .map(
          (c) => `
        <tr>
          <td><strong>${c.category}</strong></td>
          <td class="text-right">${c.quantity}</td>
          <td class="text-right">${formatETB(c.revenue)}</td>
          <td class="text-right">${metrics.revenue > 0 ? ((c.revenue / metrics.revenue) * 100).toFixed(1) : 0}%</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="section-title">4. Operational Expense Audit Log</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Expense Category</th>
        <th>Description</th>
        <th>Payment Method</th>
        <th class="text-right">Amount (ETB)</th>
      </tr>
    </thead>
    <tbody>
      ${filteredExpenses.length > 0 ? filteredExpenses
        .slice(0, 50)
        .map(
          (e) => `
        <tr>
          <td>${e.date}</td>
          <td><strong>${e.category}</strong></td>
          <td>${e.description}</td>
          <td>${e.paymentMethod || "Bank Transfer"}</td>
          <td class="text-right">${formatETB(e.amount)}</td>
        </tr>`
        )
        .join("") : '<tr><td colspan="5" style="text-align:center;">No expenses recorded for this period.</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <div>Confidential · Yadotena Enterprise Management System</div>
    <div>Page 1 of 1</div>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
