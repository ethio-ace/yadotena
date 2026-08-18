"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { 
  Bell, Search, LogOut, Check, BellRing, 
  Volume2, VolumeX, ChevronRight, SlidersHorizontal, Menu, X, Grid3X3, ClipboardList, Coffee
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSoundNotifications } from "@/contexts/SoundNotificationContext";
import { useTableLabels, formatTableRef } from "@/hooks/useTableLabels";
import { formatETB } from "@/lib/currency";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItemsForRole } from "@/lib/nav";

function SearchGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-2 py-1">
      <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export default function Header({ user = { name: "Staff Member", role: "WAITER" } }: { user?: { name?: string | null; role?: string; id?: string } }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAudioControls, setShowAudioControls] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const tableLabels = useTableLabels();
  const userRole = user?.role || "WAITER";

  // Live search across orders, tables, and dishes.
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searching = searchQuery.trim().length >= 2;
  const { data: searchOrders = [] } = useQuery({
    queryKey: ["orders"], queryFn: api.orders.getAll, enabled: searching,
  });
  const { data: searchTables = [] } = useQuery({
    queryKey: ["tables"], queryFn: api.tables.getAll, enabled: searching,
  });
  const { data: searchMenu = [] } = useQuery({
    queryKey: ["menu"], queryFn: api.menu.getAll, enabled: searching,
  });

  const isWaiterSearch = userRole === "WAITER";
  const orderResults = useMemo(() => {
    if (!searching) return [];
    const q = searchQuery.trim().toLowerCase();
    return searchOrders.filter((o) =>
      o.id.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.tableId?.toLowerCase().includes(q) ||
      (o.type || "").toLowerCase().includes(q)
    ).slice(0, 6);
  }, [searching, searchQuery, searchOrders]);
  const tableResults = useMemo(() => {
    if (!searching) return [];
    const q = searchQuery.trim().toLowerCase();
    return searchTables.filter((t) =>
      t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [searching, searchQuery, searchTables]);
  const dishResults = useMemo(() => {
    if (!searching || isWaiterSearch) return [];
    const q = searchQuery.trim().toLowerCase();
    return searchMenu.filter((m) =>
      m.name.toLowerCase().includes(q) || (m.category || "").toLowerCase().includes(q)
    ).slice(0, 6);
  }, [searching, searchQuery, searchMenu, isWaiterSearch]);
  const hasSearchResults = orderResults.length > 0 || tableResults.length > 0 || dishResults.length > 0;

  // Close the search dropdown when clicking outside.
  useEffect(() => {
    if (!searchOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [searchOpen]);

  const goSearch = (href: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(href);
  };

  // Close the mobile menu when tapping outside or pressing Escape.
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileMenuOpen]);

  // Close popups when clicking anywhere outside them.
  const popoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showNotifications && !showAudioControls) return;
    const onMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
        setShowAudioControls(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showNotifications, showAudioControls]);

  const {
    isMuted,
    volume,
    toggleMute,
    setVolume,
    pendingOrders,
    pendingServiceRequests,
    testNewOrder,
    testWaiterCall,
    testBillRequest,
    testOrderReady,
    testPaymentReceived,
    unlockAudio,
  } = useSoundNotifications();

  const resolveMutation = useMutation({
    mutationFn: api.serviceRequests.resolve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceRequests"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const showPendingOrders = pendingOrders.length > 0 && userRole !== "WAITER";
  const totalUrgentCount = (showPendingOrders ? pendingOrders.length : 0) + pendingServiceRequests.length;
  const allowedItems = navItemsForRole(userRole);

  return (
    <div className="flex flex-col shrink-0 z-30 relative">
      {/* Top Header Bar */}
      <header className="h-16 bg-card border-b flex items-center justify-between px-4 md:px-6 shadow-sm print:hidden">
        <div className="flex-1 flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-foreground hover:bg-muted"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Desktop Search — live results across orders, tables & dishes */}
          <div className="relative w-full max-w-md hidden md:block" ref={searchRef}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search orders, tables, dishes..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
              }}
              className="w-full bg-muted/50 pl-9 border-none focus-visible:ring-1"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {searchOpen && searching && (
              <div className="absolute left-0 right-0 top-12 bg-card border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {hasSearchResults ? (
                  <div className="max-h-96 overflow-y-auto py-1.5">
                    {orderResults.length > 0 && (
                      <SearchGroup label="Orders">
                        {orderResults.map((o) => (
                          <button
                            key={o.id}
                            onClick={() => goSearch(isWaiterSearch ? `/dashboard/waiter?tab=orders` : `/dashboard/orders`)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                          >
                            <ClipboardList className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-mono font-bold text-xs">#{o.id.slice(-6).toUpperCase()}</span>
                            <span className="text-xs text-muted-foreground truncate flex-1">
                              {o.type.replace("_", " ").toLowerCase()}
                              {o.tableId ? ` · ${formatTableRef(o.tableId, tableLabels)}` : o.customerName ? ` · ${o.customerName}` : ""}
                            </span>
                          </button>
                        ))}
                      </SearchGroup>
                    )}

                    {tableResults.length > 0 && (
                      <SearchGroup label="Tables">
                        {tableResults.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => goSearch(isWaiterSearch ? `/dashboard/waiter?tab=tables` : `/dashboard/tables`)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                          >
                            <Grid3X3 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-bold">{t.name || t.id}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{t.capacity}p</span>
                          </button>
                        ))}
                      </SearchGroup>
                    )}

                    {dishResults.length > 0 && (
                      <SearchGroup label="Dishes">
                        {dishResults.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => goSearch("/dashboard/menu")}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                          >
                            <Coffee className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-bold truncate flex-1">{m.name}</span>
                            <span className="text-[10px] font-bold text-muted-foreground shrink-0">{formatETB(m.price)}</span>
                          </button>
                        ))}
                      </SearchGroup>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    <p className="text-xs font-bold">No matches for “{searchQuery.trim()}”</p>
                    <p className="text-[10px] mt-0.5">Try an order number, table name, or dish.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 relative">
            <ThemeToggle />

            {/* Audio Alert Settings & Mute Toggle */}
            <div className="relative">
              <Button
                variant={isMuted ? "ghost" : "outline"}
                size="sm"
                className={`rounded-full gap-1.5 text-xs font-bold transition-all ${
                  isMuted 
                    ? "text-muted-foreground border-dashed" 
                    : totalUrgentCount > 0 
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                      : "border-primary/30 text-foreground"
                }`}
                onClick={() => {
                  unlockAudio();
                  setShowAudioControls(!showAudioControls);
                }}
                title={isMuted ? "Sound is MUTED (Click to configure)" : "Sound Alerts Active"}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-rose-500" />
                ) : (
                  <Volume2 className={`h-4 w-4 text-emerald-500 ${totalUrgentCount > 0 ? "animate-pulse" : ""}`} />
                )}
                <span className="hidden sm:inline">
                  {isMuted ? "Muted" : "Alerts"}
                </span>
              </Button>

              {/* Audio Controls Popup */}
              {showAudioControls && (
                <div className="absolute right-0 top-11 w-72 bg-card border rounded-3xl shadow-2xl z-50 p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                      <span>Audio Notifications</span>
                    </div>
                    <Button
                      size="sm"
                      variant={isMuted ? "default" : "secondary"}
                      className="h-7 text-xs rounded-full px-3 font-bold"
                      onClick={toggleMute}
                    >
                      {isMuted ? "Unmute All" : "Mute All"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                      <span>Volume</span>
                      <span>{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={volume}
                      disabled={isMuted}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-40"
                    />
                  </div>

                  <div className="pt-2 border-t space-y-2">
                    <p className="text-[11px] text-muted-foreground font-semibold">Test Alert Sounds:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-[11px] h-8 font-bold"
                        onClick={testNewOrder}
                      >
                        📋 New Order
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-[11px] h-8 font-bold"
                        onClick={testWaiterCall}
                      >
                        🛎️ Table Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-[11px] h-8 font-bold"
                        onClick={testBillRequest}
                      >
                        🧾 Bill Request
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-[11px] h-8 font-bold"
                        onClick={testOrderReady}
                      >
                        ✅ Order Ready
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-[11px] h-8 font-bold col-span-2"
                        onClick={testPaymentReceived}
                      >
                        💰 Payment Received
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Service Request & Alerts Notification Dropdown */}
            <div className="relative" ref={popoverRef}>
              <Button 
                variant={pendingServiceRequests.length > 0 ? "default" : "ghost"} 
                size="icon" 
                className={`relative rounded-full transition-all ${
                  pendingServiceRequests.length > 0 
                    ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-md shadow-rose-500/25" 
                    : "text-muted-foreground"
                }`}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5" />
                {pendingServiceRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-600 border-2 border-card text-white rounded-full text-[10px] font-black flex items-center justify-center">
                    {pendingServiceRequests.length}
                  </span>
                )}
              </Button>

              {/* Notification Dropdown Panel */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 md:w-96 bg-card border rounded-3xl shadow-2xl z-50 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <BellRing className="h-4 w-4 text-rose-500" />
                      <h4 className="font-extrabold text-sm">Table Service Calls</h4>
                    </div>
                    <Badge variant="outline" className="font-bold text-xs">
                      {pendingServiceRequests.length} Active
                    </Badge>
                  </div>

                  {pendingServiceRequests.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground space-y-1">
                      <Check className="h-8 w-8 mx-auto text-emerald-500 opacity-60 mb-1" />
                      <p className="text-xs font-bold">All tables attended!</p>
                      <p className="text-[11px] text-muted-foreground">New guest calls will alert here in real time with continuous chimes.</p>
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 divide-y divide-muted/40">
                      {pendingServiceRequests.map((req) => (
                        <div key={req.id} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-foreground">
                                {formatTableRef(req.tableId, tableLabels) || req.tableName || "Table"}
                              </span>
                              <Badge 
                                className={`text-[10px] font-bold ${
                                  req.type === "BILL" 
                                    ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20" 
                                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                }`}
                              >
                                {req.type === "BILL" ? "🧾 Request Bill" : "🛎️ Call Waiter"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{req.notes}</p>
                            <span className="text-[10px] text-muted-foreground opacity-75">
                              {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="rounded-xl text-xs font-bold shrink-0 h-8 px-3 hover:bg-emerald-500 hover:text-white transition-colors"
                            onClick={() => resolveMutation.mutate(req.id)}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            <span>Done</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer links */}
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-semibold">Sound alerting until resolved</span>
                    <Link
                      href="/dashboard/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"
                    >
                      View All <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="h-8 w-px bg-border hidden sm:block"></div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium leading-none">{user.name || "Staff Member"}</p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">{(user.role || "STAFF").toLowerCase()}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {(user.name || "S").charAt(0)}
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/login' })} title="Logout">
              <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Menu */}
      {isMobileMenuOpen && (
        <div ref={mobileMenuRef} className="md:hidden absolute top-16 left-0 right-0 bg-card border-b shadow-xl z-40 p-4 animate-in slide-in-from-top-2 duration-200">
          <nav className="space-y-1">
            {allowedItems.map((item) => {
              const isActive = 
                item.href === "/dashboard" 
                  ? pathname === "/dashboard" 
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Live Urgent Notification Bar for Pending Orders & Waiter Calls */}
      {totalUrgentCount > 0 && (
        <div className="bg-primary text-primary-foreground px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-md animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>

            {pendingServiceRequests.length > 0 && (
              <span className="flex items-center gap-1 bg-black/20 rounded-full px-2.5 py-0.5">
                🛎️ {pendingServiceRequests.length} Table Assistance {pendingServiceRequests.length === 1 ? "Call" : "Calls"} Active
              </span>
            )}

            {pendingOrders.length > 0 && (
              <span className="flex items-center gap-1 bg-black/20 rounded-full px-2.5 py-0.5">
                🔥 {pendingOrders.length} New Unprepared {pendingOrders.length === 1 ? "Order" : "Orders"}
              </span>
            )}

            <span className="opacity-80 hidden md:inline font-normal">
              (Sound alerting until marked preparing or resolved)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {pendingServiceRequests.length > 0 && (
              <Button
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-full text-xs font-bold h-7 px-3"
                onClick={() => setShowNotifications(true)}
              >
                View Table Calls ({pendingServiceRequests.length})
              </Button>
            )}

            {showPendingOrders && (
              <Link href="/dashboard/kitchen">
                <Button
                  size="sm"
                  className="bg-white text-rose-700 hover:bg-white/90 rounded-full text-xs font-black h-7 px-3 shadow-sm"
                >
                  Go to Kitchen Display
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
