"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { DayCloseReport } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatETB } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { AlertTriangle, Ban, CheckCircle2, Loader2, PackageX, Printer, Undo2, Wallet } from "lucide-react";

/** Local café day as YYYY-MM-DD (never UTC — Addis is UTC+3). */
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const time = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

/**
 * End-of-day close: what came in (by method, by staff), what went back
 * (refunds, voids, cancellations — each with its reason), what is still open,
 * and the cash count against what the drawer should hold.
 */
export default function DayClosePage() {
  const [date, setDate] = useState(localToday());

  const { data: report, isLoading, isError } = useQuery<DayCloseReport>({
    queryKey: ["day-close", date],
    queryFn: () => api.reports.getDayClose(date),
    refetchInterval: 30_000,
  });


  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300 print:max-w-none">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Day close</h1>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Count the drawer, check what went back and why, and close the day.
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Input
            type="date"
            value={date}
            max={localToday()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-10 rounded-xl w-auto"
            aria-label="Day"
          />
          <Button variant="outline" className="h-10 rounded-xl gap-1.5" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {isLoading && <div className="h-40 rounded-2xl bg-muted/40 animate-pulse" />}
      {isError && (
        <Card className="p-6 text-sm text-muted-foreground">Couldn&apos;t load the day report. Check the connection and try again.</Card>
      )}

      {report && (
        <>
          {report.closed && (
            <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>
                Closed by <b>{report.closed.closedBy}</b> at {new Date(report.closed.closedAt).toLocaleString()} —
                counted {formatETB(report.closed.countedCash)}, expected {formatETB(report.closed.expectedCash)}
                {" "}(<DiffText value={report.closed.difference} />). Saving again updates it.
              </span>
            </div>
          )}

          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Stat label="Collected" value={formatETB(report.totals.collected)} />
            <Stat label="Refunded" value={formatETB(report.totals.refunded)} tone={report.totals.refunded > 0 ? "bad" : undefined} />
            <Stat label="Net taken" value={formatETB(report.totals.net)} tone="good" />
            <Stat label="Tickets" value={String(report.totals.tickets)} hint={`${formatETB(report.totals.sales)} sold`} />
            <Stat label="Voided" value={formatETB(report.totals.voidValue)} tone={report.totals.voidValue > 0 ? "bad" : undefined}
              hint={`${report.voids.length} line${report.voids.length === 1 ? "" : "s"}`} />
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            {/* Cash drawer — keyed so it re-fills from a saved close when the day changes. */}
            <CashDrawer key={`${report.date}:${report.closed?.closedAt ?? ""}`} report={report} />

            {/* Money by method / staff */}
            <Card className="lg:col-span-3 p-5 rounded-2xl space-y-5">
              <Section title="By payment method">
                <MoneyTable
                  head={["Method", "Payments", "In", "Refunded", "Net"]}
                  rows={report.byMethod.map((m) => [m.method, String(m.count), formatETB(m.collected), formatETB(m.refunded), formatETB(m.net)])}
                  empty="No payments recorded this day."
                />
              </Section>
              <Section title="Money collected by staff">
                <MoneyTable
                  head={["Staff", "Payments", "Net", "Cash to hand in"]}
                  rows={report.byStaff.map((s) => [s.name, String(s.count), formatETB(s.net), formatETB(s.cash)])}
                  empty="No payments recorded this day."
                />
              </Section>
              <Section title="Sales by waiter (tickets taken)">
                <MoneyTable
                  head={["Waiter", "Tickets", "Sales"]}
                  rows={report.byWaiter.map((w) => [w.name, String(w.orders), formatETB(w.sales)])}
                  empty="No tickets this day."
                />
              </Section>
            </Card>
          </div>

          {report.openTickets.length > 0 && (
            <Card className="p-5 rounded-2xl border-amber-500/40 bg-amber-500/5 space-y-3">
              <h2 className="text-sm font-black flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" /> {report.openTickets.length} ticket{report.openTickets.length === 1 ? "" : "s"} still open
              </h2>
              <MoneyTable
                head={["Ticket", "Where", "Status", "Total", "Still owed"]}
                rows={report.openTickets.map((t) => [`#${t.ticket}`, t.table, t.status.toLowerCase(), formatETB(t.total), formatETB(t.balanceDue)])}
              />
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-5 rounded-2xl space-y-3">
              <h2 className="text-sm font-black flex items-center gap-2"><Ban className="h-4 w-4" /> Voids &amp; cancellations</h2>
              {report.voids.length === 0 && report.cancelledTickets.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing voided or cancelled.</p>
              ) : (
                <ul className="space-y-2">
                  {report.cancelledTickets.map((c) => (
                    <ReasonLine key={`t-${c.orderId}`} title={`Ticket #${c.ticket} cancelled`} reason={c.reason} meta={`${c.by} · ${time(c.at)}`} />
                  ))}
                  {report.voids.map((v, i) => (
                    <ReasonLine
                      key={`v-${i}`}
                      title={`#${v.ticket} · ${v.quantity}× ${v.name}`}
                      amount={formatETB(v.value)}
                      reason={v.reason || "No reason given"}
                      meta={`${v.by} · ${time(v.at)}${v.wasCooked ? " · was cooked" : ""}`}
                    />
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5 rounded-2xl space-y-3">
              <h2 className="text-sm font-black flex items-center gap-2"><Undo2 className="h-4 w-4" /> Refunds</h2>
              {report.refunds.length === 0 ? (
                <p className="text-xs text-muted-foreground">No refunds.</p>
              ) : (
                <ul className="space-y-2">
                  {report.refunds.map((r, i) => (
                    <ReasonLine key={i} title={`#${r.ticket} · ${r.method}`} amount={formatETB(r.amount)} reason={r.reason} meta={`${r.by} · ${time(r.at)}`} />
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {report.outOfStock.length > 0 && (
            <Card className="p-5 rounded-2xl space-y-2">
              <h2 className="text-sm font-black flex items-center gap-2"><PackageX className="h-4 w-4" /> Stock at or below zero</h2>
              <p className="text-xs text-muted-foreground">Used by menu recipes. Restock or correct the count on Products &amp; Stock.</p>
              <div className="flex flex-wrap gap-2">
                {report.outOfStock.map((p) => (
                  <span key={p.id} className="px-2.5 py-1 rounded-lg border text-xs font-semibold">
                    {p.name} <span className="font-mono text-red-600 dark:text-red-400">{p.stock} {p.unit}</span>
                  </span>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
  return (
    <Card className="p-4 rounded-2xl">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-xl font-black font-mono", tone === "good" && "text-primary", tone === "bad" && "text-red-600 dark:text-red-400")}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

function DiffText({ value }: { value: number }) {
  const v = Math.round(value * 100) / 100;
  if (v === 0) return <span className="text-primary">Balanced</span>;
  if (v < 0) return <span className="text-red-600 dark:text-red-400">Short by {formatETB(-v)}</span>;
  return <span className="text-amber-700 dark:text-amber-400">Over by {formatETB(v)}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function MoneyTable({ head, rows, empty }: { head: string[]; rows: string[][]; empty?: string }) {
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {head.map((h, i) => (
              <th key={h} className={cn("py-1.5 font-bold", i === 0 ? "text-left" : "text-right")}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={cn("py-2", j === 0 ? "font-semibold" : "text-right font-mono")}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReasonLine({ title, reason, meta, amount }: { title: string; reason: string; meta: string; amount?: string }) {
  return (
    <li className="p-2.5 rounded-xl border text-sm">
      <div className="flex justify-between gap-2">
        <span className="font-semibold">{title}</span>
        {amount && <span className="font-mono font-bold text-red-600 dark:text-red-400 shrink-0">{amount}</span>}
      </div>
      <div className="text-xs mt-0.5">{reason}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{meta}</div>
    </li>
  );
}

function CashDrawer({ report }: { report: DayCloseReport }) {
  const queryClient = useQueryClient();
  const [counted, setCounted] = useState(report.closed ? String(report.closed.countedCash) : "");
  const [notes, setNotes] = useState(report.closed?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const closeDay = useMutation({
    mutationFn: () => api.reports.closeDay({ date: report.date, countedCash: Number(counted), notes }),
    onSuccess: (data) => {
      queryClient.setQueryData(["day-close", report.date], data);
      setError(null);
    },
    onError: (err: Error) => setError(err.message || "Couldn't save the day close."),
  });

  const diff = counted !== "" ? Number(counted) - report.cash.expected : null;

  return (
    <Card className="lg:col-span-2 p-5 rounded-2xl space-y-4">
      <h2 className="text-sm font-black flex items-center gap-2"><Wallet className="h-4 w-4" /> Cash drawer</h2>
      <dl className="space-y-1.5 text-sm">
        <Row label="Cash taken" value={formatETB(report.cash.in)} />
        <Row label="Cash refunds" value={`−${formatETB(report.cash.refunds)}`} />
        <Row label="Paid out (cash expenses)" value={`−${formatETB(report.cash.expenses)}`} />
        <div className="flex justify-between pt-2 border-t font-black">
          <dt>Should be in the drawer</dt>
          <dd className="font-mono">{formatETB(report.cash.expected)}</dd>
        </div>
      </dl>
      <p className="text-[11px] text-muted-foreground">Not counting the opening float — add it to what you count, or leave it out of both.</p>

      <div className="space-y-2 print:hidden">
        <label htmlFor="counted" className="text-xs font-bold">Cash counted</label>
        <Input
          id="counted"
          type="number"
          min={0}
          step="0.01"
          value={counted}
          onChange={(e) => setCounted(e.target.value)}
          className="h-11 rounded-xl font-mono font-bold"
          placeholder="0.00"
        />
        {diff !== null && !Number.isNaN(diff) && (
          <p className="text-xs font-bold"><DiffText value={diff} /></p>
        )}
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional) — e.g. 50 ETB float kept"
          className="h-10 rounded-xl"
        />
        {error && <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>}
        <Button
          className="w-full h-11 rounded-xl font-bold gap-1.5"
          disabled={counted === "" || Number(counted) < 0 || closeDay.isPending}
          onClick={() => closeDay.mutate()}
        >
          {closeDay.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {report.closed ? "Update day close" : "Close the day"}
        </Button>
      </div>
    </Card>
  );
}
