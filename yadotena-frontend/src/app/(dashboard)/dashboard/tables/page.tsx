"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Plus, Utensils, QrCode, Edit3, Trash2, 
  CheckCircle2, AlertCircle, Clock, RefreshCw, X, Shield, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateOrderModal } from "@/components/dashboard/CreateOrderModal";
import { TableQRModal } from "@/components/dashboard/TableQRModal";
import { Table, TableStatus } from "@/types";
import { soundAlerts } from "@/lib/audioAlerts";
import { useStaffRealtime, ssePollInterval } from "@/lib/realtime";
import { ErrorState } from "@/components/ui/empty-state";

export default function TablesPage() {
  const { connected } = useStaffRealtime();
  const queryClient = useQueryClient();
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<string | null>(null);
  const [selectedTableForQR, setSelectedTableForQR] = useState<Table | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [deletingTable, setDeletingTable] = useState<Table | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionError, setActionError] = useState("");

  const { data: tables = [], isLoading, isRefetching, isError, refetch } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
    refetchInterval: ssePollInterval(connected),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) => 
      api.tables.updateStatus(id, status),
    onSuccess: () => {
      setActionError("");
      soundAlerts.playActionPing();
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (err: Error) => setActionError(err.message || "Could not update table status"),
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: string) => api.tables.delete(id),
    onSuccess: () => {
      setActionError("");
      soundAlerts.playActionPing();
      setDeletingTable(null);
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (err: Error) => setActionError(err.message || "Could not delete table"),
  });

  // Filtered tables
  const filteredTables = tables.filter((t) => {
    if (statusFilter === "ALL") return true;
    return t.status === statusFilter;
  });

  // Floor stats
  const totalTables = tables.length;
  const availableCount = tables.filter((t) => t.status === "AVAILABLE").length;
  const occupiedCount = tables.filter((t) => ["OCCUPIED", "ORDERING", "PREPARING"].includes(t.status)).length;
  const serviceCount = tables.filter((t) => ["WAITING_FOR_SERVICE", "WAITING_FOR_PAYMENT"].includes(t.status)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Tables & Floor Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time floor occupancy, scannable QR stands, and direct waiter order punching.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl h-10 px-3 text-xs font-bold gap-1.5"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["tables"] })}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button 
            className="rounded-xl h-10 px-4 text-xs font-black shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Add Dining Table</span>
          </Button>
        </div>
      </div>

      {isError ? (
        <ErrorState
          title="Could not load tables"
          description="Check your connection and try again."
          onRetry={() => refetch()}
        />
      ) : null}

      {actionError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      {/* Floor Metrics Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-primary/20 bg-primary/5">
          <CardHeader className="pb-1 pt-3.5 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-primary uppercase tracking-wider">Total Tables</CardTitle>
            <Users className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5">
            <div className="text-2xl font-black text-primary">{totalTables}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Full floor capacity</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-1 pt-3.5 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Available</CardTitle>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{availableCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Ready for seating</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-1 pt-3.5 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Occupied</CardTitle>
            <Utensils className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5">
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{occupiedCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Dining / preparing</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-rose-500/20 bg-rose-500/5">
          <CardHeader className="pb-1 pt-3.5 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Calls / Bill</CardTitle>
            <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{serviceCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Needs staff attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-2xl border text-xs overflow-x-auto">
          {[
            { id: "ALL", label: "All Tables" },
            { id: "AVAILABLE", label: "Available" },
            { id: "OCCUPIED", label: "Occupied" },
            { id: "PREPARING", label: "Preparing" },
            { id: "WAITING_FOR_SERVICE", label: "Needs Service" },
            { id: "WAITING_FOR_PAYMENT", label: "Needs Payment" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tables Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-3xl"></div>
          ))}
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="py-16 text-center space-y-2 bg-card rounded-3xl border">
          <Utensils className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
          <p className="text-sm font-bold text-foreground">No tables found</p>
          <p className="text-xs text-muted-foreground">Try clearing the status filter or click "Add Dining Table" to add one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((table) => (
            <TableCard 
              key={table.id} 
              table={table} 
              onPunchOrder={() => setSelectedTableForOrder(table.id)}
              onViewQR={() => setSelectedTableForQR(table)}
              onEdit={() => setEditingTable(table)}
              onDelete={() => setDeletingTable(table)}
              onStatusChange={(newStatus) => 
                updateStatusMutation.mutate({ id: table.id, status: newStatus })
              }
            />
          ))}
        </div>
      )}

      {/* Add Table Modal */}
      {isAddModalOpen && (
        <AddTableModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["tables"] });
          }}
          existingCount={tables.length}
        />
      )}

      {/* Edit Table Modal */}
      {editingTable && (
        <EditTableModal
          table={editingTable}
          isOpen={!!editingTable}
          onClose={() => setEditingTable(null)}
          onSuccess={() => {
            setEditingTable(null);
            queryClient.invalidateQueries({ queryKey: ["tables"] });
          }}
        />
      )}

      {/* Delete Table Confirmation */}
      {deletingTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">Delete Dining Table</h3>
                <p className="text-xs text-muted-foreground">Remove table from floor plan</p>
              </div>
            </div>

            <p className="text-xs text-foreground bg-muted/40 p-3 rounded-2xl border">
              Are you sure you want to remove <span className="font-black text-rose-600">{deletingTable.name}</span>? Any associated QR stands will become inactive.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="rounded-xl text-xs font-bold"
                onClick={() => setDeletingTable(null)}
              >
                Cancel
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                onClick={() => deleteTableMutation.mutate(deletingTable.id)}
                disabled={deleteTableMutation.isPending}
              >
                {deleteTableMutation.isPending ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Staff POS Modal */}
      <CreateOrderModal
        isOpen={!!selectedTableForOrder}
        onClose={() => setSelectedTableForOrder(null)}
        initialTableId={selectedTableForOrder || undefined}
      />

      {/* Printable QR Stand Modal */}
      <TableQRModal
        table={selectedTableForQR}
        isOpen={!!selectedTableForQR}
        onClose={() => setSelectedTableForQR(null)}
      />
    </div>
  );
}

