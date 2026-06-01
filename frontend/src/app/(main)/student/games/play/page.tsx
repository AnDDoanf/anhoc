"use client";

import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { gameService, GameChallenge } from "@/services/gameService";
import { formatTemplate } from "@/utils/mathService";
import {
  getChoiceOptions,
  getOrderingItems,
  makeOrderingAnswer,
  normalizeQuestionType,
  type ChoiceOption,
} from "@/utils/questionType";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { 
  Gamepad2, 
  Zap, 
  Layers, 
  BrainCircuit, 
  Heart, 
  Flame, 
  Trophy, 
  Clock, 
  ChevronRight, 
  ArrowLeft,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Copy,
  Check
} from "lucide-react";
import Link from "next/link";

// Playroom main component wrapping in Suspense for search params
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
  
  // Specific Engine details
  // Speed Math
  const [speedTimer, setSpeedTimer] = useState(60);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState("");
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; show: boolean } | null>(null);
  const [orderedItems, setOrderedItems] = useState<ChoiceOption[]>([]);

  // Tower Climb
  const [towerLives, setTowerLives] = useState(3);
  
  // Card Memory Match
  const [cards, setCards] = useState<Array<{ id: number; content: string; type: 'formula' | 'value'; matched: boolean; flipped: boolean; val: number }>>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [matchMoves, setMatchMoves] = useState(0);

  // Post Game variables
  const [submitting, setSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const gameTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);
  const guestStorageKey = `guest-game:${code}`;
  const isGuestMode = requestedGuestMode || !!guestProfile;

  const currentQuestion = challenge?.config.questions[currentQuestionIndex];
  const questionType = normalizeQuestionType(currentQuestion?.template_type);
  const challengeContextTitle =
    locale === "vi"
      ? challenge?.lesson?.title_vi || challenge?.grade?.title_vi || challenge?.lesson?.title_en || challenge?.grade?.title_en
      : challenge?.lesson?.title_en || challenge?.grade?.title_en || challenge?.lesson?.title_vi || challenge?.grade?.title_vi;
  const currentQuestionBodyTemplate =
    locale === "vi"
      ? currentQuestion?.body_template_vi || currentQuestion?.body_template_en || ""
      : currentQuestion?.body_template_en || currentQuestion?.body_template_vi || "";
  const choiceOptions = useMemo(() => {
    if (!currentQuestion) return [];
    return getChoiceOptions(currentQuestion, currentQuestion.generated_variables, locale);
  }, [currentQuestion, locale]);
  const orderingItems = useMemo(() => {
    if (!currentQuestion) return [];
    return getOrderingItems(currentQuestion, currentQuestion.generated_variables, locale);
  }, [currentQuestion, locale]);
  const availableOrderingItems = orderingItems.filter(
    (item) => !orderedItems.some((ordered) => ordered.value === item.value)
  );
  const trueFalseOptions = [
    { label: t("trueOption"), value: "true" },
    { label: t("falseOption"), value: "false" },
  ];

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
            // If Card match, generate cards
            if (challenge.game_type === 'match') {
              setupMemoryMatchCards(challenge);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownTimerRef.current);
  }, [gameState, loading, challenge, locale]);

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
        }
      }, 1000);
    }
    return () => clearInterval(gameTimerRef.current);
  }, [gameState, challenge]);

  useEffect(() => {
    setAnswerInput("");
    setOrderedItems([]);
  }, [currentQuestionIndex, challenge?.id]);

  // Setup memory match cards
  const setupMemoryMatchCards = (challengeData: GameChallenge) => {
    const list = challengeData.config.questions.slice(0, 6); // Take 6 questions for 12 cards
    const formulaCards = list.map((q, idx) => {
      const bodyTemplate =
        locale === "vi"
          ? q.body_template_vi || q.body_template_en
          : q.body_template_en || q.body_template_vi;
      const displayFormula = bodyTemplate.replace(/\$|\$\{([^}]+)\}\$/g, "").trim();
      const val = parseFloat(q.right_answers[0]);
      return {
        id: idx * 2,
        content: displayFormula,
        type: 'formula' as const,
        matched: false,
        flipped: false,
        val
      };
    });
    
    const valueCards = list.map((q, idx) => {
      const val = parseFloat(q.right_answers[0]);
      return {
        id: idx * 2 + 1,
        content: q.right_answers[0],
        type: 'value' as const,
        matched: false,
        flipped: false,
        val
      };
    });

    const combined = [...formulaCards, ...valueCards].sort(() => 0.5 - Math.random());
    setCards(combined);
  };

  // Check answer for Speed Math or Tower Climb
  const handleSubmitAnswer = (e?: React.FormEvent, answerOverride?: string) => {
    if (e) e.preventDefault();
    if (!challenge || !currentQuestion) return;
    const submittedAnswer = (answerOverride ?? answerInput).trim();
    if (!submittedAnswer) return;

    const isCorrect = currentQuestion.right_answers.some(
      (ans) => ans.trim().toLowerCase() === submittedAnswer.toLowerCase()
    );

    setFeedback({ isCorrect, show: true });
    setTimeout(() => setFeedback(null), 1000);

    if (isCorrect) {
      setCurrentScore((prev) => prev + 1);
      setStreak((prev) => prev + 1);
      
      if (challenge.game_type === 'speed') {
        // Correct Speed: +5s
        setSpeedTimer((prev) => prev + 5);
      }

      // Next question or loop around in Speed Math
      if (challenge.game_type === 'speed') {
        const nextIndex = (currentQuestionIndex + 1) % challenge.config.questions.length;
        setCurrentQuestionIndex(nextIndex);
      } else {
        // Tower Climb progression
        if (currentQuestionIndex + 1 >= challenge.config.questions.length) {
          // Finished all questions! Winner
          handleEndGame(currentScore + 1);
        } else {
          setCurrentQuestionIndex((prev) => prev + 1);
        }
      }
    } else {
      setStreak(0);
      
      if (challenge.game_type === 'speed') {
        // Wrong Speed: -3s
        setSpeedTimer((prev) => Math.max(0, prev - 3));
        const nextIndex = (currentQuestionIndex + 1) % challenge.config.questions.length;
        setCurrentQuestionIndex(nextIndex);
      } else {
        // Tower Climb heart deduct
        const nextLives = towerLives - 1;
        setTowerLives(nextLives);
        if (nextLives <= 0) {
          handleEndGame();
        } else {
          // Advance question anyway to avoid getting stuck
          const nextIndex = (currentQuestionIndex + 1) % challenge.config.questions.length;
          setCurrentQuestionIndex(nextIndex);
        }
      }
    }

    setAnswerInput("");
    setOrderedItems([]);
  };

  const submitAnswerValue = (value: string) => {
    handleSubmitAnswer(undefined, value);
  };

  // Card click matching logic
  const handleCardClick = (id: number) => {
    if (selectedCards.length >= 2) return;
    
    const cardIdx = cards.findIndex(c => c.id === id);
    if (cards[cardIdx].matched || cards[cardIdx].flipped) return;

    const nextCards = [...cards];
    nextCards[cardIdx].flipped = true;
    setCards(nextCards);

    const nextSelected = [...selectedCards, id];
    setSelectedCards(nextSelected);

    if (nextSelected.length === 2) {
      setMatchMoves((prev) => prev + 1);
      const card1 = cards.find(c => c.id === nextSelected[0])!;
      const card2 = cards.find(c => c.id === nextSelected[1])!;

      if (card1.type !== card2.type && card1.val === card2.val) {
        // Match found!
        setTimeout(() => {
          const matchedCards = nextCards.map(c => {
            if (c.id === card1.id || c.id === card2.id) {
              return { ...c, matched: true, flipped: true };
            }
            return c;
          });
          setCards(matchedCards);
          setSelectedCards([]);

          const allMatched = matchedCards.every(c => c.matched);
          if (allMatched) {
            // Final score calculated as speed match points
            const calculatedScore = Math.max(10, Math.min(100, Math.floor((300 - timeSpent) * 0.3)));
            handleEndGame(calculatedScore);
          }
        }, 600);
      } else {
        // Match failed, flip back
        setTimeout(() => {
          const resetCards = nextCards.map(c => {
            if (c.id === card1.id || c.id === card2.id) {
              return { ...c, flipped: false };
            }
            return c;
          });
          setCards(resetCards);
          setSelectedCards([]);
        }, 1000);
      }
    }
  };

  // End gameplay, submit attempt, and award XP
  const handleEndGame = async (finalScoreOverride?: number) => {
    clearInterval(gameTimerRef.current);
    setGameState('finished');
    setSubmitting(true);

    if (!challenge) return;

    let finalScore = finalScoreOverride !== undefined ? finalScoreOverride : currentScore;
    if (challenge.game_type === 'climb') {
      finalScore = currentQuestionIndex; // Floors advanced represents score in tower climb
    }

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
  };

  const copyLink = () => {
    if (!challenge) return;
    const url = `${window.location.origin}/student/games/challenge/${challenge.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectOrderingItem = (item: ChoiceOption) => {
    setOrderedItems((prev) => [...prev, item]);
  };

  const removeOrderingItem = (item: ChoiceOption) => {
    setOrderedItems((prev) => prev.filter((ordered) => ordered.value !== item.value));
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
                    {challenge.game_type === 'speed' ? t("speedTitle") : challenge.game_type === 'climb' ? t("climbTitle") : t("matchTitle")}
                  </h2>
                </div>
                
                <div className="w-32 h-32 rounded-full border-8 border-sol-accent/20 flex items-center justify-center animate-bounce">
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
                    {challenge.game_type === 'speed' ? (
                      <>
                        <Zap className="text-sol-accent" size={24} />
                        <div>
                          <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{t("timeLeft")}</p>
                          <p className="text-lg font-black text-sol-text">{speedTimer}s</p>
                        </div>
                      </>
                    ) : challenge.game_type === 'climb' ? (
                      <>
                        <Heart className="text-sol-red fill-sol-red animate-pulse" size={24} />
                        <div>
                          <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{t("hearts")}</p>
                          <div className="flex gap-0.5 mt-0.5">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <Heart 
                                key={i} 
                                size={14} 
                                className={i < towerLives ? 'text-sol-red fill-sol-red' : 'text-sol-border/50'} 
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="text-sol-orange" size={24} />
                        <div>
                          <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">{t("moves")}</p>
                          <p className="text-lg font-black text-sol-text">{matchMoves}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Middle HUD: Streak multiplier */}
                  <div className="bg-sol-surface border border-sol-border/30 rounded-2xl p-4 flex items-center justify-center text-center">
                    {streak > 1 ? (
                      <div className="flex items-center gap-1.5 text-sol-orange animate-bounce">
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
                        {challenge.game_type === 'climb' ? t("currentFloor") : t("score")}
                      </p>
                      <p className="text-lg font-black text-sol-accent">
                        {challenge.game_type === 'climb' ? t("floorShort", { n: currentQuestionIndex + 1 }) : `${currentScore}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Specific Game Engine Card */}
                <div className="bg-sol-surface border border-sol-border/30 rounded-[2.5rem] p-8 shadow-xl min-h-[300px] relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-sol-accent/5 rounded-full blur-3xl pointer-events-none" />
                  
                  {/* Feedback overlay on check */}
                  {feedback && (
                    <div className="absolute inset-0 bg-sol-surface/85 z-20 flex flex-col items-center justify-center animate-in fade-in duration-300">
                      {feedback.isCorrect ? (
                        <div className="flex flex-col items-center space-y-2 text-sol-green animate-bounce">
                          <CheckCircle2 size={64} />
                          <span className="text-2xl font-black uppercase tracking-wider">{t("correctFeedback")}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-2 text-sol-red animate-shake">
                          <XCircle size={64} />
                          <span className="text-2xl font-black uppercase tracking-wider">{t("incorrectFeedback")}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Engine mounting */}
                  {challenge.game_type === 'match' ? (
                    /* ------------------ FORMULA CARD MATCH ------------------ */
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 py-4 z-10">
                      {cards.map((card) => (
                        <button
                          key={card.id}
                          onClick={() => handleCardClick(card.id)}
                          disabled={card.matched || card.flipped}
                          className={`h-24 sm:h-28 rounded-2xl border flex items-center justify-center text-center p-3 transition-all duration-300 transform font-black select-none
                            ${card.matched 
                              ? 'bg-sol-green/10 border-sol-green/30 text-sol-green scale-95 opacity-60 shadow-inner' 
                              : card.flipped
                                ? 'bg-sol-accent/10 border-sol-accent text-sol-accent rotate-y-180 scale-102 shadow-md shadow-sol-accent/5'
                                : 'bg-sol-bg border-sol-border/30 hover:border-sol-accent/30 hover:scale-102 cursor-pointer'
                            }
                          `}
                        >
                          {card.flipped || card.matched ? (
                            <span className="text-xs sm:text-sm tracking-tight break-all font-black">
                              {card.content}
                            </span>
                          ) : (
                            <Gamepad2 className="text-sol-muted opacity-30 group-hover:opacity-60" size={24} />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    /* ------------------ SPEED MATH & TOWER CLIMB ------------------ */
                    <div className="space-y-8 py-4 z-10 flex flex-col justify-between h-full flex-1">
                      {/* Question Presentation */}
                      <div className="text-center space-y-3 py-6">
                        <p className="text-xs font-black uppercase text-sol-accent tracking-widest">
                          {challenge.game_type === 'climb' ? t("towerClimbFloor", { n: currentQuestionIndex + 1 }) : t("solveNow")}
                        </p>
                        <div className="prose mx-auto max-w-xl prose-p:my-0 prose-p:text-3xl prose-p:font-black prose-p:leading-tight prose-p:text-sol-text sm:prose-p:text-4xl prose-strong:text-sol-accent">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {formatTemplate(
                              currentQuestionBodyTemplate,
                              challenge.config.questions[currentQuestionIndex].generated_variables
                            )}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {/* User input Form */}
                      <div className="max-w-md mx-auto w-full">
                        {questionType === "true_false" && (
                          <div className="grid grid-cols-2 gap-3">
                            {trueFalseOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => submitAnswerValue(option.value)}
                                className="px-6 py-4 bg-sol-bg border border-sol-border/20 rounded-2xl text-sol-text font-black hover:border-sol-accent hover:text-sol-accent transition-all"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {(questionType === "multiple_choices" || questionType === "theoretical_question") && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {choiceOptions.map((option, index) => (
                              <button
                                key={`${option.label}-${option.value}-${index}`}
                                type="button"
                                onClick={() => submitAnswerValue(option.value)}
                                className="px-6 py-4 bg-sol-bg border border-sol-border/20 rounded-2xl text-left text-sol-text font-bold hover:border-sol-accent hover:text-sol-accent transition-all"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {questionType === "ordering" && (
                          <div className="space-y-4">
                            <div className="min-h-16 p-4 bg-sol-bg border border-sol-border/20 rounded-2xl flex flex-wrap gap-2">
                              {orderedItems.length === 0 ? (
                                <span className="text-sol-muted text-sm">{t("selectItemsInOrder")}</span>
                              ) : orderedItems.map((item) => (
                                <button
                                  key={`ordered-${item.value}`}
                                  type="button"
                                  onClick={() => removeOrderingItem(item)}
                                  className="px-3 py-2 rounded-xl bg-sol-surface border border-sol-border/20 text-sol-text font-bold"
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {availableOrderingItems.map((item) => (
                                <button
                                  key={`available-${item.value}`}
                                  type="button"
                                  onClick={() => selectOrderingItem(item)}
                                  className="px-4 py-2 bg-sol-bg border border-sol-border/20 rounded-xl text-sol-text font-bold hover:border-sol-accent hover:text-sol-accent transition-all"
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              disabled={orderedItems.length === 0 || availableOrderingItems.length > 0}
                              onClick={() => submitAnswerValue(makeOrderingAnswer(orderedItems))}
                              className="w-full px-6 py-4 bg-sol-accent text-sol-bg rounded-2xl font-black disabled:opacity-50"
                            >
                              {t("check")}
                            </button>
                          </div>
                        )}

                        {questionType === "numeric_input" && (
                          <form onSubmit={handleSubmitAnswer} className="w-full flex items-center gap-3">
                            <input
                              type="text"
                              pattern="[0-9.-]*"
                              inputMode="decimal"
                              autoFocus
                              value={answerInput}
                              onChange={(e) => setAnswerInput(e.target.value)}
                              placeholder={t("numericAnswerPlaceholder")}
                              className="flex-1 bg-sol-bg border border-sol-border/30 rounded-2xl p-4 text-center text-lg font-black text-sol-text focus:outline-none focus:border-sol-accent transition-colors"
                            />
                            <button
                              type="submit"
                              disabled={!answerInput.trim()}
                              className="px-6 py-4 bg-sol-accent text-sol-bg rounded-2xl font-black uppercase text-sm tracking-wider hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-1 shadow-lg shadow-sol-accent/10"
                            >
                              {t("check")}
                              <ChevronRight size={16} />
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  )}

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
                  {challenge.game_type === 'climb' ? t("towerCompleted") : t("gameFinishedTitle")}
                </h1>

                {/* Score details */}
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-4">
                  <div className="bg-sol-bg/50 border border-sol-border/30 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black uppercase text-sol-muted tracking-wider">
                      {challenge.game_type === 'climb' ? t("floorReached") : t("score")}
                    </p>
                    <p className="text-2xl font-black text-sol-accent mt-1">
                      {challenge.game_type === 'climb' ? `${currentQuestionIndex}` : `${currentScore}`}
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
