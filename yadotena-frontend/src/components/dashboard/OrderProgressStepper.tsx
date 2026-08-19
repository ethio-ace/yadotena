"use client";

import { OrderStatus } from "@/types";
import { Check, Clock, Utensils, CheckCircle2, AlertCircle } from "lucide-react";

interface OrderProgressStepperProps {
  status: OrderStatus;
  className?: string;
}

export function OrderProgressStepper({ status, className = "" }: OrderProgressStepperProps) {
  const steps: Array<{ key: OrderStatus | "SERVED_STEP"; label: string; sub: string }> = [
    { key: "PENDING", label: "Received", sub: "Pending Review" },
    { key: "PREPARING", label: "Preparing", sub: "In Kitchen" },
    { key: "READY", label: "Ready", sub: "Ready to Serve" },
    { key: "SERVED_STEP", label: "Served", sub: "Served / Settled" },
  ];

  const getStepIndex = (st: OrderStatus): number => {
    switch (st) {
      case "PENDING":
        return 0;
      case "PREPARING":
        return 1;
      case "READY":
        return 2;
      case "SERVED":
      case "COMPLETED":
        return 3;
      case "CANCELLED":
        return -1;
      default:
        return 0;
    }
  };

  const currentIdx = getStepIndex(status);

  if (status === "CANCELLED") {
    return (
      <div className={`p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-2 ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span>Order Cancelled / Rejected</span>
      </div>
    );
  }

  // Calculate progress percentage
  const progressPercent = Math.min(100, Math.max(0, (currentIdx / (steps.length - 1)) * 100));

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header Badge */}
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-bold uppercase tracking-wider text-muted-foreground">Order Status Tracker</span>
        <span className="font-bold text-xs px-2.5 py-0.5 rounded-full border bg-card shadow-sm">
          {status === "PENDING" && <span className="text-amber-600 dark:text-amber-400">⏳ Order Received — Pending Staff Review</span>}
          {status === "PREPARING" && <span className="text-purple-600 dark:text-purple-400">🔥 In Kitchen Preparation</span>}
          {status === "READY" && <span className="text-emerald-600 dark:text-emerald-400">✨ Ready to Serve</span>}
          {status === "SERVED" && <span className="text-indigo-600 dark:text-indigo-400">🍽️ Served to Table</span>}
          {status === "COMPLETED" && <span className="text-emerald-600 dark:text-emerald-400">✓ Completed & Settled</span>}
        </span>
      </div>

      {/* Visual Stepper */}
      <div className="relative pt-2 pb-1">
        {/* Background track */}
        <div className="absolute top-5 left-4 right-4 h-1 bg-muted rounded-full z-0" />
        {/* Filled track */}
        <div
          className="absolute top-5 left-4 h-1 bg-amber-500 rounded-full z-0 transition-all duration-500"
          style={{ width: `calc(${progressPercent}% * 0.88)` }}
        />

        {/* Nodes */}
        <div className="relative z-10 flex justify-between">
          {steps.map((step, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;

            return (
              <div key={step.key} className="flex flex-col items-center text-center max-w-[75px]">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCurrent
                      ? "bg-amber-500 text-zinc-950 ring-4 ring-amber-500/20 shadow-md scale-110"
                      : isDone
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : isCurrent ? (
                    <span className="font-extrabold">{idx + 1}</span>
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span className={`text-[10px] font-bold mt-1.5 line-clamp-1 ${isCurrent ? "text-foreground" : isDone ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
