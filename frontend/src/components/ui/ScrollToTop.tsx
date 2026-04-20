"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Set the top coordinate to 0
  // make scrolling smooth
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);
    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
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
