"use client";

import { useState, useMemo } from "react";
import { 
  Clock, 
  User, 
  ChefHat, 
  CheckCircle2, 
  CreditCard, 
  XCircle,
  ArrowRight,
  Package,
  Utensils,
  MapPin,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  AuditEventWithChanges, 
  getActionLabel,
  getSeverityColor,
  formatAuditTimestamp,
  needsAttention,
  getActorInitials,
} from "@/types/audit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangeDetailSheet } from "./ChangeDetailSheet";

// ============================================================================
// TYPES
// ============================================================================

interface OrderTimelineProps {
  orderId: string;
  orderNumber: number;
  events: AuditEventWithChanges[];
  onViewRelated?: (operationId: string) => void;
  isLoading?: boolean;
}

interface TimelineEvent {
  event: AuditEventWithChanges;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OrderTimeline({
  orderId,
  orderNumber,
  events,
  onViewRelated,
  isLoading = false,
}: OrderTimelineProps) {
  const [selectedEvent, setSelectedEvent] = useState<AuditEventWithChanges | null>(null);

  // Categorize events by type
  const categorizedEvents = useMemo(() => {
    const created: AuditEventWithChanges[] = [];
    const kitchen: AuditEventWithChanges[] = [];
    const items: AuditEventWithChanges[] = [];
    const payments: AuditEventWithChanges[] = [];
    const other: AuditEventWithChanges[] = [];

    events.forEach(event => {
      if (event.action.startsWith('ORDER_CREATED')) {
        created.push(event);
      } else if (event.action.startsWith('ORDER_') && 
                ['ORDER_SENT_TO_KITCHEN', 'ORDER_PREPARING', 'ORDER_READY', 'ORDER_SERVED'].includes(event.action)) {
        kitchen.push(event);
      } else if (event.action.startsWith('ORDER_ITEM') || event.action.startsWith('ORDER_ROUND')) {
        items.push(event);
      } else if (event.action.startsWith('PAYMENT')) {
        payments.push(event);
      } else {
        other.push(event);
      }
    });

    return { created, kitchen, items, payments, other };
  }, [events]);

  // Get icon for event
  const getEventIcon = (action: string) => {
    if (action.startsWith('ORDER_CREATED')) {
      return <Package className="h-4 w-4" />;
    }
    if (action === 'ORDER_SENT_TO_KITCHEN') {
      return <ArrowRight className="h-4 w-4" />;
    }
    if (action === 'ORDER_PREPARING') {
      return <ChefHat className="h-4 w-4" />;
    }
    if (action === 'ORDER_READY') {
      return <CheckCircle2 className="h-4 w-4" />;
    }
    if (action === 'ORDER_SERVED') {
      return <Utensils className="h-4 w-4" />;
    }
    if (action === 'ORDER_COMPLETED') {
      return <CheckCircle2 className="h-4 w-4" />;
    }
    if (action === 'ORDER_CANCELLED') {
      return <XCircle className="h-4 w-4" />;
    }
    if (action.startsWith('PAYMENT')) {
      return <CreditCard className="h-4 w-4" />;
    }
    if (action.startsWith('ORDER_ITEM') || action.startsWith('ORDER_ROUND')) {
      return <Package className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  // Get icon color based on action
  const getEventIconColor = (action: string) => {
    if (action === 'ORDER_CANCELLED') {
      return 'text-rose-500';
    }
    if (action === 'ORDER_COMPLETED' || action === 'ORDER_SERVED' || action === 'ORDER_READY') {
      return 'text-emerald-500';
    }
    if (action.startsWith('PAYMENT')) {
      return 'text-blue-500';
    }
    if (action === 'ORDER_PREPARING') {
      return 'text-amber-500';
    }
    return 'text-primary';
  };

  // Get icon background color
  const getEventIconBg = (action: string) => {
    if (action === 'ORDER_CANCELLED') {
      return 'bg-rose-500/10';
    }
    if (action === 'ORDER_COMPLETED' || action === 'ORDER_SERVED' || action === 'ORDER_READY') {
      return 'bg-emerald-500/10';
    }
    if (action.startsWith('PAYMENT')) {
      return 'bg-blue-500/10';
    }
    if (action === 'ORDER_PREPARING') {
      return 'bg-amber-500/10';
    }
    return 'bg-primary/10';
  };

  // Render timeline event
  const renderTimelineEvent = (event: AuditEventWithChanges, isLast: boolean) => (
    <div key={event.id} className="relative flex items-start gap-4 pb-6">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
      )}

      {/* Timeline Icon */}
      <div className={cn(
        "relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0",
        getEventIconBg(event.action),
        getEventIconColor(event.action)
      )}>
        {getEventIcon(event.action)}
      </div>

      {/* Event Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-foreground">{getActionLabel(event.action)}</span>
          {needsAttention(event) && (
            <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
              SENSITIVE
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{event.actor_name}</span>
          <span>•</span>
          <span>{formatAuditTimestamp(event.occurred_at)}</span>
        </div>

        {/* Changes Preview */}
        {event.changes && event.changes.length > 0 && (
          <div className="mt-2 space-y-1">
            {event.changes.map((change, idx) => (
              <div key={idx} className="text-xs text-muted-foreground">
                <span className="font-medium">{change.field_label}:</span>{" "}
                {change.change_type === "UPDATED" && (
                  <span>
                    <span className="line-through text-rose-500">{change.old_value}</span>
                    {" → "}
                    <span className="text-emerald-600 dark:text-emerald-400">{change.new_value}</span>
                  </span>
                )}
                {change.change_type === "ADDED" && (
                  <span className="text-emerald-600 dark:text-emerald-400">+ {change.new_value}</span>
                )}
                {change.change_type === "REMOVED" && (
                  <span className="text-rose-500">- {change.old_value}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* View Details Button */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-7 text-xs"
          onClick={() => setSelectedEvent(event)}
        >
          View Details
        </Button>
      </div>
    </div>
  );

  // Render loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Order Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted/40 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render empty state
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Order Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-black text-foreground">No timeline</h3>
            <p className="text-sm text-muted-foreground mt-2">
              No activity recorded for this order
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Order Timeline
            </div>
            <Badge variant="outline" className="text-xs font-bold">
              #{orderNumber}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Order Created */}
            {categorizedEvents.created.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Order Created
                </h4>
                {categorizedEvents.created.map((event, idx) => (
                  renderTimelineEvent(event, idx === categorizedEvents.created.length - 1)
                ))}
              </div>
            )}

            {/* Items Added/Modified */}
            {categorizedEvents.items.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Items & Rounds
                </h4>
                {categorizedEvents.items.map((event, idx) => (
                  renderTimelineEvent(event, idx === categorizedEvents.items.length - 1)
                ))}
              </div>
            )}

            {/* Kitchen Progress */}
            {categorizedEvents.kitchen.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Kitchen Progress
                </h4>
                {categorizedEvents.kitchen.map((event, idx) => (
                  renderTimelineEvent(event, idx === categorizedEvents.kitchen.length - 1)
                ))}
              </div>
            )}

            {/* Payments */}
            {categorizedEvents.payments.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Payments
                </h4>
                {categorizedEvents.payments.map((event, idx) => (
                  renderTimelineEvent(event, idx === categorizedEvents.payments.length - 1)
                ))}
              </div>
            )}

            {/* Other Events */}
            {categorizedEvents.other.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Other Activity
                </h4>
                {categorizedEvents.other.map((event, idx) => (
                  renderTimelineEvent(event, idx === categorizedEvents.other.length - 1)
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Detail Sheet */}
      <ChangeDetailSheet
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onViewRelated={onViewRelated}
      />
    </>
  );
}
