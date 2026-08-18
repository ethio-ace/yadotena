"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Tag, 
  AlertTriangle,
  Activity,
  ChevronDown,
  ChevronRight,
  Eye,
  Clock,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ============================================================================
// PROPS
// ============================================================================

interface ActivityFeedProps {
  events: AuditEventWithChanges[];
  onEventClick?: (event: AuditEventWithChanges) => void;
  onFilterChange?: (filter: AuditActivityFilter) => void;
  isLoading?: boolean;
  showFilters?: boolean;
  showSearch?: boolean;
  groupByDate?: boolean;
  limit?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ActivityFeed({
  events,
  onEventClick,
  onFilterChange,
  isLoading = false,
  showFilters = true,
  showSearch = true,
  groupByDate = true,
  limit,
}: ActivityFeedProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntityType, setSelectedEntityType] = useState<AuditEntityType | "all">("all");
  const [selectedSeverity, setSelectedSeverity] = useState<AuditSeverity | "all">("all");
  const [selectedActor, setSelectedActor] = useState<string>("all");
  const [showSensitiveOnly, setShowSensitiveOnly] = useState(false);

  // Get unique actors from events
  const uniqueActors = useMemo(() => {
    const actors = new Set(events.map(e => e.actor_name));
    return Array.from(actors).sort();
  }, [events]);

