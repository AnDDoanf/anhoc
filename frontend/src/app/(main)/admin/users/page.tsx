"use client";

import ProtectedRoute from "@/components/guard/ProtectedRoute";
import ConfirmModal from "@/components/ui/ConfirmModal";
import PillBadge from "@/components/ui/PillBadge";
import { useAuth } from "@/hooks/useAuth";
import {
  adminService,
  type AdminRole,
  type AdminUser,
  type AdminUserPayload,
} from "@/services/adminService";
import {
  Edit3,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type FormState = {
  username: string;
  email: string;
  password: string;
  role_name: string;
};

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

const initialForm: FormState = {
  username: "",
  email: "",
  password: "",
  role_name: "",
};

const getErrorMessage = (err: unknown, fallback: string) => {
  return (err as ApiError)?.response?.data?.error || fallback;
};

export default function AdminUsersPage() {
  const t = useTranslations("AdminUsers");
  const locale = useLocale();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleData, userData] = await Promise.all([
        adminService.listRoles(),
        adminService.listUsers(),
      ]);
      setRoles(roleData);
      setUsers(userData);
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("errors.load")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const defaultRoleName = useMemo(() => {
    return roles.find((role) => role.name === "student")?.name || roles[0]?.name || "";
  }, [roles]);

  useEffect(() => {
    if (!form.role_name && defaultRoleName) {
      setForm((current) => ({ ...current, role_name: defaultRoleName }));
    }
  }, [defaultRoleName, form.role_name]);

  const refreshUsers = async () => {
    setError(null);
    try {
      const data = await adminService.listUsers({
        search: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("errors.refresh")));
    }
  };

  const visibleUsers = users;

  const totals = useMemo(() => {
    return {
      users: users.length,
      admins: users.filter((item) => item.role.name === "admin").length,
      students: users.filter((item) => item.role.name === "student").length,
    };
  }, [users]);

  const resetForm = (clearMessages = true) => {
    setEditingUser(null);
    setForm({ ...initialForm, role_name: defaultRoleName });
    if (clearMessages) {
      setError(null);
      setSuccess(null);
    }
  };

  const startEdit = (user: AdminUser) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      email: user.email,
      password: "",
      role_name: user.role.name,
    });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: AdminUserPayload = {
      username: form.username.trim(),
      email: form.email.trim(),
      role_name: form.role_name,
    };

    if (form.password) {
      payload.password = form.password;
    }

    try {
      if (editingUser) {
        const updatedUser = await adminService.updateUser(editingUser.id, payload);
        setUsers((current) =>
          current.map((item) => (item.id === updatedUser.id ? updatedUser : item))
        );
        setSuccess(t("messages.updated"));
      } else {
        const createdUser = await adminService.createUser({
          ...payload,
          password: form.password,
        });
        setUsers((current) => [createdUser, ...current]);
        setSuccess(t("messages.created"));
      }
      resetForm(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("errors.save")));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      await adminService.deleteUser(deleteTarget.id);
      setUsers((current) => current.filter((item) => item.id !== deleteTarget.id));
      setSuccess(t("messages.deleted"));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("errors.delete")));
    } finally {
      setDeleting(false);
    }
  };

  const formatRole = (roleName: string) => {
    const roleLabels: Record<string, string> = {
      admin: t("roles.admin"),
      teacher: t("roles.teacher"),
      student: t("roles.student"),
    };

    return roleLabels[roleName] || roleName;
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <PillBadge label={t("eyebrow")} icon={<Sparkles size={16} />} className="mb-3" />
            <h1 className="text-3xl font-black uppercase tracking-tight text-sol-text sm:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-2 max-w-2xl font-bold text-sol-muted">
              {t("subtitle")}
            </p>
          </div>
          <button
            onClick={loadInitialData}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-sol-border/30 bg-sol-surface px-4 py-2.5 text-sm font-black text-sol-text transition hover:border-sol-accent/50 hover:text-sol-accent"
          >
            <RefreshCw size={16} />
            {t("actions.refresh")}
          </button>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Metric label={t("metrics.accounts")} value={totals.users} icon={<Users size={20} />} />
          <Metric label={t("metrics.admins")} value={totals.admins} icon={<Shield size={20} />} />
          <Metric label={t("metrics.students")} value={totals.students} icon={<UserPlus size={20} />} />
        </section>

        {(error || success) && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-bold ${
              error
                ? "border-red-500/20 bg-red-500/10 text-red-500"
                : "border-green-500/20 bg-green-500/10 text-green-600"
            }`}
          >
            {error || success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
          <section className="rounded-lg border border-sol-border/20 bg-sol-surface p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-sol-text">
                  {editingUser ? t("form.editTitle") : t("form.createTitle")}
                </h2>
                <p className="mt-1 text-sm font-bold text-sol-muted">
                  {editingUser ? t("form.editHint") : t("form.createHint")}
                </p>
              </div>
              {editingUser && (
                <button
                  onClick={() => resetForm()}
                  className="rounded-lg p-2 text-sol-muted transition hover:bg-sol-bg hover:text-sol-text"
                  aria-label={t("actions.cancelEdit")}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field
                label={t("form.username")}
                value={form.username}
                onChange={(value) => setForm((current) => ({ ...current, username: value }))}
                placeholder={t("form.usernamePlaceholder")}
                required
              />
              <Field
                label={t("form.email")}
                type="email"
                value={form.email}
                onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                placeholder={t("form.emailPlaceholder")}
                required
              />
              <Field
                label={editingUser ? t("form.newPassword") : t("form.password")}
                type="password"
                value={form.password}
                onChange={(value) => setForm((current) => ({ ...current, password: value }))}
                placeholder={editingUser ? t("form.optionalPassword") : t("form.passwordPlaceholder")}
                required={!editingUser}
              />
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-widest text-sol-muted">
                  {t("form.role")}
                </span>
                <select
                  value={form.role_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, role_name: event.target.value }))
                  }
                  className="w-full rounded-lg border border-sol-border/30 bg-sol-bg px-3 py-3 font-bold text-sol-text outline-none transition focus:border-sol-accent"
                  required
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {formatRole(role.name)}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-sol-accent px-4 py-3 font-black text-sol-bg shadow-sm transition hover:bg-sol-accent/90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                {editingUser ? t("actions.saveChanges") : t("actions.create")}
              </button>
            </form>
          </section>

          <section className="min-w-0 rounded-lg border border-sol-border/20 bg-sol-surface shadow-sm">
            <div className="border-b border-sol-border/10 p-4">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  refreshUsers();
                }}
                className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]"
              >
                <label className="relative block">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sol-muted"
                    size={18}
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("filters.searchPlaceholder")}
                    className="w-full rounded-lg border border-sol-border/30 bg-sol-bg py-3 pl-10 pr-3 font-bold text-sol-text outline-none transition focus:border-sol-accent"
                  />
                </label>
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="rounded-lg border border-sol-border/30 bg-sol-bg px-3 py-3 font-bold text-sol-text outline-none transition focus:border-sol-accent"
                >
                  <option value="">{t("filters.allRoles")}</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {formatRole(role.name)}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-lg bg-sol-text px-5 py-3 font-black text-sol-bg transition hover:bg-sol-accent"
                >
                  {t("actions.search")}
                </button>
              </form>
            </div>

            {loading ? (
              <div className="flex min-h-80 flex-col items-center justify-center gap-3 p-8">
                <Loader2 className="animate-spin text-sol-accent" size={36} />
                <p className="font-black text-sol-muted">{t("loading")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px]">
                  <thead>
                    <tr className="border-b border-sol-border/10 bg-sol-bg/50">
                      <Th>{t("table.account")}</Th>
                      <Th>{t("table.role")}</Th>
                      <Th>{t("table.level")}</Th>
                      <Th>{t("table.attempts")}</Th>
                      <Th>{t("table.created")}</Th>
                      <Th>{t("table.actions")}</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sol-border/10">
                    {visibleUsers.map((item) => {
                      const isCurrentUser = item.id === currentUser?.id;
                      return (
                        <tr
                          key={item.id}
                          tabIndex={0}
                          role="link"
                          onClick={() => router.push(`/admin/users/${item.id}`)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(`/admin/users/${item.id}`);
                            }
                          }}
                          className="transition hover:bg-sol-bg/40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sol-accent/40"
                        >
                          <td className="px-5 py-4">
                            <div className="font-black text-sol-text">{item.username}</div>
                            <div className="text-sm font-bold text-sol-muted">{item.email}</div>
                          </td>
                          <td className="px-5 py-4">
                            <PillBadge label={formatRole(item.role.name)} compact />
                          </td>
                          <td className="px-5 py-4 font-black text-sol-text">
                            {item.stats?.level || 1}
                          </td>
                          <td className="px-5 py-4 font-black text-sol-text">{item.attempts}</td>
                          <td className="px-5 py-4 text-sm font-bold text-sol-muted">
                            {new Date(item.created_at).toLocaleDateString(locale)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  startEdit(item);
                                }}
                                onKeyDown={(event) => event.stopPropagation()}
                                className="inline-flex items-center gap-2 rounded-lg border border-sol-border/30 px-3 py-2 text-sm font-black text-sol-text transition hover:border-sol-accent/50 hover:text-sol-accent"
                              >
                                <Edit3 size={15} />
                                {t("actions.edit")}
                              </button>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeleteTarget(item);
                                }}
                                onKeyDown={(event) => event.stopPropagation()}
                                disabled={isCurrentUser || deleting}
                                title={isCurrentUser ? t("messages.cannotDeleteSelf") : ""}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-sm font-black text-red-500 transition hover:bg-red-500/10 disabled:opacity-40"
                              >
                                <Trash2 size={15} />
                                {t("actions.delete")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {visibleUsers.length === 0 && (
                  <div className="p-10 text-center">
                    <p className="font-black text-sol-text">{t("empty.title")}</p>
                    <p className="mt-1 text-sm font-bold text-sol-muted">
                      {t("empty.subtitle")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <ConfirmModal
          isOpen={!!deleteTarget}
          title={t("deleteModal.title")}
          message={t("deleteModal.message", { username: deleteTarget?.username || t("deleteModal.fallbackUser") })}
          confirmText={deleting ? t("deleteModal.deleting") : t("actions.delete")}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isDestructive
        />
      </div>
    </ProtectedRoute>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-sol-border/20 bg-sol-surface p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-sol-accent/10 text-sol-accent">
        {icon}
      </div>
      <div className="text-xs font-black uppercase tracking-widest text-sol-muted">{label}</div>
      <div className="mt-1 text-3xl font-black text-sol-text">{value}</div>
    </div>
  );
}



function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-sol-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-sol-border/30 bg-sol-bg px-3 py-3 font-bold text-sol-text outline-none transition placeholder:text-sol-muted/60 focus:border-sol-accent"
      />
    </label>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-widest text-sol-muted">
      {children}
    </th>
  );
}
