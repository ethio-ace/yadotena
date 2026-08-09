"use client";

import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "@/stores/cartStore";
import { useShopCartStore } from "@/stores/shopCartStore";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SessionManager } from "@/components/SessionManager";
import { formatETB } from "@/lib/currency";
import { api } from "@/services/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Clock } from "lucide-react";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const cartItems = useCartStore((state) => state.items);
  const tableId = useCartStore((state) => state.tableId);
  const activeOrderId = useCartStore((state) => state.activeOrderId);
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = useCartStore((state) => state.getTotal());

  const shopItems = useShopCartStore((s) => s.items);
  const shopCount = shopItems.reduce((n, i) => n + i.quantity, 0);
  const shopTotal = useShopCartStore((s) => s.getTotal());

  const { data: tables = [] } = useQuery({
    queryKey: ["public-tables"],
    queryFn: api.tables.getAll,
  });
  const tableName = tables.find((t) => t.id === tableId)?.name;

  const showFloatingOrderButton = cartItemCount > 0 && pathname === "/menu";
  const showShopCheckout = shopCount > 0 && pathname === "/shop";

  return (
    <div className="min-h-screen bg-muted/20 relative shadow-2xl overflow-hidden flex flex-col">
      <SessionManager />

      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
              🥛
            </div>
            <div>
              <h1 className="font-black text-lg text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">
                Yadotena{" "}
                <span className="text-primary text-xs font-bold block sm:inline">
                  Milk & Foods
                </span>
              </h1>
              <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                {tableId
                  ? `${tableName || "Table"} · Dining Session`
                  : "Fresh Dairy & Artisanal Kitchen"}
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/menu"
            className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 hidden sm:inline"
          >
            Menu
          </Link>
          <Link
            href="/shop"
            className="text-xs font-bold text-muted-foreground hover:text-foreground px-2"
          >
            Shop
          </Link>
          {activeOrderId && pathname !== `/order/${activeOrderId}` && (
            <Link href={`/order/${activeOrderId}`}>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full text-xs font-bold border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1.5 h-8 px-3"
              >
                <Clock className="h-3 w-3 animate-spin text-primary" />
                <span>Live Ticket</span>
              </Button>
            </Link>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-16">{children}</main>

      {showFloatingOrderButton && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/90 to-transparent z-50">
          <div className="max-w-3xl mx-auto">
            <Link href="/checkout">
              <Button className="w-full text-lg h-16 rounded-full font-black shadow-2xl shadow-primary/30 flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-foreground/20 text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                    {cartItemCount}
                  </div>
                  <span>View Current Order</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatETB(cartTotal)}</span>
                  <ChevronRight className="h-5 w-5 stroke-[2.5]" />
                </div>
              </Button>
            </Link>
          </div>
        </div>
      )}

      {showShopCheckout && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/90 to-transparent z-50">
          <div className="max-w-3xl mx-auto">
            <Link href="/shop/checkout">
              <Button className="w-full text-lg h-16 rounded-full font-black shadow-2xl shadow-primary/30 flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-foreground/20 text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                    {shopCount}
                  </div>
                  <span>Shop checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatETB(shopTotal)}</span>
                  <ChevronRight className="h-5 w-5 stroke-[2.5]" />
                </div>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
