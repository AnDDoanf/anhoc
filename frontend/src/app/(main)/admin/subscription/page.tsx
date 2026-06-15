"use client";

import ProtectedRoute from "@/components/guard/ProtectedRoute";
import PillBadge from "@/components/ui/PillBadge";
import { adminService, type AdminUser, type AdminUserPayload } from "@/services/adminService";
import {
  Check,
  Edit3,
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
  Lock,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/redux/store";
import { useAuth } from "@/hooks/useAuth";
import { setCredentials } from "@/redux/slices/authSlice";
import { setPermissions } from "@/redux/slices/permissionSlice";
import { authService } from "@/services/auth";
import { api } from "@/services/api";
import Link from "next/link";

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

interface SupervisorMember {
  id: string;
  username: string;
  email: string;
  role: {
    name: string;
  };
  created_at: string;
}

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
  const isSupervisor = user?.role === "supervisor";
  const isAdmin = user?.role === "admin";

  // Admin view states
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

  // Supervisor view states
  const [members, setMembers] = useState<SupervisorMember[]>([]);
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

  const loadSupervisors = useCallback(async () => {
    if (!isAdmin) return;
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
  }, [isAdmin, t]);

  const fetchSupervisorData = useCallback(async () => {
    if (!isSupervisor) return;
    setLoadingMembers(true);
    setLoadingStats(true);
    setLoadingDetails(true);
    try {
      const membersRes = await api.get("/supervisor/members");
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
  }, [isSupervisor]);

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
    if (isAdmin) {
      loadSupervisors();
    } else if (isSupervisor) {
      fetchSupervisorData();
    }
  }, [isAdmin, isSupervisor, loadSupervisors, fetchSupervisorData]);

  // Admin actions
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

  const handleSave = async (u: AdminUser) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: AdminUserPayload = {
        username: u.username,
        email: u.email,
        country: u.country || "",
        role_name: "supervisor",
        slots_purchased: Math.max(0, parseInt(editForm.slots_purchased) || 0),
        max_subjects: editForm.max_subjects ? Number(editForm.max_subjects) : null,
        max_grades: editForm.max_grades ? Number(editForm.max_grades) : null,
        max_lessons: editForm.max_lessons ? Number(editForm.max_lessons) : null,
        max_templates: editForm.max_templates ? Number(editForm.max_templates) : null,
        max_teachers: editForm.max_teachers ? Number(editForm.max_teachers) : null,
        max_students: editForm.max_students ? Number(editForm.max_students) : null,
      };
      await adminService.updateUser(u.id, payload);
      await loadSupervisors();
      setEditingId(null);
      setSuccess(tUsers("messages.updated"));
    } catch (err) {
      setError(getErrorMessage(err, tUsers("errors.save")));
    } finally {
      setSaving(false);
    }
  };

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
        fetchSupervisorData();
      } catch (err: any) {
        console.error("Payment error:", err);
        setCheckoutStatus("error");
        setErrorMessage(err.response?.data?.error || tPricing("checkout.fail"));
      }
    });
  };

  const legendItems = [
    { key: "subjects" as const },
    { key: "grades" as const },
    { key: "lessons" as const },
    { key: "templates" as const },
    { key: "teachers" as const },
    { key: "students" as const },
  ];

  if (isSupervisor) {
    const lu = user?.learn_unit;
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
        <div className="bg-sol-surface border border-sol-border/10 rounded-2xl p-6 hover:border-sol-accent/30 transition-all duration-300 shadow-sm relative group overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
              {icon}
            </div>
            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-sol-bg text-sol-muted uppercase tracking-wider">
              {isUnlimited ? t("unlimited") : `${progress}% Used`}
            </span>
          </div>
          <div className="text-xs font-black text-sol-muted uppercase tracking-widest mb-1">
            {title}
          </div>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-3xl font-black text-sol-text group-hover:text-sol-accent transition-colors">
              {current}
            </span>
            <span className="text-sm font-bold text-sol-muted">
              / {isUnlimited ? "∞" : max}
            </span>
          </div>
          {!isUnlimited && (
            <div className="w-full bg-sol-bg h-2 rounded-full overflow-hidden">
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
      <ProtectedRoute requiredRole={["admin", "supervisor"]}>
        <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
          {/* Header */}
          <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PillBadge label={tPricing("supervisorBilling.roleSupervisor")} icon={<Sparkles size={16} />} className="mb-3" />
              <h1 className="text-3xl font-black uppercase tracking-tight text-sol-text sm:text-4xl">
                {tSupervisor("title")}
              </h1>
              <p className="mt-2 max-w-2xl font-bold text-sol-muted text-sm md:text-base">
                {tSupervisor("subtitle")}
              </p>
            </div>
            <button
              onClick={fetchSupervisorData}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-sol-border/30 bg-sol-surface px-4 py-2.5 text-sm font-black text-sol-text transition hover:border-sol-accent/50 hover:text-sol-accent disabled:opacity-60"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              {tUsers("actions.refresh")}
            </button>
          </section>

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>
      </ProtectedRoute>
    );
  }

  // Fallback to default admin view if current user is an admin
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
            <p className="mt-2 max-w-2xl font-bold text-sol-muted text-sm md:text-base">
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
                  {supervisors.map((u) => {
                    const isEditing = editingId === u.id;
                    return (
                      <tr key={u.id} className="transition hover:bg-sol-bg/30">
                        {/* Account */}
                        <td className="px-5 py-4">
                          <div className="font-black text-sol-text">{u.username}</div>
                          <div className="text-xs font-bold text-sol-muted">{u.email}</div>
                          {u.country && (
                            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-sol-text/50">
                              {u.country}
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
                            <LimitBadge value={u.slots_purchased} unlimitedLabel={t("unlimited")} />
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
                            <LimitBadge value={u.max_subjects} unlimitedLabel={t("unlimited")} />
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
                            <LimitBadge value={u.max_grades} unlimitedLabel={t("unlimited")} />
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
                            <LimitBadge value={u.max_lessons} unlimitedLabel={t("unlimited")} />
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
                            <LimitBadge value={u.max_templates} unlimitedLabel={t("unlimited")} />
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
                            <LimitBadge value={u.max_teachers} unlimitedLabel={t("unlimited")} />
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
                            <LimitBadge value={u.max_students} unlimitedLabel={t("unlimited")} />
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSave(u)}
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
                              onClick={() => startEdit(u)}
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
        <InfinityIcon size={11} />
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