// Table Card Item Component
function TableCard({ 
  table, 
  onPunchOrder, 
  onViewQR,
  onEdit,
  onDelete,
  onStatusChange,
}: { 
  table: Table; 
  onPunchOrder: () => void; 
  onViewQR: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: TableStatus) => void;
}) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "AVAILABLE": 
        return {
          cardBg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300",
          badge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
          icon: <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
        };
      case "OCCUPIED": 
        return {
          cardBg: "bg-blue-500/10 border-blue-500/25 text-blue-700 dark:text-blue-300",
          badge: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
          icon: <Utensils className="h-3 w-3 mr-1 text-blue-600" />
        };
      case "PREPARING": 
        return {
          cardBg: "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300",
          badge: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
          icon: <Clock className="h-3 w-3 mr-1 text-amber-600 animate-spin" />
        };
      case "WAITING_FOR_SERVICE": 
        return {
          cardBg: "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20 animate-pulse",
          badge: "bg-rose-500/25 text-rose-700 dark:text-rose-300 border-rose-500/40",
          icon: <AlertCircle className="h-3 w-3 mr-1 text-rose-600" />
        };
      case "WAITING_FOR_PAYMENT": 
        return {
          cardBg: "bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20 animate-pulse",
          badge: "bg-purple-500/25 text-purple-700 dark:text-purple-300 border-purple-500/40",
          icon: <AlertCircle className="h-3 w-3 mr-1 text-purple-600" />
        };
      default: 
        return {
          cardBg: "bg-card border-border text-foreground",
          badge: "bg-muted text-muted-foreground",
          icon: null
        };
    }
  };

  const config = getStatusConfig(table.status);

  return (
    <Card 
      className={cn("overflow-hidden hover:shadow-xl transition-all duration-300 border-2 rounded-3xl flex flex-col justify-between", config.cardBg)}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col h-full justify-between space-y-3.5">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-lg tracking-tight text-foreground">{table.name}</h3>
              <span className="text-[10px] font-mono text-muted-foreground">({table.id})</span>
            </div>
            
            <div className="mt-1 flex items-center gap-1.5">
              <Badge className={cn("rounded-lg px-2 py-0.5 text-[10px] font-extrabold border shadow-none", config.badge)}>
                {config.icon}
                <span>{table.status.replace(/_/g, " ")}</span>
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="flex items-center text-xs font-bold bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm border">
              <Users className="h-3 w-3 mr-1 text-muted-foreground" />
              <span>{table.capacity} seats</span>
            </div>

            <button
              onClick={onEdit}
              className="h-7 w-7 rounded-lg bg-background/60 hover:bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Edit Table"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={onDelete}
              className="h-7 w-7 rounded-lg bg-background/60 hover:bg-rose-500/10 flex items-center justify-center text-muted-foreground hover:text-rose-600 transition-colors"
              title="Delete Table"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Status Selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Change Floor State:
          </label>
          <select
            value={table.status}
            onChange={(e) => onStatusChange(e.target.value as TableStatus)}
            className="w-full h-8 px-2.5 rounded-xl border bg-background/90 text-xs font-bold text-foreground focus:outline-none shadow-sm cursor-pointer"
          >
            <option value="AVAILABLE">🟢 Available (Ready)</option>
            <option value="OCCUPIED">🔵 Occupied (Seated)</option>
            <option value="PREPARING">🟡 Preparing Food</option>
            <option value="WAITING_FOR_SERVICE">🔴 Waiting For Service</option>
            <option value="WAITING_FOR_PAYMENT">🟣 Waiting For Payment</option>
          </select>
        </div>
        
        {/* Table Action Buttons */}
        <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="rounded-xl text-xs font-bold bg-background/80 hover:bg-background h-8 px-2 flex items-center justify-center gap-1.5 shadow-sm border"
            onClick={(e) => {
              e.stopPropagation();
              onViewQR();
            }}
          >
            <QrCode className="h-3.5 w-3.5 text-primary" />
            <span>QR Stand</span>
          </Button>

          <Button 
            size="sm" 
            className="rounded-xl text-xs font-black h-8 px-2 flex items-center justify-center gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={(e) => {
              e.stopPropagation();
              onPunchOrder();
            }}
          >
            <Utensils className="h-3.5 w-3.5" />
            <span>Order</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Add Table Modal
