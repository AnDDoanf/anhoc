"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { authService } from "@/services/auth";
import { KeyRound, ShieldCheck, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import ProtectedRoute from "@/components/guard/ProtectedRoute";

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: t("passwordMismatch") });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await authService.updatePassword({ currentPassword, newPassword });
      setMessage({ type: "success", text: t("passwordSuccess") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage({ type: "error", text: t("passwordError") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="student">
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-sol-text tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-sol-accent" size={32} />
            {t("userSettings")}
          </h1>
          <p className="text-sol-muted font-medium">
            {t("modifyPassword")}
          </p>
        </div>

        <div className="bg-sol-surface border border-sol-border/30 rounded-3xl p-8 shadow-xl shadow-sol-accent/5 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sol-accent/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-sol-accent/10 transition-colors duration-500" />
          
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sol-muted hover:text-sol-accent transition-colors"
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sol-muted hover:text-sol-accent transition-colors"
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sol-muted hover:text-sol-accent transition-colors"
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {message && (
              <div
                className={`p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-300 ${
                  message.type === "success"
                    ? "bg-sol-accent/10 border border-sol-accent/20 text-sol-accent"
                    : "bg-sol-orange/10 border border-sol-orange/20 text-sol-orange"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 size={18} className="shrink-0" />
                ) : (
                  <AlertCircle size={18} className="shrink-0" />
                )}
                <p className="text-sm font-bold">{message.text}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sol-accent text-sol-bg font-black py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all duration-300 shadow-lg shadow-sol-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
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
    </ProtectedRoute>
  );
}
