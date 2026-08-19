"use client";

import { MetricDelta } from "@/services/analytics";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatETB } from "@/lib/currency";

interface MetricCardProps {
  label: string;
  metric: MetricDelta;
  format?: "currency" | "number" | "decimal";
  icon?: React.ReactNode;
}

export function MetricCard({ label, metric, format = "number", icon }: MetricCardProps) {
  const formatValue = (val: number) => {
    if (format === "currency") return formatETB(val);
    if (format === "decimal") return val.toFixed(1);
    return val.toLocaleString();
  };

  const isPositive = metric.delta > 0;
  const isNegative = metric.delta < 0;
  const hasChange = metric.delta !== 0 && metric.previous !== 0;

  return (
    <div className="p-4 rounded-xl border bg-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      
      <div className="text-2xl font-black leading-none mb-1">
        {formatValue(metric.current)}
      </div>

      {hasChange && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${
          isPositive ? "text-emerald-600 dark:text-emerald-400" : 
          isNegative ? "text-red-600 dark:text-red-400" : 
          "text-muted-foreground"
        }`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : 
           isNegative ? <TrendingDown className="h-3 w-3" /> : 
           <Minus className="h-3 w-3" />}
          <span>{isPositive ? "+" : ""}{formatValue(metric.delta)}</span>
          <span className="text-muted-foreground">({isPositive ? "+" : ""}{metric.pctChange.toFixed(1)}%)</span>
        </div>
      )}

      {metric.previous > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1">
          vs {formatValue(metric.previous)} previous
        </p>
      )}
    </div>
  );
}
