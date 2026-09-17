import { useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronLeft,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  GitCompare,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Printer,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ResumeTemplateView } from "@/components/shared/resume-template-view";
import { TemplateSelector } from "@/components/shared/template-selector";
import { TemplateCustomizer } from "@/components/shared/template-customizer";
import { LegoDesigner } from "@/components/legoDesigner";
import { EmptyState, SectionTitle } from "@/components/shared/ui-helpers";
import { buildLegoSchemaFromResume } from "@/lib/lego-adapter";
import { useLegoDesignerStore } from "@/store/lego-designer-store";
import type { TemplateId } from "@/types/resume";
import { useResumeStore } from "@/store/resume-store";
import { copyToClipboard, dataUrlToBlobUrl, exportResumeAsPDF, exportResumeAsWord, formatResumeAsText } from "@/lib/utils";
import { exportJDAnalysisAsPDF, exportInterviewPrepAsPDF, exportFullAnalysisAsPDF } from "@/lib/export-analysis-pdf";
import { isForeignCompany } from "@/lib/company-config";
import { getOrBuildEnglishResume } from "@/lib/english-resume-builder";

export function ExportStep() {
  const {
    userInput,
    setUserInput,
    analysisResult,
    setAnalysisResult,
    selectedTemplate,
    setSelectedTemplate,
    templateOptions,
    customTemplateHTML,
    copied,
    setCopied,
    setCurrentStep,
  } = useResumeStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"standard" | "compare" | "lego">("standard");
  const [compareLeftTab, setCompareLeftTab] = useState<"file" | "text">("file");
  const [isWideLayout, setIsWideLayout] = useState<boolean>(true);
  const [activeLang, setActiveLang] = useState<"zh" | "en">("zh");
  const [legoFullScreen, setLegoFullScreen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const pdfBlobUrl = useMemo(() => {
    if (userInput.rawFileType === "pdf" && userInput.rawFileDataUrl) {
      return dataUrlToBlobUrl(userInput.rawFileDataUrl);
    }
    return "";
  }, [userInput.rawFileType, userInput.rawFileDataUrl]);

  if (!analysisResult) {
    return (
      <EmptyState
        message="请先完成输入材料并开始分析"
        actionLabel="返回输入材料"
        onAction={() => setCurrentStep("input")}
      />
    );
  }

  const { finalResume, englishResume } = analysisResult;
  const hasEnglish = Boolean(englishResume);
  const isForeign = isForeignCompany(userInput.companyType);

  const currentResume = activeLang === "en"
    ? (englishResume || getOrBuildEnglishResume(finalResume, userInput))
    : finalResume;
  const resumeText = formatResumeAsText(currentResume);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setUserInput({ avatarUrl: base64 });
        setAnalysisResult({
          ...analysisResult,
          finalResume: {
            ...finalResume,
            personalInfo: {
              ...(finalResume.personalInfo || { name: "", email: "", phone: "", location: "" }),
              avatarUrl: base64,
            },
          },
          ...(englishResume
            ? {
                englishResume: {
                  ...englishResume,
                  personalInfo: {
                    ...(englishResume.personalInfo || { name: "", email: "", phone: "", location: "" }),
                    avatarUrl: base64,
                  },
                },
              }
            : {}),
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveAvatar = () => {
    setUserInput({ avatarUrl: "" });
    setAnalysisResult({
      ...analysisResult,
      finalResume: {
        ...finalResume,
        personalInfo: {
          ...(finalResume.personalInfo || { name: "", email: "", phone: "", location: "" }),
          avatarUrl: "",
        },
      },
      ...(englishResume
        ? {
            englishResume: {
              ...englishResume,
              personalInfo: {
                ...(englishResume.personalInfo || { name: "", email: "", phone: "", location: "" }),
                avatarUrl: "",
              },
            },
          }
        : {}),
    });
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(resumeText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportWord = async () => {
    await exportResumeAsWord(currentResume, selectedTemplate, customTemplateHTML, templateOptions);
  };


  const handleExportPDF = () => {
    exportResumeAsPDF(currentResume, selectedTemplate, customTemplateHTML, templateOptions);
  };

  const handleImportToLego = (tplId: TemplateId) => {
    setSelectedTemplate(tplId);
    const freshSchema = buildLegoSchemaFromResume(userInput, analysisResult, tplId, templateOptions, customTemplateHTML);
    useLegoDesignerStore.getState().setSchema(freshSchema, true);
    setViewMode("lego");
  };

  const hasRawPdf = userInput.rawFileType === "pdf" && Boolean(userInput.rawFileDataUrl);
  const hasRawWord = userInput.rawFileType === "word";

  return (
    <div>
      <SectionTitle
        title="最终简历导出与对比"
        description="支持【原简历 vs 最终简历】宽屏无损双栏对比（支持 PDF/Word 原件直接预览），一键导出精美 Word / PDF 文件"
      />

      {/* Mode Switcher Tabs */}
      <div className="mb-6 flex justify-center w-full">
        <div className="bg-slate-200/80 p-1 rounded-xl shadow-inner flex border border-slate-300/60 w-full sm:w-auto justify-around sm:justify-center gap-1">
          <button
            type="button"
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 flex-1 sm:flex-initial ${
              viewMode === "standard"
                ? "bg-white text-blue-600 shadow-md scale-[1.02]"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setViewMode("standard")}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>标准预览</span>
          </button>
          <button
            type="button"
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 flex-1 sm:flex-initial ${
              viewMode === "compare"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setViewMode("compare")}
          >
            <GitCompare className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>前后对照</span>
          </button>
          <button
            type="button"
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 flex-1 sm:flex-initial cursor-pointer ${
              viewMode === "lego"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setViewMode("lego")}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>积木排版</span>
          </button>
          {viewMode === "lego" && (
            <button
              type="button"
              onClick={() => setLegoFullScreen(!legoFullScreen)}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-700/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title={legoFullScreen ? "退出全屏编辑 (ESC)" : "一键进入全屏沉浸式排版微调"}
            >
              {legoFullScreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">退出全屏</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">全屏微调</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {viewMode === "lego" ? (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mb-6 h-[88vh] min-h-[750px]">
          <LegoDesigner
            isFullScreen={legoFullScreen}
            onToggleFullScreen={() => setLegoFullScreen(!legoFullScreen)}
          />
        </div>
      ) : viewMode === "compare" ? (
        <div className={isWideLayout ? "-mx-4 sm:-mx-6 lg:-mx-10 space-y-4" : "space-y-4"}>
          {/* Compare Control Bar */}
          <div className="rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-purple-50/60 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-blue-950 font-medium">
              <GitCompare className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                <strong>原简历 vs 最终优化简历 对照模式</strong>：左侧为您提交的原始履历，右侧为 AI 基于目标 JD 重构精炼后的最终成稿。
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white text-blue-700 border-blue-200 text-[11px]">
                修改优化 {analysisResult.optimizedItems?.length || 0} 处
              </Badge>
              <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200 text-[11px]">
                匹配度 {analysisResult.diagnosis?.overallScore ?? 0}/100
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWideLayout(!isWideLayout)}
                className="text-xs bg-white border-blue-200 text-blue-700 hover:bg-blue-50 ml-1"
              >
                {isWideLayout ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5 mr-1" />
                    标准宽度
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5 mr-1 text-blue-600" />
                    宽屏展开对比
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-[850px]">
            {/* Left: Original Resume File or Text */}
            <Card className="flex flex-col border-neutral-200/90 shadow-xs bg-white overflow-hidden">
              <CardHeader className="py-3 px-4 bg-neutral-100/90 border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-2 space-y-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <CardTitle className="text-xs font-bold text-neutral-800">
                    原简历（原始材料）
                  </CardTitle>
                  {userInput.rawFileName && (
                    <span className="text-[11px] text-neutral-500 truncate max-w-[180px]">
                      ({userInput.rawFileName})
                    </span>
                  )}
                </div>

                {/* Left Tabs: File preview vs Extracted text */}
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-neutral-200">
                  {(hasRawPdf || hasRawWord) && (
                    <button
                      type="button"
                      onClick={() => setCompareLeftTab("file")}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                        compareLeftTab === "file"
                          ? "bg-blue-600 text-white font-bold shadow-2xs"
                          : "text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      {hasRawPdf ? "📄 PDF 原件预览" : "📄 Word 原件信息"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCompareLeftTab("text")}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      compareLeftTab === "text" || (!hasRawPdf && !hasRawWord)
                        ? "bg-blue-600 text-white font-bold shadow-2xs"
                        : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    📝 提炼文本
                  </button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-3 overflow-y-auto max-h-[900px]">
                {compareLeftTab === "file" && hasRawPdf ? (
                  <div className="flex flex-col h-full space-y-2">
                    <div className="flex items-center justify-between px-1 text-xs text-neutral-500">
                      <span className="text-[11px] font-medium text-slate-700">原文件 PDF 页面原生预览 (100% 原版面)</span>
                      {pdfBlobUrl && (
                        <a
                          href={pdfBlobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-[11px] flex items-center gap-1 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                        >
                          <ExternalLink className="h-3 w-3" />
                          在新标签页放大查看 PDF
                        </a>
                      )}
                    </div>
                    {pdfBlobUrl ? (
                      <object
                        data={pdfBlobUrl}
                        type="application/pdf"
                        className="w-full h-[820px] rounded-lg border border-slate-300 bg-white shadow-inner"
                      >
                        <iframe
                          src={pdfBlobUrl}
                          title="Original PDF Resume Preview"
                          className="w-full h-[820px] rounded-lg border border-slate-300 bg-white shadow-inner"
                        />
                      </object>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[400px] border border-dashed rounded-lg bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                        <p>PDF 原件加载中，您也可以切换至【📝 提炼文本】进行对比</p>
                      </div>
                    )}
                  </div>
                ) : compareLeftTab === "file" && hasRawWord ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-blue-950 font-medium">
                        <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                        <span>Word 原始文件: {userInput.rawFileName}</span>
                      </div>
                      {userInput.rawFileDataUrl && (
                        <a
                          href={userInput.rawFileDataUrl}
                          download={userInput.rawFileName || "原简历.docx"}
                          className="text-xs text-blue-700 bg-white border border-blue-200 px-2.5 py-1 rounded hover:bg-blue-50 font-medium shadow-2xs"
                        >
                          下载原 Word 文档
                        </a>
                      )}
                    </div>
                    <div className="rounded-lg border border-neutral-200 bg-white p-4 overflow-y-auto max-h-[780px] shadow-inner">
                      <pre className="font-sans text-xs leading-relaxed whitespace-pre-wrap text-neutral-800 font-normal">
                        {userInput.originalResume || "暂无文本数据"}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-neutral-200/80 bg-neutral-50/40 p-4 overflow-y-auto max-h-[820px] min-h-[600px] shadow-inner">
                    <pre className="font-sans text-xs leading-relaxed whitespace-pre-wrap text-neutral-800 font-normal">
                      {userInput.originalResume || "暂无原简历数据"}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Final Optimized Resume Preview */}
            <Card className="flex flex-col border-blue-200/90 shadow-xs bg-white overflow-hidden">
              <CardHeader className="py-3 px-4 bg-gradient-to-r from-blue-50 to-indigo-50/40 border-b border-blue-200/70 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <CardTitle className="text-xs font-bold text-blue-950">
                    最终优化简历（AI 重构成品）
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                  高清模版解析
                </Badge>
              </CardHeader>
              <CardContent className="flex-1 p-3 overflow-y-auto max-h-[900px] space-y-3">
                <TemplateSelector onImportToLego={handleImportToLego} />
                <ResumeTemplateView resume={currentResume} templateId={selectedTemplate} />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Template Selector & Customizer */}
          <TemplateSelector onImportToLego={handleImportToLego} />
          <TemplateCustomizer />

      {/* Photo Avatar Config Card */}
      <Card className="mb-6 border-indigo-100 bg-indigo-50/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-indigo-950">
            <Camera className="h-4 w-4 text-indigo-600" />
            配置个人证件照 / 形象照
          </CardTitle>
          <CardDescription>照片将自动呈现于双栏及自定义简历模板中，可随时上传或替换</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex h-24 w-20 items-center justify-center rounded-md border border-dashed border-indigo-300 bg-white overflow-hidden shadow-sm">
              {userInput.avatarUrl ? (
                <img
                  src={userInput.avatarUrl}
                  alt="证件照"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-neutral-300" />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*,.png,.jpg,.jpeg,.webp,.jfif,.bmp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera className="h-3.5 w-3.5" />
                  {userInput.avatarUrl ? "更换照片" : "上传证件照"}
                </Button>
                {userInput.avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleRemoveAvatar}
                  >
                    删除照片
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                推荐尺寸：1寸 / 2寸免冠照或职业形象照，支持 .jpg / .png
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Copy className="h-4 w-4" />
              复制纯文本
            </CardTitle>
            <CardDescription>一键复制最终优化版简历纯文本到剪贴板</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={handleCopy} className="w-full">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  已复制文本
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  复制最终简历文本
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Download className="h-4 w-4" />
              导出所选模板文件
            </CardTitle>
            <CardDescription>导出带所选样式的 Word (.doc) 或打印保存为高清 PDF</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleExportWord} variant="outline" className="flex-1">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              导出 Word 文档
            </Button>
            <Button onClick={handleExportPDF} variant="outline" className="flex-1">
              <Printer className="h-4 w-4 text-emerald-600" />
              导出 PDF 文件
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Live Preview of Chosen Template */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">当前模板实时预览</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("compare")}
              className="text-xs text-blue-700 border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 font-medium"
            >
              <GitCompare className="h-3.5 w-3.5 mr-1 text-blue-600" />
              开启原简历双栏对比
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-neutral-600 hover:text-neutral-900 border border-neutral-200 bg-white hover:bg-slate-50 font-medium gap-1 shadow-2xs">
                  <FileText className="h-3.5 w-3.5 text-neutral-500" />
                  查看纯文本格式
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl p-6 rounded-2xl">
                <DialogHeader className="pb-2 border-b border-slate-800">
                  <DialogTitle className="text-lg font-bold text-slate-50 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    纯文本格式简历
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400 font-medium mt-1">
                    无格式纯文本版本，可直接全选复制，方便粘贴至招聘平台文本框、邮件或第三方编辑器
                  </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                  <Textarea
                    readOnly
                    className="min-h-[420px] font-mono text-xs md:text-sm leading-relaxed bg-slate-950 border border-slate-800 text-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl p-4 selection:bg-blue-600 selection:text-white shadow-inner"
                    value={resumeText}
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">
                    共 {resumeText.length} 个字符
                  </span>
                  <Button
                    size="sm"
                    onClick={handleCopy}
                    className={`font-semibold text-xs h-9 px-5 rounded-lg gap-2 shadow-lg transition-all ${
                      copied
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        已成功复制全部纯文本
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-white" />
                        一键复制纯文本
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {(hasEnglish || isForeign) && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveLang("zh")}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  activeLang === "zh"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🇨🇳 中文版简历
              </button>
              <button
                type="button"
                onClick={() => setActiveLang("en")}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  activeLang === "en"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-blue-700 hover:bg-blue-50"
                }`}
              >
                🇺🇸 English Resume (全英文版)
              </button>
            </div>
            <span className="text-xs text-slate-500 font-medium">当前语言：{activeLang === "en" ? "English (全英文)" : "中文"}</span>
          </div>
        )}
        <ResumeTemplateView resume={currentResume} templateId={selectedTemplate} />
      </div>

      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/40 via-white to-blue-50/40">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm text-indigo-950 font-bold">完整岗位分析与面试报告导出</CardTitle>
            <CardDescription className="text-xs text-neutral-500 mt-0.5">
              一键生成高品质 A4 PDF 报告文件，方便存档与打印查看
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px]">
            PDF 打印防断页
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-indigo-100 bg-white/80 p-3 shadow-2xs">
              <p className="text-xs text-neutral-500">匹配度评分</p>
              <p className="text-2xl font-bold tabular-nums text-indigo-600">
                {analysisResult.diagnosis?.overallScore ?? 0}
                <span className="text-sm font-normal text-neutral-400">/100</span>
              </p>
            </div>
            <div className="rounded-md border border-indigo-100 bg-white/80 p-3 shadow-2xs">
              <p className="text-xs text-neutral-500">人岗匹配对比项</p>
              <p className="text-2xl font-bold tabular-nums text-blue-600">
                {analysisResult.matchItems?.length ?? 0}
                <span className="text-sm font-normal text-neutral-400"> 条</span>
              </p>
            </div>
            <div className="rounded-md border border-indigo-100 bg-white/80 p-3 shadow-2xs">
              <p className="text-xs text-neutral-500">面试追问预案</p>
              <p className="text-2xl font-bold tabular-nums text-purple-600">
                {analysisResult.interviewPrep?.likelyQuestions?.length ?? 0}
                <span className="text-sm font-normal text-neutral-400"> 题</span>
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-indigo-100/80 flex flex-wrap gap-2.5">
            <Button
              onClick={() => exportFullAnalysisAsPDF(userInput, analysisResult)}
              className="flex-1 min-w-[240px] bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md shadow-indigo-500/20 font-bold text-xs py-5"
            >
              <Printer className="h-4 w-4 mr-2" />
              📄 导出全景综合报告 PDF（含 JD解析+诊断+匹配+面试准备）
            </Button>
            {analysisResult.jdAnalysis && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportJDAnalysisAsPDF(userInput, analysisResult.jdAnalysis)}
                className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 text-xs"
              >
                <Download className="h-3.5 w-3.5 mr-1 text-blue-600" />
                仅导出 JD 解析 PDF
              </Button>
            )}
            {analysisResult.interviewPrep && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportInterviewPrepAsPDF(userInput, analysisResult.interviewPrep)}
                className="bg-white border-purple-200 text-purple-700 hover:bg-purple-50 text-xs"
              >
                <Download className="h-3.5 w-3.5 mr-1 text-purple-600" />
                仅导出 面试准备 PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
        </div>
      )}

      <div className="mt-6 flex justify-start">
        <Button variant="outline" size="sm" onClick={() => setCurrentStep("interview")}>
          <ChevronLeft className="h-4 w-4" />
          上一步：面试准备
        </Button>
      </div>
    </div>
  );
}
