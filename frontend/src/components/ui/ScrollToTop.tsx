"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

type ScrollToTopProps = {
  containerId?: string;
  className?: string;
};

export default function ScrollToTop({ containerId, className = "bottom-6 right-6" }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasChatbot, setHasChatbot] = useState(() => {
    if (typeof window !== "undefined") {
      return !!(window as any).__chatbotVisible;
    }
    return false;
  });

  const scrollToTop = () => {
    const container = containerId ? document.getElementById(containerId) : null;
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const container = containerId ? document.getElementById(containerId) : null;
    let frameId = 0;

    const readScrollTop = () => {
      if (container) return container.scrollTop;
      return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const watchScroll = () => {
      const scrollTop = readScrollTop();
      setIsVisible(scrollTop > 120);
      frameId = window.requestAnimationFrame(watchScroll);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (frameId) {
          window.cancelAnimationFrame(frameId);
          frameId = 0;
        }
        return;
      }

      if (!frameId) {
        frameId = window.requestAnimationFrame(watchScroll);
      }
    };

    const toggleVisibility = () => {
      const scrollTop = container
        ? container.scrollTop
        : window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setIsVisible(scrollTop > 120);
    };

    toggleVisibility();
    frameId = window.requestAnimationFrame(watchScroll);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [containerId]);

  useEffect(() => {
    const handleChatbotChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setHasChatbot(customEvent.detail);
    };

    window.addEventListener("chatbot-visible-change", handleChatbotChange);
    
    if (typeof window !== "undefined") {
      setHasChatbot(!!(window as any).__chatbotVisible);
    }

    return () => {
      window.removeEventListener("chatbot-visible-change", handleChatbotChange);
    };
  }, []);

  const finalClassName = hasChatbot
    ? `${className} bottom-40 md:bottom-24`
    : className;

  return (
    <div
      className={`fixed z-[950] transition-all duration-300 ${
        isVisible
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 translate-y-10 scale-95 pointer-events-none"
      } ${finalClassName}`}
    >
      <button
        type="button"
        onClick={scrollToTop}
        className={`
          flex h-12 w-12 items-center justify-center rounded-2xl
          bg-sol-surface/80 backdrop-blur-md border border-sol-accent/20
          text-sol-accent shadow-xl transition-colors duration-300
          hover:bg-sol-accent hover:text-sol-bg hover:-translate-y-1 hover:shadow-sol-accent/20
          active:scale-95
        `}
        aria-label="Scroll to top"
      >
        <ArrowUp size={24} className="stroke-[3]" />
      </button>
    </div>
  );
}
