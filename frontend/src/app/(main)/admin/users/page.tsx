"use client";

import ProtectedRoute from "@/components/guard/ProtectedRoute";
import ConfirmModal from "@/components/ui/ConfirmModal";
import PillBadge from "@/components/ui/PillBadge";
import { useAuth } from "@/hooks/useAuth";
import {
  adminService,
  type AdminRole,
  type SubjectAccessRequest,
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
  country: string;
  password: string;
  role_name: string;
  slots_purchased: number;
  max_subjects: string;
  max_grades: string;
  max_lessons: string;
  max_templates: string;
  max_teachers: string;
  max_students: string;
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
  country: "",
  password: "",
  role_name: "",
  slots_purchased: 0,
  max_subjects: "",
  max_grades: "",
  max_lessons: "",
  max_templates: "",
  max_teachers: "",
  max_students: "",
};

const COUNTRY_OPTIONS = [
  "Argentina",
  "Australia",
  "Brazil",
  "Cambodia",
  "Canada",
  "China",
  "France",
  "Germany",
  "India",
  "Indonesia",
  "Japan",
  "Laos",
  "Malaysia",
  "Myanmar",
  "Philippines",
  "Singapore",
  "South Korea",
  "Thailand",
  "United Kingdom",
  "United States",
  "Vietnam",
];

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
  const [countryQuery, setCountryQuery] = useState("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState({ total: 0, admins: 0, students: 0 });
  const [subjectAccessRequests, setSubjectAccessRequests] = useState<SubjectAccessRequest[]>([]);
  const [reviewingRequestId, setReviewingRequestId] = useState<number | null>(null);

  const loadUsers = useCallback(async (
    nextPage = 1,
    append = false,
    searchValue = search,
    roleValue = roleFilter
  ) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await adminService.listUsers({
        search: searchValue || undefined,
        role: roleValue || undefined,
        page: nextPage,
        pageSize: 10,
      });
      setUsers((current) => (append ? [...current, ...data.items] : data.items));
      if (data.summary) {
        setSummary({
          total: data.summary.total,
          admins: data.summary.admins || 0,
          students: data.summary.students || 0,
        });
      }
      setPage(data.pagination.page);
      setHasMore(data.pagination.hasMore);
    } catch (err: unknown) {
      setError(getErrorMessage(err, append ? t("errors.refresh") : t("errors.load")));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [roleFilter, search, t]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleData, accessRequests] = await Promise.all([
        adminService.listRoles(),
        adminService.listSubjectAccessRequests("pending"),
      ]);
      setRoles(roleData);
      setSubjectAccessRequests(accessRequests);
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("errors.load")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadUsers(1, false, "", "");
  }, [loadUsers]);

  const defaultRoleName = useMemo(() => {
    return roles.find((role) => role.name === "free_student")?.name || roles[0]?.name || "";
  }, [roles]);

  useEffect(() => {
    if (!form.role_name && defaultRoleName) {
      setForm((current) => ({ ...current, role_name: defaultRoleName }));
    }
  }, [defaultRoleName, form.role_name]);

  const refreshUsers = async () => {
    await loadUsers(1, false, search, roleFilter);
  };

  const reviewSubjectAccess = async (requestId: number, status: "approved" | "rejected") => {
    setReviewingRequestId(requestId);
    setError(null);
    setSuccess(null);
    try {
      await adminService.updateSubjectAccessRequest(requestId, status);
      const accessRequests = await adminService.listSubjectAccessRequests("pending");
      setSubjectAccessRequests(accessRequests);
      setSuccess(status === "approved" ? t("messages.approvedSubjectAccess") : t("messages.rejectedSubjectAccess"));
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("errors.subjectAccess")));
    } finally {
      setReviewingRequestId(null);
    }
  };

  const visibleUsers = users;

  const totals = useMemo(() => {
    return {
      users: summary.total,
      admins: summary.admins,
      students: summary.students,
    };
  }, [summary]);

  const filteredCountries = useMemo(() => {
    const query = countryQuery.trim().toLowerCase();
    if (!query) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((country) => country.toLowerCase().includes(query));
  }, [countryQuery]);

  const resetForm = (clearMessages = true) => {
    setEditingUser(null);
    setForm({ ...initialForm, role_name: defaultRoleName });
    setCountryQuery("");
    setCountryDropdownOpen(false);
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
      country: user.country || "",
      password: "",
      role_name: user.role.name,
      slots_purchased: user.slots_purchased || 0,
      max_subjects: user.max_subjects !== undefined && user.max_subjects !== null ? String(user.max_subjects) : "",
      max_grades: user.max_grades !== undefined && user.max_grades !== null ? String(user.max_grades) : "",
      max_lessons: user.max_lessons !== undefined && user.max_lessons !== null ? String(user.max_lessons) : "",
      max_templates: user.max_templates !== undefined && user.max_templates !== null ? String(user.max_templates) : "",
      max_teachers: user.max_teachers !== undefined && user.max_teachers !== null ? String(user.max_teachers) : "",
      max_students: user.max_students !== undefined && user.max_students !== null ? String(user.max_students) : "",
    });
    setCountryQuery(user.country || "");
    setCountryDropdownOpen(false);
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
      country: form.country.trim(),
      role_name: form.role_name,
      slots_purchased: form.role_name === "supervisor" ? Number(form.slots_purchased) : 0,
      max_subjects: form.role_name === "supervisor" && form.max_subjects ? Number(form.max_subjects) : null,
      max_grades: form.role_name === "supervisor" && form.max_grades ? Number(form.max_grades) : null,
      max_lessons: form.role_name === "supervisor" && form.max_lessons ? Number(form.max_lessons) : null,
      max_templates: form.role_name === "supervisor" && form.max_templates ? Number(form.max_templates) : null,
      max_teachers: form.role_name === "supervisor" && form.max_teachers ? Number(form.max_teachers) : null,
      max_students: form.role_name === "supervisor" && form.max_students ? Number(form.max_students) : null,
    };

    if (form.password) {
      payload.password = form.password;
    }

    try {
      if (editingUser) {
        await adminService.updateUser(editingUser.id, payload);
        await loadUsers(1, false, search, roleFilter);
        setSuccess(t("messages.updated"));
      } else {
        await adminService.createUser({
          ...payload,
          password: form.password,
        });
        await loadUsers(1, false, search, roleFilter);
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
      await loadUsers(1, false, search, roleFilter);
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
      supervisor: t("roles.supervisor"),
      teacher: t("roles.teacher"),
      sub_student: t("roles.subStudent"),
      free_student: t("roles.freeStudent"),
    };

    return roleLabels[roleName] || roleName;
  };

  useEffect(() => {
    if (!editingUser && !form.country) {
      setCountryQuery("");
      return;
    }
    setCountryQuery(form.country);
  }, [editingUser, form.country]);

  const selectCountry = (country: string) => {
    setForm((current) => ({ ...current, country }));
    setCountryQuery(country);
    setCountryDropdownOpen(false);
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

        {subjectAccessRequests.length > 0 && (
          <section id="subject-access-requests" className="rounded-lg border border-sol-border/20 bg-sol-surface shadow-sm">
            <div className="border-b border-sol-border/10 p-5">
              <h2 className="text-xl font-black text-sol-text">{t("subjectAccess.title")}</h2>
              <p className="mt-1 text-sm font-bold text-sol-muted">{t("subjectAccess.subtitle")}</p>
            </div>
            <div className="divide-y divide-sol-border/10">
              {subjectAccessRequests.map((request) => {
                const subjectLabel = locale === "vi" ? request.subject.title_vi : request.subject.title_en;
                return (
                  <div key={request.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="font-black text-sol-text">{request.user.username}</div>
                      <div className="text-sm font-bold text-sol-muted">{request.user.email}</div>
                      <div className="mt-2 text-xs font-black uppercase tracking-widest text-sol-accent">
                        {subjectLabel} · {request.user.role.name}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={reviewingRequestId === request.id}
                        onClick={() => reviewSubjectAccess(request.id, "approved")}
                        className="rounded-lg bg-sol-accent px-4 py-2 text-sm font-black text-sol-bg disabled:opacity-60"
                      >
                        {t("subjectAccess.approve")}
                      </button>
                      <button
                        type="button"
                        disabled={reviewingRequestId === request.id}
                        onClick={() => reviewSubjectAccess(request.id, "rejected")}
                        className="rounded-lg border border-red-500/20 px-4 py-2 text-sm font-black text-red-500 disabled:opacity-60"
                      >
                        {t("subjectAccess.reject")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-widest text-sol-muted">
                  {t("form.country")}
                </span>
                <div className="relative">
                  <input
                    value={countryQuery}
                    onFocus={() => setCountryDropdownOpen(true)}
                    onBlur={() => window.setTimeout(() => setCountryDropdownOpen(false), 120)}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCountryQuery(value);
                      setForm((current) => ({ ...current, country: value }));
                      setCountryDropdownOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && filteredCountries.length > 0) {
                        event.preventDefault();
                        selectCountry(filteredCountries[0]);
                      }
                    }}
                    placeholder={t("form.countryPlaceholder")}
                    className="w-full rounded-lg border border-sol-border/30 bg-sol-bg px-3 py-3 font-bold text-sol-text outline-none transition placeholder:text-sol-muted/60 focus:border-sol-accent"
                  />
                  {countryDropdownOpen && (
                    <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-lg border border-sol-border/20 bg-sol-surface p-1 shadow-xl">
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map((country) => (
                          <button
                            key={country}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectCountry(country)}
                            className={`block w-full rounded-md px-3 py-2 text-left text-sm font-bold transition ${
                              form.country === country
                                ? "bg-sol-accent/10 text-sol-accent"
                                : "text-sol-text hover:bg-sol-bg hover:text-sol-accent"
                            }`}
                          >
                            {country}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm font-bold text-sol-muted">
                          {t("form.countryNoMatch")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>
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

              {form.role_name === "supervisor" && (
                <>
                  <Field
                    label={t("form.slotsPurchased")}
                    type="number"
                    value={String(form.slots_purchased)}
                    onChange={(value) => setForm((current) => ({ ...current, slots_purchased: Math.max(0, parseInt(value) || 0) }))}
                    placeholder="e.g. 5"
                    required
                  />
                  <Field
                    label={t("form.maxSubjects") || "Max Subjects"}
                    type="number"
                    value={form.max_subjects}
                    onChange={(value) => setForm((current) => ({ ...current, max_subjects: value }))}
                    placeholder={t("form.unlimitedPlaceholder") || "Unlimited"}
                  />
                  <Field
                    label={t("form.maxGrades") || "Max Grades"}
                    type="number"
                    value={form.max_grades}
                    onChange={(value) => setForm((current) => ({ ...current, max_grades: value }))}
                    placeholder={t("form.unlimitedPlaceholder") || "Unlimited"}
                  />
                  <Field
                    label={t("form.maxLessons") || "Max Lessons"}
                    type="number"
                    value={form.max_lessons}
                    onChange={(value) => setForm((current) => ({ ...current, max_lessons: value }))}
                    placeholder={t("form.unlimitedPlaceholder") || "Unlimited"}
                  />
                  <Field
                    label={t("form.maxTemplates") || "Max Templates"}
                    type="number"
                    value={form.max_templates}
                    onChange={(value) => setForm((current) => ({ ...current, max_templates: value }))}
                    placeholder={t("form.unlimitedPlaceholder") || "Unlimited"}
                  />
                  <Field
                    label={t("form.maxTeachers") || "Max Teachers"}
                    type="number"
                    value={form.max_teachers}
                    onChange={(value) => setForm((current) => ({ ...current, max_teachers: value }))}
                    placeholder={t("form.unlimitedPlaceholder") || "Unlimited"}
                  />
                  <Field
                    label={t("form.maxStudents") || "Max Students"}
                    type="number"
                    value={form.max_students}
                    onChange={(value) => setForm((current) => ({ ...current, max_students: value }))}
                    placeholder={t("form.unlimitedPlaceholder") || "Unlimited"}
                  />
                </>
              )}

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
                            {item.country && (
                              <div className="mt-1 text-xs font-bold uppercase tracking-wider text-sol-text/55">
                                {item.country}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <PillBadge label={formatRole(item.role.name)} compact />
                            {item.role.name === "supervisor" && (
                              <div className="mt-1 text-xs font-bold text-sol-accent">
                                {t("table.seats", { count: item.slots_purchased || 0 })}
                              </div>
                            )}
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
            {hasMore && !loading && (
              <div className="border-t border-sol-border/10 p-4 flex justify-center">
                <button
                  onClick={() => loadUsers(page + 1, true, search, roleFilter)}
                  disabled={loadingMore}
                  className="rounded-lg border border-sol-border/30 bg-sol-bg px-5 py-3 text-sm font-black text-sol-text transition hover:border-sol-accent/40 hover:text-sol-accent disabled:opacity-60"
                >
                  {loadingMore ? t("loadingMore") : t("showMore")}
                </button>
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
