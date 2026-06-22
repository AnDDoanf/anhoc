/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import LanguageToggle from "../ui/LanguageToggle";
import ThemeToggle from "../ui/ThemeToggle";
import { Settings, LogOut, LogIn, ChevronDown, UserCog, Bell, CheckCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AppNotification, notificationService } from "@/services/notificationService";
import { getBackendUrl } from "@/services/api";

export default function SettingBar() {
  const t = useTranslations("Settings");
  const locale = useLocale();
  const [activePanel, setActivePanel] = useState<"settings" | "notifications" | null>(null);
  const { user, logout } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [imageError, setImageError] = useState(false);
  const isGuest = !user;
  const roleLabel = user?.role || t("guestRole");
  const displayName = user?.username || user?.email?.split("@")[0] || t("guestName");
  const isSettingsOpen = activePanel === "settings";
  const isNotificationsOpen = activePanel === "notifications";

  useEffect(() => {
    setImageError(false);
  }, [user?.avatar_url]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActivePanel(null);
      }
    }

    if (activePanel) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activePanel]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setNotificationsLoading(true);
    try {
      const response = await notificationService.list({ page: 1, pageSize: 8 });
      setNotifications(response.items);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 45000);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications, user]);

  const formatNotificationTime = useCallback((value: string) => {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }, [locale]);

  const getSubjectLabel = useCallback((notification: AppNotification) => {
    const localizedTitle = locale === "vi"
      ? notification.payload?.subject_title_vi
      : notification.payload?.subject_title_en;
    return String(localizedTitle || notification.payload?.subject_slug || t("notifications.genericSubject"));
  }, [locale, t]);

  const getStatusLabel = useCallback((notification: AppNotification) => {
    const status = String(notification.payload?.status || "");
    if (status === "approved") return t("notifications.statusApproved");
    if (status === "rejected") return t("notifications.statusRejected");
    if (status === "reviewing") return t("notifications.statusReviewing");
    if (status === "resolved") return t("notifications.statusResolved");
    return status;
  }, [t]);

  const describeNotification = useCallback((notification: AppNotification) => {
    const actorName = notification.actor?.username || notification.actor?.email?.split("@")[0] || t("notifications.systemActor");
    const subjectLabel = getSubjectLabel(notification);

    switch (notification.type) {
      case "subject_access_requested":
        return {
          title: t("notifications.items.subjectAccessRequestedTitle"),
          body: t("notifications.items.subjectAccessRequestedBody", { actor: actorName, subject: subjectLabel }),
          href: "/admin/users#subject-access-requests",
        };
      case "subject_access_approved":
        return {
          title: t("notifications.items.subjectAccessApprovedTitle"),
          body: t("notifications.items.subjectAccessApprovedBody", { subject: subjectLabel }),
          href: "/student/learning",
        };
      case "subject_access_rejected":
        return {
          title: t("notifications.items.subjectAccessRejectedTitle"),
          body: t("notifications.items.subjectAccessRejectedBody", { subject: subjectLabel }),
          href: "/student/learning",
        };
      case "question_report_created":
        return {
          title: t("notifications.items.questionReportCreatedTitle"),
          body: t("notifications.items.questionReportCreatedBody", { actor: actorName }),
          href: "/admin/reports",
        };
      case "question_report_updated":
        return {
          title: t("notifications.items.questionReportUpdatedTitle"),
          body: t("notifications.items.questionReportUpdatedBody", { status: getStatusLabel(notification) }),
          href: "/admin/reports",
        };
      case "new_follower":
        return {
          title: t("notifications.items.newFollowerTitle"),
          body: t("notifications.items.newFollowerBody", { actor: actorName }),
          href: "/student",
        };
      default:
        return {
          title: t("notifications.defaultTitle"),
          body: t("notifications.defaultBody"),
          href: null,
        };
    }
  }, [getStatusLabel, getSubjectLabel, t]);

  const notificationCards = useMemo(
    () => notifications.map((notification) => ({
      notification,
      ...describeNotification(notification),
    })),
    [describeNotification, notifications]
  );

  const handleNotificationClick = useCallback(async (notification: AppNotification) => {
    if (!notification.read_at) {
      try {
        const updated = await notificationService.markRead(notification.id);
        setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }
    setActivePanel(null);
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAllRead(true);
    try {
      await notificationService.markAllRead();
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    } finally {
      setMarkingAllRead(false);
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`fixed top-4 right-6 z-50 transition-all duration-300 ${isVisible || activePanel ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}`}
    >
      <div className="relative flex flex-col items-end">
        <div className="flex items-center gap-3">
          {!isGuest && (
            <button
              type="button"
              onClick={() => setActivePanel(isNotificationsOpen ? null : "notifications")}
              className={`relative flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 shadow-sm hover:cursor-pointer ${
                isNotificationsOpen
                  ? "bg-sol-surface border-sol-accent shadow-lg ring-4 ring-sol-accent/5 text-sol-accent"
                  : "bg-sol-surface/80 backdrop-blur-md border-sol-border/30 text-sol-muted hover:border-sol-accent hover:text-sol-accent"
              }`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-sol-orange px-1.5 py-0.5 text-[10px] font-black leading-none text-sol-bg">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          )}

        <button
          onClick={() => setActivePanel(isSettingsOpen ? null : "settings")}
          className={`flex items-center gap-3 p-1.5 pr-3 hover:cursor-pointer rounded-full border transition-all duration-300 shadow-sm z-30 relative
            ${isSettingsOpen
              ? "bg-sol-surface border-sol-accent shadow-lg ring-4 ring-sol-accent/5"
              : "bg-sol-surface/80 backdrop-blur-md border-sol-border/30 hover:border-sol-accent"
            }`}
        >
          <div
            className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-colors duration-300
            ${isSettingsOpen
                ? "bg-sol-accent text-sol-bg"
                : "bg-sol-accent/10 text-sol-accent"
              }`}
          >
            {user?.avatar_url && !imageError ? (
              <img
                src={getBackendUrl(user.avatar_url)}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <UserCog size={18} />
            )}
          </div>

          <div className="flex flex-col items-start mr-1">
            <span
              className={`text-xs font-black uppercase tracking-tighter transition-colors ${isSettingsOpen ? "text-sol-accent" : "text-sol-muted"
                }`}
            >
              {roleLabel}
            </span>
            <span
              className={`text-sm font-bold transition-colors ${isSettingsOpen ? "text-sol-text" : "text-sol-text/80"
                }`}
            >
              {displayName}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`transition-transform duration-300 ${isSettingsOpen ? "rotate-180 text-sol-accent" : "text-sol-muted"
              }`}
          />
        </button>
        </div>

        {isNotificationsOpen && (
          <div className="absolute top-15 right-0 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-sol-accent/20 bg-sol-surface shadow-2xl z-20 origin-top-right animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-sol-border/10 px-4 py-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-sol-accent">{t("notifications.title")}</p>
                <p className="text-xs font-bold text-sol-muted">{t("notifications.subtitle", { count: unreadCount })}</p>
              </div>
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAllRead || unreadCount === 0}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black text-sol-accent disabled:opacity-50"
              >
                <CheckCheck size={14} />
                <span>{t("notifications.markAllRead")}</span>
              </button>
            </div>

            <div className="max-h-[28rem] overflow-y-auto p-3">
              {notificationsLoading ? (
                <p className="rounded-2xl bg-sol-bg/50 px-4 py-6 text-center text-sm font-bold text-sol-muted">
                  {t("notifications.loading")}
                </p>
              ) : notificationCards.length === 0 ? (
                <p className="rounded-2xl bg-sol-bg/50 px-4 py-6 text-center text-sm font-bold text-sol-muted">
                  {t("notifications.empty")}
                </p>
              ) : (
                <div className="space-y-2">
                  {notificationCards.map(({ notification, title, body, href }) => {
                    const cardClassName = `block rounded-2xl border px-4 py-3 text-left transition-colors ${
                      notification.read_at
                        ? "border-sol-border/10 bg-sol-bg/25"
                        : "border-sol-accent/20 bg-sol-accent/8"
                    }`;

                    const inner = (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-sol-text">{title}</p>
                            <p className="mt-1 text-sm leading-6 text-sol-muted">{body}</p>
                          </div>
                          {!notification.read_at && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sol-accent" />}
                        </div>
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-sol-muted">
                          {formatNotificationTime(notification.created_at)}
                        </p>
                      </>
                    );

                    if (href) {
                      return (
                        <Link
                          key={notification.id}
                          prefetch={false}
                          href={href}
                          className={cardClassName}
                          onClick={() => void handleNotificationClick(notification)}
                        >
                          {inner}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={notification.id}
                        type="button"
                        className={`${cardClassName} w-full hover:cursor-pointer`}
                        onClick={() => void handleNotificationClick(notification)}
                      >
                        {inner}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {isSettingsOpen && (
          <div className="absolute top-15 right-0 w-72 bg-sol-surface border border-sol-accent/20 rounded-2xl shadow-2xl z-20 origin-top-right animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-3 pt-0 flex flex-col gap-1">
              <div className="space-y-3 px-1 py-2">
                <div className="flex flex-col gap-1">
                  <LanguageToggle />
                </div>

                <div className="flex items-center justify-between px-3 py-1 bg-sol-bg/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-sol-text" >
                    <span className="opacity-70">{t("appearance")}</span>
                  </div>
                  <ThemeToggle />
                </div>
              </div>

              <div className="h-px bg-sol-border/10 my-1 mx-2" />

              <div className="space-y-1">
                {isGuest ? (
                  <>
                    <Link
                      prefetch={false}
                      href="/login"
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-sol-text transition-all hover:bg-sol-bg group/item"
                      onClick={() => setActivePanel(null)}
                    >
                      <LogIn
                        size={18}
                        className="text-sol-muted transition-colors group-hover/item:text-sol-accent"
                      />
                      <span className="flex-1 font-bold">{t("signIn")}</span>
                    </Link>

                    <Link
                      prefetch={false}
                      href="/signup"
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-sol-text transition-all hover:bg-sol-bg group/item"
                      onClick={() => setActivePanel(null)}
                    >
                      <UserCog
                        size={18}
                        className="text-sol-muted transition-colors group-hover/item:text-sol-accent"
                      />
                      <span className="flex-1 font-bold">{t("signUp")}</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      prefetch={false}
                      href="/student/settings"
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-sol-text transition-all hover:bg-sol-bg group/item"
                      onClick={() => setActivePanel(null)}
                    >
                      <Settings
                        size={18}
                        className="text-sol-muted transition-colors group-hover/item:text-sol-accent"
                      />
                      <span className="flex-1 font-bold">{t("userSettings")}</span>
                    </Link>

                    <button
                      onClick={logout}
                      className="group/logout flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-sol-orange transition-all hover:cursor-pointer hover:bg-sol-orange/10"
                    >
                      <LogOut
                        size={18}
                        className="transition-transform group-hover/logout:translate-x-1"
                      />
                      <span>{t("signOut")}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
