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
  };

  useEffect(() => {
    const container = containerId ? document.getElementById(containerId) : null;
    const target: Window | HTMLElement = container || window;

    const toggleVisibility = () => {
      const scrollTop = container ? container.scrollTop : window.scrollY;
      setIsVisible(scrollTop > 300);
    };

    target.addEventListener("scroll", toggleVisibility);
    toggleVisibility();

    return () => {
      target.removeEventListener("scroll", toggleVisibility);
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

  const finalClassName = hasChatbot ? className : className.replace("bottom-24", "bottom-6");

  return (
    <div className={`fixed z-[60] ${finalClassName}`}>
      <button
        type="button"
        onClick={scrollToTop}
        className={`
          flex h-12 w-12 items-center justify-center rounded-2xl
          bg-sol-surface/80 backdrop-blur-md border border-sol-accent/20
          text-sol-accent shadow-xl transition-all duration-300
          hover:bg-sol-accent hover:text-sol-bg hover:-translate-y-1 hover:shadow-sol-accent/20
          active:scale-95
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}
        `}
        aria-label="Scroll to top"
      >
        <ArrowUp size={24} className="stroke-[3]" />
      </button>
    </div>
  );
}
