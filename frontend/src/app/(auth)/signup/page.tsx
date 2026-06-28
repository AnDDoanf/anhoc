"use client";

import Logo from "@/components/ui/Logo";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect } from "react";
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
  GraduationCap,
  Users,
  BookOpen,
  Check,
  X
} from "lucide-react";
import { authService } from "@/services/auth";
import { api } from "@/services/api";
import LanguageToggle from "@/components/ui/LanguageToggle";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LoadingOverlayWrapper from "@/components/ui/LoadingOverlayWrapper";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type PlanType = "free_student" | "sub_student" | "supervisor" | "learning_center";

const planDetailsContent = {
  free_student: {
    en: {
      subheader: "For students starting out:",
      checklist: [
        { text: "Access free modules & lessons", isLimit: false },
        { text: "Earn up to 500 XP (Level 3)", isLimit: true },
        { text: "Basic AI math tutoring", isLimit: false },
        { text: "Limit of 5 lessons and 5 templates", isLimit: true }
      ],
      descHeader: "Basic study tools:",
      descText: "Access standard lessons, practice quizzes, and basic progress stats.",
      buttonText: "Get started",
      subLink: "or explore features"
    },
    vi: {
      subheader: "Cho người mới bắt đầu học toán:",
      checklist: [
        { text: "Truy cập bài học & chuyên đề miễn phí", isLimit: false },
        { text: "Tích lũy tối đa 500 XP (Cấp độ 3)", isLimit: true },
        { text: "Gia sư AI hỗ trợ cơ bản", isLimit: false },
        { text: "Giới hạn 5 bài học và 5 mẫu câu hỏi", isLimit: true }
      ],
      descHeader: "Công cụ học tập cơ bản:",
      descText: "Truy cập các bài học tiêu chuẩn, trắc nghiệm luyện tập, và bảng theo dõi tiến độ cơ bản.",
      buttonText: "Bắt đầu ngay",
      subLink: "hoặc tìm hiểu tính năng"
    }
  },
  sub_student: {
    en: {
      subheader: "For dedicated independent learners:",
      checklist: [
        { text: "Unlimited lessons & templates", isLimit: false },
        { text: "No XP or level cap", isLimit: false },
        { text: "Priority AI tutor support", isLimit: false }
      ],
      descHeader: "All Free features plus:",
      descText: "Unlock achievements, earn rewards, access premium math modules, priority support, and advanced learning statistics.",
      buttonText: "Try for free",
      subLink: "or subscribe"
    },
    vi: {
      subheader: "Cho học sinh tự học chuyên sâu:",
      checklist: [
        { text: "Không giới hạn bài học & mẫu câu hỏi", isLimit: false },
        { text: "Không giới hạn XP & cấp độ", isLimit: false },
        { text: "Gia sư AI hỗ trợ ưu tiên", isLimit: false }
      ],
      descHeader: "Bao gồm tất cả tính năng Miễn phí và:",
      descText: "Mở khóa thành tựu, nhận phần thưởng, học chuyên đề toán cao cấp, hỗ trợ ưu tiên và thống kê học tập chi tiết.",
      buttonText: "Dùng thử miễn phí",
      subLink: "hoặc đăng ký ngay"
    }
  },
  supervisor: {
    en: {
      subheader: "For families and small tutor groups:",
      checklist: [
        { text: "Up to 5 student accounts", isLimit: false },
        { text: "Up to 2 teacher accounts", isLimit: false },
        { text: "Premium student seats allocation", isLimit: false },
        { text: "Limit of 10 lessons and 20 templates", isLimit: true }
      ],
      descHeader: "All Premium features plus:",
      descText: "Track progress of managed students, review lessons & assignments, assign customized quizzes, and manage study schedules.",
      buttonText: "Try for free",
      subLink: "or subscribe"
    },
    vi: {
      subheader: "Cho gia đình và nhóm học tập nhỏ:",
      checklist: [
        { text: "Tối đa 5 tài khoản học sinh", isLimit: false },
        { text: "Tối đa 2 tài khoản giáo viên", isLimit: false },
        { text: "Phân bổ bản quyền học cao cấp", isLimit: false },
        { text: "Giới hạn 10 bài học và 20 mẫu câu hỏi", isLimit: true }
      ],
      descHeader: "Bao gồm tất cả tính năng Cao cấp và:",
      descText: "Theo dõi tiến độ học sinh, phê duyệt bài tập & bài kiểm tra, giao bài tự chọn, và quản lý lịch trình học tập.",
      buttonText: "Dùng thử miễn phí",
      subLink: "hoặc đăng ký ngay"
    }
  },
  learning_center: {
    en: {
      subheader: "For large agencies and schools:",
      checklist: [
        { text: "Starts with 20 student seats", isLimit: false },
        { text: "Includes 5 teachers & 5 subjects", isLimit: false },
        { text: "Includes 20 grades, 50 lessons & 200 templates", isLimit: false },
        { text: "Customized numbers as you grow", isLimit: false }
      ],
      descHeader: "All Family features plus:",
      descText: "Custom workspace branding, dedicated manager support, advanced capacity management, multi-grade/subject licensing, API access, and more.",
      buttonText: "Subscribe",
      subLink: "or try a custom plan"
    },
    vi: {
      subheader: "Cho trung tâm lớn và trường học:",
      checklist: [
        { text: "Bắt đầu với 20 tài khoản học sinh", isLimit: false },
        { text: "Có sẵn 5 giáo viên & 5 môn học", isLimit: false },
        { text: "Có sẵn 20 khối lớp, 50 bài học & 200 mẫu câu hỏi", isLimit: false },
        { text: "Tùy chỉnh số lượng theo nhu cầu", isLimit: false }
      ],
      descHeader: "Bao gồm tất cả tính năng Gia đình và:",
      descText: "Thương hiệu trung tâm riêng, hỗ trợ quản lý riêng, quản lý tài nguyên linh hoạt, cấp phép môn học diện rộng, và truy cập API.",
      buttonText: "Đăng ký",
      subLink: "hoặc yêu cầu tùy chỉnh"
    }
  }
};



