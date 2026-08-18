// ============================================================================
// AUDIT SYSTEM TYPES
// ============================================================================

// Severity levels for audit events
export type AuditSeverity = 'NORMAL' | 'IMPORTANT' | 'SENSITIVE' | 'SECURITY';

// Change types for field diffs
export type AuditChangeType = 'UPDATED' | 'ADDED' | 'REMOVED' | 'UNCHANGED';

// Entity types for audit events
export type AuditEntityType = 
  | 'ORDER' 
  | 'PAYMENT' 
  | 'MENU_ITEM' 
  | 'MENU_CATEGORY' 
  | 'ADDON' 
  | 'STAFF' 
  | 'EXPENSE' 
  | 'TABLE' 
  | 'SETTING' 
  | 'PAYMENT_ACCOUNT';

// ============================================================================
// CORE INTERFACES
// ============================================================================

// Change represents a before/after field diff
export interface AuditChange {
  field: string;
  field_label: string;
  old_value?: string;
  new_value?: string;
  old_value_json?: any;
  new_value_json?: any;
  change_type: AuditChangeType;
  sort_order: number;
}

// Operation represents a business operation (Git commit equivalent)
export interface AuditOperation {
  id: string;
  description: string;
  reason?: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  session_id?: string;
  device_id?: string;
  ip_address?: string;
  user_agent?: string;
  status: string;
  occurred_at: string;
  completed_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// Event represents an immutable business action
export interface AuditEvent {
  id: string;
  operation_id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: AuditEntityType;
  entity_id: string;
  entity_name?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  related_entity_name?: string;
  before_snapshot?: Record<string, any>;
  after_snapshot?: Record<string, any>;
  description: string;
  severity: AuditSeverity;
  occurred_at: string;
  created_at: string;
}

// Event with changes includes the event and its associated changes
export interface AuditEventWithChanges extends AuditEvent {
  changes: AuditChange[];
}

// Operation with events includes the operation and all its events
export interface AuditOperationWithEvents extends AuditOperation {
  events: AuditEventWithChanges[];
}

// Daily summary of activity
export interface AuditDailySummary {
  date: string;
  total_events: number;
  by_category: Record<string, number>;
  by_actor: Record<string, number>;
  by_entity: Record<string, number>;
  by_severity: Record<string, number>;
}

// Activity filter parameters
export interface AuditActivityFilter {
  actor_id?: string;
  entity_type?: AuditEntityType;
  severity?: AuditSeverity;
  since?: string;
  search?: string;
  limit?: number;
}

// ============================================================================
// UI HELPER TYPES
// ============================================================================

// Human-readable action labels
export const ACTION_LABELS: Record<string, string> = {
  // Orders
  ORDER_CREATED: 'Created order',
  ORDER_ITEM_ADDED: 'Added item to order',
  ORDER_ITEM_REMOVED: 'Removed item from order',
  ORDER_ITEM_UPDATED: 'Updated order item',
  ORDER_ROUND_ADDED: 'Added new round',
  ORDER_SENT_TO_KITCHEN: 'Sent to kitchen',
  ORDER_PREPARING: 'Started preparation',
  ORDER_READY: 'Marked ready',
  ORDER_SERVED: 'Served to customer',
  ORDER_COMPLETED: 'Completed order',
  ORDER_CANCELLED: 'Cancelled order',
  ORDER_REOPENED: 'Reopened order',
  
  // Payments
  PAYMENT_CREATED: 'Recorded payment',
  PAYMENT_VERIFIED: 'Verified payment',
  PAYMENT_REJECTED: 'Rejected payment',
  PAYMENT_VOIDED: 'Voided payment',
  PAYMENT_REFUNDED: 'Refunded payment',
  PAYMENT_METHOD_CHANGED: 'Changed payment method',
  
  // Menu
  MENU_ITEM_CREATED: 'Created menu item',
  MENU_ITEM_UPDATED: 'Updated menu item',
  MENU_ITEM_PRICE_CHANGED: 'Changed price',
  MENU_ITEM_ARCHIVED: 'Archived menu item',
  MENU_ITEM_RESTORED: 'Restored menu item',
  MENU_ITEM_AVAILABILITY_CHANGED: 'Changed availability',
  MENU_CATEGORY_CREATED: 'Created category',
  MENU_CATEGORY_UPDATED: 'Updated category',
  MENU_CATEGORY_REORDERED: 'Reordered categories',
  
  // Addons
  ADDON_CREATED: 'Created addon',
  ADDON_UPDATED: 'Updated addon',
  ADDON_PRICE_CHANGED: 'Changed addon price',
  ADDON_ARCHIVED: 'Archived addon',
  ADDON_ATTACHED: 'Attached addon',
  ADDON_DETACHED: 'Detached addon',
  
  // Staff
  STAFF_CREATED: 'Created staff account',
  STAFF_UPDATED: 'Updated staff details',
  STAFF_ROLE_CHANGED: 'Changed role',
  STAFF_SUSPENDED: 'Suspended staff',
  STAFF_REACTIVATED: 'Reactivated staff',
  STAFF_PIN_CHANGED: 'Changed PIN',
  
  // Expenses
  EXPENSE_CREATED: 'Recorded expense',
  EXPENSE_UPDATED: 'Updated expense',
  EXPENSE_VOIDED: 'Voided expense',
  
  // Settings
  BUSINESS_SETTING_CHANGED: 'Changed settings',
  PAYMENT_ACCOUNT_CREATED: 'Created payment account',
  PAYMENT_ACCOUNT_CHANGED: 'Updated payment account',
  PAYMENT_ACCOUNT_DISABLED: 'Disabled payment account',
  
  // Tables
  TABLE_CREATED: 'Created table',
  TABLE_UPDATED: 'Updated table',
  TABLE_STATUS_CHANGED: 'Changed table status',
  
  // Security
  LOGIN_SUCCESS: 'Logged in',
  LOGIN_FAILED: 'Failed login',
  UNAUTHORIZED_ACTION: 'Unauthorized action',
};

// Severity colors for UI
export const SEVERITY_COLORS: Record<AuditSeverity, string> = {
  NORMAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  IMPORTANT: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  SENSITIVE: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  SECURITY: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

// Severity icons (Lucide icon names)
export const SEVERITY_ICONS: Record<AuditSeverity, string> = {
  NORMAL: 'Activity',
  IMPORTANT: 'AlertCircle',
  SENSITIVE: 'AlertTriangle',
  SECURITY: 'Shield',
};

// Entity type labels
export const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  ORDER: 'Order',
  PAYMENT: 'Payment',
  MENU_ITEM: 'Menu Item',
  MENU_CATEGORY: 'Category',
  ADDON: 'Addon',
  STAFF: 'Staff',
  EXPENSE: 'Expense',
  TABLE: 'Table',
  SETTING: 'Setting',
  PAYMENT_ACCOUNT: 'Payment Account',
};

// Entity type icons
export const ENTITY_TYPE_ICONS: Record<AuditEntityType, string> = {
  ORDER: 'ClipboardList',
  PAYMENT: 'CreditCard',
  MENU_ITEM: 'Coffee',
  MENU_CATEGORY: 'Tag',
  ADDON: 'Layers',
  STAFF: 'Users',
  EXPENSE: 'Receipt',
  TABLE: 'Grid3X3',
  SETTING: 'Settings',
  PAYMENT_ACCOUNT: 'Banknote',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Format change for display
export function formatChange(change: AuditChange): string {
  if (change.change_type === 'UPDATED') {
    return `${change.old_value} → ${change.new_value}`;
  } else if (change.change_type === 'ADDED') {
    return `Added ${change.new_value}`;
  } else if (change.change_type === 'REMOVED') {
    return `Removed ${change.old_value}`;
  }
  return `${change.old_value} → ${change.new_value}`;
}

// Get human-readable action label
export function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, ' ').toLowerCase();
}

// Get severity color class
export function getSeverityColor(severity: AuditSeverity): string {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS.NORMAL;
}

// Get entity type label
export function getEntityTypeLabel(entityType: AuditEntityType): string {
  return ENTITY_TYPE_LABELS[entityType] || entityType;
}

// Format timestamp for display
export function formatAuditTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Group events by date
export function groupEventsByDate(events: AuditEventWithChanges[]): Map<string, AuditEventWithChanges[]> {
  const grouped = new Map<string, AuditEventWithChanges[]>();
  
  events.forEach(event => {
    const date = new Date(event.occurred_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(event);
  });
  
  return grouped;
}

// Check if event needs attention
export function needsAttention(event: AuditEvent): boolean {
  return event.severity === 'SENSITIVE' || event.severity === 'SECURITY';
}

// Get actor initials for avatar
export function getActorInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
