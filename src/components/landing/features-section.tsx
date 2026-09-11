import { Brain, Target, MessageSquareCode, FileUp, Sparkles, LayoutGrid } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: Target,
      color: "text-blue-400 bg-blue-500/15 border-blue-500/30",
      title: "JD 要求精准拆解",
      desc: "提取岗位核心硬性指标、隐性需求与高频关键词，打造针对性极强的匹配诊断。",
    },
    {
      icon: Brain,
      color: "text-purple-400 bg-purple-500/15 border-purple-500/30",
      title: "多维度简历评分诊断",
      desc: "从结构、量化表现、岗位对齐度等维度打分，直观指出短板与优化改进空间。",
    },
    {
      icon: MessageSquareCode,
      color: "text-indigo-400 bg-indigo-500/15 border-indigo-500/30",
      title: "AI 启发式深度追问",
      desc: "针对匹配缺口精准发问，引导你补充关键项目数据与细节，让叙事更有说服力。",
    },
    {
      icon: Sparkles,
      color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
      title: "STAR 法则一键重构",
      desc: "遵循 Situation-Task-Action-Result 法则，自动改写提炼高质量专业 Bullet。",
    },
    {
      icon: FileUp,
      color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
      title: "高清 PDF / Word 导出",
      desc: "支持服务端原生矢量渲染，一键保存矢量 PDF 或编辑版 Word 格式。",
    },
    {
      icon: LayoutGrid,
      color: "text-pink-400 bg-pink-500/15 border-pink-500/30",
      title: "积木拖拽排版设计",
      desc: "内置丰富精美模版，模块自由增删与排版微调，让简历好看又专业。",
    },
  ];

  return (
    <section id="features" className="py-24 bg-slate-950 border-b border-slate-800">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-bold text-blue-400 tracking-wider uppercase">Powerful Features</span>
          <h2 className="text-4xl md:text-5xl font-black mt-2 text-slate-50">
            全流程 AI 简历优化解决方案
          </h2>
          <p className="text-slate-200 font-medium text-lg mt-4">
            不仅仅是简单的文本修正，而是从 JD 拆解到面试备战的一站式 Agent 辅助。
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="p-7 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 transition-all hover:-translate-y-1 shadow-lg"
            >
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-6 ${item.color}`}>
                <item.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-50 mb-3">{item.title}</h3>
              <p className="text-slate-200 text-base leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
