"use client";

import ProtectedRoute from "@/components/guard/ProtectedRoute";
import {
  adminService,
  type AccessControlData,
  type AdminAccessRole,
  type RolePayload,
} from "@/services/adminService";
import { Loader2, Save, Shield, UserCog } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type RoleForm = {
  id?: number;
  name: string;
  permissions: Set<string>;
  subjectIds: Set<number>;
};

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

const emptyForm = (): RoleForm => ({
  name: "",
  permissions: new Set(),
  subjectIds: new Set(),
});

const permissionKey = (actionId: number, resourceId: number) => `${actionId}:${resourceId}`;
const errorMessage = (err: unknown, fallback: string) => {
  return (err as ApiError)?.response?.data?.error || fallback;
};

export default function AdminRolesPage() {
  const t = useTranslations("AdminRoles");
  const locale = useLocale();
  const [data, setData] = useState<AccessControlData | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accessData = await adminService.getAccessControl();
      setData(accessData);
    } catch (err: unknown) {
      setError(errorMessage(err, t("errors.load")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedRole = useMemo(() => {
    if (!data || !form.id) return null;
    return data.roles.find((role) => role.id === form.id) || null;
  }, [data, form.id]);

  const editRole = (role: AdminAccessRole) => {
    setForm({
      id: role.id,
      name: role.name,
      permissions: new Set(role.permissions.map((permission) => permissionKey(permission.action_id, permission.resource_id))),
      subjectIds: new Set(role.subject_ids),
    });
    setMessage(null);
    setError(null);
  };

  const togglePermission = (key: string) => {
    setForm((current) => {
      const next = new Set(current.permissions);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...current, permissions: next };
    });
  };

  const toggleSubject = (subjectId: number) => {
    setForm((current) => {
      const next = new Set(current.subjectIds);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return { ...current, subjectIds: next };
    });
  };

  const buildPayload = (): RolePayload => {
    const permissions = Array.from(form.permissions).map((key) => {
      const [actionId, resourceId] = key.split(":").map(Number);
      return { action_id: actionId, resource_id: resourceId };
    });

    return {
      name: form.name.trim(),
      permissions,
      subject_ids: Array.from(form.subjectIds),
    };
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = buildPayload();
      if (form.id) {
        await adminService.updateRole(form.id, payload);
        setMessage(t("messages.updated"));
      } else {
        await adminService.createRole(payload);
        setMessage(t("messages.created"));
      }
      setForm(emptyForm());
      await loadData();
    } catch (err: unknown) {
      setError(errorMessage(err, t("errors.save")));
    } finally {
      setSaving(false);
    }
  };

  const assignRole = async (userId: string, roleId: number) => {
    setAssigningUserId(userId);
    setMessage(null);
    setError(null);
    try {
      await adminService.assignUserRole(userId, roleId);
      setMessage(t("messages.assigned"));
      await loadData();
    } catch (err: unknown) {
      setError(errorMessage(err, t("errors.assign")));
    } finally {
      setAssigningUserId(null);
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section>
          <div className="mb-3 pill-badge inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-black uppercase tracking-[0.28em]">
            <Shield size={15} />
            {t("eyebrow")}
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-sol-text sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-2xl font-bold text-sol-muted">{t("subtitle")}</p>
        </section>

        {(message || error) && (
          <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${error ? "border-red-500/20 bg-red-500/10 text-red-500" : "border-green-500/20 bg-green-500/10 text-green-600"}`}>
            {error || message}
          </div>
        )}

        {loading || !data ? (
          <div className="flex min-h-[50vh] items-center justify-center rounded-lg border border-sol-border/10 bg-sol-surface">
            <Loader2 className="animate-spin text-sol-accent" size={42} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
            <section className="rounded-lg border border-sol-border/10 bg-sol-surface p-5 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-sol-text">
                    {form.id ? t("form.editTitle") : t("form.createTitle")}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-sol-muted">
                    {selectedRole ? t("form.editing", { role: selectedRole.name }) : t("form.hint")}
                  </p>
                </div>
                {form.id && (
                  <button
                    type="button"
                    onClick={() => setForm(emptyForm())}
                    className="rounded-lg px-3 py-2 text-sm font-black text-sol-muted hover:bg-sol-bg hover:text-sol-text"
                  >
                    {t("actions.newRole")}
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-widest text-sol-muted">
                    {t("form.name")}
                  </span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder={t("form.namePlaceholder")}
                    className="w-full rounded-lg border border-sol-border/30 bg-sol-bg px-3 py-3 font-bold text-sol-text outline-none transition focus:border-sol-accent"
                  />
                </label>

                <div>
                  <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-sol-muted">
                    {t("form.subjects")}
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {data.subjects.map((subject) => (
                      <label key={subject.id} className="flex items-center gap-3 rounded-lg border border-sol-border/10 bg-sol-bg/40 p-3 font-bold text-sol-text">
                        <input
                          type="checkbox"
                          checked={form.subjectIds.has(subject.id)}
                          onChange={() => toggleSubject(subject.id)}
                          className="h-4 w-4 accent-sol-accent"
                        />
                        {locale === "vi" ? subject.title_vi : subject.title_en}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-sol-muted">
                    {t("form.permissions")}
                  </h3>
                  <div className="max-h-80 space-y-4 overflow-y-auto rounded-lg border border-sol-border/10 bg-sol-bg/30 p-3">
                    {data.resources.map((resource) => (
                      <div key={resource.id}>
                        <div className="mb-2 text-xs font-black uppercase tracking-widest text-sol-accent">
                          {resource.name}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {data.actions.map((action) => {
                            const key = permissionKey(action.id, resource.id);
                            return (
                              <label key={key} className="flex items-center gap-2 rounded-lg bg-sol-surface px-3 py-2 text-sm font-bold text-sol-text">
                                <input
                                  type="checkbox"
                                  checked={form.permissions.has(key)}
                                  onChange={() => togglePermission(key)}
                                  className="h-4 w-4 accent-sol-accent"
                                />
                                {action.name}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-sol-accent px-4 py-3 font-black text-sol-bg shadow-sm transition hover:bg-sol-accent/90 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {form.id ? t("actions.save") : t("actions.create")}
                </button>
              </form>
            </section>

            <div className="space-y-6">
              <section className="rounded-lg border border-sol-border/10 bg-sol-surface shadow-sm">
                <div className="border-b border-sol-border/10 p-5">
                  <h2 className="text-xl font-black text-sol-text">{t("roles.title")}</h2>
                </div>
                <div className="divide-y divide-sol-border/10">
                  {data.roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => editRole(role)}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-sol-bg/40"
                    >
                      <div>
                        <div className="font-black text-sol-text">{role.name}</div>
                        <div className="mt-1 text-xs font-bold uppercase tracking-wider text-sol-muted">
                          {t("roles.meta", {
                            permissions: role.permissions.length,
                            subjects: role.subject_ids.length,
                            users: role.users,
                          })}
                        </div>
                      </div>
                      <UserCog className="text-sol-accent" size={20} />
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-sol-border/10 bg-sol-surface shadow-sm">
                <div className="border-b border-sol-border/10 p-5">
                  <h2 className="text-xl font-black text-sol-text">{t("assign.title")}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b border-sol-border/10 bg-sol-bg/50">
                        <Th>{t("assign.user")}</Th>
                        <Th>{t("assign.currentRole")}</Th>
                        <Th>{t("assign.newRole")}</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sol-border/10">
                      {data.users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-5 py-4">
                            <div className="font-black text-sol-text">{user.username}</div>
                            <div className="text-sm font-bold text-sol-muted">{user.email}</div>
                          </td>
                          <td className="px-5 py-4 font-black text-sol-accent">{user.role.name}</td>
                          <td className="px-5 py-4">
                            <select
                              value={user.role.id}
                              disabled={assigningUserId === user.id}
                              onChange={(event) => assignRole(user.id, Number(event.target.value))}
                              className="w-full rounded-lg border border-sol-border/30 bg-sol-bg px-3 py-2 font-bold text-sol-text outline-none focus:border-sol-accent"
                            >
                              {data.roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-widest text-sol-muted">
      {children}
    </th>
  );
}
