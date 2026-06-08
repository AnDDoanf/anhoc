"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import {
  Check,
  CreditCard,
  Sparkles,
  Users,
  Lock,
  Plus,
  Minus,
  X,
  ShieldAlert,
  Loader2,
  Calendar,
  UserCheck
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { setCredentials } from "@/redux/slices/authSlice";
import { setPermissions } from "@/redux/slices/permissionSlice";
import { authService } from "@/services/auth";
import { api } from "@/services/api";

type PlanType = "free_student" | "sub_student" | "supervisor";

export default function PricingPage() {
  const t = useTranslations("Pricing");
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [slotCount, setSlotCount] = useState(1);
  
  // Checkout Form State
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  
  const [isPending, startTransition] = useTransition();
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleOpenCheckout = (plan: PlanType) => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/subscription");
      return;
    }
    setSelectedPlan(plan);
    setCheckoutStatus("idle");
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setErrorMessage("");
    setIsCheckoutOpen(true);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    // Format card number with spaces every 4 digits
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

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setCheckoutStatus("processing");
    setErrorMessage("");

    startTransition(async () => {
      try {
        // Simulate a 2-second payment processing delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (selectedPlan === "supervisor" && user?.role === "supervisor") {
          // Supervisor buying additional seats
          const response = await api.post("/supervisor/buy-slots", { slots: slotCount });
          
          // Refresh user profile
          const updatedProfile = await authService.getProfile();
          const token = localStorage.getItem("token") || "";
          localStorage.setItem("user", JSON.stringify(updatedProfile));
          dispatch(setCredentials({ user: updatedProfile, token }));
          dispatch(setPermissions(updatedProfile.permissions));
        } else {
          // Role upgrade: sub_student or supervisor
          await api.post("/auth/upgrade-role", { roleName: selectedPlan });
          
          // Refresh user profile
          const updatedProfile = await authService.getProfile();
          const token = localStorage.getItem("token") || "";
          localStorage.setItem("user", JSON.stringify(updatedProfile));
          dispatch(setCredentials({ user: updatedProfile, token }));
          dispatch(setPermissions(updatedProfile.permissions));
        }

        setCheckoutStatus("success");
      } catch (error: any) {
        console.error("Simulation payment error:", error);
        setCheckoutStatus("error");
        setErrorMessage(error.response?.data?.error || t("checkout.fail"));
      }
    });
  };

  // Detect card type based on first digit
  const getCardType = () => {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (cleanNumber.startsWith("4")) return "Visa";
    if (/^5[1-5]/.test(cleanNumber)) return "Mastercard";
    if (cleanNumber.startsWith("3")) return "Amex";
    return "Unknown";
  };

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Decorative blurred backdrops */}
      <div className="absolute top-[-5rem] left-[10%] h-72 w-72 rounded-full bg-sol-accent/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-[10%] h-80 w-80 rounded-full bg-sol-orange/8 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-16 relative">
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
      </div>

      {/* Grid of pricing cards */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:max-w-6xl lg:mx-auto">
        
        {/* Tier 1: Free Student */}
        <div className={`relative flex flex-col justify-between rounded-3xl border p-8 bg-sol-surface/50 backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
          user?.role === "free_student" 
            ? "border-sol-accent ring-2 ring-sol-accent/20" 
            : "border-sol-border/30 hover:border-sol-accent/40"
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black tracking-tight text-sol-text">{t("freeStudent.title")}</h3>
              {user?.role === "free_student" && (
                <span className="rounded-full bg-sol-accent/15 border border-sol-accent/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sol-accent">
                  {t("buttons.currentPlan")}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-sol-muted min-h-10">{t("freeStudent.description")}</p>
            <p className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold tracking-tight text-sol-text">{t("freeStudent.price")}</span>
              <span className="ml-1 text-sm font-semibold text-sol-muted">/ {t("period.forever")}</span>
            </p>

            <ul className="mt-8 space-y-4 border-t border-sol-border/20 pt-6">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green">
                  <Check size={14} />
                </span>
                <span className="text-sm font-medium text-sol-text/90">{t("freeStudent.features.accessFree")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green">
                  <Check size={14} />
                </span>
                <span className="text-sm font-medium text-sol-text/90">{t("freeStudent.features.xpCap")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green">
                  <Check size={14} />
                </span>
                <span className="text-sm font-medium text-sol-text/90">{t("freeStudent.features.basicAi")}</span>
              </li>
              <li className="flex items-start gap-3 opacity-60">
                <span className="mt-0.5 rounded-full bg-sol-orange/10 p-0.5 text-sol-orange">
                  <Lock size={12} />
                </span>
                <span className="text-sm font-medium text-sol-muted">{t("freeStudent.features.premiumLocked")}</span>
              </li>
              <li className="flex items-start gap-3 opacity-60">
                <span className="mt-0.5 rounded-full bg-sol-orange/10 p-0.5 text-sol-orange">
                  <Lock size={12} />
                </span>
                <span className="text-sm font-medium text-sol-muted">{t("freeStudent.features.rewardsLocked")}</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            disabled
            className="mt-8 w-full rounded-2xl bg-sol-surface border border-sol-border/30 px-4 py-4 text-center text-sm font-bold uppercase tracking-wider text-sol-muted cursor-not-allowed"
          >
            {user?.role === "free_student" ? t("buttons.currentPlan") : t("buttons.getStarted")}
          </button>
        </div>

        {/* Tier 2: Premium Student */}
        <div className={`relative flex flex-col justify-between rounded-3xl border p-8 bg-sol-surface/60 backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
          user?.role === "sub_student"
            ? "border-sol-accent ring-2 ring-sol-accent/30 bg-sol-accent/3"
            : "border-sol-accent/40 shadow-lg ring-1 ring-sol-accent/10 hover:border-sol-accent"
        }`}>
          {/* Recommended ribbon */}
          <div className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-gradient-to-r from-sol-accent to-sol-cyan px-4 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-sol-bg shadow-md">
            Popular
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black tracking-tight text-sol-text">{t("subStudent.title")}</h3>
              {user?.role === "sub_student" && (
                <span className="rounded-full bg-sol-accent/15 border border-sol-accent/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sol-accent">
                  {t("buttons.currentPlan")}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-sol-muted min-h-10">{t("subStudent.description")}</p>
            <p className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold tracking-tight text-sol-text">{t("subStudent.price")}</span>
              <span className="ml-1 text-sm font-semibold text-sol-muted">/ {t("period.month")}</span>
            </p>

            <ul className="mt-8 space-y-4 border-t border-sol-border/20 pt-6">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green">
                  <Check size={14} />
                </span>
                <span className="text-sm font-bold text-sol-text">{t("subStudent.features.allFree")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green">
                  <Check size={14} />
                </span>
                <span className="text-sm font-bold text-sol-text">{t("subStudent.features.accessPremium")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green">
                  <Check size={14} />
                </span>
                <span className="text-sm font-bold text-sol-text">{t("subStudent.features.noCap")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green">
                  <Check size={14} />
                </span>
                <span className="text-sm font-bold text-sol-text">{t("subStudent.features.rewardsUnlocked")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green">
                  <Check size={14} />
                </span>
                <span className="text-sm font-bold text-sol-text">{t("subStudent.features.priorityAi")}</span>
              </li>
            </ul>
          </div>

          {user?.role === "sub_student" ? (
            <button
              type="button"
              disabled
              className="mt-8 w-full rounded-2xl bg-sol-accent/10 border border-sol-accent/35 px-4 py-4 text-center text-sm font-black uppercase tracking-wider text-sol-accent cursor-default"
            >
              {t("buttons.currentPlan")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenCheckout("sub_student")}
              className="mt-8 w-full rounded-2xl bg-sol-accent hover:cursor-pointer hover:opacity-95 text-sol-bg shadow-lg shadow-sol-accent/20 px-4 py-4 text-center text-sm font-black uppercase tracking-wider transition-all transform hover:scale-[1.01] active:scale-95"
            >
              {t("buttons.upgrade")}
            </button>
          )}
        </div>

        {/* Tier 3: Supervisor */}
        <div className={`relative flex flex-col justify-between rounded-3xl border p-8 bg-sol-surface/50 backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
          user?.role === "supervisor"
            ? "border-sol-accent ring-2 ring-sol-accent/20 bg-sol-accent/2"
            : "border-sol-border/30 hover:border-sol-accent/40"
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black tracking-tight text-sol-text">{t("supervisor.title")}</h3>
              {user?.role === "supervisor" && (
                <span className="rounded-full bg-sol-accent/15 border border-sol-accent/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sol-accent">
                  {user.slots_purchased || 0} Seats Active
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-sol-muted min-h-10">{t("supervisor.description")}</p>
            <p className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold tracking-tight text-sol-text">{t("supervisor.price")}</span>
              <span className="ml-1 text-sm font-semibold text-sol-muted">/ {t("period.seatMonth")}</span>
            </p>

            <ul className="mt-8 space-y-4 border-t border-sol-border/20 pt-6">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green">
                  <Check size={14} />
                </span>
                <span className="text-sm font-medium text-sol-text/90">{t("supervisor.features.buySeats")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green">
                  <Check size={14} />
                </span>
                <span className="text-sm font-medium text-sol-text/90">{t("supervisor.features.manageAccounts")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green">
                  <Check size={14} />
                </span>
                <span className="text-sm font-medium text-sol-text/90">{t("supervisor.features.assignSeats")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green">
                  <Check size={14} />
                </span>
                <span className="text-sm font-medium text-sol-text/90">{t("supervisor.features.trackProgress")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-sol-green/10 p-0.5 text-sol-green">
                  <Check size={14} />
                </span>
                <span className="text-sm font-medium text-sol-text/90">{t("supervisor.features.reviewLessons")}</span>
              </li>
            </ul>
          </div>

          {user?.role === "supervisor" ? (
            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between border border-sol-border/30 bg-sol-bg/40 rounded-2xl p-2">
                <span className="text-xs font-black uppercase text-sol-muted pl-2">Seats to add</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSlotCount(prev => Math.max(1, prev - 1))}
                    className="flex h-8 w-8 items-center justify-center hover:cursor-pointer rounded-xl bg-sol-surface border border-sol-border/30 text-sol-text transition hover:border-sol-accent"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-black text-sol-text">{slotCount}</span>
                  <button
                    type="button"
                    onClick={() => setSlotCount(prev => prev + 1)}
                    className="flex h-8 w-8 items-center justify-center hover:cursor-pointer rounded-xl bg-sol-surface border border-sol-border/30 text-sol-text transition hover:border-sol-accent"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCheckout("supervisor")}
                className="w-full rounded-2xl bg-sol-accent hover:cursor-pointer hover:opacity-95 text-sol-bg px-4 py-4 text-center text-sm font-black uppercase tracking-wider transition-all transform hover:scale-[1.01] active:scale-95 shadow-md shadow-sol-accent/15"
              >
                {t("buttons.buySeats")} ({slotCount})
              </button>

              <button
                type="button"
                onClick={() => router.push("/student/members")}
                className="w-full rounded-2xl bg-sol-surface border border-sol-border/30 text-sol-text hover:border-sol-accent hover:cursor-pointer px-4 py-3.5 text-center text-sm font-bold tracking-wider transition-all"
              >
                {t("buttons.manageMembers")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenCheckout("supervisor")}
              className="mt-8 w-full rounded-2xl bg-sol-surface hover:cursor-pointer hover:bg-sol-bg border border-sol-border/40 hover:border-sol-accent text-sol-text px-4 py-4 text-center text-sm font-black uppercase tracking-wider transition-all transform hover:scale-[1.01] active:scale-95"
            >
              {t("buttons.upgrade")}
            </button>
          )}
        </div>

      </div>

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
                    // Refresh view
                    router.refresh();
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
                    {selectedPlan === "supervisor" && user?.role === "supervisor" 
                      ? `${t("buttons.buySeats")} (${slotCount} Seats)` 
                      : t("checkout.title")
                    }
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

                {/* Stylized credit card template preview */}
                <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-sol-accent/90 via-sol-cyan to-sol-accent p-6 text-sol-bg shadow-lg mb-6 overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Anhoc Premium</p>
                      <p className="text-xs font-bold mt-0.5">
                        {selectedPlan === "free_student" && t("freeStudent.title")}
                        {selectedPlan === "sub_student" && t("subStudent.title")}
                        {selectedPlan === "supervisor" && t("supervisor.title")}
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
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          disabled={checkoutStatus === "processing"}
                          className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/20 pl-11 pr-4 py-3 text-sm font-bold text-sol-text placeholder-sol-muted/50 focus:border-sol-accent focus:outline-none transition-colors font-mono"
                        />
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-sol-muted/80" size={16} />
                      </div>
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
                    className="w-full mt-6 flex items-center justify-center gap-2 rounded-2xl bg-sol-accent hover:cursor-pointer hover:opacity-95 text-sol-bg py-4 text-sm font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sol-accent/15"
                  >
                    {checkoutStatus === "processing" ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>{t("checkout.processing")}</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>{t("checkout.payNow")}</span>
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
