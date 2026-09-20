"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings, ChevronRight, Check, Loader2, Eye, EyeOff,
  Sparkles, ExternalLink, AlertCircle, ArrowLeft, Zap, RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAIConfigStore } from "@/store/ai-config-store";

const PROVIDERS = [
  {
    id: "deepseek",
    name: "DeepSeek",
    label: "推荐 · 性价比最高",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    provider: "openai",
    guideUrl: "https://platform.deepseek.com/api_keys",
    guideSteps: ["打开 platform.deepseek.com 并注册", "登录后进入 API Keys 页面", "点击「创建 API Key」", "复制生成的密钥粘贴到下方"],
    freeQuota: "注册即送 500 万 Token 免费额度",
    bgColor: "bg-blue-500/10 border-blue-500/30 hover:border-blue-400",
  },
  {
    id: "siliconflow",
    name: "硅基流动 (SiliconFlow)",
    label: "部分模型完全免费",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen2.5-7B-Instruct",
    provider: "openai",
    guideUrl: "https://cloud.siliconflow.cn/account/ak",
    guideSteps: ["打开 cloud.siliconflow.cn 并注册", "进入 账户 → API 密钥", "创建新密钥", "复制密钥粘贴到下方"],
    freeQuota: "多个开源模型完全免费调用",
    bgColor: "bg-purple-500/10 border-purple-500/30 hover:border-purple-400",
  },
  {
    id: "openai",
    name: "OpenAI (ChatGPT)",
    label: "全球最强模型",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    provider: "openai",
    guideUrl: "https://platform.openai.com/api-keys",
    guideSteps: ["打开 platform.openai.com", "登录 OpenAI 账号", "进入 API Keys 页面", "创建新的 Secret Key 并复制"],
    freeQuota: "新账号赠送 $5 免费额度",
    bgColor: "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-400",
  },
  {
    id: "moonshot",
    name: "月之暗面 (Kimi)",
    label: "国产优质模型",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
    provider: "openai",
    guideUrl: "https://platform.moonshot.cn/console/api-keys",
    guideSteps: ["打开 platform.moonshot.cn", "注册并登录", "进入 API 管理页面", "新建密钥并复制"],
    freeQuota: "新用户赠送 15 元额度",
    bgColor: "bg-amber-500/10 border-amber-500/30 hover:border-amber-400",
  },
  {
    id: "custom",
    name: "自定义 OpenAI 兼容接口",
    label: "高级用户",
    baseUrl: "",
    model: "",
    provider: "openai",
    guideUrl: "",
    guideSteps: [],
    freeQuota: "",
    bgColor: "bg-slate-500/10 border-slate-500/30 hover:border-slate-400",
  },
];

