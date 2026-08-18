"use client";

import { 
  X, 
  Clock, 
  User, 
  Hash, 
  ArrowRight, 
  ArrowDown,
  CheckCircle2,
  XCircle,
  Minus,
  Plus,
  AlertTriangle,
  Shield,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  AuditEventWithChanges, 
  AuditChange,
  getActionLabel,
  getSeverityColor,
  getEntityTypeLabel,
  formatAuditTimestamp,
  getActorInitials,
} from "@/types/audit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// ============================================================================
// PROPS
// ============================================================================

interface ChangeDetailSheetProps {
  event: AuditEventWithChanges | null;
  isOpen: boolean;
  onClose: () => void;
  onViewRelated?: (operationId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ChangeDetailSheet({
  event,
  isOpen,
  onClose,
  onViewRelated,
}: ChangeDetailSheetProps) {
  if (!event) return null;

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'SENSITIVE':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'SECURITY':
        return <Shield className="h-4 w-4 text-purple-500" />;
      case 'IMPORTANT':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  // Render change diff
  const renderChangeDiff = (change: AuditChange) => {
    if (change.change_type === 'UPDATED') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{change.field_label}</span>
          </div>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
            {/* Old Value */}
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-3 w-3 text-rose-500" />
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Before</span>
              </div>
              <p className="text-sm font-medium text-foreground">{change.old_value}</p>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            {/* New Value */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">After</span>
              </div>
              <p className="text-sm font-medium text-foreground">{change.new_value}</p>
            </div>
          </div>
        </div>
      );
    }

    if (change.change_type === 'ADDED') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{change.field_label}</span>
            <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
              ADDED
            </Badge>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Plus className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">New</span>
            </div>
            <p className="text-sm font-medium text-foreground">{change.new_value}</p>
          </div>
        </div>
      );
    }

    if (change.change_type === 'REMOVED') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{change.field_label}</span>
            <Badge variant="outline" className="text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30">
              REMOVED
            </Badge>
          </div>
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Minus className="h-3 w-3 text-rose-500" />
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Old</span>
            </div>
            <p className="text-sm font-medium text-foreground line-through text-muted-foreground">{change.old_value}</p>
          </div>
        </div>
      );
    }

    // UNCHANGED
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{change.field_label}</span>
          <Badge variant="outline" className="text-[10px] font-bold bg-muted text-muted-foreground">
            UNCHANGED
          </Badge>
        </div>
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-sm text-muted-foreground">{change.old_value}</p>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:w-[400px] sm:max-w-[400px] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <SheetTitle className="text-lg font-black text-foreground">
                  {getActionLabel(event.action)}
                </SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground mt-1">
                  {event.entity_name || getEntityTypeLabel(event.entity_type)}
                </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Content */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {/* Actor Information */}
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold",
                  "bg-primary/10 text-primary"
                )}>
                  {getActorInitials(event.actor_name)}
                </div>
                <div>
                  <p className="font-bold text-foreground">{event.actor_name}</p>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px] font-bold", getSeverityColor(event.severity))}
                    >
                      {event.actor_role}
                    </Badge>
                    {event.severity !== 'NORMAL' && (
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px] font-bold", getSeverityColor(event.severity))}
                      >
                        {event.severity}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatAuditTimestamp(event.occurred_at)}</span>
              </div>

              {/* Description */}
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm text-foreground">{event.description}</p>
              </div>

              {/* Changes */}
              {event.changes && event.changes.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-foreground uppercase tracking-wider">
                    Changes
                  </h4>
                  <div className="space-y-4">
                    {event.changes.map((change, idx) => (
                      <div key={idx} className="border border-border rounded-xl p-4">
                        {renderChangeDiff(change)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reason (if provided) */}
              {event.before_snapshot?.reason && (
                <div className="space-y-2">
                  <h4 className="text-sm font-black text-foreground uppercase tracking-wider">
                    Reason
                  </h4>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <p className="text-sm text-foreground">{event.before_snapshot.reason}</p>
                  </div>
                </div>
              )}

              {/* Related Entities */}
              {event.related_entity_type && event.related_entity_id && (
                <div className="space-y-2">
                  <h4 className="text-sm font-black text-foreground uppercase tracking-wider">
                    Related Entity
                  </h4>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {getEntityTypeLabel(event.related_entity_type as any)}:
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {event.related_entity_name || event.related_entity_id}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Operation Reference */}
              <div className="space-y-2">
                <h4 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Operation
                </h4>
                <div className="bg-muted/50 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-mono text-foreground">
                      {event.operation_id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>

              {/* View Related Activity Button */}
              {onViewRelated && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onViewRelated(event.operation_id)}
                >
                  View Related Activity
                </Button>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
