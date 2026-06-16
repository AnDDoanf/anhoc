"use client";

import ProtectedRoute from "@/components/guard/ProtectedRoute";
import PillBadge from "@/components/ui/PillBadge";
import { adminService } from "@/services/adminService";
import {
  Check,
  Infinity as InfinityIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
  X,
  CreditCard,
  Plus,
  Minus,
  ShieldAlert,
  UserCheck,
  BookOpen,
  Zap,
  Calendar,
  AlertCircle,
  UserPlus,
  ShieldCheck,
  UserX,
  Mail,
  Key,
  User,
  ArrowRight,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { setCredentials } from "@/redux/slices/authSlice";
import { setPermissions } from "@/redux/slices/permissionSlice";
import { authService, LearnUnitSummary } from "@/services/auth";
import { api } from "@/services/api";
import Link from "next/link";
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

type ApiError = {
  response?: { data?: { error?: string } };
};

const getErrorMessage = (err: unknown, fallback: string) =>
  (err as ApiError)?.response?.data?.error || fallback;

interface Plan {
  id: number;
  name: string;
  vi_name?: string;
  en_name?: string;
  description: string;
  price_monthly: number;
  price_annually: number;
  max_students: number | null;
  max_teachers: number | null;
  max_lessons: number | null;
  max_templates: number | null;
  max_subjects: number | null;
  max_grades: number | null;
}

interface SubscriptionDetails {
  activeSubscription: {
    id: string;
    plan_id: number;
    status: string;
    billing_cycle: "monthly" | "annually";
    start_date: string;
    end_date: string | null;
    auto_renew: boolean;
    plan: Plan;
    calculatedPrice?: number;
  } | null;
  invoices: Array<{
    id: string;
    amount: number;
    billing_date: string;
    status: string;
    description: string;
  }>;
}

export default function AdminSubscriptionPage() {
  const t = useTranslations("AdminSubscription");
  const tUsers = useTranslations("AdminUsers");
  const tPricing = useTranslations("Pricing");
  const tSupervisor = useTranslations("Supervisor");
  const locale = useLocale();
  const dispatch = useDispatch();

  const { user } = useAuth();

  // Supervisor billing states
  const [members, setMembers] = useState<ManagedMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [subDetails, setSubDetails] = useState<SubscriptionDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);
  
  // Checkout/Purchase states for Supervisor
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [slotCount, setSlotCount] = useState(1);
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [isPending, startTransition] = useTransition();

  // Supervisor member management states
  const [learnUnit, setLearnUnit] = useState<LearnUnitSummary | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<"free_student" | "teacher">("free_student");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formPending, setFormPending] = useState(false);
  const [activeOperationId, setActiveOperationId] = useState<string | null>(null);
  const [operationError, setOperationError] = useState("");

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

  const fetchSupervisorData = useCallback(async () => {
    setLoadingMembers(true);
    setLoadingStats(true);
    setLoadingDetails(true);
    try {
      const membersRes = await api.get<SupervisorMembersResponse>("/supervisor/members");
      setLearnUnit(membersRes.data.learnUnit);
      setMembers(membersRes.data.members || []);
      
      const statsRes = await adminService.getStats();
      setStats(statsRes);

      const detailsRes = await api.get("/subscription/details");
      setSubDetails(detailsRes.data);
    } catch (err) {
      console.error("Failed to load supervisor subscription details:", err);
    } finally {
      setLoadingMembers(false);
      setLoadingStats(false);
      setLoadingDetails(false);
    }
  }, []);

  const handleToggleAutoRenew = async () => {
    if (!subDetails?.activeSubscription || togglingAutoRenew) return;
    setTogglingAutoRenew(true);
    try {
      const res = await api.post("/subscription/toggle-auto-renew");
      setSubDetails((prev) =>
        prev
          ? {
              ...prev,
              activeSubscription: res.data.activeSubscription,
            }
          : null
      );
    } catch (err) {
      console.error("Failed to toggle auto-renew status:", err);
    } finally {
      setTogglingAutoRenew(false);
    }
  };

  const getPlanLocalKey = (name: string) => {
    if (name === "free") return "freeStudent";
    if (name === "pro") return "subStudent";
    return name === "learning_center" ? "learningCenter" : name; // family or learningCenter
  };

  useEffect(() => {
    if (user?.role === "supervisor") {
      void fetchSupervisorData();
    }
  }, [user, fetchSupervisorData]);

  // Supervisor actions
  const handleOpenCheckout = () => {
    setSlotCount(1);
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setCheckoutStatus("idle");
    setErrorMessage("");
    setIsCheckoutOpen(true);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    const formatted = val.match(/.{1,4}/g)?.join(" ") || "";
    setCardNumber(formatted.slice(0, 19));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length >= 2) {
      setCardExpiry(`${val.slice(0, 2)}/${val.slice(2, 4)}`);
    } else {
      setCardExpiry(val);
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 3);
    setCardCvc(val);
  };

  const getCardType = () => {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (cleanNumber.startsWith("4")) return "Visa";
    if (/^5[1-5]/.test(cleanNumber)) return "Master";
    if (/^3[47]/.test(cleanNumber)) return "Amex";
    return "Card";
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStatus("processing");
    setErrorMessage("");

    startTransition(async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await api.post("/supervisor/buy-slots", { slots: slotCount });

        const updatedProfile = await authService.getProfile();
        const token = localStorage.getItem("token") || "";
        localStorage.setItem("user", JSON.stringify(updatedProfile));
        dispatch(setCredentials({ user: updatedProfile, token }));
        dispatch(setPermissions(updatedProfile.permissions));

        setCheckoutStatus("success");
        void fetchSupervisorData();
      } catch (err: any) {
        console.error("Payment error:", err);
        setCheckoutStatus("error");
        setErrorMessage(err.response?.data?.error || tPricing("checkout.fail"));
      }
    });
  };

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

      setFormSuccess(tSupervisor("alerts.createSuccess", { username: newUsername }));
      setNewEmail("");
      setNewPassword("");
      setNewUsername("");
      setNewRole("free_student");
      
      // Refresh list
      void fetchSupervisorData();
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

  const legendItems = [
    { key: "subjects" as const },
    { key: "grades" as const },
    { key: "lessons" as const },
    { key: "templates" as const },
    { key: "teachers" as const },
    { key: "students" as const },
  ];

  {
    const lu = user?.learn_unit || learnUnit;
    const activeStudents = members.filter((m) => m.role.name === "sub_student").length;
    const activeTeachers = members.filter((m) => m.role.name === "teacher").length;

    const studentLimit = lu?.max_students !== null && lu?.max_students !== undefined
      ? lu.max_students
      : (user?.slots_purchased || 0);

    const activeLessons = stats?.summary?.lessons || 0;
    const isLoading = loadingMembers || loadingStats || loadingDetails;

    const renderLimitCard = (
      title: string,
      current: number | string,
      max: number | null | undefined,
      icon: React.ReactNode,
      colorClass: string,
      bgClass: string
    ) => {
      const isUnlimited = max === null || max === undefined;
      const progress = isUnlimited ? 0 : Math.min(100, Math.round(((Number(current) || 0) / max) * 100));

      return (
        <div className="bg-sol-surface border border-sol-border/10 rounded-xl p-3.5 sm:p-4 hover:border-sol-accent/30 transition-all duration-300 shadow-sm relative group overflow-hidden flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-lg shrink-0 ${bgClass} ${colorClass}`}>
                {icon}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black text-sol-muted uppercase tracking-wider truncate">
                  {title}
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-sol-text group-hover:text-sol-accent transition-colors">
                    {current}
                  </span>
                  <span className="text-xs font-bold text-sol-muted">
                    / {isUnlimited ? "∞" : max}
                  </span>
                </div>
              </div>
            </div>
            
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-sol-bg text-sol-muted uppercase tracking-wider shrink-0">
              {isUnlimited ? t("unlimited") : `${progress}%`}
            </span>
          </div>

          {!isUnlimited && (
            <div className="w-full bg-sol-bg h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  progress >= 90 ? "bg-red-500" : progress >= 70 ? "bg-sol-orange" : "bg-sol-accent"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      );
    };

    return (
      <ProtectedRoute requiredRole="supervisor">
        <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
          {/* Header */}
          <Hero
            icon={<CreditCard size={112} className="text-sol-accent md:h-40 md:w-40" />}
            className="md:rounded-[3rem]"
            containerClassName="relative z-10 flex w-full flex-col items-start gap-4 lg:max-w-4xl lg:flex-row lg:justify-between"
          >
            <div className="space-y-3 md:space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-sol-accent/20 bg-sol-accent/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-sol-accent sm:px-3 sm:py-1.5 md:text-xs">
                <Sparkles size={11} className="md:h-3.5 md:w-3.5" />
                <span>{tPricing("supervisorBilling.roleSupervisor")}</span>
              </div>
              <h1 className="max-w-[11ch] text-[1.75rem] font-black leading-[1.05] tracking-tight text-sol-text sm:text-4xl md:max-w-none md:text-6xl">
                {tSupervisor("title")}
              </h1>
              <p className="max-w-xl text-[13px] leading-relaxed text-sol-muted sm:text-sm md:text-xl">
                {tSupervisor("subtitle")}
              </p>
            </div>
            <button
              onClick={fetchSupervisorData}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-2xl bg-sol-accent px-4 py-2.5 text-sm font-bold text-sol-bg shadow-lg shadow-sol-accent/20 transition-transform hover:scale-105 cursor-pointer md:px-6 md:py-3 disabled:opacity-60"
            >
              <RefreshCw size={18} className={`md:h-5 md:w-5 ${isLoading ? "animate-spin" : ""}`} />
              <span>{tUsers("actions.refresh")}</span>
            </button>
          </Hero>

          {/* Supervisor Dashboard Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left part: Active Plan, Limits & Invoices */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* 1. Active Plan details card */}
              <div className="bg-sol-surface border border-sol-border/15 rounded-[2rem] p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sol-accent/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sol-accent/10 border border-sol-accent/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-sol-accent">
                    {tPricing("buttons.activePlan")}
                  </span>
                  <h2 className="text-3xl font-black text-sol-text uppercase mt-3">
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2 text-base font-normal text-sol-muted">
                        <Loader2 className="animate-spin text-sol-accent" size={16} /> {tPricing("supervisorBilling.retrievingPlan")}
                      </span>
                    ) : subDetails?.activeSubscription ? (
                      locale === "vi" 
                        ? (subDetails.activeSubscription.plan.vi_name || tPricing(`${getPlanLocalKey(subDetails.activeSubscription.plan.name)}.title`))
                        : (subDetails.activeSubscription.plan.en_name || tPricing(`${getPlanLocalKey(subDetails.activeSubscription.plan.name)}.title`))
                    ) : (
                      tPricing("supervisorBilling.freeAccount")
                    )}
                  </h2>
                  
                  {!isLoading && (
                    <>
                      <p className="text-sm font-bold text-sol-muted mt-2">
                        {subDetails?.activeSubscription ? (
                          tPricing("supervisorBilling.priceDetail", {
                            price: subDetails.activeSubscription.calculatedPrice !== undefined
                              ? subDetails.activeSubscription.calculatedPrice
                              : (subDetails.activeSubscription.billing_cycle === "annually" 
                                  ? subDetails.activeSubscription.plan.price_annually 
                                  : subDetails.activeSubscription.plan.price_monthly),
                            cycle: subDetails.activeSubscription.billing_cycle === "annually" 
                              ? tPricing("buttons.annually") 
                              : tPricing("buttons.monthly")
                          })
                        ) : (
                          tPricing("supervisorBilling.freeDesc")
                        )}
                      </p>
                      
                      {subDetails?.activeSubscription?.end_date && (
                        <div className="flex items-center gap-2 text-xs font-bold text-sol-muted/80 mt-4 bg-sol-bg/50 border border-sol-border/30 rounded-xl px-3 py-1.5 w-fit">
                          <Calendar size={14} className="text-sol-accent" />
                          <span>
                            {tPricing("supervisorBilling.renewsOn", {
                              date: new Date(subDetails.activeSubscription.end_date).toLocaleDateString()
                            })}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!isLoading && subDetails?.activeSubscription && (
                  <div className="border border-sol-border/20 bg-sol-bg/30 p-5 rounded-2xl shrink-0 w-full md:w-auto flex flex-col gap-3 min-w-[240px]">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-black uppercase text-sol-muted tracking-wider">
                        {tPricing("buttons.autoRenewStatus")}
                      </span>
                      <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-full border ${
                        subDetails.activeSubscription.auto_renew 
                          ? "bg-sol-green/10 border-sol-green/30 text-sol-green" 
                          : "bg-sol-orange/10 border-sol-orange/30 text-sol-orange"
                      }`}>
                        {subDetails.activeSubscription.auto_renew ? tPricing("buttons.autoRenewOn") : tPricing("buttons.autoRenewOff")}
                      </span>
                    </div>

                    <button
                      onClick={handleToggleAutoRenew}
                      disabled={togglingAutoRenew}
                      className={`w-full text-center px-4 py-2.5 rounded-xl text-xs font-black transition hover:cursor-pointer flex items-center justify-center gap-1.5 ${
                        subDetails.activeSubscription.auto_renew
                          ? "bg-sol-orange/10 border border-sol-orange/30 text-sol-orange hover:bg-sol-orange/20"
                          : "bg-sol-accent/10 border border-sol-accent/30 text-sol-accent hover:bg-sol-accent/20"
                      }`}
                    >
                      {togglingAutoRenew ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : subDetails.activeSubscription.auto_renew ? (
                        tPricing("buttons.turnOffAutoRenew")
                      ) : (
                        tPricing("buttons.turnOnAutoRenew")
                      )}
                    </button>
                    
                    <Link
                      href="/subscription"
                      className="w-full text-center px-4 py-2 bg-sol-surface border border-sol-border/30 hover:border-sol-accent hover:text-sol-accent rounded-xl text-xs font-black transition uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      {tPricing("supervisorBilling.changePlan")}
                    </Link>
                  </div>
                )}
                
                {!isLoading && !subDetails?.activeSubscription && (
                  <div className="shrink-0 w-full md:w-auto">
                    <Link
                      href="/subscription"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-sol-accent text-sol-bg px-6 py-4 text-center text-sm font-black uppercase tracking-wider transition-all transform hover:scale-[1.01] active:scale-95 shadow-lg shadow-sol-accent/20"
                    >
                      <Sparkles size={16} />
                      {tPricing("supervisorBilling.choosePlan")}
                    </Link>
                  </div>
                )}
              </div>

              {/* 2. Limits and stats */}
              <div className="bg-sol-surface border border-sol-border/10 rounded-[2rem] p-6 shadow-sm">
                <h2 className="text-xl font-black text-sol-text mb-6 uppercase tracking-wider">{tPricing("supervisorBilling.capacityLimits")}</h2>
                
                {isLoading ? (
                  <div className="flex h-60 flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-sol-accent" size={36} />
                    <p className="font-black text-sol-muted">{t("loading")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {renderLimitCard(
                      t("table.students"),
                      activeStudents,
                      studentLimit,
                      <Users size={20} />,
                      "text-sol-accent",
                      "bg-sol-accent/10"
                    )}
                    {renderLimitCard(
                      t("table.teachers"),
                      activeTeachers,
                      lu?.max_teachers,
                      <Users size={20} />,
                      "text-blue-500",
                      "bg-blue-500/10"
                    )}
                    {renderLimitCard(
                      t("table.lessons"),
                      activeLessons,
                      lu?.max_lessons,
                      <BookOpen size={20} />,
                      "text-green-500",
                      "bg-green-500/10"
                    )}
                    {renderLimitCard(
                      t("table.templates"),
                      stats?.summary?.templates || 0,
                      lu?.max_templates,
                      <Zap size={20} />,
                      "text-sol-orange",
                      "bg-sol-orange/10"
                    )}
                    {renderLimitCard(
                      t("table.subjects"),
                      stats?.summary?.subjects || 0,
                      lu?.max_subjects,
                      <BookOpen size={20} />,
                      "text-purple-500",
                      "bg-purple-500/10"
                    )}
                    {renderLimitCard(
                      t("table.grades"),
                      stats?.summary?.grades || 0,
                      lu?.max_grades,
                      <Sparkles size={20} />,
                      "text-pink-500",
                      "bg-pink-500/10"
                    )}
                  </div>
                )}
              </div>

              {/* 3. Invoices / Billing History */}
              <div className="bg-sol-surface border border-sol-border/10 rounded-[2rem] p-6 shadow-sm overflow-hidden">
                <h3 className="text-xl font-black text-sol-text mb-6 uppercase tracking-wider">
                  {tPricing("buttons.billingHistory")}
                </h3>
                
                {isLoading ? (
                  <div className="flex h-40 flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-sol-accent" size={36} />
                    <p className="font-black text-sol-muted">{tPricing("supervisorBilling.loadingInvoices")}</p>
                  </div>
                ) : !subDetails?.invoices || subDetails.invoices.length === 0 ? (
                  <div className="text-center py-10">
                    <AlertCircle className="mx-auto text-sol-muted mb-3" size={32} />
                    <p className="font-bold text-sol-muted text-sm">{tPricing("buttons.noInvoices")}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-sol-border/10 bg-sol-bg/50">
                          <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest">
                            {tPricing("buttons.invoiceDate")}
                          </th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest">
                            {tPricing("buttons.invoiceDesc")}
                          </th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest">
                            {tPricing("buttons.invoiceAmount")}
                          </th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest">
                            {tPricing("buttons.invoiceStatus")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sol-border/5">
                        {subDetails.invoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-sol-bg/20 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-sol-muted">
                              {new Date(invoice.billing_date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-xs font-black text-sol-text">
                              {invoice.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-sol-text">
                              ${Number(invoice.amount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                invoice.status === "paid"
                                  ? "bg-sol-green/10 border-sol-green/30 text-sol-green"
                                  : "bg-red-500/10 border-red-500/30 text-red-500"
                              }`}>
                                {invoice.status === "paid" ? tPricing("buttons.invoicePaid") : tPricing("buttons.invoiceFailed")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right part: Sub details & seat buy form */}
            <div className="lg:col-span-1 space-y-6">
              {/* 1. Learn Unit Info */}
              <div className="bg-sol-surface border border-sol-border/15 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sol-accent/5 rounded-full blur-2xl pointer-events-none" />
                
                <div>
                  <h3 className="text-xl font-black text-sol-text mb-4 uppercase tracking-wider">
                    {tPricing("supervisorBilling.learnUnitInfo")}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-sol-bg/50 border border-sol-border/30 rounded-2xl p-4">
                      <div className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{tPricing("supervisorBilling.unitName")}</div>
                      <div className="text-lg font-black text-sol-text truncate mt-1">{lu?.name || "My Organization"}</div>
                    </div>

                    <div className="bg-sol-bg/50 border border-sol-border/30 rounded-2xl p-4">
                      <div className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{tPricing("supervisorBilling.registrationCode")}</div>
                      <div className="text-lg font-mono font-black text-sol-accent tracking-widest mt-1">{lu?.code || "N/A"}</div>
                    </div>

                    <div className="bg-sol-bg/50 border border-sol-border/30 rounded-2xl p-4">
                      <div className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{tPricing("supervisorBilling.capacityModel")}</div>
                      <div className="text-sm font-bold text-sol-text mt-1">
                        {lu?.max_students !== null && lu?.max_students !== undefined ? (
                          <span className="text-sol-orange font-black">{tPricing("supervisorBilling.fixedPlan")}</span>
                        ) : (
                          <span>{tPricing("supervisorBilling.payAsYouGrow", { count: user?.slots_purchased || 0 })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Seat Purchase Form / Advice Card */}
              {(!isLoading && (subDetails?.activeSubscription?.plan?.name === "learning_center" || (lu?.max_students === null || lu?.max_students === undefined))) ? (
                <div className="bg-sol-surface border border-sol-border/15 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sol-accent/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div>
                    <h3 className="text-xl font-black text-sol-text mb-2 uppercase tracking-wider">
                      {tPricing("supervisorBilling.purchaseSeats")}
                    </h3>
                    <p className="text-xs text-sol-muted font-bold mb-4">
                      {tPricing("supervisorBilling.purchaseSeatsDesc")}
                    </p>
                    <div className="bg-sol-bg/50 border border-sol-border/30 rounded-2xl p-4 text-center">
                      <span className="text-3xl font-black text-sol-accent">
                        {user?.slots_purchased || 0}
                      </span>
                      <div className="text-[10px] font-black uppercase text-sol-muted tracking-wider mt-1">{tPricing("supervisorBilling.totalSlots")}</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={handleOpenCheckout}
                      className="w-full rounded-2xl bg-sol-accent hover:cursor-pointer hover:bg-sol-accent/90 text-sol-bg px-4 py-4 text-center text-sm font-black uppercase tracking-wider transition-all transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-sol-accent/20"
                    >
                      <CreditCard size={18} />
                      {tPricing("buttons.buySeats")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-sol-surface border border-sol-border/15 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sol-accent/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div>
                    <h3 className="text-xl font-black text-sol-text mb-2 uppercase tracking-wider">
                      {tPricing("supervisorBilling.needMoreSeats")}
                    </h3>
                    <p className="text-sm text-sol-muted font-semibold leading-relaxed mb-6">
                      {tPricing("supervisorBilling.limitedTo", { count: lu?.max_students || 0 })}
                      {" "}
                      {tPricing("supervisorBilling.upgradeDesc")}
                    </p>
                  </div>

                  <div>
                    <Link
                      href="/subscription"
                      className="w-full rounded-2xl bg-gradient-to-r from-sol-accent to-sol-cyan hover:opacity-95 text-sol-bg px-4 py-4 text-center text-sm font-black uppercase tracking-wider transition-all transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-sol-accent/20"
                    >
                      <Sparkles size={18} />
                      {tPricing("supervisorBilling.upgradePlan")}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Simulated billing Modal */}
          {isCheckoutOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-sol-bg/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
              <div 
                className="absolute inset-0"
                onClick={() => {
                  if (checkoutStatus !== "processing") setIsCheckoutOpen(false);
                }}
              />

              <div className="relative w-full max-w-lg rounded-[2rem] border border-sol-accent/20 bg-sol-surface p-6 sm:p-8 shadow-2xl z-10 origin-center animate-in zoom-in-95 duration-200">
                {checkoutStatus !== "processing" && (
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full border border-sol-border/30 hover:border-sol-accent text-sol-muted hover:text-sol-text transition hover:cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}

                {checkoutStatus === "success" ? (
                  <div className="text-center py-6">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sol-green/10 text-sol-green mb-6">
                      <UserCheck size={36} className="animate-bounce" />
                    </div>
                    <h3 className="text-2xl font-black text-sol-text">{tPricing("checkout.title")}</h3>
                    <p className="mt-3 text-sm font-bold text-sol-green bg-sol-green/5 border border-sol-green/20 rounded-2xl px-4 py-3 mx-auto max-w-sm leading-relaxed">
                      {tPricing("checkout.success")}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCheckoutOpen(false)}
                      className="mt-8 rounded-2xl bg-sol-accent hover:cursor-pointer px-8 py-4 text-sm font-black uppercase tracking-wider text-sol-bg transition hover:opacity-90 shadow-md"
                    >
                      {tPricing("checkout.close")}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      <CreditCard className="text-sol-accent" size={22} />
                      <h3 className="text-xl font-black tracking-tight text-sol-text">
                        {tPricing("buttons.buySeats")}
                      </h3>
                    </div>

                    <div className="flex gap-3 rounded-2xl border border-sol-orange/20 bg-sol-orange/8 p-4 mb-6">
                      <ShieldAlert className="text-sol-orange shrink-0 mt-0.5" size={18} />
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-sol-orange">
                          {tPricing("checkout.pendingTitle")}
                        </h4>
                        <p className="mt-1 text-xs font-medium text-sol-muted leading-relaxed">
                          {tPricing("checkout.pendingDesc")}
                        </p>
                      </div>
                    </div>

                    {/* Seat count adjustment */}
                    <div className="bg-sol-bg/40 border border-sol-border/20 rounded-2xl p-4 mb-6 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-black text-sol-text">{tPricing("supervisorBilling.additionalSeats")}</h4>
                        <p className="text-xs text-sol-muted font-semibold mt-0.5">{tPricing("supervisorBilling.seatRateDesc")}</p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setSlotCount(Math.max(1, slotCount - 1))}
                          disabled={checkoutStatus === "processing"}
                          className="h-8 w-8 rounded-lg border border-sol-border/30 hover:border-sol-accent text-sol-text flex items-center justify-center hover:cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-mono font-black text-lg text-sol-text">{slotCount}</span>
                        <button
                          type="button"
                          onClick={() => setSlotCount(slotCount + 1)}
                          disabled={checkoutStatus === "processing"}
                          className="h-8 w-8 rounded-lg border border-sol-border/30 hover:border-sol-accent text-sol-text flex items-center justify-center hover:cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Card template preview */}
                    <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-sol-accent/90 via-sol-cyan to-sol-accent p-6 text-sol-bg shadow-lg mb-6 overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Anhoc Premium</p>
                          <p className="text-xs font-bold mt-0.5">{tPricing("supervisorBilling.seatPurchase")}</p>
                        </div>
                        <div className="h-8 w-12 bg-white/10 rounded-md backdrop-blur border border-white/10 flex items-center justify-center font-bold text-xs">
                          {getCardType()}
                        </div>
                      </div>

                      <p className="text-lg font-black tracking-[0.15em] font-mono mt-4">
                        {cardNumber || "•••• •••• •••• ••••"}
                      </p>

                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-wider opacity-60">Card Holder</p>
                          <p className="text-sm font-bold tracking-tight uppercase truncate max-w-[12rem]">
                            {cardName || tPricing("supervisorBilling.cardHolderPlaceholder")}
                          </p>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-wider opacity-60">Expires</p>
                            <p className="text-xs font-bold font-mono">{cardExpiry || "MM/YY"}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-wider opacity-60">CVC</p>
                            <p className="text-xs font-bold font-mono">{cardCvc || "•••"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Form fields */}
                    <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                      {errorMessage && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-black text-red-500">
                          {errorMessage}
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">
                          {tPricing("checkout.cardholder")}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. ALAN TURING"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          disabled={checkoutStatus === "processing"}
                          className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/20 px-4 py-3 text-sm font-bold text-sol-text placeholder-sol-muted/50 focus:border-sol-accent focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">
                          {tPricing("checkout.cardNumber")}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="4242 4242 4242 4242"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            disabled={checkoutStatus === "processing"}
                            className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/20 pl-11 pr-4 py-3 text-sm font-bold text-sol-text placeholder-sol-muted/50 focus:border-sol-accent focus:outline-none transition-colors font-mono"
                          />
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-sol-muted/80" size={16} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">
                            {tPricing("checkout.expiry")}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            disabled={checkoutStatus === "processing"}
                            className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/20 px-4 py-3 text-sm font-bold text-sol-text placeholder-sol-muted/50 focus:border-sol-accent focus:outline-none transition-colors font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">
                            {tPricing("checkout.cvc")}
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="123"
                            value={cardCvc}
                            onChange={handleCvcChange}
                            disabled={checkoutStatus === "processing"}
                            className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/20 px-4 py-3 text-sm font-bold text-sol-text placeholder-sol-muted/50 focus:border-sol-accent focus:outline-none transition-colors font-mono"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={checkoutStatus === "processing"}
                        className="mt-6 w-full rounded-2xl bg-sol-accent hover:bg-sol-accent/90 text-sol-bg px-4 py-4 text-center text-sm font-black uppercase tracking-wider transition-all transform active:scale-95 flex items-center justify-center gap-2 hover:cursor-pointer shadow-md disabled:opacity-50"
                      >
                        {checkoutStatus === "processing" ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            {tPricing("checkout.processing")}
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            {tPricing("checkout.payNow")} (${(slotCount * 5).toFixed(2)})
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Members Management Section */}
          <div className="border-t border-sol-border/10 pt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Create Member Panel */}
            <div className="rounded-3xl border border-sol-border/30 bg-sol-surface/50 backdrop-blur p-6 sm:p-8 h-fit lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="text-sol-accent" size={20} />
                <h2 className="text-xl font-black tracking-tight text-sol-text">{tSupervisor("createMember")}</h2>
              </div>
              <p className="text-xs text-sol-muted mb-6 leading-relaxed">{tSupervisor("createMemberDesc")}</p>

              <form onSubmit={handleCreateMember} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{tSupervisor("fields.username")}</label>
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
                  <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{tSupervisor("fields.email")}</label>
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
                  <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{tSupervisor("fields.password")}</label>
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
                  <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{tSupervisor("fields.role")}</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as "free_student" | "teacher")}
                    disabled={formPending}
                    className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/25 px-4 py-2.5 text-sm font-bold text-sol-text focus:border-sol-accent focus:outline-none transition-colors"
                  >
                    <option value="free_student" className="bg-sol-surface">{tSupervisor("roles.student")}</option>
                    <option value="teacher" className="bg-sol-surface">{tSupervisor("roles.teacher")}</option>
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
                      <span>{tSupervisor("buttons.creating")}</span>
                    </>
                  ) : (
                    <span>{tSupervisor("buttons.create")}</span>
                  )}
                </button>
              </form>
            </div>

            {/* Directory Panel */}
            <div className="rounded-3xl border border-sol-border/30 bg-sol-surface/50 backdrop-blur p-6 sm:p-8 lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between border-b border-sol-border/10 pb-4">
                <h2 className="text-xl font-black tracking-tight text-sol-text">{tSupervisor("directory")}</h2>
                <span className="rounded-full bg-sol-bg border border-sol-border/30 px-3 py-1 text-xs font-bold text-sol-muted">
                  {members.length} Accounts
                </span>
              </div>

              {operationError && (
                <div className="rounded-xl border border-sol-red/25 bg-sol-red/5 p-3 text-xs font-bold text-sol-red">
                  {operationError}
                </div>
              )}

              {loadingMembers ? (
                <div className="flex flex-col items-center justify-center py-20 text-sol-muted gap-3">
                  <Loader2 className="animate-spin text-sol-accent" size={32} />
                  <p className="text-sm font-bold">Loading directory...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-sol-border/30 rounded-2xl bg-sol-bg/20">
                  <Users className="mx-auto text-sol-muted/50 mb-3" size={32} />
                  <p className="text-sm font-bold text-sol-muted">{tSupervisor("alerts.noMembers")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-sol-border/20 text-[10px] font-black uppercase tracking-wider text-sol-muted">
                        <th className="pb-3 pr-4">{tSupervisor("table.member")}</th>
                        <th className="pb-3 px-4">{tSupervisor("table.role")}</th>
                        <th className="pb-3 px-4 hidden sm:table-cell">{tSupervisor("table.dateJoined")}</th>
                        <th className="pb-3 pl-4 text-right">{tSupervisor("table.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sol-border/10">
                      {members.map((member) => {
                        const isStudent = member.role.name === "free_student" || member.role.name === "sub_student";
                        const isSubscribed = member.role.name === "sub_student";
                        const isTeacher = member.role.name === "teacher";
                        const availableSlots = Math.max(0, studentLimit - activeStudents);
                        
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
                                  {tSupervisor("roles.subStudent")}
                                </span>
                              )}
                              {member.role.name === "free_student" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sol-bg border border-sol-border/30 px-2.5 py-0.5 text-xs font-bold text-sol-muted">
                                  {tSupervisor("roles.freeStudent")}
                                </span>
                              )}
                              {isTeacher && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sol-accent/10 border border-sol-accent/30 px-2.5 py-0.5 text-xs font-bold text-sol-accent">
                                  <ShieldCheck size={11} />
                                  {tSupervisor("roles.teacher")}
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
                                          <span>{tSupervisor("buttons.revoking")}</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserX size={12} />
                                          <span>{tSupervisor("buttons.revoke")}</span>
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAssignSeat(member.id)}
                                      disabled={activeOperationId !== null || availableSlots === 0}
                                      className="inline-flex items-center gap-1 rounded-lg bg-sol-accent/10 hover:bg-sol-accent/20 border border-sol-accent/30 text-sol-accent px-3 py-1.5 text-xs font-bold transition hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      title={availableSlots === 0 ? tSupervisor("alerts.noSlots") : ""}
                                    >
                                      {activeOperationId === member.id ? (
                                        <>
                                          <Loader2 className="animate-spin" size={12} />
                                          <span>{tSupervisor("buttons.assigning")}</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck size={12} />
                                          <span>{tSupervisor("buttons.assign")}</span>
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
      </ProtectedRoute>
    );
  }
}