  // Get unique entity types from events
  const uniqueEntityTypes = useMemo(() => {
    const types = new Set(events.map(e => e.entity_type));
    return Array.from(types).sort();
  }, [events]);

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    let result = events;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(event => 
        event.description.toLowerCase().includes(query) ||
        event.actor_name.toLowerCase().includes(query) ||
        (event.entity_name && event.entity_name.toLowerCase().includes(query)) ||
        getActionLabel(event.action).toLowerCase().includes(query)
      );
    }

    // Entity type filter
    if (selectedEntityType !== "all") {
      result = result.filter(event => event.entity_type === selectedEntityType);
    }

    // Severity filter
    if (selectedSeverity !== "all") {
      result = result.filter(event => event.severity === selectedSeverity);
    }

    // Actor filter
    if (selectedActor !== "all") {
      result = result.filter(event => event.actor_name === selectedActor);
    }

    // Sensitive only filter
    if (showSensitiveOnly) {
      result = result.filter(event => needsAttention(event));
    }

    // Apply limit
    if (limit && result.length > limit) {
      result = result.slice(0, limit);
    }

    return result;
  }, [events, searchQuery, selectedEntityType, selectedSeverity, selectedActor, showSensitiveOnly, limit]);

  // Group events by date if enabled
  const groupedEvents = useMemo(() => {
    if (!groupByDate) return null;
    return groupEventsByDate(filteredEvents);
  }, [filteredEvents, groupByDate]);

  // Handle filter changes
  const handleFilterChange = (newFilter: Partial<AuditActivityFilter>) => {
    if (onFilterChange) {
      onFilterChange({
        entity_type: selectedEntityType !== "all" ? selectedEntityType : undefined,
        severity: selectedSeverity !== "all" ? selectedSeverity : undefined,
        search: searchQuery || undefined,
        limit,
      });
    }
  };

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    handleFilterChange({ search: value });
  };

  // Handle entity type filter change
  const handleEntityTypeChange = (value: string) => {
    const entityType = value as AuditEntityType | "all";
    setSelectedEntityType(entityType);
    handleFilterChange({ entity_type: entityType !== "all" ? entityType : undefined });
  };

  // Handle severity filter change
  const handleSeverityChange = (value: string) => {
    const severity = value as AuditSeverity | "all";
    setSelectedSeverity(severity);
    handleFilterChange({ severity: severity !== "all" ? severity : undefined });
  };

  // Handle actor filter change
  const handleActorChange = (value: string) => {
    setSelectedActor(value);
  };

  // Handle sensitive only toggle
  const handleSensitiveOnlyToggle = () => {
    setShowSensitiveOnly(!showSensitiveOnly);
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted/40 border rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  // Render empty state
  if (filteredEvents.length === 0) {
    return (
      <div className="bg-card border rounded-2xl p-8 shadow-sm text-center">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-black text-foreground">No activity found</h3>
        <p className="text-sm text-muted-foreground mt-2">
          {searchQuery 
            ? "No results match your search criteria"
            : "No activity recorded for the selected filters"
          }
        </p>
      </div>
    );
  }

  // Render event item
  const renderEvent = (event: AuditEventWithChanges) => (
    <div
      key={event.id}
      className={cn(
        "bg-card border rounded-2xl p-4 shadow-sm transition-all hover:shadow-md cursor-pointer",
        needsAttention(event) && "border-amber-500/30 bg-amber-500/5"
      )}
      onClick={() => onEventClick?.(event)}
    >
      <div className="flex items-start gap-3">
        {/* Actor Avatar */}
        <div className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
          needsAttention(event)
            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
            : "bg-primary/10 text-primary"
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
            {needsAttention(event) && (
              <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                SENSITIVE
              </Badge>
            )}
          </div>

          <p className="text-sm text-foreground mt-1 font-medium">
            {getActionLabel(event.action)}
            {event.entity_name && (
              <span className="text-muted-foreground"> • {event.entity_name}</span>
            )}
          </p>

          {/* Changes Preview */}
          {event.changes && event.changes.length > 0 && (
            <div className="mt-2 space-y-1">
              {event.changes.slice(0, 2).map((change, idx) => (
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
              {event.changes.length > 2 && (
                <p className="text-xs text-muted-foreground">
                  +{event.changes.length - 2} more changes
                </p>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatAuditTimestamp(event.occurred_at)}</span>
            <span>•</span>
            <span>{getEntityTypeLabel(event.entity_type)}</span>
          </div>
        </div>

        {/* Action Indicator */}
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </div>
    </div>
  );

  // Render grouped by date
  if (groupedEvents) {
    return (
      <div className="space-y-6">
        {/* Search and Filters */}
        {showFilters && (
          <div className="bg-card border rounded-2xl p-4 shadow-sm">
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              {showSearch && (
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search activity..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              )}

              {/* Entity Type Filter */}
              <Select value={selectedEntityType} onValueChange={handleEntityTypeChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {uniqueEntityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {getEntityTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Severity Filter */}
              <Select value={selectedSeverity} onValueChange={handleSeverityChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severity</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="IMPORTANT">Important</SelectItem>
                  <SelectItem value="SENSITIVE">Sensitive</SelectItem>
                  <SelectItem value="SECURITY">Security</SelectItem>
                </SelectContent>
              </Select>

              {/* Actor Filter */}
              <Select value={selectedActor} onValueChange={handleActorChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  {uniqueActors.map(actor => (
                    <SelectItem key={actor} value={actor}>
                      {actor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sensitive Only Toggle */}
              <Button
                variant={showSensitiveOnly ? "default" : "outline"}
                size="sm"
                onClick={handleSensitiveOnlyToggle}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Sensitive Only
              </Button>
            </div>
          </div>
        )}

        {/* Events by Date */}
        {Array.from(groupedEvents.entries()).map(([date, dateEvents]) => (
          <div key={date} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                {date}
              </h3>
              <div className="flex-1 h-px bg-border" />
              <Badge variant="outline" className="text-xs font-bold">
                {dateEvents.length} event{dateEvents.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="space-y-3">
              {dateEvents.map(renderEvent)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render flat list
  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      {showFilters && (
        <div className="bg-card border rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            {showSearch && (
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search activity..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            )}

            {/* Entity Type Filter */}
            <Select value={selectedEntityType} onValueChange={handleEntityTypeChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {uniqueEntityTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {getEntityTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Severity Filter */}
            <Select value={selectedSeverity} onValueChange={handleSeverityChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severity</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="IMPORTANT">Important</SelectItem>
                <SelectItem value="SENSITIVE">Sensitive</SelectItem>
                <SelectItem value="SECURITY">Security</SelectItem>
              </SelectContent>
            </Select>

            {/* Actor Filter */}
            <Select value={selectedActor} onValueChange={handleActorChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {uniqueActors.map(actor => (
                  <SelectItem key={actor} value={actor}>
                    {actor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sensitive Only Toggle */}
            <Button
              variant={showSensitiveOnly ? "default" : "outline"}
              size="sm"
              onClick={handleSensitiveOnlyToggle}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Sensitive Only
            </Button>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.map(renderEvent)}
      </div>
    </div>
  );
}
