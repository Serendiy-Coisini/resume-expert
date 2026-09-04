"use client";

import { useState } from "react";
import { ChevronDown, Sparkles, ShieldCheck, Cpu, FileCheck2, HelpCircle, Search, Layers } from "lucide-react";

interface FAQItem {
  id: string;
  category: "all" | "ai" | "diagnosis" | "privacy";
  categoryLabel: string;
  q: string;
  a: string;
  tag: string;
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const faqs: FAQItem[] = [
    {
      id: "faq-1",
      category: "diagnosis",
      categoryLabel: "诊断与重构",
      tag: "Agent 引擎",
      q: "简历专家与普通 AI 聊天工具有什么本质区别？",
      a: "普通聊天工具仅能进行通用的语句润色，缺乏岗位对齐深度。简历专家采用了针对招聘场景研发的 Agent 诊断引擎：首先自动拆解目标 JD 的隐性硬性要求并进行精准对齐度打分；随后通过“启发式追问”引导你补全缺失的量化数据与关键成果；最后遵循 STAR 法则重构出极具说服力的高含金量 Bullet 履历。",
    },
    {
      id: "faq-2",
      category: "ai",
      categoryLabel: "模型与 API",
      tag: "BYOK 模式",
      q: "如何配置 AI 大模型？需要付费购买额度吗？",
      a: "系统采用零强制订阅的 BYOK（Bring Your Own Key）模式。在“AI 配置”中，你可以填入自己的 DeepSeek、OpenAI (GPT-4o)、Kimi (Moonshot)、阿里通义千问、智谱 AI 或自定义 OpenAI 兼容 Endpoint API Key。使用自己的 API 额度，单次简历深度分析成本仅约 0.01~0.03 元，极大降低了使用门槛与使用成本。",
    },
    {
      id: "faq-3",
      category: "privacy",
      categoryLabel: "隐私与安全",
      tag: "PII 本地脱敏",
      q: "系统如何保障我的个人隐私与简历数据安全？",
      a: "我们高度重视个人隐私与信息安全：1. 系统内置 PII (Personally Identifiable Information) 隐私脱敏模块，在向 AI 接口发送请求前，会自动识别并替换姓名、手机号、电子邮箱、身份证号等敏感信息；2. 您的 API Key 及个性化设置均仅保存在您本地设备存储或指定环境变量中，绝不会被上传或转售给第三方，也不会用于公共大模型训练。",
    },
    {
      id: "faq-5",
      category: "diagnosis",
      categoryLabel: "诊断与重构",
      tag: "启发式追问",
      q: "如果我不擅长提炼工作量化成果，AI 启发式追问如何帮助我？",
      a: "AI 会在对比 JD 与你的原始简历后，自动找出关键经历中的“数据空白”与“能力缺口”，提出针对性的追问（例如：“在该项目中你负责的模块并发量是多少？最终提升了多少性能或转化率？”）。你只需用平实口语回答真实情况，系统就会将这些零碎信息提炼改写为符合 STAR 法则（背景-任务-行动-结果）的专业表达式。",
    },
    {
      id: "faq-6",
      category: "diagnosis",
      categoryLabel: "诊断与重构",
      tag: "积木设计器",
      q: "除了智能诊断与改写，系统还提供模版排版设计能力吗？",
      a: "是的！系统内置“积木式自由简历设计器”（Lego Designer），提供丰富专业模版，支持简历模块拖拽排序、自由增减自定义板块、字体行距微调及多色彩主题切换，让你无需设计背景也能分钟级输出排版严谨优雅的顶级简历。",
    },
    {
      id: "faq-7",
      category: "ai",
      categoryLabel: "模型与 API",
      tag: "Mock 演示模式",
      q: "系统顶部的「Mock · 未配置 LLM_API_KEY」是什么模式？",
      a: "Mock 模式是系统的演示与离线模拟数据模式。在未配置 API Key 时自动开启，零费用、不消耗 Token。系统内置了一套高保真的专业简历诊断打分、启发式追问 Bullet 和前后对比范例，方便你零门槛完整体验产品全流程。配置并保存个人 Key 后，系统将自动无缝切换为真实 AI 大模型实时分析重构模式。",
    },
  ];

  const categories = [
    { key: "all", label: "全部问题", icon: HelpCircle },
    { key: "diagnosis", label: "诊断与 STAR 重构", icon: Sparkles },
    { key: "ai", label: "AI 模型与配置", icon: Cpu },
    { key: "privacy", label: "隐私与数据安全", icon: ShieldCheck },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="faq" className="py-24 bg-slate-950 border-b border-slate-800/80 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container max-w-5xl mx-auto px-4 relative z-10">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-50 tracking-tight">
            常见问题解答
          </h2>
          <p className="text-slate-400 font-medium text-base mt-3">
            根据当前最新 Agent 诊断引擎与大模型架构整理，助你快速了解隐私、配置与诊断机制
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl w-full md:w-auto">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    setActiveCategory(cat.key);
                    setOpenIndex(0);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索常见问题..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* FAQ Accordion List */}
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
            <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-base font-medium">未找到匹配的问题，尝试调整搜索关键字或切换分类。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? "bg-slate-900 border-blue-500/40 shadow-lg shadow-blue-950/40"
                      : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full p-6 text-left flex items-start justify-between gap-4 font-bold text-base md:text-lg text-slate-100 hover:text-blue-400 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 shrink-0 w-fit">
                        {faq.tag}
                      </span>
                      <span>{faq.q}</span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 mt-1 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-blue-400" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-slate-300 text-sm md:text-base leading-relaxed border-t border-slate-800/80 pt-4 bg-slate-950/30">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Sub-note */}
        <div className="mt-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <FileCheck2 className="w-4 h-4 text-emerald-400" />
          <span>解答内容根据简历专家 2.4 Agent 诊断版本及算法规范实时更新</span>
        </div>
      </div>
    </section>
  );
}
