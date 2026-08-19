import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Order, OrderStatus } from "@/types";
import { KitchenOrderCard } from "@/components/dashboard/KitchenOrderCard";
import { AddExtraSelectionModal } from "@/components/dashboard/AddExtraSelectionModal";
import { FullPageMenuPOS } from "@/components/dashboard/FullPageMenuPOS";

interface ActiveOrdersTabProps {
  /** Page-level filtered orders (type / table / payment) from the Orders page. */
  ordersOverride?: Order[];
}

export function ActiveOrdersTab({ ordersOverride }: ActiveOrdersTabProps) {
  const [search, setSearch] = useState("");
  const [selectedOrderToEdit, setSelectedOrderToEdit] = useState<Order | null>(null);
  const [showExtraSelectionForOrder, setShowExtraSelectionForOrder] = useState<Order | null>(null);
  const [initialCategory, setInitialCategory] = useState<string>("All");
  
  const queryClient = useQueryClient();

  const { data: queriedOrders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    enabled: ordersOverride === undefined,
  });

  const orders = ordersOverride ?? queriedOrders;

  // Resolve raw addon ids on tickets to human names (cached by react-query).
  const { data: addons = [] } = useQuery({
    queryKey: ["addons"],
    queryFn: () => api.addons.getAll(),
  });
  const addonMap = useMemo(() => Object.fromEntries(addons.map((a) => [a.id, a.name])), [addons]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string, status: OrderStatus }) => 
      api.orders.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  });

  const activeOrders = orders?.filter(o => 
    o.status === "PENDING" || o.status === "PREPARING" || o.status === "READY"
  ) || [];

  const filteredOrders = activeOrders.filter(o => {
    const term = search.toLowerCase();
    const matchesId = o.id.toLowerCase().includes(term);
    const matchesCustomer = o.customerName?.toLowerCase().includes(term);
    const matchesTable = o.tableId?.toLowerCase().includes(term);
    return !search || matchesId || matchesCustomer || matchesTable;
  });

  const getActionPropsForStatus = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return { actionText: "Start Preparing", actionVariant: "default", nextStatus: "PREPARING" as OrderStatus };
      case "PREPARING":
        return { actionText: "Mark as Ready", actionVariant: "outline", nextStatus: "READY" as OrderStatus };
      case "READY":
        return { actionText: "Close Table (Completed)", actionVariant: "default", nextStatus: "COMPLETED" as OrderStatus };
      default:
        return { actionText: "", actionVariant: "outline", nextStatus: "PENDING" as OrderStatus };
    }
  };

  if (selectedOrderToEdit) {
    return (
      <FullPageMenuPOS 
        existingOrder={selectedOrderToEdit}
        initialCategory={initialCategory}
        onCancel={() => setSelectedOrderToEdit(null)}
        onSuccess={() => setSelectedOrderToEdit(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search active orders..." 
            className="pl-9 h-12 rounded-2xl bg-card border-none shadow-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground animate-pulse">Loading active orders...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOrders.map(order => {
            const { actionText, actionVariant, nextStatus } = getActionPropsForStatus(order.status);
            return (
              <KitchenOrderCard 
                key={order.id} 
                order={order} 
                actionText={actionText}
                actionVariant={actionVariant}
                onAction={() => updateStatus.mutate({ id: order.id, status: nextStatus })}
                isLoading={updateStatus.isPending && updateStatus.variables?.id === order.id}
                isUrgent={order.status === "PENDING"}
                addonMap={addonMap}
                onAddItems={() => setShowExtraSelectionForOrder(order)}
              />
            );
          })}
          {filteredOrders.length === 0 && (
            <div className="col-span-full p-12 text-center text-muted-foreground font-medium bg-card rounded-3xl border-none shadow-sm">
              No active orders found.
            </div>
          )}
        </div>
      )}

      {showExtraSelectionForOrder && (
        <AddExtraSelectionModal
          isOpen={!!showExtraSelectionForOrder}
          onClose={() => setShowExtraSelectionForOrder(null)}
          onSelectOption={(category) => {
            setInitialCategory(category);
            setSelectedOrderToEdit(showExtraSelectionForOrder);
            setShowExtraSelectionForOrder(null);
          }}
        />
      )}
    </div>
  );
}
