"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { 
  Bell, Search, LogOut, Check, Utensils, Receipt, BellRing, 
  Volume2, VolumeX, Flame, ChevronRight, SlidersHorizontal, Sparkles
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSoundNotifications } from "@/contexts/SoundNotificationContext";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function Header({ user }: { user: any }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAudioControls, setShowAudioControls] = useState(false);
  const queryClient = useQueryClient();

  const {
    isMuted,
    volume,
    toggleMute,
    setVolume,
    pendingOrders,
    pendingServiceRequests,
    testOrderSound,
    testWaiterSound,
    unlockAudio,
  } = useSoundNotifications();

  const resolveMutation = useMutation({
    mutationFn: api.serviceRequests.resolve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceRequests"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const totalUrgentCount = pendingOrders.length + pendingServiceRequests.length;

  return (
    <div className="flex flex-col shrink-0 z-30 relative">
      {/* Top Header Bar */}
      <header className="h-16 bg-card border-b flex items-center justify-between px-4 md:px-6 shadow-sm">
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
                        onClick={testOrderSound}
                      >
                        🔔 Order Chime
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-[11px] h-8 font-bold"
                        onClick={testWaiterSound}
                      >
                        🛎️ Waiter Chime
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Service Request & Alerts Notification Dropdown */}
            <div className="relative">
              <Button 
                variant={pendingServiceRequests.length > 0 ? "default" : "ghost"} 
                size="icon" 
                className={`relative rounded-full transition-all ${
                  pendingServiceRequests.length > 0 
                    ? "bg-rose-500 hover:bg-rose-600 text-white animate-bounce shadow-md shadow-rose-500/25" 
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

      {/* Live Urgent Notification Bar for Pending Orders & Waiter Calls */}
      {totalUrgentCount > 0 && (
        <div className="bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-md animate-in slide-in-from-top duration-300">
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

            {pendingOrders.length > 0 && (
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
