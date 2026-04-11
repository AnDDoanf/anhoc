"use client";

import Link from "next/link";
import { MoveLeft, HelpCircle, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-sol-bg flex items-center justify-center px-4 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-sol-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-sol-accent/5 rounded-full blur-3xl" />
      
      <div className="max-w-2xl w-full text-center space-y-12 relative z-10">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-sol-surface border border-sol-border/20 shadow-2xl mb-8 animate-bounce">
            <HelpCircle size={48} className="text-sol-accent" />
          </div>
          
          <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sol-accent to-sol-accent/40 tracking-tighter">
            404
          </h1>
          
          <h2 className="text-3xl md:text-4xl font-bold text-sol-text tracking-tight">
            Điểm này không tồn tại
          </h2>
          
          <p className="text-xl text-sol-muted leading-relaxed max-w-lg mx-auto">
            Có vẻ như bạn đã đi lạc vào một không gian không chiều. Đừng lo, hãy sử dụng la bàn để quay lại lộ trình học tập của mình nhé.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link
            href="/student"
            className="group flex items-center gap-3 px-8 py-4 bg-sol-accent text-white font-bold rounded-2xl hover:bg-sol-accent/90 hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl shadow-sol-accent/20"
          >
            <MoveLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Quay lại phỏng học
          </Link>
          
          <Link
            href="/"
            className="flex items-center gap-3 px-8 py-4 bg-sol-surface text-sol-text font-bold rounded-2xl border border-sol-border/20 hover:bg-sol-surface/80 transition-all"
          >
            <Compass size={20} />
            Trang chủ
          </Link>
        </div>

        {/* Fun math-related footer */}
        <div className="pt-12 border-t border-sol-border/10 opacity-30">
          <p className="text-sm font-mono text-sol-muted italic">
            Error: coordinate_undefined_at_index_404
          </p>
        </div>
      </div>
    </div>
  );
}
