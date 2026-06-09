"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  Users,
  UserPlus,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  UserX,
  UserCheck,
  Mail,
  Key,
  User,
  ArrowRight
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { setCredentials } from "@/redux/slices/authSlice";
import { setPermissions } from "@/redux/slices/permissionSlice";
import { authService, LearnUnitSummary } from "@/services/auth";
import { api } from "@/services/api";
import Hero from "@/components/ui/Hero";

type ManagedMember = {
  id: string;
  username: string;
  email: string;
  role: {
    name: string;
  };
  created_at: string;
  student_stats?: {
    level: number;
    total_xp: number;
  } | null;
};

type SupervisorMembersResponse = {
  learnUnit: LearnUnitSummary | null;
  members: ManagedMember[];
};

export default function SupervisorMembersPage() {
  const t = useTranslations("Supervisor");
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  const [members, setMembers] = useState<ManagedMember[]>([]);
  const [learnUnit, setLearnUnit] = useState<LearnUnitSummary | null>(null);
  const [membersLoading, setMembersLoading] = useState(true);
  
  // Create member state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<"free_student" | "teacher">("free_student");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formPending, setFormPending] = useState(false);

  // Operations state
  const [activeOperationId, setActiveOperationId] = useState<string | null>(null);
  const [operationError, setOperationError] = useState("");

  const fetchMembers = async () => {
    try {
      const response = await api.get<SupervisorMembersResponse>("/supervisor/members");
      setLearnUnit(response.data.learnUnit);
      setMembers(response.data.members);
    } catch (error: any) {
      console.error("Failed to load managed members:", error);
    } finally {
      setMembersLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const updatedProfile = await authService.getProfile();
      const token = localStorage.getItem("token") || "";
      dispatch(setCredentials({ user: updatedProfile, token }));
      dispatch(setPermissions(updatedProfile.permissions));
    } catch (error) {
      console.error("Failed to refresh supervisor profile:", error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/student/members");
      return;
    }
    
    if (!user) {
      return;
    }
    
    if (user.role !== "supervisor" && user.role !== "admin") {
      // Access denied
      return;
    }

    void fetchMembers();
  }, [isAuthenticated, user, router]);

  // If user is not supervisor or admin, render access denied
  if (user && user.role !== "supervisor" && user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <ShieldAlert className="text-sol-red h-16 w-16 mb-4 animate-pulse" />
        <h1 className="text-2xl font-black text-sol-text">{t("accessDenied")}</h1>
        <button
          type="button"
          onClick={() => router.push("/student")}
          className="mt-6 rounded-xl bg-sol-surface border border-sol-border/30 px-6 py-3 text-sm font-bold text-sol-text hover:border-sol-accent transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFormPending(true);

    try {
      await api.post("/supervisor/members", {
        email: newEmail,
        password: newPassword,
        username: newUsername,
        role_name: newRole
      });

      setFormSuccess(t("alerts.createSuccess", { username: newUsername }));
      setNewEmail("");
      setNewPassword("");
      setNewUsername("");
      setNewRole("free_student");
      
      // Refresh list
      void fetchMembers();
    } catch (error: any) {
      console.error("Failed to create member:", error);
      setFormError(error.response?.data?.error || "Failed to create account");
    } finally {
      setFormPending(false);
    }
  };

  const handleAssignSeat = async (memberId: string) => {
    setActiveOperationId(memberId);
    setOperationError("");

    try {
      await api.post(`/supervisor/members/${memberId}/assign-seat`);
      
      // Update locally
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, role: { name: "sub_student" } } : m
        )
      );
      
      // Refresh slots count from backend profile
      void refreshProfile();
    } catch (error: any) {
      console.error("Failed to assign seat:", error);
      setOperationError(error.response?.data?.error || "Failed to assign seat");
    } finally {
      setActiveOperationId(null);
    }
  };

  const handleUnassignSeat = async (memberId: string) => {
    setActiveOperationId(memberId);
    setOperationError("");

    try {
      await api.post(`/supervisor/members/${memberId}/unassign-seat`);
      
      // Update locally
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, role: { name: "free_student" } } : m
        )
      );

      // Refresh slots count from backend profile
      void refreshProfile();
    } catch (error: any) {
      console.error("Failed to unassign seat:", error);
      setOperationError(error.response?.data?.error || "Failed to revoke seat");
    } finally {
      setActiveOperationId(null);
    }
  };

  // Helper stats
  const totalSlots = user?.slots_purchased || 0;
  const assignedSlots = members.filter((m) => m.role.name === "sub_student").length;
  const availableSlots = Math.max(0, totalSlots - assignedSlots);

  return (
    <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Banner */}
      <Hero
        icon={<Users size={160} className="text-sol-accent md:h-[280px] md:w-[280px]" />}
        iconPosition="bottom-right"
        className="md:rounded-[3rem]"
        containerClassName="relative z-10 flex w-full flex-col items-start gap-5 lg:max-w-3xl"
      >
        <div className="space-y-4 md:space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-sol-accent/20 bg-sol-accent/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-sol-accent">
            <ShieldCheck size={12} className="md:h-3.5 md:w-3.5" />
            <span>{t("title")}</span>
          </div>
          <h1 className="text-[1.75rem] font-black leading-[1.05] tracking-tight text-sol-text sm:text-4xl md:text-6xl">
            {t("title")}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-sol-muted md:text-lg font-medium">
            {t("subtitle")}
          </p>
          {learnUnit && (
            <p className="inline-flex flex-wrap items-center gap-2 rounded-full border border-sol-accent/20 bg-sol-accent/5 px-4 py-2 text-xs font-bold text-sol-text">
              <span>{learnUnit.name}</span>
              <span className="text-sol-muted">•</span>
              <span className="text-sol-accent">{learnUnit.code}</span>
            </p>
          )}
        </div>
      </Hero>

      {/* Overview Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Seats Status */}
        <div className="rounded-3xl border border-sol-border/30 bg-sol-surface/50 backdrop-blur p-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-sol-muted">{t("slotsOverview")}</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-sol-text">{assignedSlots}</span>
              <span className="text-sol-muted font-bold">/</span>
              <span className="text-2xl font-bold text-sol-muted">{totalSlots}</span>
            </div>
            <p className="text-xs text-sol-muted mt-2">
              {t("slotsUsage", { assigned: assignedSlots, total: totalSlots })}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="h-2 w-full bg-sol-bg/50 rounded-full overflow-hidden border border-sol-border/20">
              <div 
                className="h-full bg-gradient-to-r from-sol-accent to-sol-cyan transition-all duration-500" 
                style={{ width: `${totalSlots > 0 ? (assignedSlots / totalSlots) * 100 : 0}%` }}
              />
            </div>
            {availableSlots === 0 && totalSlots > 0 && (
              <p className="text-[10px] font-bold text-sol-orange mt-2 flex items-center gap-1">
                <ShieldAlert size={12} />
                {t("alerts.noSlots")}
              </p>
            )}
          </div>
        </div>

        {/* Available seats */}
        <div className="rounded-3xl border border-sol-border/30 bg-sol-surface/50 backdrop-blur p-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-sol-muted">Available Premium Seats</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-sol-accent">{availableSlots}</span>
              <span className="text-sm font-bold text-sol-muted">seats free</span>
            </div>
            <p className="text-xs text-sol-muted mt-2">You can assign these to free student accounts below.</p>
          </div>
          
          <button
            type="button"
            onClick={() => router.push("/pricing")}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-sol-accent/10 hover:bg-sol-accent/15 border border-sol-accent/30 text-sol-accent px-4 py-3 text-xs font-black uppercase tracking-wider transition-colors hover:cursor-pointer"
          >
            {t("buyMore")}
            <ArrowRight size={12} />
          </button>
        </div>

        {/* Org Size */}
        <div className="rounded-3xl border border-sol-border/30 bg-sol-surface/50 backdrop-blur p-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-sol-muted">Total Managed Accounts</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-sol-text">{members.length}</span>
              <span className="text-sm font-bold text-sol-muted">total members</span>
            </div>
            <p className="text-xs text-sol-muted mt-2">
              Includes {members.filter(m => m.role.name === "teacher").length} teachers and {members.filter(m => m.role.name !== "teacher").length} students.
            </p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Member Panel */}
        <div className="rounded-3xl border border-sol-border/30 bg-sol-surface/50 backdrop-blur p-6 sm:p-8 h-fit lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="text-sol-accent" size={20} />
            <h2 className="text-xl font-black tracking-tight text-sol-text">{t("createMember")}</h2>
          </div>
          <p className="text-xs text-sol-muted mb-6 leading-relaxed">{t("createMemberDesc")}</p>

          <form onSubmit={handleCreateMember} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{t("fields.username")}</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. jason_math"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={formPending}
                  className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/25 pl-10 pr-4 py-2.5 text-sm font-bold text-sol-text placeholder-sol-muted/40 focus:border-sol-accent focus:outline-none transition-colors"
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sol-muted" size={14} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{t("fields.email")}</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="student@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={formPending}
                  className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/25 pl-10 pr-4 py-2.5 text-sm font-bold text-sol-text placeholder-sol-muted/40 focus:border-sol-accent focus:outline-none transition-colors"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sol-muted" size={14} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{t("fields.password")}</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={formPending}
                  className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/25 pl-10 pr-4 py-2.5 text-sm font-bold text-sol-text placeholder-sol-muted/40 focus:border-sol-accent focus:outline-none transition-colors font-mono"
                />
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sol-muted" size={14} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{t("fields.role")}</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "free_student" | "teacher")}
                disabled={formPending}
                className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/25 px-4 py-2.5 text-sm font-bold text-sol-text focus:border-sol-accent focus:outline-none transition-colors"
              >
                <option value="free_student" className="bg-sol-surface">{t("roles.student")}</option>
                <option value="teacher" className="bg-sol-surface">{t("roles.teacher")}</option>
              </select>
            </div>

            {formError && (
              <div className="rounded-xl border border-sol-red/25 bg-sol-red/5 p-3 text-xs font-bold text-sol-red">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="rounded-xl border border-sol-green/25 bg-sol-green/5 p-3 text-xs font-bold text-sol-green">
                {formSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={formPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-sol-accent hover:cursor-pointer hover:opacity-95 text-sol-bg py-3 text-xs font-black uppercase tracking-wider transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sol-accent/15"
            >
              {formPending ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>{t("buttons.creating")}</span>
                </>
              ) : (
                <span>{t("buttons.create")}</span>
              )}
            </button>
          </form>
        </div>

        {/* Directory Panel */}
        <div className="rounded-3xl border border-sol-border/30 bg-sol-surface/50 backdrop-blur p-6 sm:p-8 lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-sol-border/10 pb-4">
            <h2 className="text-xl font-black tracking-tight text-sol-text">{t("directory")}</h2>
            <span className="rounded-full bg-sol-bg border border-sol-border/30 px-3 py-1 text-xs font-bold text-sol-muted">
              {members.length} Accounts
            </span>
          </div>

          {operationError && (
            <div className="rounded-xl border border-sol-red/25 bg-sol-red/5 p-3 text-xs font-bold text-sol-red">
              {operationError}
            </div>
          )}

          {membersLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-sol-muted gap-3">
              <Loader2 className="animate-spin text-sol-accent" size={32} />
              <p className="text-sm font-bold">Loading directory...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-sol-border/30 rounded-2xl bg-sol-bg/20">
              <Users className="mx-auto text-sol-muted/50 mb-3" size={32} />
              <p className="text-sm font-bold text-sol-muted">{t("alerts.noMembers")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-sol-border/20 text-[10px] font-black uppercase tracking-wider text-sol-muted">
                    <th className="pb-3 pr-4">{t("table.member")}</th>
                    <th className="pb-3 px-4">{t("table.role")}</th>
                    <th className="pb-3 px-4 hidden sm:table-cell">{t("table.dateJoined")}</th>
                    <th className="pb-3 pl-4 text-right">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sol-border/10">
                  {members.map((member) => {
                    const isStudent = member.role.name === "free_student" || member.role.name === "sub_student";
                    const isSubscribed = member.role.name === "sub_student";
                    const isTeacher = member.role.name === "teacher";
                    
                    return (
                      <tr key={member.id} className="text-sm">
                        {/* Member detail */}
                        <td className="py-4 pr-4">
                          <div className="font-bold text-sol-text">{member.username}</div>
                          <div className="text-xs text-sol-muted mt-0.5">{member.email}</div>
                        </td>

                        {/* Role tag */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {isSubscribed && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sol-green/10 border border-sol-green/30 px-2.5 py-0.5 text-xs font-bold text-sol-green">
                              <Sparkles size={11} />
                              {t("roles.subStudent")}
                            </span>
                          )}
                          {member.role.name === "free_student" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sol-bg border border-sol-border/30 px-2.5 py-0.5 text-xs font-bold text-sol-muted">
                              {t("roles.freeStudent")}
                            </span>
                          )}
                          {isTeacher && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sol-accent/10 border border-sol-accent/30 px-2.5 py-0.5 text-xs font-bold text-sol-accent">
                              <ShieldCheck size={11} />
                              {t("roles.teacher")}
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="py-4 px-4 text-xs font-medium text-sol-muted hidden sm:table-cell">
                          {new Date(member.created_at).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="py-4 pl-4 text-right whitespace-nowrap">
                          {isStudent && (
                            <>
                              {isSubscribed ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnassignSeat(member.id)}
                                  disabled={activeOperationId !== null}
                                  className="inline-flex items-center gap-1 rounded-lg bg-sol-orange/10 hover:bg-sol-orange/15 border border-sol-orange/30 text-sol-orange px-3 py-1.5 text-xs font-bold transition hover:cursor-pointer disabled:opacity-50"
                                >
                                  {activeOperationId === member.id ? (
                                    <>
                                      <Loader2 className="animate-spin" size={12} />
                                      <span>{t("buttons.revoking")}</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserX size={12} />
                                      <span>{t("buttons.revoke")}</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAssignSeat(member.id)}
                                  disabled={activeOperationId !== null || availableSlots === 0}
                                  className="inline-flex items-center gap-1 rounded-lg bg-sol-accent/10 hover:bg-sol-accent/20 border border-sol-accent/30 text-sol-accent px-3 py-1.5 text-xs font-bold transition hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={availableSlots === 0 ? t("alerts.noSlots") : ""}
                                >
                                  {activeOperationId === member.id ? (
                                    <>
                                      <Loader2 className="animate-spin" size={12} />
                                      <span>{t("buttons.assigning")}</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck size={12} />
                                      <span>{t("buttons.assign")}</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