function AddTableModal({
  isOpen,
  onClose,
  onSuccess,
  existingCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingCount: number;
}) {
  const [name, setName] = useState(`Table ${String(existingCount + 1).padStart(2, "0")}`);
  const [capacity, setCapacity] = useState<number>(4);
  const [status, setStatus] = useState<TableStatus>("AVAILABLE");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: api.tables.create,
    onSuccess: () => {
      soundAlerts.playActionPing();
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.message || "Failed to create table.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Table name is required.");
      return;
    }
    setError("");
    createMutation.mutate({
      name: name.trim(),
      capacity: Number(capacity) || 4,
      status,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-card border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base">Add New Dining Table</h3>
              <p className="text-[11px] text-muted-foreground">Setup scannable table stand & seat capacity</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Table Name / Number *</label>
            <Input
              placeholder="e.g. Table 09, VIP Booth 1, Patio 3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl h-10 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Seating Capacity (Guests)</label>
              <Input
                type="number"
                min="1"
                max="30"
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                className="rounded-xl h-10 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TableStatus)}
                className="w-full h-10 px-3 rounded-xl border bg-card text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border text-xs text-muted-foreground space-y-1">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5 text-primary" />
              <span>Instant Scannable QR Token</span>
            </p>
            <p className="text-[11px]">
              A unique dining session QR code will automatically be generated for this table so customers can scan and order immediately.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs font-bold h-10 px-4"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl text-xs font-black h-10 px-5 bg-primary text-primary-foreground shadow-md shadow-primary/20"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Save Table"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Table Modal
function EditTableModal({
  table,
  isOpen,
  onClose,
  onSuccess,
}: {
  table: Table;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(table.name);
  const [capacity, setCapacity] = useState<number>(table.capacity);
  const [status, setStatus] = useState<TableStatus>(table.status);
  const [error, setError] = useState("");

  const updateMutation = useMutation({
    mutationFn: (updates: any) => api.tables.update(table.id, updates),
    onSuccess: () => {
      soundAlerts.playActionPing();
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.message || "Failed to update table.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    updateMutation.mutate({
      name: name.trim(),
      capacity: Number(capacity) || 4,
      status,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-card border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base">Edit Dining Table</h3>
              <p className="text-[11px] text-muted-foreground">{table.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Table Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl h-10 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Seating Capacity</label>
              <Input
                type="number"
                min="1"
                max="30"
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                className="rounded-xl h-10 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Floor Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TableStatus)}
                className="w-full h-10 px-3 rounded-xl border bg-card text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="PREPARING">Preparing</option>
                <option value="WAITING_FOR_SERVICE">Waiting For Service</option>
                <option value="WAITING_FOR_PAYMENT">Waiting For Payment</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs font-bold h-10 px-4"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl text-xs font-black h-10 px-5 bg-primary text-primary-foreground shadow-md shadow-primary/20"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
