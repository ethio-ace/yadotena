"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { User, Role } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, Search, UserSquare2, Shield, ChefHat, Utensils, 
  KeyRound, Trash2, Edit3, CheckCircle2, XCircle, Phone, 
  Mail, Calendar, Filter, MoreVertical, X, Lock, RefreshCw, ShieldCheck
} from "lucide-react";
import { soundAlerts } from "@/lib/audioAlerts";

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const { data: users = [], isLoading, isRefetching } = useQuery({
    queryKey: ["users"],
    queryFn: api.users.getAll,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => api.users.toggleStatus(id),
    onSuccess: () => {
      soundAlerts.playActionConfirm();
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => {
      soundAlerts.playActionConfirm();
      setDeletingUser(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  // Filtered staff list
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalStaff = users.length;
  const activeStaff = users.filter(u => u.status === "ACTIVE").length;
  const waiterCount = users.filter(u => u.role === "WAITER").length;
  const kitchenCount = users.filter(u => u.role === "KITCHEN").length;
  const managerCount = users.filter(u => u.role === "MANAGER" || u.role === "OWNER").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
            <UserSquare2 className="h-8 w-8 text-primary" />
            <span>Staff & User Management</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Admin console • Manage restaurant employees, roles, login credentials, and floor access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl h-10 px-3 text-xs font-bold gap-1.5"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
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
            <span>Add Staff Member</span>
          </Button>
        </div>
      </div>

      {/* Staff Metrics Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-primary/5 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-bold text-primary uppercase tracking-wider">Total Staff</CardTitle>
            <UserSquare2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-primary">{totalStaff}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{activeStaff} active now</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Waiters</CardTitle>
            <Utensils className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{waiterCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Floor service & orders</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Kitchen Staff</CardTitle>
            <ChefHat className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{kitchenCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Cooks & chefs</p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-500/5 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Admins / Managers</CardTitle>
            <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{managerCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Full console access</p>
          </CardContent>
        </Card>
      </div>

      {/* Directory Table Card */}
      <Card className="rounded-2xl border shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b bg-card space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search staff by name, email, or phone..." 
                className="pl-9 bg-muted/40 rounded-xl h-10 border-muted text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Role & Status Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border text-xs">
                {(["ALL", "OWNER", "MANAGER", "WAITER", "KITCHEN"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all text-[11px] ${
                      roleFilter === r
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === "ALL" ? "All Roles" : r.charAt(0) + r.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border bg-card text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground animate-pulse text-sm font-medium">
              Loading staff accounts from backend...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <UserSquare2 className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
              <p className="text-sm font-bold text-foreground">No staff members found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search or role filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-muted-foreground uppercase bg-muted/40 border-b font-extrabold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Staff Member</th>
                    <th className="px-5 py-3.5">Role & Access</th>
                    <th className="px-5 py-3.5">Phone Contact</th>
                    <th className="px-5 py-3.5">Joined Date</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => {
                    const roleBadge = getRoleBadge(user.role);
                    return (
                      <tr 
                        key={user.id} 
                        onClick={() => setEditingUser(user)}
                        className="cursor-pointer hover:bg-muted/40 active:bg-muted/60 transition-colors"
                      >
                        {/* Name & Email */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${roleBadge.avatarBg}`}>
                              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div>
                              <div className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                                {user.name || "Unnamed User"}
                                {user.role === "OWNER" && (
                                  <span title="Administrator / Owner"><ShieldCheck className="h-3.5 w-3.5 text-amber-500" /></span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Mail className="h-3 w-3 opacity-60" />
                                <span>{user.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4">
                          <Badge className={`rounded-xl px-2.5 py-1 text-[11px] font-bold border ${roleBadge.badgeClass}`}>
                            {roleBadge.icon}
                            <span className="ml-1">{roleBadge.label}</span>
                          </Badge>
                        </td>

                        {/* Phone */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{user.phone || "+251 900 000 000"}</span>
                          </div>
                        </td>

                        {/* Joined Date */}
                        <td className="px-5 py-4 text-muted-foreground font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 opacity-60" />
                            <span>
                              {user.joinedDate 
                                ? new Date(user.joinedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) 
                                : "Nov 12, 2024"}
                            </span>
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className="px-5 py-4">
                          <button
                            onClick={() => toggleStatusMutation.mutate(user.id)}
                            className="group flex items-center gap-1.5 cursor-pointer focus:outline-none"
                            title="Click to toggle active/inactive"
                          >
                            {user.status === "ACTIVE" ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/25 transition-colors font-bold text-[10px] rounded-lg px-2 py-0.5">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="group-hover:bg-rose-500/15 group-hover:text-rose-600 transition-colors font-bold text-[10px] rounded-lg px-2 py-0.5">
                                <XCircle className="h-3 w-3 mr-1 text-rose-500" />
                                Inactive
                              </Badge>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 rounded-xl text-[11px] font-bold gap-1 border-muted hover:border-primary/50"
                              onClick={() => setEditingUser(user)}
                              title="Edit user details"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                              onClick={() => setDeletingUser(user)}
                              title="Remove user"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <AddUserModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["users"] });
          }}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            queryClient.invalidateQueries({ queryKey: ["users"] });
          }}
        />
      )}

      {/* Delete User Confirmation */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setDeletingUser(null)}>
          <div className="bg-card border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">Remove Staff Account</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-foreground bg-muted/40 p-3 rounded-2xl border">
              Are you sure you want to remove <span className="font-black text-rose-600">{deletingUser.name}</span> ({deletingUser.email})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="rounded-xl text-xs font-bold"
                onClick={() => setDeletingUser(null)}
              >
                Cancel
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                onClick={() => deleteUserMutation.mutate(deletingUser.id)}
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? "Removing..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
function getRoleBadge(role: Role) {
  switch (role) {
    case "OWNER":
      return {
        label: "Owner / SuperAdmin",
        icon: <Shield className="h-3 w-3 text-amber-500" />,
        badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
        avatarBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
      };
    case "MANAGER":
      return {
        label: "Manager",
        icon: <Shield className="h-3 w-3 text-purple-500" />,
        badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
        avatarBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30",
      };
    case "WAITER":
      return {
        label: "Floor Waiter",
        icon: <Utensils className="h-3 w-3 text-blue-500" />,
        badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
        avatarBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
      };
    case "KITCHEN":
      return {
        label: "Kitchen Chef",
        icon: <ChefHat className="h-3 w-3 text-rose-500" />,
        badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
        avatarBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
      };
    default:
      return {
        label: "Staff Member",
        icon: <UserSquare2 className="h-3 w-3 text-emerald-500" />,
        badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        avatarBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      };
  }
}

// Add User Modal Component
function AddUserModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("WAITER");
  const [password, setPassword] = useState("password123");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: api.users.create,
    onSuccess: () => {
      soundAlerts.playActionConfirm();
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.message || "Failed to create user. Ensure email is unique.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Please provide both name and email.");
      return;
    }
    setError("");
    createMutation.mutate({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || "+251 911 000 000",
      role,
      password: password || "password123",
      status,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-card border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base">Add New Staff Member</h3>
              <p className="text-[11px] text-muted-foreground">Register an account for staff login access</p>
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
            <label className="text-xs font-bold text-foreground">Full Name *</label>
            <Input
              placeholder="e.g. Almaz Bekele"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl h-10 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Email Address *</label>
              <Input
                type="email"
                placeholder="almaz@yadotena.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl h-10 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Phone Number</label>
              <Input
                placeholder="+251 911 234 567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Staff Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full h-10 px-3 rounded-xl border bg-card text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value="WAITER">Floor Waiter</option>
                <option value="KITCHEN">Kitchen Staff / Chef</option>
                <option value="MANAGER">Branch Manager</option>
                <option value="OWNER">Owner / SuperAdmin</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                className="w-full h-10 px-3 rounded-xl border bg-card text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value="ACTIVE">Active (Can Login)</option>
                <option value="INACTIVE">Inactive (Disabled)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Initial Password *</span>
              <span className="text-[10px] text-muted-foreground font-normal">Default: password123</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="password123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl h-10 pl-9 text-xs font-mono"
                required
              />
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
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Save Staff Member"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ user, isOpen, onClose, onSuccess }: { user: User; isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [role, setRole] = useState<Role>(user.role || "WAITER");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(user.status || "ACTIVE");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  const updateMutation = useMutation({
    mutationFn: (updates: any) => api.users.update(user.id, updates),
    onSuccess: () => {
      soundAlerts.playActionConfirm();
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.message || "Failed to update user.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const payload: any = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role,
      status,
    };

    if (newPassword.trim()) {
      payload.password = newPassword.trim();
    }

    updateMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-card border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base">Edit Staff Account</h3>
              <p className="text-[11px] text-muted-foreground">{user.email}</p>
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
            <label className="text-xs font-bold text-foreground">Full Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl h-10 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl h-10 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Phone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full h-10 px-3 rounded-xl border bg-card text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value="WAITER">Floor Waiter</option>
                <option value="KITCHEN">Kitchen Staff / Chef</option>
                <option value="MANAGER">Branch Manager</option>
                <option value="OWNER">Owner / SuperAdmin</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                className="w-full h-10 px-3 rounded-xl border bg-card text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value="ACTIVE">Active (Allowed)</option>
                <option value="INACTIVE">Inactive (Disabled)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Reset Password (Optional)</span>
              <span className="text-[10px] text-muted-foreground font-normal">Leave blank to keep unchanged</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Enter new password to update..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl h-10 pl-9 text-xs"
              />
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