export default function SignupPage() {
  const t = useTranslations("Signup");
  const tPricing = useTranslations("Pricing");
  const locale = useLocale();

  interface Plan {
    id: number;
    name: string;
    vi_name: string;
    en_name: string;
    description: string | null;
    price_monthly: number;
    price_annually: number;
    max_students: number | null;
    max_teachers: number | null;
    max_lessons: number | null;
    max_templates: number | null;
    max_subjects: number | null;
    max_grades: number | null;
  }

  const [plans, setPlans] = useState<Plan[]>([]);
  const [isPlansLoading, setIsPlansLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [isFullNameDirty, setIsFullNameDirty] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      setIsPlansLoading(true);
      try {
        const res = await api.get("/subscription/plans");
        setPlans(res.data);
      } catch (err) {
        console.error("Failed to fetch plans on signup", err);
      } finally {
        setIsPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const getPlanDisplayName = (planType: PlanType) => {
    const dbName =
      planType === "free_student"
        ? "free"
        : planType === "sub_student"
          ? "pro"
          : planType === "supervisor"
            ? "family"
            : "learning_center";
    const matchedPlan = plans.find(p => p.name === dbName);
    if (matchedPlan) {
      return locale === "vi" ? matchedPlan.vi_name : matchedPlan.en_name;
    }
    if (locale === "vi") {
      if (planType === "free_student") return "Học Sinh Miễn Phí";
      if (planType === "sub_student") return "Học Sinh Cao Cấp";
      if (planType === "supervisor") return "Gói Gia Đình";
      return "Trung Tâm Học Tập";
    } else {
      if (planType === "free_student") return "Free Student";
      if (planType === "sub_student") return "Premium Student";
      if (planType === "supervisor") return "Family Plan";
      return "Learning Center";
    }
  };

  const getFormattedPriceParts = (plan: Plan) => {
    if (plan.name === "free") {
      return {
        currency: locale === "vi" ? "" : "$",
        integer: "0",
        decimal: locale === "vi" ? "đ" : "",
        period: locale === "vi" ? "mãi mãi" : "forever"
      };
    }

    const price = Number(plan.price_monthly);
    if (locale === "vi") {
      let vndPrice = 0;
      if (plan.name === "pro") vndPrice = 249000;
      else if (plan.name === "family") vndPrice = 499000;
      else if (plan.name === "learning_center") vndPrice = 1249000;
      else vndPrice = Math.round(price * 25000);

      const formatted = vndPrice.toLocaleString("vi-VN");
      return {
        currency: "",
        integer: formatted,
        decimal: "đ",
        period: "tháng"
      };
    } else {
      const integerPart = Math.floor(price);
      const decimalPart = (price % 1).toFixed(2).substring(1);
      return {
        currency: "$",
        integer: String(integerPart),
        decimal: decimalPart === ".00" ? "" : decimalPart,
        period: "monthly"
      };
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscription Plan State
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("free_student");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const activeDbPlan = plans.find(
    (p) =>
      p.name ===
      (selectedPlan === "free_student"
        ? "free"
        : selectedPlan === "sub_student"
          ? "pro"
          : selectedPlan === "supervisor"
            ? "family"
            : "learning_center")
  );
  const [learnUnitName, setLearnUnitName] = useState("");

  // Checkout Form State
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const schema = z.object({
    firstName: z.string().min(1, t("errors.first_name_required")),
    lastName: z.string().min(1, t("errors.last_name_required")),
    fullName: z.string().min(1, t("errors.full_name_required")),
    email: z.string().email(t("errors.invalid_email")),
    password: z
      .string()
      .min(8, t("errors.password_too_short"))
      .regex(/[A-Z]/, t("errors.password_uppercase"))
      .regex(/[a-z]/, t("errors.password_lowercase"))
      .regex(/[0-9]/, t("errors.password_number"))
      .regex(/[^a-zA-Z0-9]/, t("errors.password_special")),
    confirmPassword: z.string().min(1, t("errors.confirm_password_required")),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t("errors.confirm_password_mismatch"),
    path: ["confirmPassword"],
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    }
  });

  const firstNameVal = watch("firstName") || "";
  const lastNameVal = watch("lastName") || "";
  const passwordVal = watch("password") || "";

  const { onBlur: firstNameOnBlur, ...firstNameReg } = register("firstName");
  const { onBlur: lastNameOnBlur, ...lastNameReg } = register("lastName");
  const { onBlur: fullNameOnBlur, ...fullNameReg } = register("fullName");
  const { onBlur: emailOnBlur, ...emailReg } = register("email");
  const { onBlur: passwordOnBlur, ...passwordReg } = register("password");
  const { onBlur: confirmPasswordOnBlur, ...confirmPasswordReg } = register("confirmPassword");

  const passwordChecks = [
    {
      key: "lowercase",
      label: t("tooltips.passwordLowercase"),
      isValid: /[a-z]/.test(passwordVal),
    },
    {
      key: "uppercase",
      label: t("tooltips.passwordUppercase"),
      isValid: /[A-Z]/.test(passwordVal),
    },
    {
      key: "digit",
      label: t("tooltips.passwordDigit"),
      isValid: /\d/.test(passwordVal),
    },
    {
      key: "specialChar",
      label: t("tooltips.passwordSpecialChar"),
      isValid: /[!@#$%^&*()\-=_+\[\]{}?\/|]/.test(passwordVal),
    },
    {
      key: "englishOnly",
      label: t("tooltips.passwordEnglishOnly"),
      isValid: passwordVal.length > 0 && /^[a-zA-Z0-9!@#$%^&*()\-=_+\[\]{}?\/|]*$/.test(passwordVal),
    },
    {
      key: "minLength",
      label: t("tooltips.passwordMinLength"),
      isValid: passwordVal.length >= 8,
    },
    {
      key: "maxLength",
      label: t("tooltips.passwordMaxLength"),
      isValid: passwordVal.length >= 1 && passwordVal.length <= 40,
    },
  ];

  useEffect(() => {
    if (!isFullNameDirty) {
      const computedFullName = [firstNameVal, lastNameVal].filter(Boolean).join(" ");
      setValue("fullName", computedFullName);
    }
  }, [firstNameVal, lastNameVal, isFullNameDirty, setValue]);

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
      await authService.register({
        email: values.email,
        password: values.password,
        first_name: values.firstName,
        last_name: values.lastName,
        full_name: values.fullName,
        role_name: selectedPlan === "learning_center" ? "supervisor" : selectedPlan,
        learn_unit_name: (selectedPlan === "supervisor" || selectedPlan === "learning_center") ? learnUnitName.trim() : undefined,
      });
      setStep(3);
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

    if ((selectedPlan === "supervisor" || selectedPlan === "learning_center") && !learnUnitName.trim()) {
      setErrorMessage(locale === "vi" ? "Tên nhóm học là bắt buộc đối với gói Giám hộ." : "Learn unit name is required for the supervisor plan.");
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
    <div className="flex w-full flex-col items-center justify-center px-4 py-8 relative min-h-screen">
      {/* Floating Toggles */}
      <div className="absolute top-6 right-6 flex items-center gap-2 z-40 bg-sol-surface/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-sol-border/30 shadow-lg">
        <LanguageToggle />
        <span className="text-sol-border/20 select-none">|</span>
        <div className="px-2">
          <ThemeToggle />
        </div>
      </div>
      {/* Background decorations */}
      <div className="absolute top-[10%] left-[5%] h-56 w-56 rounded-full bg-sol-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] h-72 w-72 rounded-full bg-sol-orange/5 blur-3xl pointer-events-none" />

      <LoadingOverlayWrapper
        isLoading={isPlansLoading || isLoading}
        title={isPlansLoading ? tPricing("loadingPlans") : t("submitting")}
        description={isPlansLoading ? undefined : t("success")}
        className="w-full max-w-5xl"
      >
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Left Column: Signup Step Card */}
        <div className="lg:col-span-7 w-full max-w-[500px] lg:max-w-none mx-auto flex lg:h-[720px]">
          <div className="w-full rounded-[2rem] border border-sol-border/30 bg-sol-surface/85 backdrop-blur-md p-8 sm:p-10 shadow-2xl relative flex flex-col justify-between overflow-visible">

            {/* Step 1: Choose Plan screen */}
            {step === 1 && (
              <div className="w-full flex flex-col justify-between h-full">
                <div className="mb-6 flex flex-col items-center">
                  <div className="mb-2">
                    <Logo className="h-32 w-auto" />
                  </div>
                  <h2 className="text-center text-2xl sm:text-3xl font-black tracking-tight text-sol-text">{t("choose_plan")}</h2>
                  <p className="mt-2 text-center text-xs sm:text-sm text-sol-muted leading-relaxed">{t("subtitle")}</p>
                </div>

                {/* Plan Choice Selector */}
                <div className="mb-6 space-y-2.5">
                  <span className="block text-xs font-black uppercase tracking-wider text-sol-muted">Select Learning Plan</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {/* Free Student Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("free_student")}
                      className={`flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-all hover:cursor-pointer ${selectedPlan === "free_student"
                          ? "border-sol-accent bg-sol-accent/5 ring-1 ring-sol-accent/20"
                          : "border-sol-border/30 bg-sol-bg/20 hover:border-sol-accent/30"
                        }`}
                    >
                      <GraduationCap size={16} className={selectedPlan === "free_student" ? "text-sol-accent" : "text-sol-muted"} />
                      <span className="text-xs font-extrabold text-sol-text mt-1.5">{getPlanDisplayName("free_student")}</span>
                      <span className="text-[10px] font-black text-sol-accent mt-0.5">{tPricing("freeStudent.price")}</span>
                    </button>

                    {/* Premium Student Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("sub_student")}
                      className={`flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-all hover:cursor-pointer relative ${selectedPlan === "sub_student"
                          ? "border-sol-accent bg-sol-accent/5 ring-1 ring-sol-accent/20"
                          : "border-sol-border/30 bg-sol-bg/20 hover:border-sol-accent/30"
                        }`}
                    >
                      <div className="absolute top-0 right-3 -translate-y-1/2 rounded-full bg-sol-orange px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-sol-bg">
                        Hot
                      </div>
                      <Sparkles size={16} className={selectedPlan === "sub_student" ? "text-sol-accent animate-pulse" : "text-sol-muted"} />
                      <span className="text-xs font-extrabold text-sol-text mt-1.5">{getPlanDisplayName("sub_student")}</span>
                      <span className="text-[10px] font-black text-sol-accent mt-0.5">{tPricing("subStudent.price")}</span>
                    </button>

                    {/* Supervisor Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("supervisor")}
                      className={`flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-all hover:cursor-pointer ${selectedPlan === "supervisor"
                          ? "border-sol-accent bg-sol-accent/5 ring-1 ring-sol-accent/20"
                          : "border-sol-border/30 bg-sol-bg/20 hover:border-sol-accent/30"
                        }`}
                    >
                      <Users size={16} className={selectedPlan === "supervisor" ? "text-sol-accent" : "text-sol-muted"} />
                      <span className="text-xs font-extrabold text-sol-text mt-1.5">{getPlanDisplayName("supervisor")}</span>
                      <span className="text-[10px] font-black text-sol-accent mt-0.5">{tPricing("supervisor.price")}</span>
                    </button>

                    {/* Learning Center Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("learning_center")}
                      className={`flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-all hover:cursor-pointer ${selectedPlan === "learning_center"
                          ? "border-sol-accent bg-sol-accent/5 ring-1 ring-sol-accent/20"
                          : "border-sol-border/30 bg-sol-bg/20 hover:border-sol-accent/30"
                        }`}
                    >
                      <BookOpen size={16} className={selectedPlan === "learning_center" ? "text-sol-accent" : "text-sol-muted"} />
                      <span className="text-xs font-extrabold text-sol-text mt-1.5">{getPlanDisplayName("learning_center")}</span>
                      <span className="text-[10px] font-black text-sol-accent mt-0.5">
                        {locale === "vi" ? "Từ 1.249.000đ" : "From $49.99"}
                      </span>
                    </button>
                  </div>

                  {selectedPlan !== "free_student" && (
                    <p className="text-[10px] font-medium text-sol-muted text-center pt-1 animate-pulse-glow">
                      ✨ {tPricing("checkout.pendingTitle")}: You will be prompted with a payment simulation.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full mt-6 rounded-xl bg-sol-accent py-4 text-sm font-black uppercase tracking-wider text-sol-bg hover:cursor-pointer hover:opacity-95 transition-all transform hover:scale-[1.01] active:scale-95 shadow-md shadow-sol-accent/15"
                >
                  {t("next")}
                </button>

                <p className="mt-8 text-center text-sm text-sol-muted">
                  {t("hasAccount")}{" "}
                  <Link href="/login" className="font-bold text-sol-accent hover:underline">
                    {t("signIn")}
                  </Link>
                </p>
              </div>
            )}

            {/* Step 2: Information form */}
            {step === 2 && (
              <div className="w-full flex flex-col justify-between h-full">
                <div className="mb-4 flex flex-col items-center">
                  <div className="mb-2">
                    <Logo className="h-24 w-auto" />
                  </div>
                  <h2 className="text-center text-xl sm:text-2xl font-black tracking-tight text-sol-text">{t("add_info")}</h2>
                  <p className="mt-1 text-center text-xs text-sol-muted leading-relaxed">
                    {locale === "vi" ? "Gói đăng ký: " : "Plan selected: "}
                    <span className="font-bold text-sol-accent">{getPlanDisplayName(selectedPlan)}</span>
                  </p>
                </div>

                {(selectedPlan === "supervisor" || selectedPlan === "learning_center") && (
                  <div className="mb-4 space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-sol-muted">
                      {locale === "vi" ? "Tên nhóm học" : "Learn unit name"}
                    </label>
                    <input
                      type="text"
                      required
                      value={learnUnitName}
                      onChange={(e) => setLearnUnitName(e.target.value)}
                      placeholder="e.g. Sunrise Learning Center"
                      className="w-full rounded-xl border border-sol-border/50 bg-sol-bg/40 px-4 py-3 text-sm font-bold text-sol-text placeholder-sol-muted/50 transition-all focus:border-sol-accent focus:outline-none"
                    />
                    <p className="text-[10px] text-sol-muted">
                      {locale === "vi" ? "Khởi tạo nhóm học và tạo mã đăng nhập cho các thành viên." : "Supervisor registration creates a learn unit and generates a login code for your members."}
                    </p>
                  </div>
                )}

                {errorMessage && (
                  <div className="mb-4 rounded-2xl border border-sol-red/25 bg-sol-red/5 p-3 text-xs font-bold text-sol-red leading-relaxed">
                    {errorMessage}
                  </div>
                )}

                <form id="signup-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="relative">
                      <input
                        {...firstNameReg}
                        onBlur={firstNameOnBlur}
                        type="text"
                        placeholder={t("first_name_placeholder")}
                        className="w-full rounded-xl border border-sol-border/50 bg-sol-bg/40 px-4 py-3.5 text-sm font-bold text-sol-text placeholder-sol-muted/50 transition-all focus:border-sol-accent focus:outline-none"
                      />
                      {errors.firstName && <p className="mt-1 text-[11px] text-sol-orange font-bold">{errors.firstName.message}</p>}
                    </div>

                    <div className="relative">
                      <input
                        {...lastNameReg}
                        onBlur={lastNameOnBlur}
                        type="text"
                        placeholder={t("last_name_placeholder")}
                        className="w-full rounded-xl border border-sol-border/50 bg-sol-bg/40 px-4 py-3.5 text-sm font-bold text-sol-text placeholder-sol-muted/50 transition-all focus:border-sol-accent focus:outline-none"
                      />
                      {errors.lastName && <p className="mt-1 text-[11px] text-sol-orange font-bold">{errors.lastName.message}</p>}
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      {...fullNameReg}
                      onBlur={fullNameOnBlur}
                      type="text"
                      onChange={(e) => {
                        fullNameReg.onChange(e);
                        setIsFullNameDirty(true);
                      }}
                      placeholder={t("full_name_placeholder")}
                      className="w-full rounded-xl border border-sol-border/50 bg-sol-bg/40 px-4 py-3.5 text-sm font-bold text-sol-text placeholder-sol-muted/50 transition-all focus:border-sol-accent focus:outline-none"
                    />
                    {errors.fullName && <p className="mt-1.5 text-xs text-sol-orange font-bold">{errors.fullName.message}</p>}
                  </div>

                  <div className="relative">
                    <input
                      {...emailReg}
                      onBlur={emailOnBlur}
                      type="email"
                      placeholder={t("email_placeholder")}
                      className="w-full rounded-xl border border-sol-border/50 bg-sol-bg/40 px-4 py-3.5 text-sm font-bold text-sol-text placeholder-sol-muted/50 transition-all focus:border-sol-accent focus:outline-none"
                    />
                    {errors.email && <p className="mt-1.5 text-xs text-sol-orange font-bold">{errors.email.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="relative">
                      <input
                        {...passwordReg}
                        onFocus={() => setFocusedField("password")}
                        onBlur={(e) => {
                          passwordOnBlur(e);
                          setFocusedField(null);
                        }}
                        type={showPassword ? "text" : "password"}
                        placeholder={t("password_placeholder")}
                        className="w-full rounded-xl border border-sol-border/50 bg-sol-bg/40 px-4 py-3.5 pr-12 text-sm font-bold text-sol-text placeholder-sol-muted/50 transition-all focus:border-sol-accent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-sol-muted transition-colors duration-200 hover:text-sol-accent hover:cursor-pointer z-30"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      {focusedField === "password" && (
                        <div className="absolute z-20 left-0 top-full mt-1.5 w-[340px] rounded-xl border border-sol-border/50 bg-sol-surface/95 backdrop-blur-md p-4 shadow-xl text-left text-xs space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          <p className="font-bold text-sol-text">{t("tooltips.passwordTitle")}</p>
                          <ul className="space-y-1.5 text-[11px] font-semibold text-sol-muted">
                            {passwordChecks.map((check) => (
                              <li key={check.key} className="flex items-start gap-2">
                                {check.isValid ? (
                                  <Check className="text-[#10b981] shrink-0 mt-0.5" size={14} />
                                ) : (
                                  <X className="text-[#dc322f] opacity-60 shrink-0 mt-0.5" size={14} />
                                )}
                                <span className={check.isValid ? "text-sol-text font-bold" : "text-sol-muted"}>
                                  {check.label}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {errors.password && <p className="mt-1 text-[11px] text-sol-orange font-bold">{errors.password.message}</p>}
                    </div>

                    <div className="relative">
                      <input
                        {...confirmPasswordReg}
                        onBlur={confirmPasswordOnBlur}
                        type={showPassword ? "text" : "password"}
                        placeholder={t("confirm_password_placeholder")}
                        className="w-full rounded-xl border border-sol-border/50 bg-sol-bg/40 px-4 py-3.5 text-sm font-bold text-sol-text placeholder-sol-muted/50 transition-all focus:border-sol-accent focus:outline-none"
                      />
                      {errors.confirmPassword && <p className="mt-1 text-[11px] text-sol-orange font-bold">{errors.confirmPassword.message}</p>}
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/3 rounded-xl border border-sol-border/30 bg-sol-bg/10 py-4 text-sm font-black uppercase tracking-wider text-sol-text hover:cursor-pointer hover:bg-sol-bg/20 transition-all"
                    >
                      {t("back")}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-2/3 rounded-xl bg-sol-accent py-4 text-sm font-black uppercase tracking-wider text-sol-bg hover:cursor-pointer hover:opacity-95 transition-all transform hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <LoadingSpinner size={16} />
                          <span>{t("submitting")}</span>
                        </span>
                      ) : (
                        <span>{selectedPlan === "free_student" ? t("submit") : "Checkout & Create Account"}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: Verify Email screen */}
            {step === 3 && (
              <div className="w-full flex flex-col justify-between h-full py-4 text-center">
                <div>
                  <div className="mb-6 flex flex-col items-center">
                    <Logo className="h-28 w-auto mb-4" />
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-sol-text">{t("verify_email")}</h2>
                  </div>

                  <div className="rounded-2xl border border-sol-accent/20 bg-sol-accent/5 p-6 mb-8 text-sm font-semibold text-sol-text leading-relaxed">
                    <p className="mb-3 text-base text-sol-accent font-black">
                      {locale === "vi" ? "Chúc mừng! Đăng ký thành công." : "Congratulations! Registration successful."}
                    </p>
                    <p className="mb-2 text-sol-text font-bold">{t("success")}</p>
                    <p className="text-xs text-sol-muted mt-2">
                      {locale === "vi" ? "Email nhận kích hoạt: " : "Sent to: "}
                      <span className="font-bold text-sol-text">{getValues().email}</span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-sol-orange/20 bg-sol-bg/40 p-6 space-y-4 max-w-md mx-auto">
                    <p className="text-xs text-sol-muted leading-relaxed font-bold">
                      {t("mailhog_hint")}
                    </p>
                    <a
                      href="http://localhost:8025/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sol-orange py-4 text-sm font-black uppercase tracking-wider text-sol-bg hover:cursor-pointer hover:opacity-95 transition-all shadow-md shadow-sol-orange/15 transform hover:scale-[1.01] active:scale-95"
                    >
                      {t("mailhog_button")}
                    </a>
                  </div>
                </div>

                <p className="mt-8 text-sm text-sol-muted">
                  {t("hasAccount")}{" "}
                  <Link href="/login" className="font-bold text-sol-accent hover:underline">
                    {t("signIn")}
                  </Link>
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Plan Details */}
        <div className="lg:col-span-5 w-full bg-sol-surface/80 border border-sol-border/20 backdrop-blur-md rounded-[2rem] p-8 shadow-2xl flex flex-col justify-between lg:h-[720px] overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-500">
          <div>
            {activeDbPlan ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-3xl font-black text-sol-text uppercase tracking-tight">
                    {locale === "vi" ? activeDbPlan.vi_name : activeDbPlan.en_name}
                  </h3>
                </div>

                {/* Price block styled exactly like Semrush */}
                <div className="border-t border-sol-border/10 pt-6">
                  {(() => {
                    const parts = getFormattedPriceParts(activeDbPlan);
                    return (
                      <div className="flex items-baseline gap-1 text-sol-text font-black">
                        {activeDbPlan.name === "learning_center" && (
                          <span className="text-lg font-black text-sol-accent mr-1.5 uppercase self-center">
                            {locale === "vi" ? "Từ" : "From"}
                          </span>
                        )}
                        <div className="flex items-start">
                          {parts.currency && (
                            <span className="text-3xl mt-1.5 mr-0.5">{parts.currency}</span>
                          )}
                          <span className="text-6xl tracking-tight leading-none">
                            {parts.integer}
                          </span>
                          <div className="ml-1 flex flex-col justify-start">
                            {parts.decimal && (
                              <span className="text-xl font-black leading-none">{parts.decimal}</span>
                            )}
                            <span className="text-xs font-semibold text-sol-muted leading-none mt-1">
                              {parts.period}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>


                {/* Checklist with checkmarks */}
                <div className="border-t border-sol-border/10 pt-6 space-y-4">
                  <h4 className="text-sm font-bold text-sol-text">
                    {locale === "vi"
                      ? planDetailsContent[selectedPlan].vi.subheader
                      : planDetailsContent[selectedPlan].en.subheader}
                  </h4>
                  <ul className="space-y-2.5">
                    {(locale === "vi"
                      ? planDetailsContent[selectedPlan].vi.checklist
                      : planDetailsContent[selectedPlan].en.checklist
                    ).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-sol-text font-medium">
                        {feature.isLimit ? (
                          <X className="text-[#dc322f] shrink-0 mt-0.5" size={16} />
                        ) : (
                          <Check className="text-[#10b981] shrink-0 mt-0.5" size={16} />
                        )}
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom description */}
                <div className="border-t border-sol-border/10 pt-6 space-y-2">
                  <h4 className="text-xs font-black uppercase text-sol-muted tracking-wider">
                    {locale === "vi"
                      ? planDetailsContent[selectedPlan].vi.descHeader
                      : planDetailsContent[selectedPlan].en.descHeader}
                  </h4>
                  <p className="text-xs font-medium text-sol-muted leading-relaxed">
                    {locale === "vi"
                      ? planDetailsContent[selectedPlan].vi.descText
                      : planDetailsContent[selectedPlan].en.descText}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-60 gap-3">
                <div className="text-sol-accent">
                  <LoadingSpinner size={32} />
                </div>
                <p className="text-xs font-bold text-sol-muted">
                  {locale === "vi" ? "Đang tải thông tin gói học..." : "Loading plan details..."}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
      </LoadingOverlayWrapper>

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
                      {getPlanDisplayName(selectedPlan)}
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
                      <LoadingSpinner size={16} />
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
