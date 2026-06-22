"use client";

import { useEffect, useState, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Rocket } from "lucide-react";
import { ChoiceOption, normalizeQuestionType } from "@/utils/questionType";
import { formatTemplate } from "@/utils/mathService";

interface SpaceShooterGameProps {
  question: any;
  choiceOptions: ChoiceOption[];
  onSubmitAnswer: (value: string) => void;
  feedback: { isCorrect: boolean; show: boolean } | null;
  onEndGame: () => void;
  questionIndex: number;
  fuel: number;
}

export default function SpaceShooterGame({
  question,
  choiceOptions,
  onSubmitAnswer,
  feedback,
  onEndGame,
  questionIndex,
  fuel,
}: SpaceShooterGameProps) {
  const t = useTranslations("Games");
  const locale = useLocale();

  const [rocketPos, setRocketPos] = useState({ x: 50, y: 82, rotate: 0 });
  const [flightState, setFlightState] = useState<'idle' | 'firing' | 'warping' | 'crashing' | 're-entering'>('idle');
  const [explodedBoxIdx, setExplodedBoxIdx] = useState<number | null>(null);
  const [laser, setLaser] = useState<{ targetIndex: number; isCorrect: boolean; targetX: number; targetY: number } | null>(null);
  // High-performance refs to prevent forced reflows and excessive rendering overhead
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const arenaRectRef = useRef<DOMRect | null>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const flightTimeRef = useRef(0);

  const questionType = normalizeQuestionType(question?.template_type);
  const currentQuestionBodyTemplate =
    locale === "vi"
      ? question?.body_template_vi || question?.body_template_en || ""
      : question?.body_template_en || question?.body_template_vi || "";

  const trueFalseOptions = [
    { label: t("trueOption"), value: "true" },
    { label: t("falseOption"), value: "false" },
  ];

  const optionsToRender = questionType === "true_false" ? trueFalseOptions : choiceOptions;

  const isOptionCorrect = (option: ChoiceOption) => {
    return question?.right_answers.some(
      (ans: string) => ans.trim().toLowerCase() === option.value.trim().toLowerCase()
    ) || false;
  };

  const getLaserOrigin = () => {
    const rocketNoseOffset = 7;
    const angleInRadians = (rocketPos.rotate - 90) * (Math.PI / 180);

    return {
      x: rocketPos.x + Math.cos(angleInRadians) * rocketNoseOffset,
      y: rocketPos.y + Math.sin(angleInRadians) * rocketNoseOffset,
    };
  };

  const getOptionTargetPosition = (index: number) => {
    const arenaRect = arenaRectRef.current;
    const optionRect = optionRefs.current[index]?.getBoundingClientRect();

    if (!arenaRect || !optionRect) {
      return {
        x: 12.5 + index * 25,
        y: 28,
      };
    }

    return {
      x: ((optionRect.left + optionRect.width / 2 - arenaRect.left) / arenaRect.width) * 100,
      y: ((optionRect.top + optionRect.height / 2 - arenaRect.top) / arenaRect.height) * 100,
    };
  };

  // Re-enter rocket flight on new question load
  useEffect(() => {
    setExplodedBoxIdx(null);
    setLaser(null);
    cursorRef.current = null;
    setFlightState('re-entering');
    setRocketPos({ x: 50, y: 120, rotate: 0 });

    const reEnterTimeout = setTimeout(() => {
      setRocketPos({ x: 50, y: 82, rotate: 0 });
      setFlightState('idle');
    }, 600);

    return () => clearTimeout(reEnterTimeout);
  }, [questionIndex]);

  // Cache arena bounding rect on mount/resize/scroll to completely avoid layout reflows in mousemove
  useEffect(() => {
    const updateRect = () => {
      if (arenaRef.current) {
        arenaRectRef.current = arenaRef.current.getBoundingClientRect();
      }
    };

    updateRect();
    const tId = setTimeout(updateRect, 300);

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect);

    return () => {
      clearTimeout(tId);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [flightState]);

  // Global window listener to track mouse position globally into a ref (avoids re-rendering overhead)
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (flightState !== 'idle' || !arenaRectRef.current) return;
      const rect = arenaRectRef.current;
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;
      cursorRef.current = { x: px, y: py };
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, [flightState]);

  // Gentle background space flight drift & cursor tracking heading loop
  useEffect(() => {
    if (flightState !== 'idle') return;

    const interval = setInterval(() => {
      flightTimeRef.current += 1;
      const nextTime = flightTimeRef.current;

      // Calculate organic zero-gravity drift coordinates
      const driftX = Math.sin(nextTime * 0.04) * 12;
      const driftY = Math.cos(nextTime * 0.03) * 5;
      const driftRotate = Math.sin(nextTime * 0.04) * 8;

      const nextX = 50 + driftX;
      const nextY = Math.max(72, 82 + driftY);

      let nextRotate = driftRotate;

      // If the user's cursor is anywhere on screen, lock heading angle directly to the cursor
      const currentCursor = cursorRef.current;
      if (currentCursor !== null) {
        const dx = currentCursor.x - nextX;
        const dy = currentCursor.y - nextY;
        nextRotate = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      }

      setRocketPos((prevPos) => ({
        x: prevPos.x + (nextX - prevPos.x) * 0.08,
        y: prevPos.y + (nextY - prevPos.y) * 0.08,
        rotate: prevPos.rotate + (nextRotate - prevPos.rotate) * 0.12
      }));
    }, 25);

    return () => clearInterval(interval);
  }, [flightState]);

  const handleShootOption = (index: number, option: ChoiceOption) => {
    if (flightState !== 'idle' || feedback) return;

    const correct = isOptionCorrect(option);
    const targetPosition = getOptionTargetPosition(index);
    
    // Compute exact aiming vector to meteor column target
    const targetX = targetPosition.x;
    const targetY = targetPosition.y;
    const dx = targetX - rocketPos.x;
    const dy = targetY - rocketPos.y;
    const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    setFlightState('firing');
    setLaser({ targetIndex: index, isCorrect: correct, targetX, targetY });
    setRocketPos((prev) => ({ ...prev, rotate: targetAngle }));

    if (correct) {
      // Correct answer: Fire, explode target, and warp through the screen
      setTimeout(() => {
        setExplodedBoxIdx(index);
        setFlightState('warping');
        
        // Fly forward directly through the target coordinates and off-screen
        setRocketPos({ x: targetX, y: -25, rotate: targetAngle });

        setTimeout(() => {
          onSubmitAnswer(option.value);
        }, 600);
      }, 350);
    } else {
      // Incorrect answer: Crash, damage, and Game Over
      setTimeout(() => {
        setFlightState('crashing');
        
        // Fly forward and crash directly into the target box
        setRocketPos({ x: targetX, y: 20, rotate: targetAngle });

        setTimeout(() => {
          onEndGame();
        }, 1100);
      }, 350);
    }
  };

  const getTransitionStyle = () => {
    if (flightState === 'warping') {
      return 'all 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53)';
    }
    if (flightState === 'crashing') {
      return 'all 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)';
    }
    if (flightState === 're-entering') {
      return 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }
    return 'none';
  };

  const isShaking = !feedback && (flightState === 'crashing' || fuel <= 30);

  return (
    <div className="space-y-4 py-4 z-10 flex flex-col justify-between h-full flex-1 relative min-h-[440px] sm:min-h-[420px]">
      
      {/* Background space element stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem]">
        <div className="absolute top-4 left-10 w-1 h-1 bg-white rounded-full opacity-30 animate-pulse" />
        <div className="absolute top-20 right-20 w-1.5 h-1.5 bg-white rounded-full opacity-20 animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-10 left-1/4 w-1.5 h-1.5 bg-white rounded-full opacity-40 animate-pulse" style={{ animationDelay: "0.5s" }} />
        <div className="absolute top-1/2 right-1/3 w-0.5 h-0.5 bg-white rounded-full opacity-50 animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* Red damage overlay on crash */}
      {flightState === 'crashing' && (
        <div className="absolute inset-0 bg-sol-red/20 pointer-events-none rounded-[2rem] z-25 animate-pulse" />
      )}

      {/* Title & Spaceship Fuel progress bar */}
      <div className="text-center space-y-2 py-1 z-10 w-full max-w-xs mx-auto">
        <p className="text-xs font-black uppercase text-sol-accent tracking-widest">{t("solveNow")}</p>
        <div className="w-full h-1.5 bg-sol-border/10 rounded-full overflow-hidden relative">
          <div 
            className={`h-full transition-all duration-1000 ease-linear rounded-full
              ${fuel <= 30 ? "bg-sol-red animate-pulse" : "bg-sol-orange"}
            `}
            style={{ width: `${fuel}%` }}
          />
        </div>
        <p className="text-[9px] font-black text-sol-muted uppercase tracking-wider">
          {fuel <= 30
            ? t("shooterFuelWarning", { fuel: Math.ceil(fuel) })
            : t("shooterFuelStatus", { fuel: Math.ceil(fuel) })}
        </p>
      </div>

      {/* Interactive 2D Flight Area */}
      <div 
        ref={arenaRef}
        className="relative w-full h-[360px] sm:h-[320px] overflow-hidden bg-sol-bg/10 rounded-[2rem] border border-sol-border/10 flex flex-col justify-start p-4 z-10 cursor-crosshair"
      >

        {/* Question prompt */}
        <div className="relative z-10 mx-auto max-w-2xl px-4 pt-2 text-center">
          <div className="prose mx-auto prose-p:my-0 prose-p:text-base prose-p:font-black prose-p:leading-snug prose-p:text-sol-text sm:prose-p:text-lg prose-strong:text-sol-accent">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {formatTemplate(
                currentQuestionBodyTemplate,
                question?.generated_variables || {}
              )}
            </ReactMarkdown>
          </div>
        </div>
        
        {/* Meteor Targets (Drifting top options) */}
        <div className="absolute inset-x-4 top-20 z-10 grid grid-cols-2 gap-4 sm:inset-x-6 sm:top-auto sm:bottom-28 sm:grid-cols-4">
          {optionsToRender.map((option, index) => {
            const isExploded = explodedBoxIdx === index;
            return (
              <button
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                key={`${option.label}-${index}`}
                type="button"
                onClick={() => handleShootOption(index, option)}
                disabled={flightState !== 'idle'}
                className={`relative py-4 px-3 bg-sol-bg border rounded-2xl flex flex-col items-center justify-center text-center select-none animate-float-target
                  ${isExploded 
                    ? 'scale-0 opacity-0 transition-all duration-300 rotate-45' 
                    : flightState === 'crashing' && laser?.targetIndex === index
                      ? 'border-sol-red bg-sol-red/20 animate-shake scale-110 shadow-lg shadow-sol-red/40'
                      : 'border-sol-border/30 hover:border-sol-accent hover:scale-105 active:scale-95 shadow-md hover:shadow-sol-accent/5'
                  }
                `}
                style={{
                  animationDelay: `${index * 0.15}s`,
                  transition: 'all 0.3s ease-out'
                }}
              >
                {/* Visual explosion particles on correct shoot */}
                {isExploded && (
                  <div className="absolute inset-0 bg-sol-accent/20 rounded-2xl animate-ping pointer-events-none" />
                )}
                
                <div className="w-8 h-8 rounded-full bg-sol-surface flex items-center justify-center border border-sol-border/20 mb-1.5 text-sol-accent font-black text-[10px]">
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="text-sol-text font-black text-xs tracking-tight break-words max-w-full">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic SVG laser beam line */}
        {laser && (() => {
          const laserOrigin = getLaserOrigin();
          return (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" style={{ overflow: 'visible' }}>
            <line 
              x1={`${laserOrigin.x}%`} 
              y1={`${laserOrigin.y}%`} 
              x2={`${laser.targetX}%`} 
              y2={`${laser.targetY}%`} 
              stroke="#dc322f" 
              strokeWidth="4" 
              className="animate-laser-fire drop-shadow-[0_0_8px_#dc322f]" 
            />
          </svg>
          );
        })()}

        {/* Steering Bouncing Spaceship (2D Flight positioning) */}
        <div 
          className={`absolute z-20 flex flex-col items-center
            ${isShaking ? 'animate-shake' : ''}
          `}
          style={{
            left: `${rocketPos.x}%`,
            top: `${rocketPos.y}%`,
            transform: `translate(-50%, -50%) rotate(${rocketPos.rotate}deg)`,
            transition: getTransitionStyle()
          }}
        >
          <div className="p-3 bg-sol-surface/95 border border-sol-accent/20 rounded-full shadow-lg shadow-sol-accent/15">
            <Rocket size={28} className="text-sol-accent transform -rotate-45" />
          </div>
          
          {/* Fire thrust flame trail */}
          {(flightState === 'warping' || flightState === 'firing') && (
            <div className="w-2.5 h-6 bg-gradient-to-t from-sol-orange to-sol-red rounded-full animate-pulse mt-0.5" />
          )}
        </div>

      </div>

    </div>
  );
}
