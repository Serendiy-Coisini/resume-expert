import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="text-slate-400 hover:text-slate-100 gap-2 mb-8">
            <ArrowLeft className="w-4 h-4" /> 返回首页
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-50">隐私政策 (Privacy Policy)</h1>
        </div>

        <div className="space-y-6 text-slate-300 text-sm md:text-base leading-relaxed bg-slate-900/80 border border-slate-800 p-8 rounded-2xl shadow-xl">
          <p className="text-xs text-slate-400 font-semibold">最新更新日期：2026年8月11日</p>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-2">1. 数据收集与使用原则</h2>
            <p>简历专家（Resume Expert）高度尊重并保护用户的个人隐私。我们遵循“最小化收集”与“本地优先”的原则。系统仅在您使用 AI 智能诊断或模板排版功能时处理必要的简历文本与岗位描述（JD）数据。</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-2">2. PII 敏感信息脱敏保护</h2>
            <p>开启脱敏后，系统在发送模型请求前按规则替换识别到的姓名、电话、邮箱、身份证号、带标签的地址和公司名称。自动识别可能遗漏或误判，不保证覆盖全部个人信息；请在输入页检查发送预览，并手工删除不希望发送的内容。关闭脱敏后，原始文本和图片可能发送给所选模型服务商。图片本地 OCR 指在本应用服务器处理。</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-2">3. API Key 及密钥存储说明</h2>
            <p>您在“AI 配置”中填入的大模型 API Key（如 DeepSeek、OpenAI 等）均仅保存在您本地浏览器的 LocalStorage 或个人配置的环境变量中。我们绝不会在任何集中式服务端存储、备份或转售您的 API Key。</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-2">4. 第三方服务商与模型处理</h2>
            <p>简历诊断分析请求需调用您指定的 LLM 大模型服务商。请求内容仅用于当次对话与简历评估，不会被用于任何公开模型的商业训练。</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-2">5. 联系与反馈</h2>
            <p>如果您对本隐私政策有任何疑问、建议或隐私数据清理需求，请通过系统控制台客服支持或官方 GitHub 仓库提交 Feedback。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
