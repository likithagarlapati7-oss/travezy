import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import { AdminTable, Td } from "@/components/AdminTable";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminUsersQuery, type AdminUser } from "@/lib/admin";
import { adminUpdateUserRole } from "@/lib/admin.functions";
import type { AppRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "User Management — Travezy Admin" },
      { name: "description", content: "Manage user accounts, assign role permissions, and monitor platform users." },
      { property: "og:title", content: "User Management — Travezy Admin" },
      { property: "og:description", content: "Role-based user management for Travezy administrators." },
    ],
  }),
  component: AdminUsers,
});

const PAGE_SIZE = 12;

function AdminUsers() {
  const { data: users, isLoading, error } = useQuery(adminUsersQuery);
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Role change modal state
  const [targetUser, setTargetUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("tourist");

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      return await adminUpdateUserRole({ data: { userId, newRole } });
    },
    onSuccess: (res) => {
      toast.success(res.message || "User role updated successfully");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
      setTargetUser(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update user role");
    },
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const matchesRole = roleFilter === "all" || u.resolved_role === roleFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        u.id.toLowerCase().includes(q);

      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  // Handle opening role modal
  const openRoleModal = (user: AdminUser) => {
    setTargetUser(user);
    setSelectedRole(user.resolved_role);
  };

  const handleConfirmRoleChange = () => {
    if (!targetUser) return;
    updateRoleMutation.mutate({
      userId: targetUser.id,
      newRole: selectedRole,
    });
  };

  const counts = useMemo(() => {
    if (!users) return { all: 0, tourist: 0, provider: 0, admin: 0 };
    return {
      all: users.length,
      tourist: users.filter((u) => u.resolved_role === "tourist").length,
      provider: users.filter((u) => u.resolved_role === "provider").length,
      admin: users.filter((u) => u.resolved_role === "admin").length,
    };
  }, [users]);

  return (
    <PageShell
      eyebrow="Access Control & Governance"
      title="User Management"
      subtitle="Inspect user accounts, manage role authorizations, and audit platform membership."
    >
      {/* Role Counts and Search Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Role Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={roleFilter === "all" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setRoleFilter("all");
              setPage(1);
            }}
          >
            All Users ({counts.all})
          </Button>
          <Button
            size="sm"
            variant={roleFilter === "tourist" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setRoleFilter("tourist");
              setPage(1);
            }}
          >
            Tourists ({counts.tourist})
          </Button>
          <Button
            size="sm"
            variant={roleFilter === "provider" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setRoleFilter("provider");
              setPage(1);
            }}
          >
            Providers ({counts.provider})
          </Button>
          <Button
            size="sm"
            variant={roleFilter === "admin" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setRoleFilter("admin");
              setPage(1);
            }}
          >
            Admins ({counts.admin})
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, ID..."
            className="rounded-full pl-9 pr-4 text-sm"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="mt-6">
        <AdminTable
          headers={["User", "ID", "Contact", "Role", "Joined Date", "Action"]}
          isLoading={isLoading}
          error={error}
          empty={
            searchQuery || roleFilter !== "all"
              ? "No users match your filter criteria."
              : "No users registered yet."
          }
          rows={paginatedUsers.map((u) => {
            const isSelf = false;
            return (
              <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary font-display font-semibold text-secondary-foreground text-xs uppercase">
                      {u.full_name ? u.full_name.slice(0, 2) : "U"}
                    </span>
                    <div>
                      <p className="font-medium text-sm text-foreground">{u.full_name || "Unnamed User"}</p>
                      <p className="text-xs text-muted-foreground">{u.email || "No email provided"}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {u.id.slice(0, 8)}…
                  </code>
                </Td>
                <Td>
                  <span className="text-xs text-muted-foreground">{u.phone || "—"}</span>
                </Td>
                <Td>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wider ${
                      u.resolved_role === "admin"
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold"
                        : u.resolved_role === "provider"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                    }`}
                  >
                    {u.resolved_role === "admin" ? (
                      <Shield className="size-3" />
                    ) : u.resolved_role === "provider" ? (
                      <UserCheck className="size-3" />
                    ) : (
                      <Users className="size-3" />
                    )}
                    {u.resolved_role}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </Td>
                <Td>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => openRoleModal(u)}
                  >
                    <UserCog className="size-3.5" />
                    Change Role
                  </Button>
                </Td>
              </tr>
            );
          })}
        />
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredUsers.length)} of{" "}
            {filteredUsers.length} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-xs font-medium px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Role Management Confirmation Dialog */}
      <AlertDialog open={!!targetUser} onOpenChange={(open) => !open && setTargetUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-amber-500" />
              Modify Role Permissions
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-3 pt-2">
              <p>
                You are updating the administrative role for{" "}
                <span className="font-semibold text-foreground">
                  {targetUser?.full_name || targetUser?.email || "User"}
                </span>{" "}
                (<code className="text-xs">{targetUser?.id.slice(0, 8)}</code>).
              </p>

              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
                <label className="text-xs font-semibold text-foreground block">
                  Assign New Role
                </label>
                <Select
                  value={selectedRole}
                  onValueChange={(val) => setSelectedRole(val as AppRole)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tourist">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-emerald-500" />
                        <span>Tourist (Standard guest browsing & booking)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="provider">
                      <div className="flex items-center gap-2">
                        <UserCheck className="size-4 text-blue-500" />
                        <span>Provider (Host services & manage listings)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="size-4 text-purple-500" />
                        <span>Admin (Full administrative & moderation access)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRole === "admin" && targetUser?.resolved_role !== "admin" && (
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-xs text-purple-700 dark:text-purple-300">
                  ⚠️ Granting <strong>Administrator</strong> privileges gives this user full platform control, user management, and service moderation rights.
                </div>
              )}

              {targetUser?.resolved_role === "admin" && selectedRole !== "admin" && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ Demoting this Administrator will revoke all admin panel access. The system safeguards will prevent removing the last admin.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateRoleMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateRoleMutation.isPending || selectedRole === targetUser?.resolved_role}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRoleChange();
              }}
            >
              {updateRoleMutation.isPending ? "Updating Role…" : "Confirm Role Change"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="mt-8 text-xs text-muted-foreground border-t border-border pt-4">
        🔒 Role modifications are cryptographically validated by backend authorization functions. User history, bookings, and payments are strictly preserved.
      </p>
    </PageShell>
  );
}
