// frontend/src/app/(main)/student/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { authService } from "@/services/auth";
import { 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  EyeOff, 
  User,
  AtSign
} from "lucide-react";
import ProtectedRoute from "@/components/guard/ProtectedRoute";
import Hero from "@/components/ui/Hero";

type Feedback = { type: "success" | "error"; text: string } | null;

export default function SettingsPage() {
  const t = useTranslations("Settings");
  
  // ── Username state ──────────────────────────────────────────
  const [username, setUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameFeedback, setUsernameFeedback] = useState<Feedback>(null);

  // ── Password state ──────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Pre-fill username from profile
  useEffect(() => {
    authService.getProfile().then((profile) => {
      setUsername(profile.username ?? "");
    }).catch(() => {});
  }, []);

  // ── Handlers ────────────────────────────────────────────────
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameLoading(true);
    setUsernameFeedback(null);
    try {
      const res = await authService.updateUsername(username);
      setUsername(res.username);
      setUsernameFeedback({ type: "success", text: t("usernameSuccess") });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        setUsernameFeedback({ type: "error", text: t("usernameTaken") });
      } else {
        setUsernameFeedback({ type: "error", text: t("usernameError") });
      }
    } finally {
      setUsernameLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", text: t("passwordMismatch") });
      return;
    }
    setPasswordLoading(true);
    setPasswordFeedback(null);
    try {
      await authService.updatePassword({ currentPassword, newPassword });
      setPasswordFeedback({ type: "success", text: t("passwordSuccess") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordFeedback({ type: "error", text: t("passwordError") });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="student">
      <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        
        {/* Hero Banner */}
        <Hero
          icon={<ShieldCheck size={112} className="text-sol-accent md:h-40 md:w-40" />}
          className="md:rounded-[3rem]"
          containerClassName="relative z-10 flex w-full flex-col items-start gap-4 lg:max-w-4xl lg:flex-row lg:justify-between"
        >
          <div className="space-y-3 md:space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sol-accent/20 bg-sol-accent/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-sol-accent sm:px-3 sm:py-1.5 md:text-xs">
              <User size={11} className="md:h-3.5 md:w-3.5" />
              <span>{t("userSettings")}</span>
            </div>
            <h1 className="max-w-[15ch] text-[1.75rem] font-black leading-[1.05] tracking-tight text-sol-text sm:text-4xl md:max-w-none md:text-6xl">
              {t("userSettings")}
            </h1>
            <p className="max-w-xl text-[13px] leading-relaxed text-sol-muted sm:text-sm md:text-xl font-medium">
              {t("accountSettings")}
            </p>
          </div>
        </Hero>

        <div className="max-w-2xl mx-auto w-full space-y-6">

          {/* ── Username Card ─────────────────────────────────── */}
          <div className="bg-sol-surface border border-sol-border/30 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sol-accent/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-sol-accent/10 transition-colors duration-500" />

            <form onSubmit={handleUsernameSubmit} className="space-y-5 relative z-10">
              <h2 className="text-lg font-black text-sol-text flex items-center gap-2">
                <AtSign size={18} className="text-sol-accent" />
                {t("username")}
              </h2>

              <div className="space-y-2">
                <label className="text-sm font-bold text-sol-muted px-1 flex items-center gap-2">
                  <User size={14} />
                  {t("username")}
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  maxLength={30}
                  className="w-full bg-sol-bg/50 border border-sol-border/30 rounded-2xl px-4 py-3 text-sol-text focus:outline-none focus:ring-2 focus:ring-sol-accent/20 focus:border-sol-accent transition-all duration-300"
                  placeholder={t("usernamePlaceholder")}
                />
                <p className="text-[11px] text-sol-muted px-1 font-medium">{t("usernameHint")}</p>
              </div>

              {usernameFeedback && (
                <div
                  className={`p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-300 ${
                    usernameFeedback.type === "success"
                      ? "bg-sol-accent/10 border border-sol-accent/20 text-sol-accent"
                      : "bg-sol-orange/10 border border-sol-orange/20 text-sol-orange"
                  }`}
                >
                  {usernameFeedback.type === "success" ? (
                    <CheckCircle2 size={18} className="shrink-0" />
                  ) : (
                    <AlertCircle size={18} className="shrink-0" />
                  )}
                  <p className="text-sm font-bold">{usernameFeedback.text}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={usernameLoading}
                className="w-full bg-sol-accent text-sol-bg font-black py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all duration-300 shadow-lg shadow-sol-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:cursor-pointer"
              >
                {usernameLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {t("updating")}
                  </>
                ) : (
                  t("updateUsername")
                )}
              </button>
            </form>
          </div>

          {/* ── Password Card ─────────────────────────────────── */}
          <div className="bg-sol-surface border border-sol-border/30 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sol-accent/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-sol-accent/10 transition-colors duration-500" />
            
            <form onSubmit={handlePasswordSubmit} className="space-y-6 relative z-10">
              <h2 className="text-lg font-black text-sol-text flex items-center gap-2">
                <KeyRound size={18} className="text-sol-accent" />
                {t("modifyPassword")}
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-sol-muted px-1 flex items-center gap-2">
                    <KeyRound size={14} />
                    {t("currentPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-sol-bg/50 border border-sol-border/30 rounded-2xl px-4 py-3 pr-12 text-sol-text focus:outline-none focus:ring-2 focus:ring-sol-accent/20 focus:border-sol-accent transition-all duration-300"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sol-muted hover:text-sol-accent transition-colors hover:cursor-pointer"
                    >
                      {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-sol-muted px-1">
                      {t("newPassword")}
                    </label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-sol-bg/50 border border-sol-border/30 rounded-2xl px-4 py-3 pr-12 text-sol-text focus:outline-none focus:ring-2 focus:ring-sol-accent/20 focus:border-sol-accent transition-all duration-300"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sol-muted hover:text-sol-accent transition-colors hover:cursor-pointer"
                      >
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-sol-muted px-1">
                      {t("confirmPassword")}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-sol-bg/50 border border-sol-border/30 rounded-2xl px-4 py-3 pr-12 text-sol-text focus:outline-none focus:ring-2 focus:ring-sol-accent/20 focus:border-sol-accent transition-all duration-300"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sol-muted hover:text-sol-accent transition-colors hover:cursor-pointer"
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {passwordFeedback && (
                <div
                  className={`p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-300 ${
                    passwordFeedback.type === "success"
                      ? "bg-sol-accent/10 border border-sol-accent/20 text-sol-accent"
                      : "bg-sol-orange/10 border border-sol-orange/20 text-sol-orange"
                  }`}
                >
                  {passwordFeedback.type === "success" ? (
                    <CheckCircle2 size={18} className="shrink-0" />
                  ) : (
                    <AlertCircle size={18} className="shrink-0" />
                  )}
                  <p className="text-sm font-bold">{passwordFeedback.text}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-sol-accent text-sol-bg font-black py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all duration-300 shadow-lg shadow-sol-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:cursor-pointer"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {t("updating")}
                  </>
                ) : (
                  t("updatePassword")
                )}
              </button>
            </form>
          </div>

        </div>

      </div>
    </ProtectedRoute>
  );
}
