"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  Sparkles,
  CreditCard,
  Lock,
  Calendar,
  ShieldAlert,
  Loader2,
  GraduationCap,
  Users
} from "lucide-react";
import { authService } from "@/services/auth";

type PlanType = "free_student" | "sub_student" | "supervisor";

export default function SignupPage() {
  const t = useTranslations("Signup");
  const tPricing = useTranslations("Pricing");
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscription Plan State
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("free_student");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [learnUnitName, setLearnUnitName] = useState("");
  
  // Checkout Form State
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const schema = z.object({
    email: z.string().email(t("errors.invalid_email")),
    password: z.string().min(6, t("errors.password_too_short")),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

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
    if (/^5[1-5]/.test(cleanNumber)) return "Mastercard";
    if (cleanNumber.startsWith("3")) return "Amex";
    return "Unknown";
  };

  // Perform the actual signup registration API call
  const performRegistration = async (values: FormValues) => {
    try {
      const response = await authService.register({
        email: values.email,
        password: values.password,
        role_name: selectedPlan,
        learn_unit_name: selectedPlan === "supervisor" ? learnUnitName.trim() : undefined,
      });
      const codeMessage = response.learnUnit?.code
        ? `Learn unit code: ${response.learnUnit.code}`
        : "";
      setSuccessMessage([response.message || t("success"), codeMessage].filter(Boolean).join(" "));
      setIsCheckoutOpen(false);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t("fallbackError");
      if (isCheckoutOpen) {
        setCheckoutError(message);
      } else {
        setErrorMessage(message);
      }
      throw error;
    }
  };

  const onSubmit = async (values: FormValues) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (selectedPlan === "supervisor" && !learnUnitName.trim()) {
      setErrorMessage("Learn unit name is required for the supervisor plan.");
      return;
    }

    // If paid plan, prompt checkout simulation first
    if (selectedPlan !== "free_student") {
      setCardName("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvc("");
      setCheckoutError("");
      setIsCheckoutOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      await performRegistration(values);
    } catch {
      // Handled in performRegistration
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutPending(true);
    setCheckoutError("");

    try {
      // Simulate Stripe API transaction latency
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const values = getValues();
      await performRegistration(values);
    } catch {
      // Error handled in performRegistration
    } finally {
      setCheckoutPending(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center px-4 py-8 relative">
      {/* Background decorations */}
      <div className="absolute top-[10%] left-[5%] h-56 w-56 rounded-full bg-sol-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] h-72 w-72 rounded-full bg-sol-orange/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-[500px]">
        <div className="rounded-[2rem] border border-sol-border/30 bg-sol-surface/85 backdrop-blur-md p-8 sm:p-10 shadow-2xl relative">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-2">
              <Image src="/anhoc.svg" alt="Anhoc Logo" width={640} height={320} className="h-32 w-auto object-contain" priority />
            </div>
            <h2 className="text-center text-2xl sm:text-3xl font-black tracking-tight text-sol-text">{t("title")}</h2>
            <p className="mt-2 text-center text-xs sm:text-sm text-sol-muted leading-relaxed">{t("subtitle")}</p>
          </div>

          {/* Plan Choice Selector */}
          <div className="mb-6 space-y-2.5">
            <span className="block text-xs font-black uppercase tracking-wider text-sol-muted">Select Learning Plan</span>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Free Student Option */}
              <button
                type="button"
                onClick={() => setSelectedPlan("free_student")}
                className={`flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-all hover:cursor-pointer ${
                  selectedPlan === "free_student"
                    ? "border-sol-accent bg-sol-accent/5 ring-1 ring-sol-accent/20"
                    : "border-sol-border/30 bg-sol-bg/20 hover:border-sol-accent/30"
                }`}
              >
                <GraduationCap size={16} className={selectedPlan === "free_student" ? "text-sol-accent" : "text-sol-muted"} />
                <span className="text-xs font-extrabold text-sol-text mt-1.5">{tPricing("freeStudent.title")}</span>
                <span className="text-[10px] font-black text-sol-accent mt-0.5">{tPricing("freeStudent.price")}</span>
              </button>

              {/* Premium Student Option */}
              <button
                type="button"
                onClick={() => setSelectedPlan("sub_student")}
                className={`flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-all hover:cursor-pointer relative ${
                  selectedPlan === "sub_student"
                    ? "border-sol-accent bg-sol-accent/5 ring-1 ring-sol-accent/20"
                    : "border-sol-border/30 bg-sol-bg/20 hover:border-sol-accent/30"
                }`}
              >
                <div className="absolute top-0 right-3 -translate-y-1/2 rounded-full bg-sol-orange px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-sol-bg">
                  Hot
                </div>
                <Sparkles size={16} className={selectedPlan === "sub_student" ? "text-sol-accent animate-pulse" : "text-sol-muted"} />
                <span className="text-xs font-extrabold text-sol-text mt-1.5">{tPricing("subStudent.title")}</span>
                <span className="text-[10px] font-black text-sol-accent mt-0.5">{tPricing("subStudent.price")}</span>
              </button>

              {/* Supervisor Option */}
              <button
                type="button"
                onClick={() => setSelectedPlan("supervisor")}
                className={`flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-all hover:cursor-pointer ${
                  selectedPlan === "supervisor"
                    ? "border-sol-accent bg-sol-accent/5 ring-1 ring-sol-accent/20"
                    : "border-sol-border/30 bg-sol-bg/20 hover:border-sol-accent/30"
                }`}
              >
                <Users size={16} className={selectedPlan === "supervisor" ? "text-sol-accent" : "text-sol-muted"} />
                <span className="text-xs font-extrabold text-sol-text mt-1.5">{tPricing("supervisor.title")}</span>
                <span className="text-[10px] font-black text-sol-accent mt-0.5">{tPricing("supervisor.price")}</span>
              </button>
            </div>

            {selectedPlan !== "free_student" && (
              <p className="text-[10px] font-medium text-sol-muted text-center pt-1 animate-pulse-glow">
                ✨ {tPricing("checkout.pendingTitle")}: You will be prompted with a payment simulation.
              </p>
            )}
          </div>

          {selectedPlan === "supervisor" && (
            <div className="mb-6 space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-sol-muted">
                Learn unit name
              </label>
              <input
                type="text"
                required
                value={learnUnitName}
                onChange={(e) => setLearnUnitName(e.target.value)}
                placeholder="e.g. Sunrise Learning Center"
                className="w-full rounded-xl border border-sol-border/50 bg-sol-bg/40 px-4 py-3.5 text-sm font-bold text-sol-text placeholder-sol-muted/50 transition-all focus:border-sol-accent focus:outline-none"
              />
              <p className="text-[11px] text-sol-muted">
                Supervisor registration creates a learn unit and generates a login code for your members.
              </p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-2xl border border-sol-green/20 bg-sol-green/10 p-4 text-xs font-bold text-sol-green leading-relaxed">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-sol-red/25 bg-sol-red/5 p-4 text-xs font-bold text-sol-red leading-relaxed">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <input
                {...register("email")}
                type="email"
                placeholder={t("email_placeholder")}
                className="w-full rounded-xl border border-sol-border/50 bg-sol-bg/40 px-4 py-3.5 text-sm font-bold text-sol-text placeholder-sol-muted/50 transition-all focus:border-sol-accent focus:outline-none"
              />
              {errors.email && <p className="mt-1.5 text-xs text-sol-orange font-bold">{errors.email.message}</p>}
            </div>

            <div className="relative">
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder={t("password_placeholder")}
                className="w-full rounded-xl border border-sol-border/50 bg-sol-bg/40 px-4 py-3.5 pr-12 text-sm font-bold text-sol-text placeholder-sol-muted/50 transition-all focus:border-sol-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-sol-muted transition-colors duration-200 hover:text-sol-accent hover:cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {errors.password && <p className="mt-1.5 text-xs text-sol-orange font-bold">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 rounded-xl bg-sol-accent py-4 text-sm font-black uppercase tracking-wider text-sol-bg hover:cursor-pointer hover:opacity-95 transition-all transform hover:scale-[1.01] active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  <span>{t("submitting")}</span>
                </span>
              ) : (
                <span>{selectedPlan === "free_student" ? t("submit") : "Checkout & Create Account"}</span>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-sol-muted">
            {t("hasAccount")}{" "}
            <Link href="/login" className="font-bold text-sol-accent hover:underline">
              {t("signIn")}
            </Link>
          </p>
        </div>
      </div>

      {/* Stripe checkout simulation Modal */}
      {isCheckoutOpen && selectedPlan !== "free_student" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sol-bg/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div 
            className="absolute inset-0"
            onClick={() => {
              if (!checkoutPending) setIsCheckoutOpen(false);
            }}
          />

          <div className="relative w-full max-w-lg rounded-[2rem] border border-sol-accent/20 bg-sol-surface p-6 sm:p-8 shadow-2xl z-10 origin-center animate-in zoom-in-95 duration-200">
            {/* Close button */}
            {!checkoutPending && (
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full border border-sol-border/30 hover:border-sol-accent text-sol-muted hover:text-sol-text transition hover:cursor-pointer"
              >
                X
              </button>
            )}

            <div>
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="text-sol-accent" size={22} />
                <h3 className="text-xl font-black tracking-tight text-sol-text">
                  Complete Signup & Subscribe
                </h3>
              </div>

              {/* Simulated notice */}
              <div className="flex gap-3 rounded-2xl border border-sol-orange/20 bg-sol-orange/8 p-4 mb-6">
                <ShieldAlert className="text-sol-orange shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-sol-orange">{tPricing("checkout.pendingTitle")}</h4>
                  <p className="mt-1 text-xs font-medium text-sol-muted leading-relaxed">{tPricing("checkout.pendingDesc")}</p>
                </div>
              </div>

              {/* Stylized credit card template */}
              <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-sol-accent/90 via-sol-cyan to-sol-accent p-6 text-sol-bg shadow-lg mb-6 overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Anhoc Premium</p>
                    <p className="text-xs font-bold mt-0.5">
                      {selectedPlan === "sub_student" ? tPricing("subStudent.title") : tPricing("supervisor.title")}
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

              {/* Checkout Form */}
              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{tPricing("checkout.cardholder")}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ALAN TURING"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    disabled={checkoutPending}
                    className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/20 px-4 py-3 text-sm font-bold text-sol-text placeholder-sol-muted/50 focus:border-sol-accent focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{tPricing("checkout.cardNumber")}</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      disabled={checkoutPending}
                      className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/20 pl-11 pr-4 py-3 text-sm font-bold text-sol-text placeholder-sol-muted/50 focus:border-sol-accent focus:outline-none transition-colors font-mono"
                    />
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-sol-muted/80" size={16} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{tPricing("checkout.expiry")}</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        disabled={checkoutPending}
                        className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/20 pl-11 pr-4 py-3 text-sm font-bold text-sol-text placeholder-sol-muted/50 focus:border-sol-accent focus:outline-none transition-colors font-mono"
                      />
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-sol-muted/80" size={16} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-sol-muted mb-1.5">{tPricing("checkout.cvc")}</label>
                    <input
                      type="password"
                      required
                      placeholder="123"
                      value={cardCvc}
                      onChange={handleCvcChange}
                      disabled={checkoutPending}
                      className="w-full rounded-xl border border-sol-border/30 bg-sol-bg/20 px-4 py-3 text-sm font-bold text-sol-text placeholder-sol-muted/50 focus:border-sol-accent focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>

                {checkoutError && (
                  <div className="rounded-xl border border-sol-red/25 bg-sol-red/5 p-3 text-xs font-bold text-sol-red leading-relaxed">
                    {checkoutError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={checkoutPending}
                  className="w-full mt-6 flex items-center justify-center gap-2 rounded-2xl bg-sol-accent hover:cursor-pointer hover:opacity-95 text-sol-bg py-4 text-sm font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sol-accent/15"
                >
                  {checkoutPending ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>{tPricing("checkout.processing")}</span>
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      <span>{tPricing("checkout.payNow")}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
