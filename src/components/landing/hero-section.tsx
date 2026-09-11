"use client";

import Link from "next/link";
import { Sparkles, Brain, LayoutGrid, ShieldCheck, Zap, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <header className="relative pt-12 pb-24 overflow-hidden border-b border-slate-800 bg-slate-950">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/30 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-600/20 rounded-full blur-[110px] pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-4 mb-16 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-blue-500/30">
            R
          </div>
          <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-300 bg-clip-text text-transparent">
            简历专家
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-slate-100 text-base font-semibold">
          <a href="#features" className="hover:text-blue-400 transition-colors">核心功能</a>
          <a href="#faq" className="hover:text-blue-400 transition-colors">常见问题</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="outline" className="bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800 font-semibold h-11 px-5 gap-2">
              <Settings className="w-4 h-4 text-blue-400" />
              <span>AI 配置</span>
            </Button>
          </Link>
          <Link href="/expert">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 px-6 shadow-lg shadow-blue-600/30">
              开始使用
            </Button>
          </Link>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 relative z-10 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-slate-900/90 border border-blue-500/40 text-sm font-semibold text-slate-100 mb-8 shadow-md">
          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          <span>大模型对齐 JD · 简历深度重构 Agent</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight bg-gradient-to-r from-blue-300 via-indigo-200 to-purple-300 bg-clip-text text-transparent pb-4 leading-tight drop-shadow-md">
          让每一份简历都能精准脱颖而出
        </h1>

        <p className="mt-4 text-xl md:text-2xl text-slate-200 font-medium leading-relaxed max-w-3xl drop-shadow-sm">
          结合目标岗位 JD 深度诊断、智能匹配技能差距、启发挖掘经历细节、一键重构高含金量 Bullet 点，助你斩获更多心仪 Offer。
        </p>

        <div className="mt-10 flex flex-wrap gap-5 justify-center">
          <Link href="/expert">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-14 px-9 text-lg gap-2.5 rounded-xl shadow-xl shadow-blue-600/30 transition-all hover:scale-105">
              <Brain className="w-5 h-5 text-white" /> 立即使用 AI 诊断优化
            </Button>
          </Link>

          <Link href="/designer">
            <Button size="lg" className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-100 font-bold h-14 px-9 text-lg gap-2.5 rounded-xl shadow-md transition-all hover:scale-105">
              <LayoutGrid className="w-5 h-5 text-purple-400" /> 进入自由简历设计器
            </Button>
          </Link>
        </div>

        <div className="mt-14 flex items-center justify-center gap-10 text-sm font-semibold text-slate-300">
          <span className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-400" /> PII 个人隐私安全脱敏</span>
          <span className="flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400" /> 秒级生成 HD 高清 PDF</span>
        </div>
      </div>
    </header>
  );
}
