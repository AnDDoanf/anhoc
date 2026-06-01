"use client";

import { useEffect, useMemo, useState, useRef, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { gameService, GameChallenge } from "@/services/gameService";
import {
  getChoiceOptions,
  normalizeQuestionType,
} from "@/utils/questionType";
import { 
  Zap, 
  Heart, 
  Flame, 
  Trophy, 
  Clock, 
  ChevronRight, 
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Rocket,
  Scale,
  CircleDot
} from "lucide-react";
import Link from "next/link";

// Import Modular Game Engine Components
import MemoryMatchGame from "./components/MemoryMatchGame";
import SpeedMathGame from "./components/SpeedMathGame";
import TowerClimbGame from "./components/TowerClimbGame";
import SpaceShooterGame from "./components/SpaceShooterGame";
import BalanceScaleGame from "./components/BalanceScaleGame";
import BubblePopperGame from "./components/BubblePopperGame";

const DEFAULT_SPEED_TIMER = 60;
const MAX_STANDARD_GAME_LIMIT_SECONDS = 60;
const DEFAULT_SHOOTER_FUEL = 100;

export default function GamePlayroomContainer() {
  const tc = useTranslations("Common");
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-sol-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sol-muted font-black uppercase tracking-wider text-sm">{tc("syncingProfile")}</p>
      </div>
    }>
      <GamePlayroomContent />
    </Suspense>
  );
}

