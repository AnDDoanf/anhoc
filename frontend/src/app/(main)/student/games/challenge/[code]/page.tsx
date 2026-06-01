"use client";

import { useEffect, useState, use } from "react";
import { useTranslations } from "next-intl";
import { gameService, GameChallenge } from "@/services/gameService";
import { authService } from "@/services/auth";
import { 
  Gamepad2, 
  Sword, 
  Trophy, 
  Play, 
  User, 
  Clock, 
  ArrowLeft 
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default function ChallengeInvitePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const code = resolvedParams.code.toUpperCase();
  const t = useTranslations("Games");
  const tc = useTranslations("Common");

  const [challenge, setChallenge] = useState<GameChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [guestAlreadyJoined, setGuestAlreadyJoined] = useState(false);

  const guestStorageKey = `guest-game:${code}`;

  const clearClientAuth = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
  };

  useEffect(() => {
    const initializeAccessState = async () => {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("token");
      if (token) {
        try {
          await authService.getProfile();
          setIsAuthed(true);
        } catch {
          clearClientAuth();
          setIsAuthed(false);
        }
      } else {
        setIsAuthed(false);
      }

      const stored = localStorage.getItem(guestStorageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { name?: string; completed?: boolean };
          setGuestName(parsed.name || "");
          setGuestAlreadyJoined(Boolean(parsed.completed));
        } catch {
          localStorage.removeItem(guestStorageKey);
        }
      }
    };

    initializeAccessState();
  }, [guestStorageKey]);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const data = await gameService.getChallenge(code);
        setChallenge(data);
      } catch (err: any) {
        console.error("Failed to load challenge invite:", err);
        setError(err.response?.data?.error || "Failed to load challenge invitation");
      } finally {
        setLoading(false);
      }
    };
    fetchChallenge();
  }, [code]);

  const getGameLabel = (type: string) => {
    if (type === 'speed') return t("speedTitle");
    if (type === 'climb') return t("climbTitle");
    return t("matchTitle");
  };

  const getCreatorBestAttempt = () => {
    if (!challenge) return null;
    const creatorAttempts = challenge.attempts.filter(
      (a) => a.user_id === challenge.created_by
    );
    return creatorAttempts[0] || null;
  };

  const creatorBest = getCreatorBestAttempt();
  const isArchived = challenge?.is_active === false;

  const acceptHref = isAuthed
    ? `/student/games/play?challenge=${challenge?.code || code}`
    : `/student/games/play?challenge=${challenge?.code || code}&guest=1`;

  const handleGuestAccept = () => {
    const trimmedName = guestName.trim();
    if (!trimmedName) return;
    const current = localStorage.getItem(guestStorageKey);
    let token = "";
    if (current) {
      try {
        token = JSON.parse(current)?.token || "";
      } catch {
        token = "";
      }
    }
    const nextToken = token || crypto.randomUUID();
    localStorage.setItem(guestStorageKey, JSON.stringify({
      name: trimmedName,
      token: nextToken,
      completed: false
    }));
    window.location.href = `/student/games/play?challenge=${challenge?.code || code}&guest=1`;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in duration-500">
        
        {/* Back Link */}
        <Link 
          href={isAuthed ? "/student/games" : "/"} 
          className="inline-flex items-center gap-2 text-xs font-black uppercase text-sol-muted hover:text-sol-accent transition-colors"
        >
          <ArrowLeft size={14} />
          {t("backToHub")}
        </Link>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-sol-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sol-muted font-black uppercase tracking-wider text-sm">{tc("syncingProfile")}</p>
          </div>
        ) : error || !challenge ? (
          <div className="bg-sol-surface border border-sol-red/20 rounded-[2rem] p-8 text-center space-y-4">
            <h3 className="text-xl font-black text-sol-text">Error Loading Duel</h3>
            <p className="text-sol-muted font-bold text-sm">{error || "This challenge code is invalid or has expired."}</p>
            <Link 
              href={isAuthed ? "/student/games" : "/"}
              className="inline-block px-5 py-2.5 bg-sol-accent text-sol-bg text-xs font-black uppercase rounded-xl hover:opacity-90 transition-all"
            >
              {t("backToHub")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Duel Invite Card */}
            <div className="md:col-span-2 bg-sol-surface border border-sol-border/30 rounded-[2.5rem] p-8 md:p-10 shadow-xl space-y-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-sol-accent/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
              
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sol-orange/10 border border-sol-orange/20 text-sol-orange text-xs font-black uppercase tracking-wider">
                  <Sword size={14} />
                  {challenge.code}
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-black text-sol-text tracking-tight">
                    {t("inviteTitle")}
                  </h1>
                  <p className="text-sol-muted font-bold leading-relaxed text-sm">
                    {t("inviteSubtitle")}
                  </p>
                </div>

                {/* Challenge Details comparisons */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-sol-bg/50 border border-sol-border/30 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{t("gameType")}</p>
                    <p className="text-sm font-black text-sol-text mt-1">{getGameLabel(challenge.game_type)}</p>
                  </div>
                  <div className="bg-sol-bg/50 border border-sol-border/30 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{t("target")}</p>
                    <p className="text-sm font-black text-sol-text mt-1">
                      {challenge.lesson?.title_en || challenge.grade?.title_en}
                    </p>
                  </div>
                </div>

                {/* Creator Best Score Card */}
                {creatorBest && (
                  <div className="bg-sol-accent/5 border border-sol-accent/20 rounded-3xl p-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-sol-bg border border-sol-border/30 flex items-center justify-center text-sol-accent">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">Challenger</p>
                        <p className="text-sm font-black text-sol-text leading-tight mt-0.5">{challenge.creator.username}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xl font-black text-sol-accent">
                        {challenge.game_type === 'climb' ? `Flr ${creatorBest.score}` : `${creatorBest.score} pts`}
                      </p>
                      <p className="text-[10px] text-sol-muted font-bold flex items-center justify-end gap-1 mt-0.5">
                        <Clock size={10} />
                        {creatorBest.time_spent}s
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-8 space-y-4">
                {isArchived && (
                  <div className="rounded-2xl border border-sol-orange/20 bg-sol-orange/10 px-4 py-3 text-sm font-bold text-sol-orange">
                    This game has been archived. You can still view the leaderboard, but new plays are disabled.
                  </div>
                )}
                {isAuthed ? (
                  isArchived ? (
                    <div className="w-full py-4 bg-sol-border/20 text-sol-muted font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2">
                      Challenge Closed
                    </div>
                  ) : (
                    <Link
                      href={acceptHref}
                      className="w-full py-4 bg-sol-accent text-sol-bg font-black uppercase tracking-wider rounded-2xl hover:opacity-90 active:scale-95 shadow-lg shadow-sol-accent/15 flex items-center justify-center gap-2 transition-all"
                    >
                      {t("acceptChallenge")}
                      <Play size={14} fill="currentColor" />
                    </Link>
                  )
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-sol-muted">
                        {t("guestNameLabel")}
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder={t("guestNamePlaceholder")}
                        className="w-full rounded-2xl border border-sol-border/30 bg-sol-bg px-4 py-3 text-sol-text font-bold outline-none focus:border-sol-accent"
                      />
                      <p className="text-xs font-bold text-sol-muted">{t("guestOneAttemptNote")}</p>
                    </div>
                    {guestAlreadyJoined && (
                      <div className="rounded-2xl border border-sol-orange/20 bg-sol-orange/10 px-4 py-3 text-sm font-bold text-sol-orange">
                        {t("guestAlreadyJoined")}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={!guestName.trim() || guestAlreadyJoined || isArchived}
                      onClick={handleGuestAccept}
                      className="w-full py-4 bg-sol-accent text-sol-bg font-black uppercase tracking-wider rounded-2xl hover:opacity-90 active:scale-95 shadow-lg shadow-sol-accent/15 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                      {t("acceptChallenge")}
                      <Play size={14} fill="currentColor" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right Leaderboard Sidepanel */}
            <div className="bg-sol-surface border border-sol-border/30 rounded-[2.5rem] p-6 shadow-xl space-y-6">
              <h3 className="text-lg font-black text-sol-text flex items-center gap-2 border-b border-sol-border/20 pb-4">
                <Trophy className="text-sol-orange" size={20} />
                {t("leaderboard")}
              </h3>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {challenge.attempts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-sol-muted">
                    <Gamepad2 className="opacity-15 mb-2" size={32} />
                    <p className="text-xs font-bold leading-relaxed">{t("noAttempts")}</p>
                  </div>
                ) : (
                  challenge.attempts.map((attempt, index) => (
                    <div 
                      key={attempt.id} 
                      className="flex items-center justify-between p-3 rounded-2xl bg-sol-bg/50 border border-sol-border/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs border
                          ${index === 0 ? 'bg-sol-orange/10 border-sol-orange/30 text-sol-orange' : 
                            index === 1 ? 'bg-sol-blue/10 border-sol-blue/30 text-sol-blue' : 
                            index === 2 ? 'bg-sol-green/10 border-sol-green/30 text-sol-green' : 
                            'bg-sol-border/10 border-sol-border/30 text-sol-muted'
                          }
                        `}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-black text-sol-text leading-tight">{attempt.display_name || attempt.user?.username || attempt.guest_name || "Guest"}</p>
                          <p className="text-[9px] text-sol-muted font-bold mt-0.5">
                            {new Date(attempt.completed_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-sol-accent">
                          {challenge.game_type === 'climb' ? `Flr ${attempt.score}` : `${attempt.score} pts`}
                        </p>
                        <p className="text-[9px] text-sol-muted font-bold mt-0.5">
                          {attempt.time_spent}s
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
    </div>
  );
}
