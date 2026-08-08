"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Bell, Search, LogOut, Check, Utensils, Receipt, BellRing, Sparkles, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Header({ user }: { user: any }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ["serviceRequests"],
    queryFn: () => api.serviceRequests.getAll("PENDING"),
    refetchInterval: 3000,
  });

  const resolveMutation = useMutation({
    mutationFn: api.serviceRequests.resolve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceRequests"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const pendingRequests = requests.filter((r) => r.status === "PENDING");

  return (
    <header className="h-16 bg-card border-b flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm z-30 relative">
      <div className="flex-1 flex items-center">
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search orders, tables, dishes..." 
            className="w-full bg-muted/50 pl-9 border-none focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 relative">
          <ThemeToggle />
          
          {/* Notification Bell with Live Counter */}
          <div className="relative">
            <Button 
              variant={pendingRequests.length > 0 ? "default" : "ghost"} 
              size="icon" 
              className={`relative rounded-full transition-all ${
                pendingRequests.length > 0
                  ? "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/25 animate-pulse"
                  : "text-muted-foreground"
              }`}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5" />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-600 border-2 border-card text-white rounded-full text-[10px] font-black flex items-center justify-center">
                  {pendingRequests.length}
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
                    {pendingRequests.length} Active
                  </Badge>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground space-y-1">
                    <Check className="h-8 w-8 mx-auto text-emerald-500 opacity-60 mb-1" />
                    <p className="text-xs font-bold">All tables attended!</p>
                    <p className="text-[11px] text-muted-foreground">New guest calls will alert here in real time.</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 divide-y divide-muted/40">
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-foreground">{req.tableName}</span>
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
                          <p className="text-xs text-muted-foreground">{req.notes}</p>
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
              </div>
            )}
          </div>
        </div>

        <div className="h-8 w-px bg-border hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{user.role.toLowerCase()}</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {user.name.charAt(0)}
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/login' })} title="Logout">
            <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </div>
    </header>
  );
}
