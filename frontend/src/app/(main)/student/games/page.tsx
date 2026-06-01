"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { gameService, GameChallenge, PersonalGameLists } from "@/services/gameService";
import ProtectedRoute from "@/components/guard/ProtectedRoute";
import { 
  Gamepad2, 
  Zap, 
  Sword, 
  Layers, 
  BrainCircuit, 
  Trophy, 
  Copy, 
  Check, 
  ChevronRight, 
  Play,
  Archive,
  Clock
} from "lucide-react";
import Link from "next/link";

export default function GamesHubPage() {
  const t = useTranslations("Games");
  const tc = useTranslations("Common");

  const [available, setAvailable] = useState<any>({ grades: [], lessons: [] });
  const [leaderboard, setLeaderboard] = useState<any>({ speed: [], climb: [], match: [] });
  const [myGames, setMyGames] = useState<PersonalGameLists | null>(null);
  const [selectedGame, setSelectedGame] = useState<string>("speed");
  
  // Selected context (lesson OR grade)
  const [selectedContext, setSelectedContext] = useState<{ type: 'lesson' | 'grade'; id: string | number | null }>({
    type: 'grade',
    id: null
  });
  
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createdChallenge, setCreatedChallenge] = useState<GameChallenge | null>(null);
  const [copied, setCopied] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [archivingChallengeId, setArchivingChallengeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [availData, leadData, mineData] = await Promise.all([
          gameService.getAvailable(),
          gameService.getGlobalLeaderboard(),
          gameService.getMine()
        ]);
        setAvailable(availData);
        setLeaderboard(leadData);
        setMyGames(mineData);
        
        // Auto-select first grade as default if available
        if (availData.grades && availData.grades.length > 0) {
          setSelectedContext({ type: 'grade', id: availData.grades[0].id });
        } else if (availData.lessons && availData.lessons.length > 0) {
          setSelectedContext({ type: 'lesson', id: availData.lessons[0].id });
        }
      } catch (err) {
        console.error("Failed to load gaming hub data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const refreshMine = async () => {
    const mineData = await gameService.getMine();
    setMyGames(mineData);
  };

  const handleCreateChallenge = async () => {
    if (!selectedContext.id) return;
    setCreating(true);
    setCreatedChallenge(null);
    setCopied(false);
    setCreateError(null);
    
    try {
      const payload: any = { game_type: selectedGame };
      if (selectedContext.type === 'lesson') {
        payload.lesson_id = selectedContext.id as string;
      } else {
        payload.grade_id = Number(selectedContext.id);
      }

      const challenge = await gameService.createChallenge(payload);
      setCreatedChallenge(challenge);
      await refreshMine();

      // Save to local storage of active challenges
      const stored = localStorage.getItem("active-challenges") || "[]";
      const challenges = JSON.parse(stored);
      if (!challenges.includes(challenge.code)) {
        challenges.unshift(challenge.code);
        localStorage.setItem("active-challenges", JSON.stringify(challenges.slice(0, 10)));
      }
    } catch (err: any) {
      console.error("Failed to create challenge:", err);
      setCreateError(err.response?.data?.error || t("createError"));
    } finally {
      setCreating(false);
    }
  };

  const copyLink = () => {
    if (!createdChallenge) return;
    const url = `${window.location.origin}/student/games/challenge/${createdChallenge.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getGameLabel = (type: string) => {
    if (type === 'speed') return t("speedTitle");
    if (type === 'climb') return t("climbTitle");
    return t("matchTitle");
  };

  const getContextLabel = (item: { lesson?: { title_en: string; title_vi: string } | null; grade?: { title_en: string; title_vi: string } | null; }) => {
    return item.lesson?.title_en || item.grade?.title_en || "Global";
  };

  const handleArchiveChallenge = async (challengeId: string) => {
    if (archivingChallengeId) return;
    setArchivingChallengeId(challengeId);
    try {
      await gameService.archiveChallenge(challengeId);
      await refreshMine();
      if (createdChallenge?.id === challengeId) {
        setCreatedChallenge((current) => current ? { ...current, is_active: false } : current);
      }
    } catch (err) {
      console.error("Failed to archive challenge:", err);
    } finally {
      setArchivingChallengeId(null);
    }
  };

  const activeLimitReached = !!myGames && myGames.activeCreatedCount >= myGames.activeLimit;

  return (
    <ProtectedRoute requiredRole="student">
      <div className="space-y-10 animate-in fade-in duration-700">
        
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-sol-surface border border-sol-border/30 p-8 md:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sol-accent/15 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sol-orange/5 rounded-full -ml-32 -mb-32 blur-3xl" />
          
          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sol-accent/10 border border-sol-accent/20 text-sol-accent text-sm font-black uppercase tracking-wider">
              <Gamepad2 size={16} />
              {t("title")}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-sol-text tracking-tight">
              {t("title")}
            </h1>
            <p className="text-lg text-sol-muted font-medium">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-sol-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sol-muted font-black uppercase tracking-wider text-sm">{tc("syncingProfile")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col: Setup & Play */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Game Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    id: "speed",
                    title: t("speedTitle"),
                    desc: t("speedDesc"),
                    icon: <Zap size={24} className="text-sol-accent" />,
                    color: "group-hover:border-sol-accent/50"
                  },
                  {
                    id: "climb",
                    title: t("climbTitle"),
                    desc: t("climbDesc"),
                    icon: <Layers size={24} className="text-sol-blue" />,
                    color: "group-hover:border-sol-blue/50"
                  },
                  {
                    id: "match",
                    title: t("matchTitle"),
                    desc: t("matchDesc"),
                    icon: <BrainCircuit size={24} className="text-sol-orange" />,
                    color: "group-hover:border-sol-orange/50"
                  }
                ].map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game.id)}
                    className={`text-left rounded-3xl p-6 border transition-all duration-300 group flex flex-col justify-between h-64 relative overflow-hidden bg-sol-surface
                      ${selectedGame === game.id 
                        ? 'border-sol-accent shadow-xl shadow-sol-accent/5 scale-[1.02]' 
                        : 'border-sol-border/30 hover:bg-sol-bg'
                      }
                    `}
                  >
                    <div className="space-y-3">
                      <div className={`p-3 rounded-2xl w-fit bg-sol-bg border border-sol-border/30 group-hover:rotate-6 transition-transform duration-300`}>
                        {game.icon}
                      </div>
                      <h3 className="text-lg font-black text-sol-text tracking-tight">{game.title}</h3>
                      <p className="text-xs text-sol-muted font-bold leading-relaxed">{game.desc}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-sol-accent pt-4 mt-auto group-hover:translate-x-1 transition-transform">
                      {t("playNow")}
                      <ChevronRight size={14} />
                    </div>
                  </button>
                ))}
              </div>

              {/* Challenge Generation Panel */}
              <div className="bg-sol-surface border border-sol-border/30 rounded-[2.5rem] p-8 shadow-xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-sol-accent/5 rounded-full blur-3xl pointer-events-none" />
                
                <h2 className="text-2xl font-black text-sol-text tracking-tight flex items-center gap-2">
                  <Sword className="text-sol-accent" size={24} />
                  {t("createChallenge")}
                </h2>

                {myGames && (
                  <div className="rounded-2xl border border-sol-border/20 bg-sol-bg px-4 py-3 text-sm font-bold text-sol-muted">
                    {t("activeLimitStatus", { current: myGames.activeCreatedCount, max: myGames.activeLimit })}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Select Context Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-sol-muted">{t("selectArea")}</label>
                    <select
                      value={`${selectedContext.type}-${selectedContext.id}`}
                      onChange={(e) => {
                        const [type, id] = e.target.value.split('-');
                        setSelectedContext({
                          type: type as 'lesson' | 'grade',
                          id: type === 'grade' ? Number(id) : id
                        });
                      }}
                      className="w-full bg-sol-bg border border-sol-border/30 rounded-2xl p-4 text-sol-text font-bold text-sm focus:outline-none focus:border-sol-accent transition-colors cursor-pointer"
                    >
                      <optgroup label="Grades / Lớp">
                        {available.grades?.map((g: any) => (
                          <option key={`grade-${g.id}`} value={`grade-${g.id}`}>
                            {g.title_en} / {g.title_vi}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Lessons / Bài học">
                        {available.lessons?.map((l: any) => (
                          <option key={`lesson-${l.id}`} value={`lesson-${l.id}`}>
                            {l.title_en} / {l.title_vi}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col justify-end">
                    <button
                      onClick={handleCreateChallenge}
                      disabled={creating || !selectedContext.id || activeLimitReached}
                      className="px-6 py-4 bg-sol-accent text-sol-bg text-sm font-black uppercase tracking-wider rounded-2xl hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sol-accent/10"
                    >
                      {creating ? t("createBtn") + "..." : t("createBtn")}
                      <Play size={16} fill="currentColor" />
                    </button>
                  </div>
                </div>

                {createError && (
                  <div className="rounded-2xl border border-sol-red/20 bg-sol-red/5 px-4 py-3 text-sm font-bold text-sol-red">
                    {createError}
                  </div>
                )}

                {/* Challenge Result Screen */}
                {createdChallenge && (
                  <div className="mt-6 p-6 bg-sol-bg border border-sol-accent/20 rounded-3xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase text-sol-accent tracking-widest">Challenge Generated</p>
                        <h4 className="text-2xl font-black text-sol-text tracking-tight mt-1">{createdChallenge.code}</h4>
                        <p className="text-xs text-sol-muted font-bold mt-1">
                          {getGameLabel(createdChallenge.game_type)} ({createdChallenge.lesson?.title_en || createdChallenge.grade?.title_en})
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={copyLink}
                          className="px-4 py-2.5 bg-sol-surface border border-sol-border/30 rounded-xl hover:border-sol-accent hover:text-sol-accent transition-all text-xs font-black flex items-center gap-2"
                        >
                          {copied ? <Check size={14} className="text-sol-green" /> : <Copy size={14} />}
                          {copied ? t("linkCopied") : t("copyLink")}
                        </button>

                        <Link
                          href={`/student/games/play?challenge=${createdChallenge.code}`}
                          className="px-5 py-2.5 bg-sol-accent text-sol-bg text-xs font-black uppercase rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
                        >
                          {t("playNow")}
                          <Play size={10} fill="currentColor" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-sol-surface border border-sol-border/30 rounded-[2.5rem] p-8 shadow-xl space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-sol-text">{t("activeChallenges")}</h3>
                    <p className="text-sm font-bold text-sol-muted">
                      {myGames ? t("activeLimitStatus", { current: myGames.activeCreatedCount, max: myGames.activeLimit }) : ""}
                    </p>
                  </div>
                  <Link
                    href="/student"
                    className="text-xs font-black uppercase text-sol-accent hover:opacity-80 transition-opacity"
                  >
                    {t("backToHub")}
                  </Link>
                </div>

                <div className="space-y-4">
                  {!myGames || myGames.created.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-sol-border/30 bg-sol-bg/40 p-6 text-sm font-bold text-sol-muted">
                      {t("noAttempts")}
                    </div>
                  ) : myGames.created.map((game) => (
                    <div
                      key={game.id}
                      className="rounded-3xl border border-sol-border/20 bg-sol-bg/40 p-5 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-sol-text">{game.code}</span>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${game.is_active ? "bg-sol-green/10 text-sol-green" : "bg-sol-border/20 text-sol-muted"}`}>
                              {game.is_active ? "Active" : "Archived"}
                            </span>
                          </div>
                          <p className="text-sm font-black text-sol-text">{getGameLabel(game.game_type)}</p>
                          <p className="text-xs font-bold text-sol-muted">{getContextLabel(game)}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/student/games/challenge/${game.code}`}
                            className="px-4 py-2 rounded-xl bg-sol-surface border border-sol-border/20 text-xs font-black uppercase text-sol-text hover:border-sol-accent hover:text-sol-accent transition-all"
                          >
                            View
                          </Link>
                          {game.is_active && (
                            <button
                              type="button"
                              onClick={() => handleArchiveChallenge(game.id)}
                              disabled={archivingChallengeId === game.id}
                              className="px-4 py-2 rounded-xl bg-sol-surface border border-sol-border/20 text-xs font-black uppercase text-sol-muted hover:border-sol-orange hover:text-sol-orange transition-all disabled:opacity-50"
                            >
                              <span className="inline-flex items-center gap-2">
                                <Archive size={12} />
                                Archive
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs font-bold text-sol-muted">
                        <span>{game.attempt_count} attempts</span>
                        {game.best_attempt && (
                          <>
                            <span>Best {game.best_attempt.score}</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} />
                              {game.best_attempt.time_spent}s
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Col: Rankings & Duels */}
            <div className="space-y-8">
              
              {/* Global Leaderboard Sidepanel */}
              <div className="bg-sol-surface border border-sol-border/30 rounded-[2.5rem] p-8 shadow-xl space-y-6">
                <h3 className="text-xl font-black text-sol-text flex items-center gap-2">
                  <Trophy className="text-sol-orange" size={22} />
                  {t("globalRankings")}
                </h3>

                {/* Sub Tab selection for leaderboard */}
                <div className="grid grid-cols-3 gap-1 bg-sol-bg p-1 rounded-2xl border border-sol-border/20 text-xs font-black uppercase text-sol-muted">
                  {['speed', 'climb', 'match'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedGame(tab)}
                      className={`py-2 rounded-xl text-center transition-all
                        ${selectedGame === tab 
                          ? 'bg-sol-surface border border-sol-border/30 text-sol-accent font-black shadow-sm' 
                          : 'hover:text-sol-text'
                        }
                      `}
                    >
                      {tab === 'speed' ? 'Speed' : tab === 'climb' ? 'Tower' : 'Match'}
                    </button>
                  ))}
                </div>

                <div className="space-y-4 min-h-[300px]">
                  {(!leaderboard[selectedGame] || leaderboard[selectedGame].length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-sol-muted">
                      <Gamepad2 className="opacity-10 mb-2 animate-bounce duration-1000" size={32} />
                      <p className="text-xs font-bold">{t("noAttempts")}</p>
                    </div>
                  ) : (
                    leaderboard[selectedGame].map((attempt: any, index: number) => (
                      <div 
                        key={attempt.id} 
                        className="flex items-center justify-between p-3 rounded-2xl bg-sol-bg/50 border border-sol-border/20 hover:border-sol-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border
                            ${index === 0 ? 'bg-sol-orange/10 border-sol-orange/30 text-sol-orange' : 
                              index === 1 ? 'bg-sol-blue/10 border-sol-blue/30 text-sol-blue' : 
                              index === 2 ? 'bg-sol-green/10 border-sol-green/30 text-sol-green' : 
                              'bg-sol-border/10 border-sol-border/30 text-sol-muted'
                            }
                          `}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-black text-sol-text leading-tight">
                              {attempt.user?.username || attempt.guest_name || "Guest"}
                            </p>
                            <p className="text-[10px] text-sol-muted font-bold">
                              {attempt.challenge.lesson?.title_en || attempt.challenge.grade?.title_en || "Global"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-black text-sol-accent">
                            {selectedGame === 'climb' ? `Flr ${attempt.score}` : `${attempt.score} pts`}
                          </p>
                          <p className="text-[10px] text-sol-muted font-bold">
                            {attempt.time_spent}s
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
