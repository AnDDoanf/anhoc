// frontend/src/app/(main)/student/settings/page.tsx
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { authService } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";
import { 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  EyeOff, 
  User,
  AtSign,
  Camera,
  Upload
} from "lucide-react";
import ProtectedRoute from "@/components/guard/ProtectedRoute";
import Hero from "@/components/ui/Hero";

type Feedback = { type: "success" | "error"; text: string } | null;

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const { user, updateUser } = useAuth();
  
  // ── Avatar state ────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<Feedback>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState(false);

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

  useEffect(() => {
    setImageError(false);
  }, [user?.avatar_url]);

  const getInitials = () => {
    const name = user?.full_name || user?.username || "";
    if (!name) return "?";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const processFile = async (file: File) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setAvatarFeedback({ type: "error", text: t("avatarTypeLimit") });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarFeedback({ type: "error", text: t("avatarSizeLimit") });
      return;
    }

    setAvatarLoading(true);
    setAvatarFeedback(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await authService.updateAvatar(base64);
        if (user) {
          updateUser({ ...user, avatar_url: res.avatar_url });
        }
        setAvatarFeedback({ type: "success", text: t("avatarSuccess") });
      } catch {
        setAvatarFeedback({ type: "error", text: t("avatarError") });
      } finally {
        setAvatarLoading(false);
      }
    };
    reader.onerror = () => {
      setAvatarFeedback({ type: "error", text: t("avatarError") });
      setAvatarLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  // ── Handlers ────────────────────────────────────────────────
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameLoading(true);
    setUsernameFeedback(null);
    try {
      const res = await authService.updateUsername(username);
      setUsername(res.username);
      if (user) {
        updateUser({ ...user, username: res.username });
      }
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

        <div className="max-w-4xl mx-auto w-full space-y-6">

          {/* ── Profile Settings Card (Avatar + Username side-by-side) ── */}
          <div className={`bg-sol-surface border ${isDragging ? "border-sol-accent shadow-sol-accent/5" : "border-sol-border/30"} rounded-3xl p-8 shadow-xl relative overflow-hidden group transition-all duration-300`}
               onDragOver={handleDragOver}
               onDragLeave={handleDragLeave}
               onDrop={handleDrop}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-sol-accent/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-sol-accent/10 transition-colors duration-500" />
            
            <div className="space-y-6 relative z-10">
              <h2 className="text-lg font-black text-sol-text flex items-center gap-2">
                <User size={18} className="text-sol-accent" />
                {t("accountSettings")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* Left side: Avatar details */}
                <div className="md:col-span-5 flex flex-col items-center p-6 bg-sol-bg/20 rounded-2xl border border-sol-border/10 space-y-4 w-full">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-28 h-28 rounded-full cursor-pointer overflow-hidden border-2 border-sol-border/30 bg-sol-bg/50 hover:border-sol-accent group/avatar shadow-inner transition-all duration-300 flex items-center justify-center shrink-0"
                  >
                    {user?.avatar_url && !imageError ? (
                      <img 
                        src={user.avatar_url.startsWith("http") ? user.avatar_url : `http://localhost:5001${user.avatar_url}`}
                        alt={user.username || "Avatar"} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-110"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-sol-accent/20 to-sol-accent/5 flex items-center justify-center text-sol-accent font-black text-3xl">
                        {getInitials()}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-sol-bg/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center gap-1 transition-all duration-300">
                      <Camera size={20} className="text-sol-accent animate-bounce" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sol-text">{t("avatarPlaceholder")}</span>
                    </div>

                    {avatarLoading && (
                      <div className="absolute inset-0 bg-sol-bg/85 flex items-center justify-center z-10 backdrop-blur-[2px]">
                        <Loader2 className="animate-spin text-sol-accent" size={28} />
                      </div>
                    )}
                  </div>

                  <div className="text-center space-y-2 w-full">
                    <p className="text-xs font-bold text-sol-text">{t("avatar")}</p>
                    <p className="text-[11px] text-sol-muted leading-relaxed">
                      {t("avatarDragDrop")}
                    </p>
                    <p className="text-[10px] text-sol-muted/80 font-semibold">
                      {t("avatarTypeLimit")}
                    </p>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarLoading}
                      className="inline-flex items-center gap-2 bg-sol-accent/10 hover:bg-sol-accent text-sol-accent hover:text-sol-bg border border-sol-accent/20 hover:border-transparent font-black px-4 py-2 rounded-xl transition-all duration-300 hover:cursor-pointer text-[10px] uppercase tracking-wider mt-1"
                    >
                      <Upload size={12} />
                      {t("avatarUploadButton")}
                    </button>
                  </div>

                  {avatarFeedback && (
                    <div
                      className={`w-full p-3 rounded-xl flex items-center gap-2 animate-in zoom-in-95 duration-300 ${
                        avatarFeedback.type === "success"
                          ? "bg-sol-accent/10 border border-sol-accent/20 text-sol-accent"
                          : "bg-sol-orange/10 border border-sol-orange/20 text-sol-orange"
                      }`}
                    >
                      {avatarFeedback.type === "success" ? (
                        <CheckCircle2 size={14} className="shrink-0" />
                      ) : (
                        <AlertCircle size={14} className="shrink-0" />
                      )}
                      <p className="text-[11px] font-bold">{avatarFeedback.text}</p>
                    </div>
                  )}
                </div>

                {/* Right side: Username details */}
                <form onSubmit={handleUsernameSubmit} className="md:col-span-7 space-y-5 h-full flex flex-col justify-between w-full">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-sol-muted px-1 flex items-center gap-2">
                        <AtSign size={14} className="text-sol-accent" />
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
                  </div>

                  <button
                    type="submit"
                    disabled={usernameLoading}
                    className="w-full bg-sol-accent text-sol-bg font-black py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all duration-300 shadow-lg shadow-sol-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:cursor-pointer mt-4"
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
            </div>
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
