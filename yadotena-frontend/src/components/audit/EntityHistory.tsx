"use client";

import { useState, useMemo } from "react";
import { 
  History, 
  Clock, 
  User, 
  ChevronDown,
  ChevronRight,
  Eye,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  AuditEventWithChanges, 
  AuditEntityType,
  getActionLabel,
  getSeverityColor,
  getEntityTypeLabel,
  formatAuditTimestamp,
  groupEventsByDate,
  needsAttention,
  getActorInitials,
} from "@/types/audit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangeDetailSheet } from "./ChangeDetailSheet";

// ============================================================================
// PROPS
// ============================================================================

interface EntityHistoryProps {
  entityType: AuditEntityType;
  entityId: string;
  entityName: string;
  events: AuditEventWithChanges[];
  onViewRelated?: (operationId: string) => void;
  isLoading?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EntityHistory({
  entityType,
  entityId,
  entityName,
  events,
  onViewRelated,
  isLoading = false,
}: EntityHistoryProps) {
  const [selectedEvent, setSelectedEvent] = useState<AuditEventWithChanges | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Group events by date
  const groupedEvents = useMemo(() => {
    return groupEventsByDate(events);
  }, [events]);

  // Toggle date expansion
  const toggleDateExpansion = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  // Render event timeline item
  const renderTimelineEvent = (event: AuditEventWithChanges, isLast: boolean) => (
    <div key={event.id} className="relative flex items-start gap-4 pb-6">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
      )}

      {/* Timeline Dot */}
      <div className={cn(
        "relative z-10 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
        needsAttention(event)
          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-2 border-amber-500/30"
          : "bg-primary/10 text-primary border-2 border-primary/30"
      )}>
        {getActorInitials(event.actor_name)}
      </div>

      {/* Event Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-foreground">{event.actor_name}</span>
          <Badge 
            variant="outline" 
            className={cn("text-[10px] font-bold", getSeverityColor(event.severity))}
          >
            {event.actor_role}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatAuditTimestamp(event.occurred_at)}
          </span>
        </div>

        <p className="text-sm text-foreground mt-1 font-medium">
          {getActionLabel(event.action)}
        </p>

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
          <Eye className="h-3 w-3 mr-1" />
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
            <History className="h-5 w-5" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
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
            <History className="h-5 w-5" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-black text-foreground">No history</h3>
            <p className="text-sm text-muted-foreground mt-2">
              No activity recorded for this {getEntityTypeLabel(entityType).toLowerCase()}
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
              <History className="h-5 w-5" />
              History
            </div>
            <Badge variant="outline" className="text-xs font-bold">
              {events.length} event{events.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Entity Info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <span className="text-sm font-bold">
                  {getEntityTypeLabel(entityType).charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-bold text-foreground">{entityName}</p>
                <p className="text-xs text-muted-foreground">
                  {getEntityTypeLabel(entityType)} • ID: {entityId.slice(0, 8)}...
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              {Array.from(groupedEvents.entries()).map(([date, dateEvents]) => (
                <div key={date} className="mb-6 last:mb-0">
                  {/* Date Header */}
                  <button
                    onClick={() => toggleDateExpansion(date)}
                    className="flex items-center gap-2 mb-3 w-full text-left"
                  >
                    {expandedDates.has(date) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <h4 className="text-sm font-black text-foreground uppercase tracking-wider">
                      {date}
                    </h4>
                    <div className="flex-1 h-px bg-border" />
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {dateEvents.length}
                    </Badge>
                  </button>

                  {/* Events for this date */}
                  {(expandedDates.has(date) || expandedDates.size === 0) && (
                    <div className="ml-4">
                      {dateEvents.map((event, idx) => (
                        renderTimelineEvent(event, idx === dateEvents.length - 1)
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
