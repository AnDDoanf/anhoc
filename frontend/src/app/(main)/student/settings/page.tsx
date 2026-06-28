// frontend/src/app/(main)/student/settings/page.tsx
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL, getBackendUrl } from "@/services/api";
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

export type Feedback = { type: "success" | "error"; text: string } | null;

function SettingsPageContent() {
  const t = useTranslations("Settings");
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [oauthActionLoading, setOauthActionLoading] = useState<string | null>(null);
  const [oauthFeedback, setOauthFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(true);
  
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
    setLoading(true);
    authService.getProfile().then((profile) => {
      setUsername(profile.username ?? "");
      updateUser(profile);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [updateUser]);

  // Handle URL query feedback parameters
  useEffect(() => {
    const success = searchParams.get("success");
    const errorParam = searchParams.get("error");

    if (success === "linked") {
      setOauthFeedback({ type: "success", text: t("linkSuccess") || "Account linked successfully!" });
      router.replace("/student/settings");
    } else if (errorParam === "already_linked_to_other") {
      setOauthFeedback({ type: "error", text: t("alreadyLinked") || "This account is already linked to another user." });
      router.replace("/student/settings");
    } else if (errorParam === "oauth_error" || errorParam === "google_oauth_failed" || errorParam === "facebook_oauth_failed" || errorParam === "microsoft_oauth_failed") {
      setOauthFeedback({ type: "error", text: t("oauthError") || "An error occurred during social account verification." });
      router.replace("/student/settings");
    }
  }, [searchParams, router, t]);

  const handleLink = (provider: string) => {
    setOauthActionLoading(provider);
    const token = localStorage.getItem("token") || "";
    window.location.href = `${API_BASE_URL}/auth/${provider}?state=${token}&frontendUrl=${encodeURIComponent(window.location.origin)}`;
  };

  const handleUnlink = async (provider: string) => {
    setOauthActionLoading(provider);
    setOauthFeedback(null);
    try {
      await authService.unlinkProvider(provider);
      const latestProfile = await authService.getProfile();
      updateUser(latestProfile);
      setOauthFeedback({ type: "success", text: t("unlinkSuccess") || "Account unlinked successfully!" });
    } catch {
      setOauthFeedback({ type: "error", text: t("oauthError") || "An error occurred during social account verification." });
    } finally {
      setOauthActionLoading(null);
    }
  };

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
          {loading && (
            <div className="bg-sol-surface border border-sol-border/30 rounded-3xl p-8 shadow-xl space-y-8 animate-pulse">
              {/* Top part: Square + 2 lines */}
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-sol-border/20 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-sol-border/20 rounded-lg w-1/3" />
                  <div className="h-4 bg-sol-border/20 rounded-lg w-2/3" />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-sol-border/20" />

              {/* Bottom part: Circle + 2 rounded lines */}
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-sol-border/20 rounded-full shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-sol-border/20 rounded-full w-1/2" />
                  <div className="h-4 bg-sol-border/20 rounded-full w-3/4" />
                </div>
              </div>
            </div>
          )}

          {!loading && (
            <>
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
                        src={getBackendUrl(user.avatar_url)}
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

          {/* Linked Accounts feedback alerts */}
          {oauthFeedback && (
            <div
              className={`p-4 rounded-3xl flex items-center gap-3 animate-in zoom-in-95 duration-300 ${
                oauthFeedback.type === "success"
                  ? "bg-sol-accent/10 border border-sol-accent/20 text-sol-accent"
                  : "bg-sol-orange/10 border border-sol-orange/20 text-sol-orange"
              }`}
            >
              {oauthFeedback.type === "success" ? (
                <CheckCircle2 size={18} className="shrink-0" />
              ) : (
                <AlertCircle size={18} className="shrink-0" />
              )}
              <p className="text-sm font-bold">{oauthFeedback.text}</p>
            </div>
          )}

          {/* ── Linked Accounts Card ── */}
          <div className="bg-sol-surface border border-sol-border/30 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sol-accent/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-sol-accent/10 transition-colors duration-500" />
            
            <div className="space-y-6 relative z-10">
              <h2 className="text-lg font-black text-sol-text flex items-center gap-2">
                <ShieldCheck size={18} className="text-sol-accent" />
                {t("linkedAccounts") || "Linked Accounts"}
              </h2>
              <p className="text-xs text-sol-muted leading-relaxed">
                {t("linkedAccountsDesc") || "Manage your external logins and bind them to your account."}
              </p>

              <div className="space-y-4">
                {[
                  {
                    name: "Google",
                    provider: "google",
                    icon: (
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )
                  },
                  {
                    name: "Facebook",
                    provider: "facebook",
                    icon: (
                      <svg className="h-5 w-5 fill-[#1877F2] shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    )
                  },
                  {
                    name: "Microsoft Outlook",
                    provider: "microsoft",
                    icon: (
                      <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 23 23" width="23" height="23" xmlns="http://www.w3.org/2000/svg">
                        <rect x="0" y="0" width="11" height="11" fill="#F25022"/>
                        <rect x="12" y="0" width="11" height="11" fill="#7FBA00"/>
                        <rect x="0" y="12" width="11" height="11" fill="#00A1F1"/>
                        <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
                      </svg>
                    )
                  }
                ].map((social) => {
                  const isLinked = user?.oauth_accounts?.some(acc => acc.provider === social.provider);
                  return (
                    <div
                      key={social.provider}
                      className="flex items-center justify-between p-4 rounded-2xl border border-sol-border/20 bg-sol-bg/20 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-sol-surface border border-sol-border/30 p-2.5 rounded-xl shadow-sm">
                          {social.icon}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-sol-text">{social.name}</p>
                          <p className="text-xs text-sol-muted font-medium">
                            {isLinked ? t("connected") || "Connected" : t("notConnected") || "Not connected"}
                          </p>
                        </div>
                      </div>

                      {isLinked ? (
                        <button
                          type="button"
                          onClick={() => handleUnlink(social.provider)}
                          disabled={!!oauthActionLoading}
                          className="px-4 py-2 border border-sol-red/30 hover:border-sol-red bg-sol-red/5 hover:bg-sol-red/10 text-sol-red font-bold rounded-xl text-xs hover:cursor-pointer transition-all active:scale-[0.98] flex items-center gap-2"
                        >
                          {oauthActionLoading === social.provider ? (
                            <Loader2 className="animate-spin h-3.5 w-3.5" />
                          ) : (
                            t("unlinkAccount") || "Unlink"
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleLink(social.provider)}
                          disabled={!!oauthActionLoading}
                          className="px-4 py-2 border border-sol-accent/30 hover:border-sol-accent bg-sol-accent/5 hover:bg-sol-accent/10 text-sol-accent font-bold rounded-xl text-xs hover:cursor-pointer transition-all active:scale-[0.98] flex items-center gap-2"
                        >
                          {oauthActionLoading === social.provider ? (
                            <Loader2 className="animate-spin h-3.5 w-3.5" />
                          ) : (
                            t("linkAccount") || "Link"
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
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
            </>
          )}
        </div>

      </div>
    </ProtectedRoute>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-sol-bg">
        <Loader2 className="animate-spin text-sol-accent" size={32} />
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}
