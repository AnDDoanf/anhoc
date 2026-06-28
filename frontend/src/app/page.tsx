"use client";

import { useMemo } from "react";
import Image from "next/image";
import Logo from "@/components/ui/Logo";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  BrainCircuit,
  Flame,
  Gamepad2,
  GraduationCap,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import SettingBar from "@/components/layout/Settingbar";
import ScrollToTop from "@/components/ui/ScrollToTop";

type RoleTarget = {
  href: string;
  label: string;
};

type TrackVisual = {
  id: "learning" | "practice" | "games";
  accent: string;
  glow: string;
  badge: string;
};

export default function RootPage() {
  const t = useTranslations("Home");
  const { user, isAuthenticated } = useAuth();

  const roleTarget = useMemo<RoleTarget>(() => {
    if (user?.role === "admin") return { href: "/admin/dashboard", label: t("openWorkspace") };
    if (user?.role === "teacher") return { href: "/student/learning", label: t("openWorkspace") };
    return { href: "/student", label: t("openWorkspace") };
  }, [t, user?.role]);

  const primaryHref = isAuthenticated ? roleTarget.href : "/signup";
  const primaryLabel = isAuthenticated ? roleTarget.label : t("signUp");

  const heroBadges = [
    { icon: <Flame size={14} className="text-sol-orange" />, label: "7 Day Streak" },
    { icon: <Trophy size={14} className="text-sol-green" />, label: "XP +120" },
    { icon: <Users size={14} className="text-sol-cyan" />, label: "Friends Challenge" },
  ];

  const proofStats = [
    { value: "2024", label: t("stats.curriculum") },
    { value: "6", label: t("stats.gameModes") },
    { value: "100%", label: t("stats.progress") },
  ];

  const tracks = [
    {
      icon: <GraduationCap size={20} className="text-sol-accent" />,
      title: t("tracks.learning.title"),
      description: t("tracks.learning.description"),
      detail: t("highlights.progress.description"),
      visual: {
        id: "learning",
        accent: "text-sol-accent",
        glow: "bg-sol-accent/12",
        badge: "bg-sol-accent text-sol-bg",
      } satisfies TrackVisual,
    },
    {
      icon: <BrainCircuit size={20} className="text-sol-orange" />,
      title: t("tracks.practice.title"),
      description: t("tracks.practice.description"),
      detail: t("highlights.adaptive.description"),
      visual: {
        id: "practice",
        accent: "text-sol-orange",
        glow: "bg-sol-orange/12",
        badge: "bg-sol-orange text-sol-bg",
      } satisfies TrackVisual,
    },
    {
      icon: <Gamepad2 size={20} className="text-sol-red" />,
      title: t("tracks.games.title"),
      description: t("tracks.games.description"),
      detail: t("highlights.social.description"),
      visual: {
        id: "games",
        accent: "text-sol-red",
        glow: "bg-sol-red/12",
        badge: "bg-sol-red text-sol-bg",
      } satisfies TrackVisual,
    },
  ];

  const trustPoints = [
    {
      icon: <Sparkles size={18} className="text-sol-accent" />,
      title: t("highlights.adaptive.title"),
    },
    {
      icon: <Users size={18} className="text-sol-cyan" />,
      title: t("highlights.social.title"),
    },
    {
      icon: <ShieldCheck size={18} className="text-sol-green" />,
      title: t("highlights.system.title"),
    },
  ];

  return (
    <main id="home-scroll-root" className="h-screen snap-y snap-mandatory overflow-y-auto scroll-smooth bg-sol-bg text-sol-text">
      <div className="relative overflow-hidden">
        <SettingBar scrollContainerId="home-scroll-root" mobileAlignment="right" />
        <ScrollToTop containerId="home-scroll-root" />
        <div className="absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(circle_at_top_left,rgba(38,139,210,0.14),transparent_38%),radial-gradient(circle_at_top_right,rgba(220,50,47,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_72%)]" />
        <div className="absolute left-[-5rem] top-24 h-56 w-56 rounded-full bg-sol-accent/10 blur-3xl" />
        <div className="absolute right-[-4rem] top-32 h-72 w-72 rounded-full bg-sol-orange/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-3 pt-20 pb-4 sm:px-6 sm:py-8 md:px-10 lg:px-12">
          <header className="flex items-center justify-between gap-4 rounded-2xl sm:rounded-[1.9rem] border border-sol-border/20 bg-sol-surface/80 px-4 py-3 sm:px-5 sm:py-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <Logo className="h-11 w-auto" />
              <div>
                <p className="text-lg font-black tracking-tight text-sol-text">Anhoc</p>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sol-muted">{t("tagline")}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isAuthenticated ? (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sol-accent px-6 py-4 text-sm font-black uppercase tracking-wider text-sol-bg shadow-xl shadow-sol-accent/20 transition hover:opacity-90"
                >
                  {t("signIn")}
                </Link>
              ) : null}
            </div>

          </header>

          <section className="snap-start snap-always flex min-h-screen items-center pt-12 pb-6 sm:py-10 lg:py-14">
            <div className="w-full space-y-6 sm:space-y-8 text-center">
              <div className="mx-auto max-w-4xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-sol-accent/25 bg-sol-accent/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-sol-accent animate-pulse-glow sm:text-[11px]">
                  <Flame size={14} />
                  {t("heroBadge")}
                </div>

                <h1 className="mx-auto mt-6 max-w-[11ch] text-[clamp(3.2rem,8vw,5.3rem)] font-black leading-[0.88] tracking-[-0.06em] text-sol-text">
                  {t("headline")}
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-sm font-medium leading-7 text-sol-muted md:text-base">
                  {t("subheadline")}
                </p>

                <div className="mt-7 flex justify-center">
                  <Link
                    href={primaryHref}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sol-accent px-6 py-4 text-sm font-black uppercase tracking-wider text-sol-bg shadow-xl shadow-sol-accent/20 transition hover:opacity-90"
                  >
                    {primaryLabel}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl sm:rounded-[2.6rem] border border-sol-border/20 bg-sol-surface/82 p-3.5 sm:p-7 shadow-2xl backdrop-blur">
                <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] border border-sol-border/15 bg-sol-bg/70 px-4 py-6 sm:px-8 sm:py-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(38,139,210,0.12),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(181,137,0,0.10),transparent_30%)]" />
                  <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                    <div className="space-y-4 text-left">
                      <div className="flex flex-wrap gap-2">
                        {heroBadges.map((item, index) => (
                          <div
                            key={item.label}
                            className="animate-slide-in inline-flex items-center gap-2 rounded-full border border-sol-border/15 bg-sol-surface/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-sol-text"
                            style={{ animationDelay: `${index * 120}ms` }}
                          >
                            {item.icon}
                            {item.label}
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {proofStats.map((item, index) => (
                          <div
                            key={item.label}
                            className="animate-slide-in rounded-[1.4rem] border border-sol-border/15 bg-sol-surface/80 px-4 py-4"
                            style={{ animationDelay: `${index * 140}ms` }}
                          >
                            <p className="text-2xl font-black tracking-tight text-sol-text">{item.value}</p>
                            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-sol-muted">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="relative mx-auto h-[18rem] w-full max-w-md">
                      <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sol-accent/10 blur-2xl" />
                      <div className="absolute inset-x-10 bottom-3 h-10 rounded-full bg-sol-border/15 blur-xl" />

                      <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] border border-sol-accent/25 bg-sol-surface shadow-xl animate-float-target">
                        <Rocket size={40} className="text-sol-accent" />
                      </div>

                      <div className="absolute left-2 top-8 animate-slide-in rounded-[1.4rem] border border-sol-border/15 bg-sol-surface/90 px-4 py-3 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sol-muted">Lesson Path</p>
                        <div className="mt-2 flex gap-2">
                          <span className="h-3 w-8 rounded-full bg-sol-accent/25" />
                          <span className="h-3 w-8 rounded-full bg-sol-accent/50" />
                          <span className="h-3 w-8 rounded-full bg-sol-accent" />
                        </div>
                      </div>

                      <div className="absolute right-0 top-2 animate-float-target rounded-[1.4rem] border border-sol-border/15 bg-sol-surface/90 px-4 py-3 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sol-muted">Boss Challenge</p>
                        <p className="mt-2 text-lg font-black tracking-tight text-sol-text">4 / 5</p>
                      </div>

                      <div className="absolute bottom-10 left-0 animate-slide-in rounded-[1.4rem] border border-sol-border/15 bg-sol-surface/90 px-4 py-3 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sol-muted">Practice</p>
                        <p className="mt-2 text-lg font-black tracking-tight text-sol-text">12/12</p>
                      </div>

                      <div className="absolute bottom-0 right-4 animate-float-target rounded-[1.4rem] border border-sol-border/15 bg-sol-surface/90 px-4 py-3 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sol-muted">Leaderboard</p>
                        <p className="mt-2 text-lg font-black tracking-tight text-sol-text">#1</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="snap-start border-t border-sol-border/20 py-6 sm:py-8">
            <div className="grid gap-3 md:grid-cols-3">
              {trustPoints.map((item, index) => (
                <div
                  key={item.title}
                  className="animate-slide-in flex items-center gap-3 rounded-[1.6rem] border border-sol-border/15 bg-sol-surface/75 px-4 py-3 sm:px-5 sm:py-4 shadow-sm"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sol-border/20 bg-sol-bg/70">
                    {item.icon}
                  </div>
                  <p className="text-sm font-black uppercase tracking-[0.12em] text-sol-text">{item.title}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="snap-start space-y-5 border-t border-sol-border/20 py-6 sm:py-10">
            {tracks.map((track) => (
              <div
                key={track.title}
                className="grid gap-6 rounded-3xl sm:rounded-[2.4rem] border border-sol-border/20 bg-sol-surface/82 p-4 sm:p-6 shadow-xl backdrop-blur lg:grid-cols-[0.9fr_1.1fr] lg:items-center"
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-3 rounded-full border border-sol-border/15 bg-sol-bg/70 px-4 py-2">
                    {track.icon}
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-sol-text">{track.title}</span>
                  </div>
                  <h2 className="max-w-md text-3xl font-black tracking-tight text-sol-text">{track.title}</h2>
                  <p className="max-w-xl text-sm font-medium leading-7 text-sol-muted md:text-base">{track.description}</p>
                  <p className="max-w-xl text-sm font-medium leading-7 text-sol-muted/90">{track.detail}</p>
                </div>

                <div className="relative overflow-hidden rounded-[2rem] border border-sol-border/15 bg-sol-bg/70 p-5">
                  <div className={`absolute inset-0 ${track.visual.glow}`} />
                  {track.visual.id === "learning" ? (
                    <div className="relative grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="space-y-3 rounded-[1.6rem] border border-sol-border/15 bg-sol-surface/85 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sol-border/20 bg-sol-bg/70">
                            {track.icon}
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${track.visual.badge}`}>Path</span>
                        </div>
                        <div className="space-y-3">
                          {[88, 72, 56, 80].map((width) => (
                            <div key={width} className="flex items-center gap-3">
                              <span className="h-3 w-3 rounded-full bg-sol-accent" />
                              <div className="h-2 flex-1 rounded-full bg-sol-border/15">
                                <div className="h-full rounded-full bg-sol-accent" style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-3">
                        <div className="animate-slide-in rounded-[1.4rem] border border-sol-border/15 bg-sol-surface/85 p-4 shadow-sm">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sol-muted">Mastery</p>
                          <p className="mt-2 text-3xl font-black tracking-tight text-sol-text">82%</p>
                        </div>
                        <div className="animate-slide-in rounded-[1.4rem] border border-sol-border/15 bg-sol-surface/85 p-4 shadow-sm">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sol-muted">Lessons</p>
                          <div className="mt-3 grid grid-cols-4 gap-2">
                            {[0, 1, 2, 3, 4, 5, 6, 7].map((cell) => (
                              <span key={cell} className={`h-8 rounded-xl ${cell > 5 ? "bg-sol-accent/20" : "bg-sol-accent/70"}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {track.visual.id === "practice" ? (
                    <div className="relative space-y-4">
                      <div className="animate-slide-in rounded-[1.6rem] border border-sol-border/15 bg-sol-surface/85 p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sol-border/20 bg-sol-bg/70">
                            {track.icon}
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${track.visual.badge}`}>Check</span>
                        </div>
                        <div className="space-y-3">
                          <div className="h-12 rounded-2xl bg-sol-surface/70" />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="h-12 rounded-2xl bg-sol-surface/70" />
                            <div className="h-12 rounded-2xl bg-sol-orange/75" />
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {["Speed", "Review", "XP"].map((label, step) => (
                          <div
                            key={label}
                            className="animate-slide-in rounded-[1.4rem] border border-sol-border/15 bg-sol-surface/85 p-4 shadow-sm"
                            style={{ animationDelay: `${step * 100}ms` }}
                          >
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sol-muted">{label}</p>
                            <div className="mt-3 h-2 rounded-full bg-sol-border/15">
                              <div className="h-full rounded-full bg-sol-orange" style={{ width: `${65 + step * 12}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {track.visual.id === "games" ? (
                    <div className="relative grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                      <div className="grid gap-3">
                        <div className="animate-float-target rounded-[1.5rem] border border-sol-border/15 bg-sol-surface/90 p-4 shadow-sm">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sol-muted">Live Rank</p>
                          <p className="mt-2 text-3xl font-black tracking-tight text-sol-text">#1</p>
                        </div>
                        <div className="animate-slide-in rounded-[1.5rem] border border-sol-border/15 bg-sol-surface/90 p-4 shadow-sm">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sol-muted">Friends Online</p>
                          <div className="mt-3 flex -space-x-2">
                            {[0, 1, 2, 3].map((avatar) => (
                              <span key={avatar} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-sol-bg bg-sol-red/20 text-xs font-black text-sol-red">
                                {avatar + 1}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="animate-slide-in rounded-[1.6rem] border border-sol-border/15 bg-sol-surface/85 p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sol-border/20 bg-sol-bg/70">
                            {track.icon}
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${track.visual.badge}`}>Match</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[0, 1, 2, 3, 4, 5].map((card) => (
                            <div key={card} className="flex aspect-square items-center justify-center rounded-2xl border border-sol-border/15 bg-sol-bg/70">
                              <Rocket size={18} className={card % 2 === 0 ? "text-sol-red" : "text-sol-accent"} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </section>

          <section className="snap-start border-t border-sol-border/20 py-6 sm:py-10">
            <div className="rounded-3xl sm:rounded-[2.6rem] border border-sol-border/20 bg-sol-surface/85 px-4 py-6 sm:px-6 sm:py-8 text-center shadow-xl backdrop-blur">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-sol-accent">{t("platformTitle")}</p>
              <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black tracking-tight text-sol-text">{t("platformHeadline")}</h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-7 text-sol-muted md:text-base">
                {t("deliveryText")}
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              </div>
            </div>
          </section>

          <footer className="snap-start border-t border-sol-border/20 py-6 text-sm font-medium text-sol-muted md:flex md:flex-row md:items-center md:justify-between">
            <p>{t("footer")}</p>
            <p>{t("publicHome")}</p>
          </footer>
        </div>
      </div>
    </main>
  );
}
