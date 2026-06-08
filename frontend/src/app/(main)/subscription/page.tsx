"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import {
  Check,
  CreditCard,
  Sparkles,
  Lock,
  Plus,
  Minus,
  X,
  ShieldAlert,
  Loader2,
  Calendar,
  UserCheck,
  RefreshCw,
  Clock,
  Infinity as InfinityIcon,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { setCredentials } from "@/redux/slices/authSlice";
import { setPermissions } from "@/redux/slices/permissionSlice";
import { authService } from "@/services/auth";
import { api } from "@/services/api";

type BillingCycle = "monthly" | "annually";

interface Plan {
  id: number;
  name: string;
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
    billing_cycle: BillingCycle;
    start_date: string;
    end_date: string | null;
    auto_renew: boolean;
    plan: Plan;
  } | null;
  invoices: Array<{
    id: string;
    amount: number;
    billing_date: string;
    status: string;
    description: string;
  }>;
}

export default function PricingPage() {
  const t = useTranslations("Pricing");
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<"pricing" | "billing">("pricing");

  // Plans & Cycle State
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  // Billing & Invoices Details State
  const [subDetails, setSubDetails] = useState<SubscriptionDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);

  // Checkout States
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [learnUnitName, setLearnUnitName] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [isPending, startTransition] = useTransition();

  // Load plans from backend
  const loadPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await api.get("/subscription/plans");
      setPlans(res.data);
    } catch (err) {
      console.error("Failed to load plans:", err);
    } finally {
      setLoadingPlans(false);
    }
  };

  // Load active subscription and invoices from backend
  const loadSubDetails = async () => {
    if (!isAuthenticated) return;
    setLoadingDetails(true);
    try {
      const res = await api.get("/subscription/details");
      setSubDetails(res.data);
    } catch (err) {
      console.error("Failed to load subscription details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    loadPlans();
    if (isAuthenticated) {
      loadSubDetails();
    }
  }, [isAuthenticated]);

  const handleOpenCheckout = (plan: Plan) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/subscription`);
      return;
    }
    setSelectedPlan(plan);
    setCheckoutStatus("idle");
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setLearnUnitName("");
    setErrorMessage("");
    setIsCheckoutOpen(true);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    const formatted = value.match(/.{1,4}/g)?.join(" ") || "";
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setCardExpiry(value);
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 3);
    setCardCvc(value);
  };

  const getCardType = () => {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (cleanNumber.startsWith("4")) return "Visa";
    if (/^5[1-5]/.test(cleanNumber)) return "Master";
    if (cleanNumber.startsWith("3")) return "Amex";
    return "Card";
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    
    const isSupervisorRolePlan = selectedPlan.name === "family" || selectedPlan.name === "learning_center";
    if (isSupervisorRolePlan && user?.role !== "supervisor" && !learnUnitName.trim()) {
      setCheckoutStatus("error");
      setErrorMessage(t("checkout.organizationNameRequired"));
      return;
    }

    setCheckoutStatus("processing");
    setErrorMessage("");

    startTransition(async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        await api.post("/subscription/checkout", {
          planId: selectedPlan.id,
          billingCycle,
          learnUnitName: learnUnitName.trim() || undefined,
        });

        // Sync Redux profile credentials
        const updatedProfile = await authService.getProfile();
        const token = localStorage.getItem("token") || "";
        localStorage.setItem("user", JSON.stringify(updatedProfile));
        dispatch(setCredentials({ user: updatedProfile, token }));
        dispatch(setPermissions(updatedProfile.permissions));

        setCheckoutStatus("success");
        loadSubDetails();
      } catch (err: any) {
        console.error("Payment checkout error:", err);
        setCheckoutStatus("error");
        setErrorMessage(err.response?.data?.error || t("checkout.fail"));
      }
    });
  };

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
    if (name === "learning_center") return "learningCenter";
    return name; // "family" maps directly
  };

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-24">
      {/* Background decorations */}
      <div className="absolute top-[-5rem] left-[10%] h-72 w-72 rounded-full bg-sol-accent/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-[10%] h-80 w-80 rounded-full bg-sol-orange/8 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-10 relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-sol-accent/25 bg-sol-accent/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-sol-accent">
          <Sparkles size={13} className="animate-spin-slow" />
          Anhoc Membership
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-sol-text sm:text-5xl bg-gradient-to-r from-sol-text via-sol-accent to-sol-cyan bg-clip-text text-transparent">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg font-medium text-sol-muted leading-relaxed">
          {t("subtitle")}
        </p>

        {/* Tab Toggle Navigation */}
        {isAuthenticated && (
          <div className="mt-8 inline-flex rounded-full border border-sol-border/20 bg-sol-surface p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("pricing")}
              className={`rounded-full px-6 py-2 text-sm font-black transition ${
                activeTab === "pricing" ? "bg-sol-accent text-sol-bg" : "text-sol-text hover:text-sol-accent"
              }`}
            >
              {t("plansAndPricing")}
            </button>
            <button
              onClick={() => setActiveTab("billing")}
              className={`rounded-full px-6 py-2 text-sm font-black transition ${
                activeTab === "billing" ? "bg-sol-accent text-sol-bg" : "text-sol-text hover:text-sol-accent"
              }`}
            >
              {t("billingAndHistory")}
            </button>
          </div>
        )}
      </div>

      {activeTab === "pricing" ? (
        <>
          {/* Billing Cycle Selector Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12 relative">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`text-sm font-black tracking-wider transition ${
                billingCycle === "monthly" ? "text-sol-accent font-black" : "text-sol-muted hover:text-sol-text"
              }`}
            >
              {t("buttons.monthly")}
            </button>
            
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "annually" : "monthly")}
              className="relative h-7 w-12 rounded-full bg-sol-surface border border-sol-border/40 hover:border-sol-accent transition focus:outline-none"
            >
              <div
                className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-sol-accent transition-all duration-300 ${
                  billingCycle === "annually" ? "left-5.5" : "left-0.5"
                }`}
              />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setBillingCycle("annually")}
                className={`text-sm font-black tracking-wider transition ${
                  billingCycle === "annually" ? "text-sol-accent font-black" : "text-sol-muted hover:text-sol-text"
                }`}
              >
                {t("buttons.annually")}
              </button>
              <span className="rounded-full bg-sol-green/10 border border-sol-green/35 text-sol-green text-[10px] font-black uppercase tracking-wider px-2 py-0.5 animate-pulse">
                {t("buttons.savePercent")}
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          {loadingPlans ? (
            <div className="flex h-60 flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-sol-accent" size={36} />
              <p className="font-black text-sol-muted">{t("loadingPlans")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
              {plans.map((plan) => {
                const key = getPlanLocalKey(plan.name);
                const isCurrent = subDetails?.activeSubscription?.plan_id === plan.id && subDetails.activeSubscription.billing_cycle === billingCycle;
                const isPlanActive = subDetails?.activeSubscription?.plan_id === plan.id;
                
                const displayPrice = billingCycle === "annually" ? plan.price_annually : plan.price_monthly;
                const displayPeriod = plan.name === "free" ? t("period.forever") : t("period.month");
                const priceFormatted = plan.name === "free" ? "0" : displayPrice;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col justify-between rounded-3xl border p-6 bg-sol-surface/50 backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                      isCurrent
                        ? "border-sol-accent ring-2 ring-sol-accent/20 bg-sol-accent/3"
                        : "border-sol-border/30 hover:border-sol-accent/40"
                    }`}
                  >
                    {plan.name === "pro" && (
                      <div className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-gradient-to-r from-sol-accent to-sol-cyan px-4 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-sol-bg shadow-md">
                        {t("popular")}
                      </div>
                    )}
                    {plan.name === "learning_center" && (
                      <div className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-sol-orange text-sol-bg px-4 py-1 text-[10px] font-black uppercase tracking-[0.15em] shadow-md">
                        {t("enterprise")}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-black tracking-tight text-sol-text uppercase">
                          {t(`${key}.title`)}
                        </h3>
                        {isCurrent && (
                          <span className="rounded-full bg-sol-accent/15 border border-sol-accent/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-sol-accent">
                            {t("buttons.currentPlan")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-sol-muted min-h-10 mb-4">{t(`${key}.description`)}</p>
                      
                      <div className="flex items-baseline mb-6 border-b border-sol-border/10 pb-4">
                        <span className="text-3xl font-extrabold tracking-tight text-sol-text">
                          ${priceFormatted}
                        </span>
                        <span className="ml-1 text-xs font-semibold text-sol-muted">
                          / {displayPeriod}
                        </span>
                      </div>

                      <ul className="space-y-3">
                        <li className="flex items-start gap-2 text-xs">
                          <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green shrink-0">
                            <Check size={12} />
                          </span>
                          <span className="font-semibold text-sol-text/90">
                            {plan.name === "free" ? t("freeStudent.features.accessFree") : t("subStudent.features.accessPremium")}
                          </span>
                        </li>
                        
                        {plan.max_students !== null && (
                          <li className="flex items-start gap-2 text-xs">
                            <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green shrink-0">
                              <Check size={12} />
                            </span>
                            <span className="font-semibold text-sol-text/90">
                              {t(`${key}.features.limitStudents`)}
                            </span>
                          </li>
                        )}
                        
                        {plan.max_teachers !== null && (
                          <li className="flex items-start gap-2 text-xs">
                            <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green shrink-0">
                              <Check size={12} />
                            </span>
                            <span className="font-semibold text-sol-text/90">
                              {t(`${key}.features.limitTeachers`)}
                            </span>
                          </li>
                        )}

                        {plan.name === "free" && (
                          <>
                            <li className="flex items-start gap-2 text-xs">
                              <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green shrink-0">
                                <Check size={12} />
                              </span>
                              <span className="font-semibold text-sol-text/90">{t("freeStudent.features.xpCap")}</span>
                            </li>
                            <li className="flex items-start gap-2 text-xs opacity-60">
                              <span className="mt-0.5 rounded-full bg-sol-orange/10 p-0.5 text-sol-orange shrink-0">
                                <Lock size={10} />
                              </span>
                              <span className="font-medium text-sol-muted">{t("freeStudent.features.premiumLocked")}</span>
                            </li>
                          </>
                        )}

                        {plan.name === "pro" && (
                          <>
                            <li className="flex items-start gap-2 text-xs">
                              <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green shrink-0">
                                <Check size={12} />
                              </span>
                              <span className="font-semibold text-sol-text/90">{t("subStudent.features.noCap")}</span>
                            </li>
                            <li className="flex items-start gap-2 text-xs">
                              <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green shrink-0">
                                <Check size={12} />
                              </span>
                              <span className="font-semibold text-sol-text/90">{t("subStudent.features.rewardsUnlocked")}</span>
                            </li>
                          </>
                        )}

                        {(plan.name === "family" || plan.name === "learning_center") && (
                          <>
                            <li className="flex items-start gap-2 text-xs">
                              <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green shrink-0">
                                <Check size={12} />
                              </span>
                              <span className="font-semibold text-sol-text/90">Assign premium student slots</span>
                            </li>
                            <li className="flex items-start gap-2 text-xs">
                              <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green shrink-0">
                                <Check size={12} />
                              </span>
                              <span className="font-semibold text-sol-text/90">Detailed progress monitoring</span>
                            </li>
                          </>
                        )}
                      </ul>
                    </div>

                    {plan.name === "free" ? (
                      <button
                        type="button"
                        disabled
                        className="mt-8 w-full rounded-2xl bg-sol-surface border border-sol-border/30 px-4 py-3.5 text-center text-xs font-black uppercase tracking-wider text-sol-muted cursor-not-allowed"
                      >
                        {user?.role === "free_student" ? t("buttons.currentPlan") : "Default Level"}
                      </button>
                    ) : isCurrent ? (
                      <button
                        type="button"
                        disabled
                        className="mt-8 w-full rounded-2xl bg-sol-accent/10 border border-sol-accent/35 px-4 py-3.5 text-center text-xs font-black uppercase tracking-wider text-sol-accent cursor-default"
                      >
                        {t("buttons.currentPlan")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenCheckout(plan)}
                        className="mt-8 w-full rounded-2xl bg-sol-accent hover:cursor-pointer hover:opacity-95 text-sol-bg shadow-lg shadow-sol-accent/15 px-4 py-3.5 text-center text-xs font-black uppercase tracking-wider transition-all transform hover:scale-[1.01] active:scale-95"
                      >
                        {isPlanActive ? "Switch Cycle" : t("buttons.upgrade")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Billing & Invoice History Panel */
        <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in duration-500">
          {loadingDetails ? (
            <div className="flex h-60 flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-sol-accent" size={36} />
              <p className="font-black text-sol-muted">Retrieving billing info...</p>
            </div>
          ) : (
            <>
              {/* Active Plan Detail Card */}
              <div className="bg-sol-surface border border-sol-border/15 rounded-[2rem] p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sol-accent/5 rounded-full blur-2xl pointer-events-none" />
                
                <div>
                  <h3 className="text-xs font-black uppercase text-sol-accent tracking-widest mb-1">
                    {t("buttons.activePlan")}
                  </h3>
                  <h2 className="text-3xl font-black text-sol-text uppercase mt-1">
                    {subDetails?.activeSubscription ? t(`${getPlanLocalKey(subDetails.activeSubscription.plan.name)}.title`) : "Free Account"}
                  </h2>
                  <p className="text-sm font-bold text-sol-muted mt-2">
                    {subDetails?.activeSubscription ? (
                      <>
                        Price: ${subDetails.activeSubscription.billing_cycle === "annually" ? subDetails.activeSubscription.plan.price_annually : subDetails.activeSubscription.plan.price_monthly} 
                        ({subDetails.activeSubscription.billing_cycle === "annually" ? "Annually" : "Monthly"})
                      </>
                    ) : (
                      "Basic learning track with limits."
                    )}
                  </p>
                  
                  {subDetails?.activeSubscription?.end_date && (
                    <div className="flex items-center gap-2 text-xs font-bold text-sol-muted/80 mt-4 bg-sol-bg/50 border border-sol-border/30 rounded-xl px-3 py-1.5 w-fit">
                      <Calendar size={14} className="text-sol-accent" />
                      <span>
                        Renews on: {new Date(subDetails.activeSubscription.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {subDetails?.activeSubscription && (
                  <div className="border border-sol-border/20 bg-sol-bg/30 p-5 rounded-2xl shrink-0 w-full md:w-auto flex flex-col gap-3 min-w-[240px]">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-black uppercase text-sol-muted tracking-wider">
                        {t("buttons.autoRenewStatus")}
                      </span>
                      <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-full border ${
                        subDetails.activeSubscription.auto_renew 
                          ? "bg-sol-green/10 border-sol-green/30 text-sol-green" 
                          : "bg-sol-orange/10 border-sol-orange/30 text-sol-orange"
                      }`}>
                        {subDetails.activeSubscription.auto_renew ? t("buttons.autoRenewOn") : t("buttons.autoRenewOff")}
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
                        t("buttons.turnOffAutoRenew")
                      ) : (
                        t("buttons.turnOnAutoRenew")
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Invoices List Table */}
              <div className="bg-sol-surface border border-sol-border/10 rounded-[2.5rem] p-6 shadow-sm overflow-hidden">
                <h3 className="text-xl font-black text-sol-text mb-6 uppercase tracking-wider">
                  {t("buttons.billingHistory")}
                </h3>
                
                {subDetails?.invoices?.length === 0 ? (
                  <div className="text-center py-10">
                    <AlertCircle className="mx-auto text-sol-muted mb-3" size={32} />
                    <p className="font-bold text-sol-muted text-sm">{t("buttons.noInvoices")}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-sol-border/10 bg-sol-bg/50">
                          <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest">
                            {t("buttons.invoiceDate")}
                          </th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest">
                            {t("buttons.invoiceDesc")}
                          </th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest">
                            {t("buttons.invoiceAmount")}
                          </th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest">
                            {t("buttons.invoiceStatus")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sol-border/5">
                        {subDetails?.invoices?.map((invoice) => (
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
                                {invoice.status === "paid" ? t("buttons.invoicePaid") : t("buttons.invoiceFailed")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Stripe checkout simulation Modal */}
      {isCheckoutOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sol-bg/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div 
            className="absolute inset-0"
            onClick={() => {
              if (checkoutStatus !== "processing") setIsCheckoutOpen(false);
            }}
          />

          <div className="relative w-full max-w-lg rounded-[2rem] border border-sol-accent/20 bg-sol-surface p-6 sm:p-8 shadow-2xl z-10 origin-center animate-in zoom-in-95 duration-200">
            {/* Close button */}
            {checkoutStatus !== "processing" && (
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full border border-sol-border/30 hover:border-sol-accent text-sol-muted hover:text-sol-text transition hover:cursor-pointer"
              >
                <X size={16} />
              </button>
            )}

            {/* Modal Content */}
            {checkoutStatus === "success" ? (
              <div className="text-center py-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sol-green/10 text-sol-green mb-6">
                  <UserCheck size={36} className="animate-bounce" />
                </div>
                <h3 className="text-2xl font-black text-sol-text">{t("checkout.title")}</h3>
                <p className="mt-3 text-sm font-bold text-sol-green bg-sol-green/5 border border-sol-green/20 rounded-2xl px-4 py-3 mx-auto max-w-sm leading-relaxed">
                  {t("checkout.success")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    // Refresh view/tab
                    loadSubDetails();
                    setActiveTab("billing");
                  }}
                  className="mt-8 rounded-2xl bg-sol-accent hover:cursor-pointer px-8 py-4 text-sm font-black uppercase tracking-wider text-sol-bg transition hover:opacity-90 shadow-md shadow-sol-accent/15"
                >
                  {t("checkout.close")}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard className="text-sol-accent" size={22} />
                  <h3 className="text-xl font-black tracking-tight text-sol-text">
                    Subscribe to {selectedPlan.name.toUpperCase()}
                  </h3>
                </div>

                {/* Simulated payment notice warning */}
                <div className="flex gap-3 rounded-2xl border border-sol-orange/20 bg-sol-orange/8 p-4 mb-6">
                  <ShieldAlert className="text-sol-orange shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-sol-orange">{t("checkout.pendingTitle")}</h4>
                    <p className="mt-1 text-xs font-medium text-sol-muted leading-relaxed">{t("checkout.pendingDesc")}</p>
                  </div>
                </div>

                {/* Learn Unit setup if upgrading to supervisor roles (Family / Learning Center) */}
                {(selectedPlan.name === "family" || selectedPlan.name === "learning_center") && user?.role !== "supervisor" && (
                  <div className="mb-6">
                    <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-sol-muted">
                      Organization / Learn Unit Name
                    </label>
                    <input
                      type="text"
                      required
                      value={learnUnitName}
                      onChange={(e) => setLearnUnitName(e.target.value)}
                      disabled={checkoutStatus === "processing"}
                      placeholder="e.g. Sunny School Center"
                      className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/20 px-4 py-3 text-sm font-bold text-sol-text placeholder-sol-muted/50 focus:border-sol-accent focus:outline-none transition-colors"
                    />
                  </div>
                )}

                {/* Stylized credit card template preview */}
                <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-sol-accent/90 via-sol-cyan to-sol-accent p-6 text-sol-bg shadow-lg mb-6 overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Anhoc Premium</p>
                      <p className="text-xs font-bold mt-0.5 uppercase">
                        {t(`${getPlanLocalKey(selectedPlan.name)}.title`)}
                      </p>
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
                        {cardName || "Your Name"}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider opacity-60">Expires</p>
                        <p className="text-xs font-bold font-mono">
                          {cardExpiry || "MM/YY"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider opacity-60">CVC</p>
                        <p className="text-xs font-bold font-mono">
                          {cardCvc || "•••"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checkout form fields */}
                <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{t("checkout.cardholder")}</label>
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
                    <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{t("checkout.cardNumber")}</label>
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
                      <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{t("checkout.expiry")}</label>
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
                      <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{t("checkout.cvc")}</label>
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

                  {checkoutStatus === "error" && (
                    <div className="rounded-xl border border-sol-red/25 bg-sol-red/5 p-3 text-xs font-bold text-sol-red leading-relaxed">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={checkoutStatus === "processing"}
                    className="w-full mt-6 flex items-center justify-center gap-2 rounded-2xl bg-sol-accent hover:cursor-pointer hover:opacity-95 text-sol-bg py-4 text-sm font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sol-accent/15 animate-pulse-slow"
                  >
                    {checkoutStatus === "processing" ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>{t("checkout.processing")}</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>
                          {t("checkout.payNow")} (${billingCycle === "annually" ? selectedPlan.price_annually : selectedPlan.price_monthly})
                        </span>
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
  );
}
