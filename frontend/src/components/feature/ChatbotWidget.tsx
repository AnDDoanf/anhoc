"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocale, useTranslations } from "next-intl";
import { authService } from "@/services/auth";
import {
  AlertCircle,
  Brain,
  Flame,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Send,
  Settings,
  Square,
  Target,
  Trophy,
  X
} from "lucide-react";

interface Message {
  sender: "student" | "tutor";
  text: string;
  thought?: string;
  image?: string;
  timestamp: string;
}

interface ProviderDebug {
  requested?: string;
  effective?: string;
  limited?: boolean;
}

const reasoningTechniques = [
  { id: "step_by_step" },
  { id: "plan_solve_check" },
  { id: "socratic" },
  { id: "worked_example" }
] as const;

export default function ChatbotWidget() {
  const disableChatbot = process.env.NEXT_PUBLIC_DISABLE_CHATBOT === "true" || process.env.DISABLE_CHATBOT === "true";

  useEffect(() => {
    if (disableChatbot && typeof window !== "undefined") {
      (window as any).__chatbotVisible = false;
      window.dispatchEvent(new CustomEvent("chatbot-visible-change", { detail: false }));
    }
  }, [disableChatbot]);

  const { user, isAuthenticated } = useAuth();
  const locale = useLocale();
  const t = useTranslations("Chatbot");

  const [isAvailable, setIsAvailable] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"chat" | "settings">("chat");
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<{ name: string; data: string; mime: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remainingUses, setRemainingUses] = useState<number>(5);
  const [lastThought, setLastThought] = useState<string>("");
  const [lastContext, setLastContext] = useState<any>(null);
  const [lastProviderDebug, setLastProviderDebug] = useState<ProviderDebug | null>(null);
  const [provider, setProvider] = useState<string>("gemini");
  const [byokOpenAIKey, setByokOpenAIKey] = useState<string>("");
  const [byokOllamaUrl, setByokOllamaUrl] = useState<string>("");
  const [byokGeminiKey, setByokGeminiKey] = useState<string>("");
  const [byokClaudeKey, setByokClaudeKey] = useState<string>("");
  const [reasoningTechnique, setReasoningTechnique] = useState<string>("step_by_step");
  const [profileStats, setProfileStats] = useState<{ level: number; total_xp: number } | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [historySkip, setHistorySkip] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const chatbotApiUrl = (process.env.NEXT_PUBLIC_CHATBOT_API_URL || "http://127.0.0.1:5002").replace(/\/+$/, "");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const cachedProvider = localStorage.getItem("chatbot_provider");
    if (cachedProvider) setProvider(cachedProvider);

    const cachedOpenAI = localStorage.getItem("chatbot_byok_openai");
    if (cachedOpenAI) setByokOpenAIKey(cachedOpenAI);

    const cachedOllama = localStorage.getItem("chatbot_byok_ollama");
    if (cachedOllama) setByokOllamaUrl(cachedOllama);

    const cachedGemini = localStorage.getItem("chatbot_byok_gemini");
    if (cachedGemini) setByokGeminiKey(cachedGemini);

    const cachedClaude = localStorage.getItem("chatbot_byok_claude");
    if (cachedClaude) setByokClaudeKey(cachedClaude);

    const cachedTechnique = localStorage.getItem("chatbot_reasoning_technique");
    if (cachedTechnique) setReasoningTechnique(cachedTechnique);
  }, []);

  const handleProviderChange = (val: string) => {
    setProvider(val);
    localStorage.setItem("chatbot_provider", val);
  };

  const handleOpenAIKeyChange = (val: string) => {
    setByokOpenAIKey(val);
    localStorage.setItem("chatbot_byok_openai", val);
  };

  const handleOllamaUrlChange = (val: string) => {
    setByokOllamaUrl(val);
    localStorage.setItem("chatbot_byok_ollama", val);
  };

  const handleGeminiKeyChange = (val: string) => {
    setByokGeminiKey(val);
    localStorage.setItem("chatbot_byok_gemini", val);
  };

  const handleClaudeKeyChange = (val: string) => {
    setByokClaudeKey(val);
    localStorage.setItem("chatbot_byok_claude", val);
  };

  const handleReasoningTechniqueChange = (val: string) => {
    setReasoningTechnique(val);
    localStorage.setItem("chatbot_reasoning_technique", val);
  };

  const loadInitialHistory = async () => {
    if (!isAuthenticated || !user) return;
    try {
      setHistoryLoading(true);
      const res = await fetch(`${chatbotApiUrl}/api/v1/chat/history?user_id=${user.id}&skip=0&limit=3`);
      if (!res.ok) throw new Error("Failed to fetch initial history");
      const records = await res.json();

      if (records.length > 0) {
        const reversedRecords = [...records].reverse();
        const initialMsgs: Message[] = [];
        reversedRecords.forEach((record: any) => {
          const timeStr = record.timestamp
            ? new Date(record.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
            : new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

          initialMsgs.push({
            sender: "student",
            text: record.message,
            timestamp: timeStr
          });

          initialMsgs.push({
            sender: "tutor",
            text: record.answer,
            thought: record.thought,
            timestamp: timeStr
          });
        });

        setMessages(initialMsgs);
        setHistorySkip(3);
        setHasMoreHistory(records.length === 3);
        localStorage.setItem(`chatbot_history_${user.id}`, JSON.stringify(initialMsgs));
      } else {
        setHasMoreHistory(false);
        setMessages([]);
        localStorage.removeItem(`chatbot_history_${user.id}`);
      }
    } catch (err) {
      console.error("Failed to load initial history:", err);
    } finally {
      setHistoryLoading(false);
      scrollToBottom();
    }
  };

  const loadMoreHistory = async (container?: HTMLDivElement) => {
    if (historyLoading || !hasMoreHistory || !isAuthenticated || !user) return;

    setHistoryLoading(true);
    const nextSkip = historySkip + 3;

    try {
      const res = await fetch(`${chatbotApiUrl}/api/v1/chat/history?user_id=${user.id}&skip=${historySkip}&limit=3`);
      if (!res.ok) throw new Error("Failed to load history");

      const records = await res.json();

      if (records.length === 0) {
        setHasMoreHistory(false);
        setHistoryLoading(false);
        return;
      }

      const reversedRecords = [...records].reverse();
      const prependedMessages: Message[] = [];
      reversedRecords.forEach((record: any) => {
        const timeStr = record.timestamp
          ? new Date(record.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
          : new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

        prependedMessages.push({
          sender: "student",
          text: record.message,
          timestamp: timeStr
        });

        prependedMessages.push({
          sender: "tutor",
          text: record.answer,
          thought: record.thought,
          timestamp: timeStr
        });
      });

      const oldScrollHeight = container ? container.scrollHeight : 0;
      const oldScrollTop = container ? container.scrollTop : 0;

      setMessages((prev) => [...prependedMessages, ...prev]);
      setHistorySkip(nextSkip);

      if (records.length < 3) {
        setHasMoreHistory(false);
      }

      if (container) {
        setTimeout(() => {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
        }, 50);
      }
    } catch (err) {
      console.error("Failed to load more history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.scrollTop < 10 && !historyLoading && hasMoreHistory) {
      loadMoreHistory(container);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const checkAvailability = async () => {
      try {
        const res = await fetch(`${chatbotApiUrl}/health`, { signal: AbortSignal.timeout(3000) });
        setIsAvailable(res.ok);
      } catch {
        setIsAvailable(false);
      }
    };

    checkAvailability();

    const fetchProfileStats = async () => {
      try {
        const profile = await authService.getProfile();
        if (profile?.student_stats) {
          setProfileStats({
            level: profile.student_stats.level || 1,
            total_xp: profile.student_stats.total_xp || 0
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile stats for chatbot widget:", err);
      }
    };
    fetchProfileStats();

    const cached = localStorage.getItem(`chatbot_history_${user.id}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const truncated = parsed.slice(-6); // 3 rounds is 6 messages
        setMessages(truncated);
        const lastTutorMsg = [...truncated].reverse().find((message: Message) => message.sender === "tutor");
        if (lastTutorMsg?.thought) {
          setLastThought(lastTutorMsg.thought);
        }
      } catch (e) {
        console.error("Failed to parse chat history cache", e);
      }
    }

    loadInitialHistory();
  }, [chatbotApiUrl, isAuthenticated, user]);

  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      const fetchProfileStats = async () => {
        try {
          const profile = await authService.getProfile();
          if (profile?.student_stats) {
            setProfileStats({
              level: profile.student_stats.level || 1,
              total_xp: profile.student_stats.total_xp || 0
            });
          }
        } catch (err) {
          console.error("Failed to fetch profile stats for chatbot widget:", err);
        }
      };
      fetchProfileStats();
      loadInitialHistory();
    }
  }, [isOpen, isAuthenticated, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && activeSection === "chat") {
      scrollToBottom();
    }
  }, [isOpen, activeSection]);

  const isChatbotVisible = !disableChatbot && !!(isAuthenticated && isAvailable && user);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__chatbotVisible = isChatbotVisible;
      window.dispatchEvent(new CustomEvent("chatbot-visible-change", { detail: isChatbotVisible }));
    }
    return () => {
      if (typeof window !== "undefined") {
        (window as any).__chatbotVisible = false;
        window.dispatchEvent(new CustomEvent("chatbot-visible-change", { detail: false }));
      }
    };
  }, [isChatbotVisible]);

  if (disableChatbot || !isAuthenticated || !isAvailable || !user) return null;

  const providerTypeSystem = t("providerTypes.system");
  const providerTypeByok = t("providerTypes.byok");

  const providerOptions = [
    { id: "gemini", name: "Gemini", type: providerTypeSystem },
    ...(user?.role?.toLowerCase() === "admin"
      ? [
          { id: "openai", name: "GPT-4o", type: providerTypeSystem },
          { id: "ollama", name: "Ollama", type: providerTypeSystem }
        ]
      : []),
    { id: "gemini_byok", name: "Gemini", type: providerTypeByok },
    { id: "openai_byok", name: "GPT-4o", type: providerTypeByok },
    { id: "claude_byok", name: "Claude", type: providerTypeByok },
    { id: "ollama_byok", name: "Ollama", type: providerTypeByok }
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1];
      setImageFile({
        name: file.name,
        data: base64Data,
        mime: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !imageFile) return;

    const currentMsgText = input;
    const currentImg = imageFile;

    setInput("");
    clearImage();
    setErrorMsg(null);

    const studentMessage: Message = {
      sender: "student",
      text: currentMsgText,
      image: currentImg ? `data:${currentImg.mime};base64,${currentImg.data}` : undefined,
      timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    };

    const updatedHistory = [...messages, studentMessage];
    setMessages(updatedHistory);
    localStorage.setItem(`chatbot_history_${user.id}`, JSON.stringify(updatedHistory.slice(-6)));
    setLoading(true);

    try {
      const payload: any = {
        user_id: user.id,
        message: currentMsgText,
        locale: locale || "vi",
        provider,
        reasoning_technique: reasoningTechnique,
        byok_openai_key: byokOpenAIKey || undefined,
        byok_ollama_url: byokOllamaUrl || undefined,
        byok_gemini_key: byokGeminiKey || undefined,
        byok_claude_key: byokClaudeKey || undefined
      };

      if (currentImg) {
        payload.images = [
          {
            mime_type: currentImg.mime,
            data: currentImg.data
          }
        ];
      }

      const tutorMessage: Message = {
        sender: "tutor",
        text: "",
        timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      };
      let streamedHistory = [...updatedHistory, tutorMessage];
      setMessages(streamedHistory);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const res = await fetch(`${chatbotApiUrl}/api/v1/chat/stream`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || t("errors.fetchFailed"));
      }

      if (!res.body) {
        throw new Error(t("errors.streamUnavailable"));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalThought = "";
      let finalContext: any = null;
      let finalRemainingUses = remainingUses;

      const applyTutorText = (nextText: string) => {
        streamedHistory = streamedHistory.map((msg, index) =>
          index === streamedHistory.length - 1 ? { ...msg, text: nextText } : msg
        );
        setMessages(streamedHistory);
      };

      const handleStreamEvent = (rawEvent: string) => {
        const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data: "));
        if (!dataLine) return;

        const event = JSON.parse(dataLine.slice(6));
        if (event.type === "delta") {
          const currentText = streamedHistory[streamedHistory.length - 1]?.text || "";
          applyTutorText(currentText + (event.text || ""));
        }
        if (event.type === "meta") {
          finalContext = event.context_used;
          setLastContext(event.context_used);
          setLastProviderDebug(event.context_used?.provider_debug || null);
        }
        if (event.type === "done") {
          finalThought = event.thought || "";
          finalContext = event.context_used || finalContext;
          finalRemainingUses = event.remaining_uses ?? finalRemainingUses;
        }
        if (event.type === "error") {
          const providerDebug = event.provider_debug;
          if (providerDebug) {
            setLastProviderDebug(providerDebug);
          }
          const debugSuffix = providerDebug
            ? ` [provider=${providerDebug.requested || "unknown"} -> ${providerDebug.effective || "unknown"} | limited=${String(providerDebug.limited)}]`
            : "";
          throw new Error((event.detail || t("errors.serverError")) + debugSuffix);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        events.forEach(handleStreamEvent);
      }

      if (buffer.trim()) {
        handleStreamEvent(buffer);
      }

      streamedHistory = streamedHistory.map((msg, index) =>
        index === streamedHistory.length - 1 ? { ...msg, thought: finalThought } : msg
      );

      setMessages(streamedHistory);
      localStorage.setItem(`chatbot_history_${user.id}`, JSON.stringify(streamedHistory.slice(-6)));
      setLastThought(finalThought);
      setLastContext(finalContext);
      setRemainingUses(finalRemainingUses);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((prev) => {
          localStorage.setItem(`chatbot_history_${user.id}`, JSON.stringify(prev.slice(-6)));
          return prev;
        });
      } else {
        setErrorMsg(err.message || t("errors.serverError"));
        const restored = messages.filter((msg) => msg !== studentMessage);
        setMessages(restored);
        localStorage.setItem(`chatbot_history_${user.id}`, JSON.stringify(restored.slice(-6)));
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const clearHistory = () => {
    if (confirm(t("confirmClearHistory"))) {
      setMessages([]);
      setLastThought("");
      localStorage.removeItem(`chatbot_history_${user.id}`);
    }
  };

  return (
    <div className="fixed bottom-24 md:bottom-6 right-6 z-[999] select-none font-sans">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-16 w-16 items-center justify-center rounded-full border border-sol-accent/30 bg-sol-accent text-sol-bg shadow-[0_4px_30px_rgba(var(--sol-accent-rgb),0.3)] transition-all hover:scale-105 hover:shadow-[0_4px_30px_rgba(var(--sol-accent-rgb),0.5)] active:scale-95 cursor-pointer"
          aria-label={t("open")}
        >
          <MessageSquare size={28} />
          <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sol-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-sol-green"></span>
          </span>
        </button>
      )}

      {isOpen && (
        <div className="flex h-[36rem] w-[24rem] sm:w-[28rem] flex-col rounded-[2.5rem] border border-sol-border/30 bg-sol-surface shadow-2xl transition-all duration-300 overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="relative border-b border-sol-border/20 p-5 flex items-center justify-between bg-sol-bg">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-sol-accent/10 border border-sol-accent/20 text-sol-accent">
                <Brain size={20} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-black text-sol-text tracking-tight flex items-center gap-1.5">
                  {t("title")}
                  <span className="inline-block h-2 w-2 rounded-full bg-sol-green animate-ping" />
                </h4>
                <p className="text-[10px] font-bold text-sol-muted uppercase tracking-widest">{t("tagline")}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearHistory}
                className="p-2 rounded-xl text-sol-muted hover:text-sol-orange hover:bg-sol-orange/5 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                title={t("clearLogs")}
              >
                {t("clear")}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-sol-muted hover:text-sol-text hover:bg-sol-bg transition-all cursor-pointer"
                aria-label={t("close")}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b border-sol-border/10 text-center text-xs font-black uppercase bg-sol-surface/50">
            {[
              { id: "chat", label: t("tabs.chat"), icon: <MessageSquare size={13} /> },
              { id: "settings", label: t("tabs.settings"), icon: <Settings size={13} /> }
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as "chat" | "settings")}
                className={`py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer
                  ${
                    activeSection === section.id
                      ? "border-sol-accent text-sol-accent font-black bg-sol-bg/20"
                      : "border-transparent text-sol-muted hover:text-sol-text"
                  }
                `}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5 bg-sol-bg/20">
            {activeSection === "chat" && (
              <div className="space-y-4 h-full flex flex-col justify-between overflow-hidden">
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin"
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                      <Brain size={48} className="text-sol-accent/30 animate-bounce duration-1000" />
                      <p className="text-sm font-bold text-sol-text max-w-[20ch]">
                        {t("emptyGreeting", { username: user.username || "" })}
                      </p>
                      <p className="text-[10px] text-sol-muted uppercase tracking-widest font-black">
                        {t("dailyLimit", { count: 5 })}
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex flex-col ${msg.sender === "student" ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                      >
                        <div
                          className={`max-w-[85%] rounded-[1.8rem] px-5 py-3 text-sm font-medium shadow-sm leading-relaxed
                            ${
                              msg.sender === "student"
                                ? "bg-sol-accent text-sol-bg rounded-tr-none"
                                : "bg-sol-surface border border-sol-border/20 text-sol-text rounded-tl-none"
                            }
                          `}
                        >
                          {msg.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={msg.image}
                              alt={t("attachedImageAlt")}
                              className="rounded-2xl max-w-full h-auto mb-2 border border-black/10"
                            />
                          )}
                          <p className="whitespace-pre-wrap">{msg.text}</p>

                        </div>
                        <span className="text-[9px] text-sol-muted font-bold mt-1 px-1">{msg.timestamp}</span>
                      </div>
                    ))
                  )}

                  {loading && (
                    <div className="flex items-center gap-2 text-sol-accent text-xs font-bold animate-pulse">
                      <Loader2 size={16} className="animate-spin" />
                      <span>{t("thinking")}</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="rounded-2xl border border-sol-orange/20 bg-sol-orange/10 p-4 text-xs font-bold text-sol-orange flex items-start gap-2.5">
                      <AlertCircle size={16} className="shrink-0" />
                      <p>{errorMsg}</p>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {activeSection === "settings" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-sol-accent border-b border-sol-border/10 pb-3">
                  <Settings size={18} />
                  <h5 className="text-sm font-black uppercase tracking-wider">{t("tabs.settings")}</h5>
                </div>

                {/* Dashboard statistics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-sol-border/20 bg-sol-surface p-3 text-center shadow-sm">
                    <Trophy size={18} className="text-sol-orange mx-auto mb-1" />
                    <p className="text-[10px] font-black text-sol-muted uppercase tracking-wider">{t("stats.xpPoints")}</p>
                    <p className="text-base font-black text-sol-text mt-0.5">
                      {lastContext?.total_xp ?? profileStats?.total_xp ?? 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-sol-border/20 bg-sol-surface p-3 text-center shadow-sm">
                    <Target size={18} className="text-sol-accent mx-auto mb-1" />
                    <p className="text-[10px] font-black text-sol-muted uppercase tracking-wider">{t("stats.level")}</p>
                    <p className="text-base font-black text-sol-text mt-0.5">
                      {lastContext?.level ?? profileStats?.level ?? 1}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-sol-border/20 bg-sol-surface p-3 text-center shadow-sm">
                    <Flame size={18} className="text-sol-green mx-auto mb-1" />
                    <p className="text-[10px] font-black text-sol-muted uppercase tracking-wider">{t("stats.dailyUses")}</p>
                    <p className="text-base font-black text-sol-text mt-0.5">
                      {t("stats.remainingUses", { count: remainingUses })}
                    </p>
                  </div>
                </div>

                {/* RAG Persona Info */}
                <div className="rounded-[1.5rem] border border-sol-border/20 bg-sol-surface p-4 space-y-3 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wider text-sol-accent">{t("ragPersonaTitle")}</p>
                  <p className="text-xs text-sol-muted leading-relaxed font-medium">{t("ragPersonaDescription")}</p>
                  {lastProviderDebug && (
                    <p className="text-[10px] font-mono text-sol-muted">
                      Provider debug: {lastProviderDebug.requested || "unknown"} -&gt; {lastProviderDebug.effective || "unknown"} | limited={String(lastProviderDebug.limited)}
                    </p>
                  )}
                </div>

                {/* Engine Picker Section */}
                <div className="rounded-[1.5rem] border border-sol-border/20 bg-sol-surface p-4 space-y-3 shadow-sm">
                  <div className="flex items-center gap-1.5 border-b border-sol-border/10 pb-2">
                    <Target size={15} className="text-sol-accent" />
                    <p className="text-xs font-black uppercase tracking-wider text-sol-accent">{t("engineLabel")}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {providerOptions.map((option) => {
                      const isSelected = provider === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleProviderChange(option.id)}
                          className={`rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-sol-accent bg-sol-accent/10 text-sol-text"
                              : "border-sol-border/20 bg-sol-bg/30 text-sol-muted hover:text-sol-text hover:border-sol-accent/40"
                          }`}
                        >
                          <span className="block text-[11px] font-black uppercase tracking-wider">
                            {option.name}
                          </span>
                          <span
                            className={`mt-1.5 inline-block text-[8px] px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-tight
                              ${
                                isSelected
                                  ? "bg-sol-accent/20 text-sol-accent border border-sol-accent/10"
                                  : option.type === providerTypeSystem
                                    ? "bg-sol-green/10 text-sol-green border border-sol-green/5"
                                    : "bg-sol-orange/10 text-sol-orange border border-sol-orange/5"
                              }
                            `}
                          >
                            {option.type}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reasoning Logic Selection */}
                <div className="rounded-[1.5rem] border border-sol-border/20 bg-sol-surface p-4 space-y-3 shadow-sm">
                  <div className="flex items-center gap-1.5 border-b border-sol-border/10 pb-2">
                    <Brain size={15} className="text-sol-accent" />
                    <p className="text-xs font-black uppercase tracking-wider text-sol-accent">{t("reasoningTitle")}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {reasoningTechniques.map((technique) => {
                      const isSelected = reasoningTechnique === technique.id;
                      return (
                        <button
                          key={technique.id}
                          type="button"
                          onClick={() => handleReasoningTechniqueChange(technique.id)}
                          className={`rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-sol-accent bg-sol-accent/10 text-sol-text"
                              : "border-sol-border/20 bg-sol-bg/30 text-sol-muted hover:text-sol-text hover:border-sol-accent/40"
                          }`}
                        >
                          <span className="block text-[11px] font-black uppercase tracking-wider">
                            {t(`reasoning.${technique.id}.label`)}
                          </span>
                          <span className="mt-1 block text-[10px] font-semibold leading-snug">
                            {t(`reasoning.${technique.id}.description`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* BYOK Custom API Keys / URLs */}
                <div className="rounded-[1.5rem] border border-sol-border/20 bg-sol-surface p-4 space-y-4 shadow-sm select-text">
                  <div className="flex items-center gap-1.5 border-b border-sol-border/10 pb-2">
                    <Brain size={15} className="text-sol-orange animate-pulse" />
                    <p className="text-xs font-black uppercase tracking-wider text-sol-accent">{t("byokTitle")}</p>
                  </div>

                  <p className="text-[10px] text-sol-muted leading-relaxed font-semibold">{t("byokDescription")}</p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-sol-muted mb-1">
                        {t("fields.geminiApiKey")}
                      </label>
                      <input
                        type="password"
                        value={byokGeminiKey}
                        onChange={(e) => handleGeminiKeyChange(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-sol-bg/50 border border-sol-border/30 rounded-xl px-3 py-1.5 text-xs text-sol-text focus:outline-none focus:border-sol-accent font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-sol-muted mb-1">
                        {t("fields.openAiApiKey")}
                      </label>
                      <input
                        type="password"
                        value={byokOpenAIKey}
                        onChange={(e) => handleOpenAIKeyChange(e.target.value)}
                        placeholder="sk-proj-..."
                        className="w-full bg-sol-bg/50 border border-sol-border/30 rounded-xl px-3 py-1.5 text-xs text-sol-text focus:outline-none focus:border-sol-accent font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-sol-muted mb-1">
                        {t("fields.claudeApiKey")}
                      </label>
                      <input
                        type="password"
                        value={byokClaudeKey}
                        onChange={(e) => handleClaudeKeyChange(e.target.value)}
                        placeholder="sk-ant-..."
                        className="w-full bg-sol-bg/50 border border-sol-border/30 rounded-xl px-3 py-1.5 text-xs text-sol-text focus:outline-none focus:border-sol-accent font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-sol-muted mb-1">
                        {t("fields.ollamaUrl")}
                      </label>
                      <input
                        type="text"
                        value={byokOllamaUrl}
                        onChange={(e) => handleOllamaUrlChange(e.target.value)}
                        placeholder="http://localhost:11434"
                        className="w-full bg-sol-bg/50 border border-sol-border/30 rounded-xl px-3 py-1.5 text-xs text-sol-text focus:outline-none focus:border-sol-accent font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeSection === "chat" && (
            <div className="border-t border-sol-border/20 p-4 bg-sol-bg">
              {imageFile && (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-sol-surface border border-sol-border/20 px-3 py-1.5 text-xs text-sol-text">
                  <span className="truncate max-w-[200px] font-bold">{imageFile.name}</span>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="p-1 rounded-md text-sol-orange hover:bg-sol-orange/5 cursor-pointer"
                    aria-label={t("removeAttachment")}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sol-border/20 bg-sol-surface text-sol-muted hover:text-sol-accent transition-colors cursor-pointer"
                  aria-label={t("attachImage")}
                >
                  <ImageIcon size={18} />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("inputPlaceholder")}
                  disabled={loading}
                  className="flex-1 bg-sol-surface border border-sol-border/30 rounded-xl px-4 py-2.5 text-sm font-medium text-sol-text focus:outline-none focus:border-sol-accent transition-colors disabled:opacity-50"
                />

                {loading ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sol-orange text-sol-bg hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    aria-label={t("stop")}
                    title={t("stop")}
                  >
                    <Square size={16} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim() && !imageFile}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sol-accent text-sol-bg hover:opacity-90 active:scale-95 disabled:scale-100 disabled:opacity-50 transition-all cursor-pointer"
                    aria-label={t("send")}
                  >
                    <Send size={16} />
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
