"use client";

import { useState, useMemo } from "react";
import { 
  Activity, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Tag, 
  AlertTriangle,
  BarChart3,
  Clock,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  AuditEventWithChanges, 
  AuditActivityFilter,
  AuditEntityType,
  AuditSeverity,
  getActionLabel,
  getSeverityColor,
  getEntityTypeLabel,
  formatAuditTimestamp,
  groupEventsByDate,
  needsAttention,
  getActorInitials,
} from "@/types/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActivityFeed } from "@/components/audit/ActivityFeed";
import { ChangeDetailSheet } from "@/components/audit/ChangeDetailSheet";

// ============================================================================
// MOCK DATA (Replace with real API calls)
// ============================================================================

const MOCK_EVENTS: AuditEventWithChanges[] = [
  {
    id: "evt-001",
    operation_id: "op-001",
    actor_id: "usr-mgr-1",
    actor_name: "Abebe Manager",
    actor_role: "MANAGER",
    action: "MENU_ITEM_PRICE_CHANGED",
    entity_type: "MENU_ITEM",
    entity_id: "item-bev-02",
    entity_name: "Signature Double Macchiato",
    description: "Changed Cappuccino price from 120 ETB to 135 ETB",
    severity: "IMPORTANT",
    occurred_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    changes: [
      {
        field: "price",
        field_label: "Price",
        old_value: "120 ETB",
        new_value: "135 ETB",
        change_type: "UPDATED",
        sort_order: 1,
      },
      {
        field: "category",
        field_label: "Category",
        old_value: "Coffee",
        new_value: "Hot Coffee",
        change_type: "UPDATED",
        sort_order: 2,
      },
    ],
  },
  {
    id: "evt-002",
    operation_id: "op-002",
    actor_id: "usr-waiter-1",
    actor_name: "Sara Waiter",
    actor_role: "WAITER",
    action: "ORDER_COMPLETED",
    entity_type: "ORDER",
    entity_id: "ord-10482",
    entity_name: "Order #10482",
    description: "Completed Order #10482",
    severity: "NORMAL",
    occurred_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    changes: [
      {
        field: "total",
        field_label: "Total",
        old_value: undefined,
        new_value: "420 ETB",
        change_type: "ADDED",
        sort_order: 1,
      },
    ],
  },
  {
    id: "evt-003",
    operation_id: "op-003",
    actor_id: "usr-chef-1",
    actor_name: "Dawit Chef",
    actor_role: "CHEF",
    action: "ORDER_READY",
    entity_type: "ORDER",
    entity_id: "ord-10482",
    entity_name: "Order #10482",
    description: "Marked Round 2 ready",
    severity: "NORMAL",
    occurred_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 minutes ago
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    changes: [],
  },
  {
    id: "evt-004",
    operation_id: "op-004",
    actor_id: "usr-waiter-1",
    actor_name: "Sara Waiter",
    actor_role: "WAITER",
    action: "ORDER_CANCELLED",
    entity_type: "ORDER",
    entity_id: "ord-10476",
    entity_name: "Order #10476",
    description: "Cancelled Order #10476",
    severity: "SENSITIVE",
    occurred_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    changes: [
      {
        field: "reason",
        field_label: "Reason",
        old_value: undefined,
        new_value: "Customer cancelled",
        change_type: "ADDED",
        sort_order: 1,
      },
      {
        field: "total",
        field_label: "Total",
        old_value: "850 ETB",
        new_value: undefined,
        change_type: "REMOVED",
        sort_order: 2,
      },
    ],
  },
  {
    id: "evt-005",
    operation_id: "op-005",
    actor_id: "usr-mgr-1",
    actor_name: "Abebe Manager",
    actor_role: "MANAGER",
    action: "PAYMENT_VERIFIED",
    entity_type: "PAYMENT",
    entity_id: "pay-88291",
    entity_name: "Payment PAY-88291",
    description: "Verified CBE Birr payment for Order #10482",
    severity: "IMPORTANT",
    occurred_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    changes: [
      {
        field: "status",
        field_label: "Status",
        old_value: "Pending Verification",
        new_value: "Verified",
        change_type: "UPDATED",
        sort_order: 1,
      },
    ],
  },
];

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function ActivityPage() {
  const [selectedEvent, setSelectedEvent] = useState<AuditEventWithChanges | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "sensitive" | "today">("all");

  // Filter events based on active tab
  const filteredEvents = useMemo(() => {
    switch (activeTab) {
      case "sensitive":
        return MOCK_EVENTS.filter(event => needsAttention(event));
      case "today":
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return MOCK_EVENTS.filter(event => new Date(event.occurred_at) >= today);
      default:
        return MOCK_EVENTS;
    }
  }, [activeTab]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalEvents = MOCK_EVENTS.length;
    const sensitiveEvents = MOCK_EVENTS.filter(e => needsAttention(e)).length;
    const todayEvents = MOCK_EVENTS.filter(e => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(e.occurred_at) >= today;
    }).length;

    return { totalEvents, sensitiveEvents, todayEvents };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Activity className="h-6 w-6" />
            </div>
            Activity
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-2 ml-15">
            Everything that happened in your café
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-muted-foreground">Total Events</p>
                <p className="text-2xl font-black text-foreground">{stats.totalEvents}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-muted-foreground">Today</p>
                <p className="text-2xl font-black text-foreground">{stats.todayEvents}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-muted-foreground">Needs Attention</p>
                <p className="text-2xl font-black text-foreground">{stats.sensitiveEvents}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "all" ? "default" : "outline"}
          onClick={() => setActiveTab("all")}
          className="flex items-center gap-2"
        >
          <Activity className="h-4 w-4" />
          All Activity
        </Button>
        <Button
          variant={activeTab === "today" ? "default" : "outline"}
          onClick={() => setActiveTab("today")}
          className="flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          Today
        </Button>
        <Button
          variant={activeTab === "sensitive" ? "default" : "outline"}
          onClick={() => setActiveTab("sensitive")}
          className="flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          Sensitive
          {stats.sensitiveEvents > 0 && (
            <Badge variant="outline" className="text-[10px] font-bold">
              {stats.sensitiveEvents}
            </Badge>
          )}
        </Button>
      </div>

      {/* Activity Feed */}
      <ActivityFeed
        events={filteredEvents}
        onEventClick={setSelectedEvent}
        showFilters={true}
        showSearch={true}
        groupByDate={true}
      />

      {/* Change Detail Sheet */}
      <ChangeDetailSheet
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
