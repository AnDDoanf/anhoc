"use client";

import ProtectedRoute from "@/components/guard/ProtectedRoute";
import PillBadge from "@/components/ui/PillBadge";
import { adminService, type AdminUser, type AdminUserPayload } from "@/services/adminService";
import {
  Check,
  Edit3,
  Infinity,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type CapacityEdit = {
  slots_purchased: string;
  max_subjects: string;
  max_grades: string;
  max_lessons: string;
  max_templates: string;
  max_teachers: string;
  max_students: string;
};

type ApiError = {
  response?: { data?: { error?: string } };
};
const getErrorMessage = (err: unknown, fallback: string) =>
  (err as ApiError)?.response?.data?.error || fallback;

const toDisplay = (val: number | null | undefined) =>
  val !== null && val !== undefined ? String(val) : "";

export default function AdminSubscriptionPage() {
  const t = useTranslations("AdminSubscription");
  const tUsers = useTranslations("AdminUsers");

  const [supervisors, setSupervisors] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CapacityEdit>({
    slots_purchased: "",
    max_subjects: "",
    max_grades: "",
    max_lessons: "",
    max_templates: "",
    max_teachers: "",
    max_students: "",
  });
  const [saving, setSaving] = useState(false);

  const loadSupervisors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.listUsers({ role: "supervisor", pageSize: 100 });
      setSupervisors(data.items);
    } catch (err) {
      setError(getErrorMessage(err, t("errors.load")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSupervisors();
  }, [loadSupervisors]);

  const startEdit = (user: AdminUser) => {
    setEditingId(user.id);
    setEditForm({
      slots_purchased: String(user.slots_purchased || 0),
      max_subjects: toDisplay(user.max_subjects),
      max_grades: toDisplay(user.max_grades),
      max_lessons: toDisplay(user.max_lessons),
      max_templates: toDisplay(user.max_templates),
      max_teachers: toDisplay(user.max_teachers),
      max_students: toDisplay(user.max_students),
    });
    setError(null);
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = async (user: AdminUser) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: AdminUserPayload = {
        username: user.username,
        email: user.email,
        country: user.country || "",
        role_name: "supervisor",
        slots_purchased: Math.max(0, parseInt(editForm.slots_purchased) || 0),
        max_subjects: editForm.max_subjects ? Number(editForm.max_subjects) : null,
        max_grades: editForm.max_grades ? Number(editForm.max_grades) : null,
        max_lessons: editForm.max_lessons ? Number(editForm.max_lessons) : null,
        max_templates: editForm.max_templates ? Number(editForm.max_templates) : null,
        max_teachers: editForm.max_teachers ? Number(editForm.max_teachers) : null,
        max_students: editForm.max_students ? Number(editForm.max_students) : null,
      };
      await adminService.updateUser(user.id, payload);
      await loadSupervisors();
      setEditingId(null);
      setSuccess(tUsers("messages.updated"));
    } catch (err) {
      setError(getErrorMessage(err, tUsers("errors.save")));
    } finally {
      setSaving(false);
    }
  };

  const legendItems = [
    { key: "subjects" as const },
    { key: "grades" as const },
    { key: "lessons" as const },
    { key: "templates" as const },
    { key: "teachers" as const },
    { key: "students" as const },
  ];

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
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
            onClick={loadSupervisors}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-sol-border/30 bg-sol-surface px-4 py-2.5 text-sm font-black text-sol-text transition hover:border-sol-accent/50 hover:text-sol-accent"
          >
            <RefreshCw size={16} />
            {tUsers("actions.refresh")}
          </button>
        </section>

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label={t("stats.totalSupervisors")}
            value={supervisors.length}
            icon={<Users size={20} />}
          />
          <StatCard
            label={t("stats.totalSeats")}
            value={supervisors.reduce((s, u) => s + (u.slots_purchased || 0), 0)}
            icon={<Check size={20} />}
          />
          <StatCard
            label={t("stats.activeSubscriptions")}
            value={supervisors.filter((u) => (u.slots_purchased || 0) > 0).length}
            icon={<Sparkles size={20} />}
          />
        </section>

        {/* Alerts */}
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

        {/* Table */}
        <section className="rounded-xl border border-sol-border/20 bg-sol-surface shadow-sm overflow-hidden">
          <div className="border-b border-sol-border/10 p-5">
            <h2 className="text-xl font-black text-sol-text">{t("table.title")}</h2>
            <p className="mt-1 text-sm font-bold text-sol-muted">{t("table.hint")}</p>
          </div>

          {loading ? (
            <div className="flex min-h-60 flex-col items-center justify-center gap-3 p-8">
              <Loader2 className="animate-spin text-sol-accent" size={36} />
              <p className="font-black text-sol-muted">{t("loading")}</p>
            </div>
          ) : supervisors.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-black text-sol-text">{t("empty.title")}</p>
              <p className="mt-1 text-sm font-bold text-sol-muted">{t("empty.subtitle")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="border-b border-sol-border/10 bg-sol-bg/50">
                    <Th>{t("table.account")}</Th>
                    <Th>{t("table.seats")}</Th>
                    <Th>{t("table.subjects")}</Th>
                    <Th>{t("table.grades")}</Th>
                    <Th>{t("table.lessons")}</Th>
                    <Th>{t("table.templates")}</Th>
                    <Th>{t("table.teachers")}</Th>
                    <Th>{t("table.students")}</Th>
                    <Th>{t("table.actions")}</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sol-border/10">
                  {supervisors.map((user) => {
                    const isEditing = editingId === user.id;
                    return (
                      <tr key={user.id} className="transition hover:bg-sol-bg/30">
                        {/* Account */}
                        <td className="px-5 py-4">
                          <div className="font-black text-sol-text">{user.username}</div>
                          <div className="text-xs font-bold text-sol-muted">{user.email}</div>
                          {user.country && (
                            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-sol-text/50">
                              {user.country}
                            </div>
                          )}
                        </td>

                        {/* Seats */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <LimitInput
                              value={editForm.slots_purchased}
                              onChange={(v) => setEditForm((f) => ({ ...f, slots_purchased: v }))}
                              required
                            />
                          ) : (
                            <LimitBadge value={user.slots_purchased} unlimitedLabel={t("unlimited")} />
                          )}
                        </td>

                        {/* Subjects */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <LimitInput
                              value={editForm.max_subjects}
                              onChange={(v) => setEditForm((f) => ({ ...f, max_subjects: v }))}
                            />
                          ) : (
                            <LimitBadge value={user.max_subjects} unlimitedLabel={t("unlimited")} />
                          )}
                        </td>

                        {/* Grades */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <LimitInput
                              value={editForm.max_grades}
                              onChange={(v) => setEditForm((f) => ({ ...f, max_grades: v }))}
                            />
                          ) : (
                            <LimitBadge value={user.max_grades} unlimitedLabel={t("unlimited")} />
                          )}
                        </td>

                        {/* Lessons */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <LimitInput
                              value={editForm.max_lessons}
                              onChange={(v) => setEditForm((f) => ({ ...f, max_lessons: v }))}
                            />
                          ) : (
                            <LimitBadge value={user.max_lessons} unlimitedLabel={t("unlimited")} />
                          )}
                        </td>

                        {/* Templates */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <LimitInput
                              value={editForm.max_templates}
                              onChange={(v) => setEditForm((f) => ({ ...f, max_templates: v }))}
                            />
                          ) : (
                            <LimitBadge value={user.max_templates} unlimitedLabel={t("unlimited")} />
                          )}
                        </td>

                        {/* Teachers */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <LimitInput
                              value={editForm.max_teachers}
                              onChange={(v) => setEditForm((f) => ({ ...f, max_teachers: v }))}
                            />
                          ) : (
                            <LimitBadge value={user.max_teachers} unlimitedLabel={t("unlimited")} />
                          )}
                        </td>

                        {/* Students */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <LimitInput
                              value={editForm.max_students}
                              onChange={(v) => setEditForm((f) => ({ ...f, max_students: v }))}
                            />
                          ) : (
                            <LimitBadge value={user.max_students} unlimitedLabel={t("unlimited")} />
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSave(user)}
                                disabled={saving}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-sol-accent px-3 py-2 text-xs font-black text-sol-bg shadow-sm transition hover:bg-sol-accent/90 disabled:opacity-60"
                              >
                                {saving ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Check size={13} />
                                )}
                                {t("save")}
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-sol-border/30 px-3 py-2 text-xs font-black text-sol-muted transition hover:text-sol-text disabled:opacity-60"
                              >
                                <X size={13} />
                                {t("cancel")}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(user)}
                              className="inline-flex items-center gap-2 rounded-lg border border-sol-border/30 px-3 py-2 text-sm font-black text-sol-text transition hover:border-sol-accent/50 hover:text-sol-accent"
                            >
                              <Edit3 size={14} />
                              {tUsers("actions.edit")}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Legend */}
        <section className="rounded-xl border border-sol-border/10 bg-sol-surface/50 p-5">
          <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-sol-muted">
            {t("legend.title")}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {legendItems.map(({ key }) => (
              <div key={key} className="rounded-lg border border-sol-border/10 bg-sol-bg/40 p-3">
                <div className="text-xs font-black text-sol-accent">{t(`legend.${key}.label`)}</div>
                <p className="mt-1 text-xs font-bold text-sol-muted leading-relaxed">
                  {t(`legend.${key}.desc`)}
                </p>
                <p className="mt-1 text-[10px] font-bold text-sol-text/40">{t("legend.blankHint")}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-widest text-sol-muted">
      {children}
    </th>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
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

function LimitBadge({
  value,
  unlimitedLabel,
}: {
  value: number | null | undefined;
  unlimitedLabel: string;
}) {
  if (value === null || value === undefined) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sol-accent/10 px-2.5 py-1 text-xs font-black text-sol-accent">
        <Infinity size={11} />
        {unlimitedLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-sol-bg border border-sol-border/20 px-2.5 py-1 text-xs font-black text-sol-text">
      {value}
    </span>
  );
}

function LimitInput({
  value,
  onChange,
  required = false,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="∞"
      required={required}
      className="w-20 rounded-lg border border-sol-border/30 bg-sol-bg px-2 py-1.5 text-sm font-bold text-sol-text outline-none transition placeholder:text-sol-muted/50 focus:border-sol-accent"
    />
  );
}