function GamePlayroomContent() {
  const t = useTranslations("Games");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const code = searchParams.get("challenge")?.toUpperCase() || "";
  const requestedGuestMode = searchParams.get("guest") === "1";

  const [challenge, setChallenge] = useState<GameChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestProfile, setGuestProfile] = useState<{ name: string; token: string; completed?: boolean } | null>(null);

  // General Game States: 'countdown' | 'playing' | 'finished'
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'finished'>('countdown');
  const [countdown, setCountdown] = useState(3);
  
  // Gameplay variables
  const [currentScore, setCurrentScore] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [streak, setStreak] = useState(0);
  
  // HUD variables
  const [speedTimer, setSpeedTimer] = useState(DEFAULT_SPEED_TIMER);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; show: boolean } | null>(null);
  const [towerLives, setTowerLives] = useState(3);
  const [matchMoves, setMatchMoves] = useState(0);
  const [climbTimer, setClimbTimer] = useState(MAX_STANDARD_GAME_LIMIT_SECONDS);
  const [matchTimer, setMatchTimer] = useState(MAX_STANDARD_GAME_LIMIT_SECONDS);
  const [shooterFuel, setShooterFuel] = useState(DEFAULT_SHOOTER_FUEL);

  // Post Game variables
  const [submitting, setSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const gameTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);
  const guestStorageKey = `guest-game:${code}`;
  const isGuestMode = requestedGuestMode || !!guestProfile;

  const currentQuestion = challenge?.config.questions[currentQuestionIndex];
  const challengeContextTitle =
    locale === "vi"
      ? challenge?.lesson?.title_vi || challenge?.grade?.title_vi || challenge?.lesson?.title_en || challenge?.grade?.title_en
      : challenge?.lesson?.title_en || challenge?.grade?.title_en || challenge?.lesson?.title_vi || challenge?.grade?.title_vi;

  const choiceOptions = useMemo(() => {
    if (!currentQuestion) return [];
    return getChoiceOptions(currentQuestion, currentQuestion.generated_variables, locale);
  }, [currentQuestion, locale]);

  useEffect(() => {
    setTimeSpent(0);
    setCurrentScore(0);
    setStreak(0);
    setSpeedTimer(DEFAULT_SPEED_TIMER);
    setCurrentQuestionIndex(0);
    setTowerLives(3);
    setMatchMoves(0);
    setClimbTimer(MAX_STANDARD_GAME_LIMIT_SECONDS);
    setMatchTimer(MAX_STANDARD_GAME_LIMIT_SECONDS);
    setShooterFuel(DEFAULT_SHOOTER_FUEL);
    setFeedback(null);
    setAttemptResult(null);
    setSubmitting(false);
    setCopied(false);
    setGameState("countdown");
    setCountdown(3);
  }, [challenge?.id]);

  // Load Challenge
  useEffect(() => {
    if (!code) {
      setError(t("errors.noChallengeCode"));
      setLoading(false);
      return;
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(guestStorageKey);
      if (!stored) {
        if (requestedGuestMode) {
          setError(t("errors.guestProfileMissing"));
          setLoading(false);
          return;
        }
      } else {
        try {
          const parsed = JSON.parse(stored) as { name?: string; token?: string; completed?: boolean };
          if (parsed.name && parsed.token) {
            setGuestProfile({ name: parsed.name, token: parsed.token, completed: parsed.completed });
          } else if (requestedGuestMode) {
            setError(t("errors.guestProfileMissing"));
            setLoading(false);
            return;
          }
        } catch {
          if (requestedGuestMode) {
            setError(t("errors.guestProfileMissing"));
            setLoading(false);
            return;
          }
        }
      }
    }

    const fetchChallenge = async () => {
      try {
        const data = await gameService.getChallenge(code);
        if (data.is_active === false) {
          setError(t("errors.archivedGame"));
          return;
        }

        // Filter out non-choice questions (ordering, numeric) for interactive games
        if (data.game_type === 'shooter' || data.game_type === 'balance' || data.game_type === 'bubbles') {
          data.config.questions = data.config.questions.filter((q: any) => {
            const type = normalizeQuestionType(q.template_type);
            return type === 'multiple_choices' || type === 'theoretical_question' || type === 'true_false';
          });
        }

        if (data.config.questions.length === 0) {
          setError(t("errors.missingConfiguration"));
          return;
        }

        setChallenge(data);
      } catch (err: any) {
        console.error("Failed to load game playroom challenge:", err);
        setError(err.response?.data?.error || t("errors.loadChallenge"));
      } finally {
        setLoading(false);
      }
    };
    fetchChallenge();
  }, [code, requestedGuestMode, guestStorageKey, t]);

  // Handle Countdown timer before game starts
  useEffect(() => {
    if (gameState === 'countdown' && !loading && challenge) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            setGameState('playing');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownTimerRef.current);
  }, [gameState, loading, challenge]);

  useEffect(() => {
    if (challenge?.game_type === "climb") {
      setClimbTimer(MAX_STANDARD_GAME_LIMIT_SECONDS);
    }
  }, [challenge?.game_type, currentQuestionIndex]);

  const handleEndGame = useCallback(async (finalScoreOverride?: number) => {
    clearInterval(gameTimerRef.current);
    setGameState('finished');
    setSubmitting(true);

    if (!challenge) return;

    let finalScore = finalScoreOverride !== undefined ? finalScoreOverride : currentScore;
    if (challenge.game_type === 'climb') {
      finalScore = currentQuestionIndex; // Floors advanced represents score in tower climb
    }

    setCurrentScore(finalScore);

    try {
      const data = await gameService.submitAttempt({
        challenge_id: challenge.id,
        score: finalScore,
        time_spent: timeSpent,
        guest_name: guestProfile?.name,
        guest_token: guestProfile?.token
      });
      setAttemptResult(data);
      if (isGuestMode && typeof window !== "undefined") {
        localStorage.setItem(guestStorageKey, JSON.stringify({
          ...(guestProfile || {}),
          completed: true
        }));
      }
    } catch (err) {
      console.error("Failed to submit game attempt:", err);
      setError((err as any)?.response?.data?.error || t("errors.submitAttempt"));
    } finally {
      setSubmitting(false);
    }
  }, [challenge, currentQuestionIndex, currentScore, guestProfile, guestStorageKey, isGuestMode, t, timeSpent]);

  // Core gameplay clock timer
  useEffect(() => {
    if (gameState === 'playing' && challenge) {
      gameTimerRef.current = setInterval(() => {
        setTimeSpent((prev) => prev + 1);

        if (challenge.game_type === 'speed') {
          setSpeedTimer((prev) => {
            if (prev <= 1) {
              handleEndGame();
              return 0;
            }
            return prev - 1;
          });
        } else if (challenge.game_type === 'climb') {
          setClimbTimer((prev) => {
            if (prev <= 1) {
              handleEndGame();
              return 0;
            }
            return prev - 1;
          });
        } else if (challenge.game_type === 'match') {
          setMatchTimer((prev) => {
            if (prev <= 1) {
              handleEndGame();
              return 0;
            }
            return prev - 1;
          });
        } else if (challenge.game_type === 'shooter') {
          setShooterFuel((prev) => {
            if (prev <= 5) {
              handleEndGame();
              return 0;
            }
            return prev - 5;
          });
        }
      }, 1000);
    }
    return () => clearInterval(gameTimerRef.current);
  }, [gameState, challenge, handleEndGame]);

  // Answer submission handler for Speed Math, Tower Climb, Space Shooter, Balance, Bubbles
  const handleGameAnswer = (submittedAnswer: string) => {
    if (!challenge || !currentQuestion) return;

    const isCorrect = currentQuestion.right_answers.some(
      (ans) => ans.trim().toLowerCase() === submittedAnswer.trim().toLowerCase()
    );

    setFeedback({ isCorrect, show: true });
    setTimeout(() => setFeedback(null), 1000);

    if (isCorrect) {
      setCurrentScore((prev) => prev + 1);
      setStreak((prev) => prev + 1);
      
      if (challenge.game_type === 'speed') {
        setSpeedTimer((prev) => prev + 5);
      } else if (challenge.game_type === 'shooter') {
        setShooterFuel((prev) => Math.min(100, prev + 12));
      }

      // Next question or loop around
      if (
        challenge.game_type === 'speed' || 
        challenge.game_type === 'shooter' || 
        challenge.game_type === 'balance' || 
        challenge.game_type === 'bubbles'
      ) {
        const nextIndex = (currentQuestionIndex + 1) % challenge.config.questions.length;
        setCurrentQuestionIndex(nextIndex);
      } else {
        // Tower Climb progression
        if (currentQuestionIndex + 1 >= challenge.config.questions.length) {
          handleEndGame(currentScore + 1);
        } else {
          setCurrentQuestionIndex((prev) => prev + 1);
        }
      }
    } else {
      setStreak(0);
      
      if (
        challenge.game_type === 'speed' || 
        challenge.game_type === 'shooter' || 
        challenge.game_type === 'balance' || 
        challenge.game_type === 'bubbles'
      ) {
        if (challenge.game_type === 'speed') {
          setSpeedTimer((prev) => Math.max(0, prev - 3));
        } else if (challenge.game_type === 'shooter') {
          setShooterFuel((prev) => Math.max(0, prev - 18));
        }
        const nextIndex = (currentQuestionIndex + 1) % challenge.config.questions.length;
        setCurrentQuestionIndex(nextIndex);
      } else {
        // Tower Climb heart deduct
        const nextLives = towerLives - 1;
        setTowerLives(nextLives);
        if (nextLives <= 0) {
          handleEndGame();
        } else {
          const nextIndex = (currentQuestionIndex + 1) % challenge.config.questions.length;
          setCurrentQuestionIndex(nextIndex);
        }
      }
    }
  };

  const handleSkipQuestion = () => {
    if (!challenge) return;
    setStreak(0);
    const nextIndex = (currentQuestionIndex + 1) % challenge.config.questions.length;
    setCurrentQuestionIndex(nextIndex);
  };

  const copyLink = () => {
    if (!challenge) return;
    const url = `${window.location.origin}/student/games/challenge/${challenge.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const backHref = isGuestMode ? `/student/games/challenge/${code}` : "/student/games";

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in duration-500">
      
      {/* Playroom Header */}
      <div className="flex items-center justify-between border-b border-sol-border/20 pb-4">
        <Link 
          href={backHref} 
          className="inline-flex items-center gap-2 text-xs font-black uppercase text-sol-muted hover:text-sol-accent transition-colors"
        >
          <ArrowLeft size={14} />
          {t("backToHub")}
        </Link>

        {challenge && (
          <div className="flex items-center gap-2 text-xs font-black uppercase text-sol-muted">
            <span className="text-sol-accent">{challenge.code}</span>
            <span>·</span>
            <span>{challengeContextTitle}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-sol-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sol-muted font-black uppercase tracking-wider text-sm">{tc("syncingProfile")}</p>
        </div>
      ) : error || !challenge ? (
        <div className="bg-sol-surface border border-sol-red/20 rounded-[2rem] p-8 text-center space-y-4">
          <h3 className="text-xl font-black text-sol-text">{t("errors.launchTitle")}</h3>
          <p className="text-sol-muted font-bold text-sm">{error || t("errors.missingConfiguration")}</p>
          <Link 
            href={backHref}
            className="inline-block px-5 py-2.5 bg-sol-accent text-sol-bg text-xs font-black uppercase rounded-xl hover:opacity-90 transition-all"
          >
            {t("backToHub")}
          </Link>
        </div>
      ) : (
        <div>
          
          {/* Countdown Overlay */}
          {gameState === 'countdown' && (
            <div className="bg-sol-surface border border-sol-border/30 rounded-[2.5rem] p-16 text-center shadow-xl space-y-8 relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
              <div className="absolute top-0 right-0 w-80 h-80 bg-sol-accent/5 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-sol-accent">{t("getReady")}</p>
                <h2 className="text-lg font-black text-sol-muted uppercase tracking-wider">
                  {challenge.game_type === 'speed' 
                    ? t("speedTitle") 
                    : challenge.game_type === 'climb' 
                      ? t("climbTitle") 
                      : challenge.game_type === 'match'
                        ? t("matchTitle")
                        : challenge.game_type === 'shooter'
                          ? t("shooterTitle")
                          : challenge.game_type === 'balance'
                            ? t("balanceTitle")
                            : t("bubblesTitle")
                  }
                </h2>
              </div>
              
              <div className="w-32 h-32 rounded-full border-8 border-sol-accent/25 flex items-center justify-center animate-pulse-glow bg-sol-accent/5">
                <span className="text-6xl font-black text-sol-accent">{countdown}</span>
              </div>
            </div>
          )}

          {/* Gameplay Engine Area */}
          {gameState === 'playing' && (
            <div className="space-y-6">
              
              {/* HUD Display */}
              <div className="grid grid-cols-3 gap-6">
                {/* Left HUD: game details */}
                <div className="bg-sol-surface border border-sol-border/30 rounded-2xl p-4 flex items-center gap-3">
                  {challenge?.game_type === 'speed' ? (
                    <>
                      <Zap className="text-sol-accent" size={24} />
                      <div>
                        <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{t("timeLeft")}</p>
                        <p className="text-lg font-black text-sol-text">{speedTimer}s</p>
                      </div>
                    </>
                  ) : challenge?.game_type === 'climb' ? (
                    <>
                      <Clock className={`text-sol-accent ${climbTimer <= 15 ? "animate-pulse text-sol-red" : ""}`} size={24} />
                      <div key={towerLives} className={towerLives < 3 ? "animate-shake-heart" : ""}>
                        <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{t("towerTimer")}</p>
                        <p className="text-lg font-black text-sol-text">{climbTimer}s</p>
                      </div>
                    </>
                  ) : challenge?.game_type === 'match' ? (
                    <>
                      <Clock className={`text-sol-orange ${matchTimer <= 20 ? "animate-pulse text-sol-red" : ""}`} size={24} />
                      <div>
                        <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{t("memoryTimer")}</p>
                        <p className="text-lg font-black text-sol-text">{matchTimer}s</p>
                      </div>
                    </>
                  ) : challenge?.game_type === 'shooter' ? (
                    <>
                      <Rocket className="text-sol-accent" size={24} />
                      <div>
                        <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{t("fuel")}</p>
                        <p className={`text-lg font-black ${shooterFuel <= 25 ? "text-sol-red" : "text-sol-text"}`}>{Math.ceil(shooterFuel)}%</p>
                      </div>
                    </>
                  ) : challenge?.game_type === 'balance' ? (
                    <>
                      <Scale className="text-sol-accent" size={24} />
                      <div>
                        <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{t("score")}</p>
                        <p className="text-lg font-black text-sol-text">{currentScore}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <CircleDot className="text-sol-accent" size={24} />
                      <div>
                        <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{t("score")}</p>
                        <p className="text-lg font-black text-sol-text">{currentScore}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Middle HUD: Streak multiplier */}
                <div className="bg-sol-surface border border-sol-border/30 rounded-2xl p-4 flex items-center justify-center text-center">
                  {challenge?.game_type === 'climb' ? (
                    <div key={towerLives} className={towerLives < 3 ? "animate-shake-heart" : ""}>
                      <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{t("hearts")}</p>
                      <div className="flex gap-0.5 mt-1 justify-center">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Heart
                            key={i}
                            size={14}
                            className={`transition-all duration-500 ${i < towerLives ? 'text-sol-red fill-sol-red scale-100' : 'text-sol-border/30 scale-75 rotate-12'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : challenge?.game_type === 'match' ? (
                    <div>
                      <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{t("moves")}</p>
                      <p className="text-lg font-black text-sol-text">{matchMoves}</p>
                    </div>
                  ) : streak > 1 ? (
                    <div className="flex items-center gap-1.5 text-sol-orange animate-bounce animate-flame-pulse">
                      <Flame size={18} className="fill-sol-orange" />
                      <span className="text-sm font-black uppercase tracking-wider">{t("streakLabel", { count: streak })}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-black text-sol-muted uppercase tracking-widest">{t("keepItUp")}</span>
                  )}
                </div>

                {/* Right HUD: Time Spent / Score */}
                <div className="bg-sol-surface border border-sol-border/30 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="text-sol-muted" size={16} />
                    <span className="text-xs font-bold text-sol-muted">{timeSpent}s</span>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">
                      {challenge?.game_type === 'climb' ? t("currentFloor") : t("score")}
                    </p>
                    <p className="text-lg font-black text-sol-accent">
                      {challenge?.game_type === 'climb' ? t("floorShort", { n: currentQuestionIndex + 1 }) : `${currentScore}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Specific Game Engine Card */}
              <div className={`bg-sol-surface border rounded-[2.5rem] p-8 shadow-xl min-h-[300px] relative overflow-hidden flex flex-col justify-between transition-all duration-300
                ${(challenge?.game_type === 'speed' && speedTimer <= 15) 
                  ? 'border-sol-red/60 animate-border-warning' 
                  : 'border-sol-border/30'
                }
              `}>
                <div className="absolute top-0 right-0 w-80 h-80 bg-sol-accent/5 rounded-full blur-3xl pointer-events-none" />
                
                {/* Wrapping Border Time Progress Bar (Speed Math only) */}
                {challenge?.game_type === 'speed' && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-[2.5rem] z-20" style={{ overflow: 'visible' }}>
                    <rect
                      x="0"
                      y="0"
                      width="100%"
                      height="100%"
                      rx="2.5rem"
                      fill="none"
                      stroke={speedTimer <= 15 ? '#dc322f' : 'var(--accent, #268bd2)'}
                      strokeWidth="4"
                      pathLength="100"
                      strokeDasharray="100"
                      strokeDashoffset={100 - Math.min(100, (speedTimer / 60) * 100)}
                      className={`transition-all duration-1000 ease-out ${
                        speedTimer <= 15 ? 'animate-pulse drop-shadow-[0_0_8px_#dc322f]' : ''
                      }`}
                    />
                  </svg>
                )}
                
                {/* Feedback overlay on check */}
                {feedback && (
                  <div className="absolute inset-0 bg-sol-surface/85 z-25 flex flex-col items-center justify-center animate-in fade-in duration-300">
                      {feedback.isCorrect ? (
                        <div className="flex flex-col items-center space-y-2 animate-bounce" style={{ color: "#859900" }}>
                          <CheckCircle2 size={64} style={{ color: "#859900" }} />
                          <span className="text-2xl font-black uppercase tracking-wider" style={{ color: "#859900" }}>{t("correctFeedback")}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-2 text-sol-red animate-shake">
                          <XCircle size={64} />
                          <span className="text-2xl font-black uppercase tracking-wider text-sol-red">{t("incorrectFeedback")}</span>
                        </div>
                      )}
                  </div>
                )}

                {/* Engine Mounting Switch */}
                {challenge?.game_type === 'match' ? (
                  <MemoryMatchGame 
                    challenge={challenge!} 
                    timeSpent={timeSpent} 
                    onEndGame={handleEndGame} 
                    onMove={() => setMatchMoves((prev) => prev + 1)} 
                  />
                ) : challenge?.game_type === 'speed' ? (
                  <SpeedMathGame 
                    question={currentQuestion} 
                    questionIndex={currentQuestionIndex} 
                    choiceOptions={choiceOptions} 
                    onSubmitAnswer={handleGameAnswer} 
                    feedback={feedback} 
                  />
                ) : challenge?.game_type === 'climb' ? (
                  <TowerClimbGame 
                    question={currentQuestion} 
                    questionIndex={currentQuestionIndex} 
                    choiceOptions={choiceOptions} 
                    onSubmitAnswer={handleGameAnswer} 
                    feedback={feedback} 
                  />
                ) : challenge?.game_type === 'shooter' ? (
                  <SpaceShooterGame 
                    question={currentQuestion} 
                    choiceOptions={choiceOptions} 
                    onSubmitAnswer={handleGameAnswer} 
                    feedback={feedback} 
                    onEndGame={handleEndGame}
                    questionIndex={currentQuestionIndex}
                    fuel={shooterFuel}
                  />
                ) : challenge?.game_type === 'balance' ? (
                  <BalanceScaleGame 
                    question={currentQuestion} 
                    choiceOptions={choiceOptions} 
                    onSubmitAnswer={handleGameAnswer} 
                    feedback={feedback} 
                    onEndGame={handleEndGame}
                    questionIndex={currentQuestionIndex}
                  />
                ) : challenge?.game_type === 'bubbles' ? (
                  <BubblePopperGame 
                    question={currentQuestion} 
                    choiceOptions={choiceOptions} 
                    onSubmitAnswer={handleGameAnswer} 
                    feedback={feedback} 
                    onSkipQuestion={handleSkipQuestion} 
                    questionIndex={currentQuestionIndex}
                  />
                ) : null}

                {/* End game manual trigger */}
                <div className="flex justify-end pt-4 mt-auto border-t border-sol-border/10">
                  <button
                    onClick={() => handleEndGame()}
                    className="px-4 py-2 bg-sol-bg border border-sol-border/30 rounded-xl hover:border-sol-red hover:text-sol-red transition-all text-xs font-black uppercase tracking-wider"
                  >
                    {t("quitGame")}
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* Post-Game Victory Screen */}
          {gameState === 'finished' && (
            <div className="bg-sol-surface border border-sol-border/30 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 relative overflow-hidden text-center max-w-2xl mx-auto">
              <div className="absolute top-0 right-0 w-80 h-80 bg-sol-accent/5 rounded-full blur-3xl pointer-events-none" />
              
              {/* Header Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sol-orange/10 border border-sol-orange/20 text-sol-orange text-xs font-black uppercase tracking-wider">
                <Trophy size={14} className="fill-sol-orange" />
                {t("gameOver")}
              </div>

              <h1 className="text-4xl font-black text-sol-text tracking-tight mt-2">
                {challenge?.game_type === 'climb' ? t("towerCompleted") : t("gameFinishedTitle")}
              </h1>

              {/* Score details */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-4">
                <div className="bg-sol-bg/50 border border-sol-border/30 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">
                    {challenge?.game_type === 'climb' ? t("floorReached") : t("score")}
                  </p>
                  <p className="text-2xl font-black text-sol-accent mt-1">
                    {challenge?.game_type === 'climb' ? `${currentQuestionIndex}` : `${currentScore}`}
                  </p>
                </div>
                <div className="bg-sol-bg/50 border border-sol-border/30 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{t("timeSpent")}</p>
                  <p className="text-2xl font-black text-sol-text mt-1">{timeSpent}s</p>
                </div>
              </div>

              {/* XP Submission Outcome */}
              {submitting ? (
                <div className="flex flex-col items-center justify-center space-y-2 py-4">
                  <div className="w-8 h-8 border-3 border-sol-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-sol-muted">{t("submittingResults")}</p>
                </div>
              ) : attemptResult ? (
                <div className="bg-sol-accent/5 border border-sol-accent/20 rounded-3xl p-6 max-w-md mx-auto space-y-2 animate-in fade-in duration-500">
                  <div className="flex items-center justify-center gap-2 text-sol-accent font-black">
                    <Sparkles size={18} />
                    <span className="text-lg">{t("xpAwarded", { xp: attemptResult.xpEarned })}</span>
                  </div>
                  <p className="text-xs text-sol-muted font-bold">
                    {attemptResult.isGuest ? t("guestResultSaved") : t("playerResultSaved")}
                  </p>
                </div>
              ) : null}

              {/* Bottom Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 max-w-md mx-auto">
                <button
                  onClick={copyLink}
                  className="w-full py-3.5 bg-sol-bg border border-sol-border/30 rounded-xl hover:border-sol-accent hover:text-sol-accent transition-all text-xs font-black uppercase flex items-center justify-center gap-2"
                >
                  {copied ? <Check size={14} className="text-sol-green" /> : <Copy size={14} />}
                  {copied ? t("linkCopied") : t("copyLink")}
                </button>

                <Link
                  href={backHref}
                  className="w-full py-3.5 bg-sol-accent text-sol-bg rounded-xl hover:opacity-90 active:scale-95 transition-all text-xs font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-sol-accent/15"
                >
                  {t("backToHub")}
                  <ChevronRight size={14} />
                </Link>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