export default function SettingsPage() {
  const {
    config: storedConfig,
    setConfig: setStoredConfig,
    resetConfig: resetStoredConfig,
  } = useAIConfigStore();

  const [selectedProvider, setSelectedProvider] = useState<string | null>("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && storedConfig) {
      if (storedConfig.providerId) setSelectedProvider(storedConfig.providerId);
      if (storedConfig.apiKey) setApiKey(storedConfig.apiKey);
      if (storedConfig.baseUrl) setCustomBaseUrl(storedConfig.baseUrl);
      if (storedConfig.model) setCustomModel(storedConfig.model);
      setInitialized(true);
    }
  }, [storedConfig, initialized]);

  const provider = PROVIDERS.find((p) => p.id === selectedProvider);

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const baseUrl = selectedProvider === "custom" ? customBaseUrl : provider?.baseUrl;
      const model = selectedProvider === "custom" ? customModel : provider?.model;
      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), baseUrl, model }),
      });
      const data = await res.json();
      setTestResult({ success: data.success, message: data.success ? "连接成功！AI 服务可正常使用" : data.error || "连接失败" });
    } catch {
      setTestResult({ success: false, message: "网络请求失败，请检查网络" });
    } finally {
      setTesting(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("确定要清空当前浏览器中保存的 AI API Key 及相关配置吗？")) {
      return;
    }
    setResetting(true);
    try {
      // 1. Reset client localStorage
      resetStoredConfig();
      setApiKey("");
      setCustomBaseUrl("");
      setCustomModel("");
      setSelectedProvider("deepseek");
      setTestResult(null);

      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
    } catch {
      // ignore
    } finally {
      setResetting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      const baseUrl = selectedProvider === "custom" ? customBaseUrl : provider?.baseUrl;
      const model = selectedProvider === "custom" ? customModel : provider?.model;
      const providerType = provider?.provider || "openai";

      // 1. Save directly into browser localStorage (persisted across sessions)
      setStoredConfig({
        apiKey: apiKey.trim(),
        baseUrl: baseUrl || "",
        model: model || "",
        providerId: selectedProvider || "deepseek",
        provider: providerType,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">返回首页</span>
          </Link>
          <Link href="/expert">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-bold gap-1.5">
              <Zap className="w-3.5 h-3.5" /> 开始使用简历诊断
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-6">
            <Settings className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-50">配置你的 AI 大模型</h1>
          <p className="text-slate-300 text-lg mt-3 max-w-2xl mx-auto">
            选择一个 AI 服务商，填入你自己的 API Key，即可无限使用简历分析与重构优化功能
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>纯客户端隔离存储：配置保存在您的本地浏览器中，下次访问自动加载生效，绝不上报或存储在服务器上</span>
          </div>
        </div>

        {/* Step 1: Select Provider */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">1</span>
            选择 AI 服务商
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedProvider(p.id); setTestResult(null); setSaved(false); setShowGuide(true); }}
                className={`text-left p-5 rounded-xl border-2 transition-all ${
                  selectedProvider === p.id
                    ? p.bgColor.replace("hover:", "") + " ring-1 ring-blue-500/50"
                    : "border-slate-800 hover:border-slate-700 bg-slate-900/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-100 text-base">{p.name}</div>
                    <div className="text-sm text-slate-400 mt-0.5">{p.label}</div>
                  </div>
                  {selectedProvider === p.id && <Check className="w-5 h-5 text-blue-400" />}
                </div>
                {p.freeQuota && (
                  <div className="mt-2.5 text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {p.freeQuota}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Enter API Key */}
        {selectedProvider && (
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">2</span>
              填写 API Key
            </h2>

            {/* Guide toggle */}
            {provider && provider.guideSteps.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-sm text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${showGuide ? "rotate-90" : ""}`} />
                  如何获取 {provider.name} 的 API Key？
                </button>
                {showGuide && (
                  <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                    {provider.guideSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm text-slate-200">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                    {provider.guideUrl && (
                      <a
                        href={provider.guideUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-semibold mt-2 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> 前往 {provider.name} 官网注册获取 API Key
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* API Key input */}
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 h-12 pr-12 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Custom provider extra fields */}
              {selectedProvider === "custom" && (
                <>
                  <Input
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    placeholder="API Base URL (例如 https://api.example.com/v1)"
                    className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 h-12 text-sm"
                  />
                  <Input
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="模型名称 (例如 gpt-4o-mini)"
                    className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 h-12 text-sm"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Test & Save */}
        {selectedProvider && (
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">3</span>
              测试连接并保存
            </h2>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleTest}
                disabled={testing || !apiKey.trim()}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold h-12 px-6 gap-2 justify-center"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-400" />}
                测试连接
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !apiKey.trim()}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 px-8 gap-2 disabled:opacity-50 justify-center"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saved ? "已保存 ✓" : "保存配置"}
              </Button>
              <Button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                variant="outline"
                className="w-full sm:w-auto bg-rose-950/30 hover:bg-rose-900/50 border-rose-800/60 text-rose-300 hover:text-rose-200 font-semibold h-12 px-5 gap-2 justify-center transition-all"
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 text-rose-400" />}
                {resetSuccess ? "已重置 ✓" : "清空重置"}
              </Button>
            </div>


            {/* Test result */}
            {testResult && (
              <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 ${
                testResult.success
                  ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-300"
                  : "bg-red-950/50 border-red-500/30 text-red-300"
              }`}>
                {testResult.success ? <Check className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />}
                <div>
                  <div className="font-bold text-sm">{testResult.success ? "连接成功" : "连接失败"}</div>
                  <div className="text-sm mt-0.5 opacity-80">{testResult.message}</div>
                </div>
              </div>
            )}

            {/* Success next step */}
            {saved && (
              <div className="mt-6 p-5 rounded-xl bg-blue-950/50 border border-blue-500/30 text-center">
                <p className="text-blue-300 font-bold text-lg">🎉 配置已成功保存至当前浏览器！</p>
                <p className="text-slate-300 text-sm mt-1">你的配置已安全保存在本地存储中，下次访问无需重复配置，即可直接调用 AI 分析</p>
                <Link href="/expert" className="inline-block mt-4">
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 px-8 gap-2">
                    <Sparkles className="w-4 h-4" /> 立即开始分析重构简历
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* FAQ */}
        <div className="mt-16 pt-10 border-t border-slate-800">
          <h3 className="text-lg font-bold text-slate-200 mb-4">常见问题</h3>
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="font-bold text-slate-200">Q: 界面顶部的「Mock · 未配置 LLM_API_KEY」是什么模式？</div>
              <div className="text-slate-300 mt-1">A: <strong>Mock 模式（演示与离线模拟数据模式）</strong>：当您未配置 API Key 时系统自动开启该模式。它无需填 Key、不消耗 Token、不花任何费用，内置了一套高保真专业简历的离线诊断与改写范例，让您可以零门槛完整体验诊断对齐、启发式追问、积木排版与 PDF 导出的全流程。配置并保存自己的 API Key 后，系统会自动无缝切换至真实大模型实时分析重构模式。</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="font-bold text-slate-200">Q: 使用自己的 API Key 大概需要多少费用？</div>
              <div className="text-slate-300 mt-1">A: 深度分析一份完整简历（包括 JD 拆解、缺口分析、启发式追问与 STAR 改写）大约消耗 3000~6000 Token。以 DeepSeek 为例，单次分析成本仅约 0.01~0.03 元，非常便宜！</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="font-bold text-slate-200">Q: 我的 API Key 安全吗？会泄露给第三方吗？</div>
              <div className="text-slate-300 mt-1">A: 完全安全。API Key 仅保存在你自己电脑本地浏览器存储或私有配置文件（.env.local）中，绝不会被上传、共享或出售给任何第三方服务器。</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="font-bold text-slate-200">Q: 推荐使用哪个 AI 大模型服务商？</div>
              <div className="text-slate-300 mt-1">A: 强烈推荐使用 DeepSeek（DeepSeek-V3 / R1），逻辑推理与履历诊断表达能力极其出彩，且 Token 价格便宜。系统也原生支持 OpenAI (GPT-4o)、Kimi (Moonshot)、阿里通义千问及 SiliconFlow。</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="font-bold text-slate-200">Q: 如果出现 API 连通测试失败该如何排查？</div>
              <div className="text-slate-300 mt-1">A: 请检查 API Key 是否存在前后空格、账号余额是否充足、BaseURL 格式是否正确。在国内网络环境下，推荐优先选择 DeepSeek 或阿里通义千问等无需特殊网络代理的服务商。</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="font-bold text-slate-200">Q: 不配置 API Key 是否可以正常体验与导出？</div>
              <div className="text-slate-300 mt-1">A: 可以！系统内置 Demo / Mock 体验模式。在未配置 Key 时，你依然可以完整体验积木设计器（Lego Designer）排版与高清矢量 PDF 导出功能。</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
