'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLegoDesignerStore } from '@/store/lego-designer-store';
import { useResumeStore } from '@/store/resume-store';
import { PRESET_RESUMES, type PresetResumeItem } from '@/lib/preset-resumes';
import { parseResumeFromText } from '@/lib/resume-parser';
import { renderPdfPagesToImages } from '@/lib/pdf-to-images';
import { getAIHeaders } from '@/store/ai-config-store';
import { buildLegoSchemaFromResume, fillAiDataIntoExistingSchema } from '@/lib/lego-adapter';
import type { FinalResume, AnalysisResult, TemplateId, WorkExperience, ProjectExperience } from '@/types/resume';
import {
  X,
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  User,
  Briefcase,
  FolderKanban,
  GraduationCap,
  Wrench,
  Layers,
  FileUp,
  Loader2,
  Check,
  LayoutTemplate,
  RefreshCw,
  Search,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Camera
} from 'lucide-react';

interface ImportResumeDialogProps {
  open: boolean;
  onClose: () => void;
}

const PRESET_RECOMMENDED_TEMPLATE: Record<string, TemplateId> = {
  'ai-pm': 'modern-sidebar',
  'frontend-engineer': 'timeline-tech',
  'java-backend': 'corporate-banner',
  'data-scientist': 'modern-sidebar',
  'ui-ux-designer': 'grid-cards',
  'marketing-growth': 'corporate-banner',
  'finance-consultant': 'corporate-banner',
  'fresh-graduate': 'minimal'
};

const TEMPLATE_NAMES: Record<TemplateId, string> = {
  'modern-sidebar': '🖼️ 现代深色双栏',
  'classic-minimal': '📝 经典极简单栏',
  'corporate-banner': '🏢 商务 Header 沉稳范',
  'timeline-tech': '⏱️ 时间轴极客型',
  'grid-cards': '🎴 微阴影卡片流',
  'minimal': '🌿 简约清新风格',
  'github-tech': '💻 Github 极客风',
  'custom': '🎨 自定义模版'
};

const SAMPLE_RESUME_TEXT = `李明轩
电话：138-1234-5678 | 邮箱：mingxuan.li@example.com | 城市：北京 · 海淀
求职意向：全栈开发工程师 / 技术架构师

【职业摘要】
6 年互联网与企业级 SaaS 研发经验，精通 React/Next.js 前端架构与 Node.js/Go 后端微服务。具备高并发系统调优、低代码画布引擎与 AI 智能体应用落地实战经验，主导系统支撑千万级用户访问。

【核心技能】
React / Next.js · TypeScript · Tailwind CSS · Node.js / NestJS · Go / Gin · Docker / K8s · Redis 缓存调优 · PostgreSQL / MySQL · 提示词工程

【工作经历】
数智云创科技（北京）有限公司 · 高级全栈工程师
2022.05 - 至今
• 负责可视化积木搭建平台与中台微服务架构设计，基于 React + Canvas 实现高性能流式排版；
• 主导 SSR 渲染与缓存链路优化，将页面首屏 LCP 耗时由 2.4s 降低至 0.75s，性能提升 68%；
• 带领 6 人研发小组协同推进，保障季度版本上线交付率达 99.2%，线上故障率降低 45%。

未来智能互娱网络科技 · 全栈工程师
2019.07 - 2022.04
• 独立负责企业用户画像与数据看板系统研发，实现百人协同实时在线编辑功能；
• 优化复杂 SQL 查询与 Redis 二级缓存，将核心 API 接口 P99 响应耗时由 450ms 压降至 65ms。

【项目经历】
跨平台智能化简历排版与排版诊断引擎 · 核心架构师
2023.08 - 2024.03
• 设计基于标准 JSON Schema 的组件布局与自适应引擎，支持多行业模版自由换肤与即时重填；
• 集成 LLM 大模型结构化解析服务，将非结构化简历文本转为结构化数据的解析准确率提升至 95%。

【教育背景】
北京航空航天大学 · 硕士 · 计算机科学与技术 (2016.09 - 2019.06)`;

export const ImportResumeDialog: React.FC<ImportResumeDialogProps> = ({ open, onClose }) => {
  const { schema, setSchema } = useLegoDesignerStore();
  const {
    userInput,
    setUserInput,
    analysisResult,
    setAnalysisResult,
    selectedTemplate,
    setSelectedTemplate,
    templateOptions,
    customTemplateHTML
  } = useResumeStore();

  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'form' | 'json'>('presets');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ai-pm');
  const [previewPresetId, setPreviewPresetId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Floating feedback toast
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((cur) => (cur?.text === text ? null : cur));
    }, 3500);
  };

  // Active working structured resume data in dialog
  const [resumeData, setResumeData] = useState<FinalResume>(() => {
    if (analysisResult?.finalResume) {
      return JSON.parse(JSON.stringify(analysisResult.finalResume));
    }
    return JSON.parse(JSON.stringify(PRESET_RESUMES[0].data));
  });

  const [rawText, setRawText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseStatus, setParseStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    stats?: {
      workCount: number;
      projectCount: number;
      skillCount: number;
      hasEducation: boolean;
      hasContact: boolean;
    };
  } | null>(null);

  const [targetTemplate, setTargetTemplate] = useState<TemplateId>('modern-sidebar');
  const [jsonText, setJsonText] = useState<string>('');
  const [copiedJson, setCopiedJson] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state on open
  useEffect(() => {
    if (open) {
      if (analysisResult?.finalResume) {
        setResumeData(JSON.parse(JSON.stringify(analysisResult.finalResume)));
        setRawText(userInput.originalResume || '');
        const matchingPreset = PRESET_RESUMES.find(
          (p) =>
            p.data.jobIntent === analysisResult.finalResume.jobIntent ||
            p.data.personalInfo.name === analysisResult.finalResume.personalInfo.name
        );
        if (matchingPreset) {
          setSelectedPresetId(matchingPreset.id);
        }
      } else {
        const defaultPreset = PRESET_RESUMES[0];
        setResumeData(JSON.parse(JSON.stringify(defaultPreset.data)));
        setRawText(defaultPreset.rawText);
        setSelectedPresetId(defaultPreset.id);
      }
      setTargetTemplate(selectedTemplate || 'modern-sidebar');
      setParseStatus(null);
      setPreviewPresetId(null);
    }
  }, [open, analysisResult, userInput.originalResume, selectedTemplate]);

  // Keep JSON view in sync
  useEffect(() => {
    setJsonText(JSON.stringify(resumeData, null, 2));
  }, [resumeData]);

  // Real-time live parse when rawText changes in upload tab
  useEffect(() => {
    if (activeTab === 'upload' && rawText.trim().length > 30) {
      const timer = setTimeout(() => {
        try {
          const { finalResume: parsed, userInput: parsedInput } = parseResumeFromText(rawText);
          setResumeData(parsed);
          setUserInput(parsedInput);
        } catch {
          // ignore background typing errors
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [rawText, activeTab, setUserInput]);

  if (!open) return null;

  // Helper to create a complete type-safe AnalysisResult
  const createCompleteAnalysisResult = (dataToSync: FinalResume): AnalysisResult => {
    return {
      ...(analysisResult || {
        jdAnalysis: {
          responsibilities: [],
          hardRequirements: [],
          implicitRequirements: [],
          keywords: [],
          idealCandidate: '',
          coreCompetencies: []
        },
        diagnosis: {
          overallScore: 88,
          dimensionScores: [],
          mainIssues: [],
          prioritySuggestions: []
        },
        matchItems: [],
        followUpQuestions: [],
        optimizedItems: [],
        interviewPrep: {
          likelyQuestions: [],
          evidenceToPrepare: [],
          possibleExaggerations: [],
          dataToSupplement: [],
          selfIntroduction: ''
        }
      }),
      matchItems: analysisResult?.matchItems || [],
      followUpQuestions: analysisResult?.followUpQuestions || [],
      optimizedItems: analysisResult?.optimizedItems || [],
      interviewPrep: analysisResult?.interviewPrep || {
        likelyQuestions: [],
        evidenceToPrepare: [],
        possibleExaggerations: [],
        dataToSupplement: [],
        selfIntroduction: ''
      },
      finalResume: dataToSync
    };
  };

  // Sync to Global Resume Store
  const syncToGlobalStore = (dataToSync: FinalResume) => {
    setUserInput({
      targetRole: dataToSync.jobIntent || userInput.targetRole,
      highlightSkills: dataToSync.coreSkills?.join('、') || userInput.highlightSkills,
      additionalInfo: dataToSync.summary || userInput.additionalInfo,
      avatarUrl: dataToSync.personalInfo?.avatarUrl || userInput.avatarUrl,
      originalResume: rawText || userInput.originalResume
    });

    setAnalysisResult(createCompleteAnalysisResult(dataToSync));
  };

  // Handle Preset Selection
  const handleSelectPreset = (preset: PresetResumeItem) => {
    setSelectedPresetId(preset.id);
    const clonedData = JSON.parse(JSON.stringify(preset.data));
    setResumeData(clonedData);
    setRawText(preset.rawText);
    const recTemplate = PRESET_RECOMMENDED_TEMPLATE[preset.id];
    if (recTemplate) {
      setTargetTemplate(recTemplate);
    }
    showToast('info', `已选中【${preset.title}】，可点击下方套用或一键重填`);
    setParseStatus({
      type: 'success',
      message: `已选中预设简历【${preset.title}】的数据（推荐排版风格：${TEMPLATE_NAMES[recTemplate] || '现代排版'}）`,
      stats: {
        workCount: clonedData.workExperience.length,
        projectCount: clonedData.projectExperience.length,
        skillCount: clonedData.coreSkills.length,
        hasEducation: Boolean(clonedData.education.school),
        hasContact: Boolean(clonedData.personalInfo.phone || clonedData.personalInfo.email)
      }
    });
  };

  // Direct 1-Click Apply from Preset Card
  const handleApplyPresetDirectly = (preset: PresetResumeItem, mode: 'refill' | 'template') => {
    setIsApplying(true);
    try {
      setSelectedPresetId(preset.id);
      const clonedData = JSON.parse(JSON.stringify(preset.data));
      setResumeData(clonedData);
      setRawText(preset.rawText);

      const recTemplate = PRESET_RECOMMENDED_TEMPLATE[preset.id] || targetTemplate;
      syncToGlobalStore(clonedData);
      const completeAnalysis = createCompleteAnalysisResult(clonedData);

      const updatedUserInput = {
        ...userInput,
        targetRole: clonedData.jobIntent,
        highlightSkills: clonedData.coreSkills.join('、'),
        additionalInfo: clonedData.summary,
        avatarUrl: clonedData.personalInfo.avatarUrl,
        originalResume: preset.rawText
      };

      if (mode === 'refill') {
        const filledSchema = fillAiDataIntoExistingSchema(schema, updatedUserInput, completeAnalysis);
        setSchema(filledSchema, true);
        showToast('success', `🎉 已成功将【${preset.title}】数据重填到当前画布！`);
        setTimeout(onClose, 600);
      } else {
        setSelectedTemplate(recTemplate);
        setTargetTemplate(recTemplate);
        const freshSchema = buildLegoSchemaFromResume(
          updatedUserInput,
          completeAnalysis,
          recTemplate,
          templateOptions,
          customTemplateHTML
        );
        setSchema(freshSchema, true);
        showToast('success', `🎉 已成功套用【${TEMPLATE_NAMES[recTemplate]}】并装填简历数据！`);
        setTimeout(onClose, 600);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? `应用失败：${err.message}` : '操作失败，请重试');
    } finally {
      setIsApplying(false);
    }
  };

  // Handle Text Parsing
  const handleParseText = (textOverride?: string) => {
    const textToParse = textOverride || rawText;
    if (!textToParse.trim()) {
      setParseStatus({
        type: 'error',
        message: '请先输入或粘贴简历文本内容'
      });
      return;
    }

    setIsParsing(true);
    try {
      const { finalResume: parsed, userInput: parsedInput, stats } = parseResumeFromText(textToParse);
      setResumeData(parsed);
      setParseStatus({
        type: 'success',
        message: `🎉 智能解析成功！已提取 ${stats.workCount} 段工作经历、${stats.projectCount} 个项目、${stats.skillCount} 项核心技能。`,
        stats
      });
      setUserInput(parsedInput);
      showToast('success', '简历文本提取完成，已同步结构化数据！');
    } catch (err) {
      setParseStatus({
        type: 'error',
        message: err instanceof Error ? `解析异常：${err.message}` : '简历文本解析失败，请检查格式'
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Handle Load Sample Text
  const handleLoadSampleText = () => {
    setRawText(SAMPLE_RESUME_TEXT);
    handleParseText(SAMPLE_RESUME_TEXT);
  };

  // Handle File Upload (PDF / DOCX / TXT / MD / PNG / JPG)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(fileName);
    const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf';

    setIsParsing(true);
    setParseStatus({
      type: 'info',
      message: `正在读取并解析文件「${file.name}」...`
    });

    try {
      let extractedText = '';

      if (isImage) {
        setParseStatus({
          type: 'info',
          message: `正在通过智能视觉识别 / OCR 提炼简历图片「${file.name}」中的文字...`
        });

        // Convert image file to Base64 Data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch('/api/parse-resume-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAIHeaders(),
          },
          body: JSON.stringify({ images: [dataUrl] }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || '图片简历识别失败');
        }
        extractedText = data.text || '';
      } else if (isPdf) {
        // Step 1: Try fast text-layer extraction
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (res.ok && data.text && data.text.trim().length >= 20) {
          extractedText = data.text;
        } else if (data.isScannedPdf || !data.text || data.text.trim().length < 20) {
          // Step 2: Vector/Scanned PDF fallback -> render pages to images and run Vision/OCR
          setParseStatus({
            type: 'info',
            message: `检测到矢量排版/纯图片扫描版 PDF，正在启动智能视觉 / OCR 引擎提炼文字...`
          });

          const pageImages = await renderPdfPagesToImages(file, 4);
          if (!pageImages || pageImages.length === 0) {
            throw new Error('未能从 PDF 中提取出有效页面图像');
          }

          const visionRes = await fetch('/api/parse-resume-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAIHeaders(),
            },
            body: JSON.stringify({ images: pageImages }),
          });

          const visionData = await visionRes.json();
          if (!visionRes.ok || visionData.error) {
            throw new Error(visionData.error || '矢量/扫描版 PDF 视觉提炼失败');
          }
          extractedText = visionData.text || '';
        } else {
          throw new Error(data.error || '文件解析服务异常');
        }
      } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || '文件解析服务异常');
        }
        extractedText = data.text || '';
      } else {
        // Plain text file (txt / md)
        extractedText = await file.text();
      }

      if (!extractedText.trim()) {
        throw new Error('未能从文件中提取出有效文本');
      }

      setRawText(extractedText);
      const { finalResume: parsed, userInput: parsedInput, stats } = parseResumeFromText(extractedText);
      setResumeData(parsed);
      setUserInput(parsedInput);
      setParseStatus({
        type: 'success',
        message: `🎉 文件解析成功！已提取 ${stats.workCount} 段工作经历、${stats.projectCount} 个项目、${stats.skillCount} 项核心技能。`,
        stats
      });
      showToast('success', `已成功解析并提取文件「${file.name}」！`);
    } catch (err) {
      setParseStatus({
        type: 'error',
        message: err instanceof Error ? `文件解析失败：${err.message}` : '文件解析失败，请重试'
      });
      showToast('error', '文件解析失败，请检查格式');
    } finally {
      setIsParsing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Handle Local Avatar Upload
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('error', '请选择有效的图片文件 (JPG / PNG / WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      handleUpdatePersonalInfo('avatarUrl', base64);
      showToast('success', '本地头像已成功上传并更新！');
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  // Action 1: Fill into Existing Schema (Preserve Canvas Layout)
  const handleRefillExistingCanvas = () => {
    setIsApplying(true);
    try {
      let dataToApply = resumeData;
      let inputToApply = userInput;

      if (activeTab === 'upload' && rawText.trim()) {
        const { finalResume: parsed, userInput: parsedInput } = parseResumeFromText(rawText);
        dataToApply = parsed;
        inputToApply = { ...userInput, ...parsedInput };
        setResumeData(parsed);
      }

      syncToGlobalStore(dataToApply);
      const completeAnalysis = createCompleteAnalysisResult(dataToApply);

      const updatedUserInput = {
        ...inputToApply,
        targetRole: dataToApply.jobIntent,
        highlightSkills: dataToApply.coreSkills.join('、'),
        additionalInfo: dataToApply.summary,
        avatarUrl: dataToApply.personalInfo.avatarUrl
      };

      const filledSchema = fillAiDataIntoExistingSchema(schema, updatedUserInput, completeAnalysis);
      setSchema(filledSchema, true);

      showToast('success', '🎉 初始简历数据已成功重填至当前画布！排版与组件位置完好保留。');
      setTimeout(onClose, 600);
    } catch (err) {
      showToast('error', err instanceof Error ? `重填失败：${err.message}` : '重填失败，请检查数据');
    } finally {
      setIsApplying(false);
    }
  };

  // Action 2: Apply with Fresh Template Rebuild
  const handleApplyWithNewTemplate = () => {
    setIsApplying(true);
    try {
      let dataToApply = resumeData;
      let inputToApply = userInput;

      if (activeTab === 'upload' && rawText.trim()) {
        const { finalResume: parsed, userInput: parsedInput } = parseResumeFromText(rawText);
        dataToApply = parsed;
        inputToApply = { ...userInput, ...parsedInput };
        setResumeData(parsed);
      }

      syncToGlobalStore(dataToApply);
      setSelectedTemplate(targetTemplate);
      const completeAnalysis = createCompleteAnalysisResult(dataToApply);

      const updatedUserInput = {
        ...inputToApply,
        targetRole: dataToApply.jobIntent,
        highlightSkills: dataToApply.coreSkills.join('、'),
        additionalInfo: dataToApply.summary,
        avatarUrl: dataToApply.personalInfo.avatarUrl
      };

      const freshSchema = buildLegoSchemaFromResume(
        updatedUserInput,
        completeAnalysis,
        targetTemplate,
        templateOptions,
        customTemplateHTML
      );

      setSchema(freshSchema, true);
      showToast('success', `🎉 已成功套用【${TEMPLATE_NAMES[targetTemplate]}】并装填初始简历数据！`);
      setTimeout(onClose, 600);
    } catch (err) {
      showToast('error', err instanceof Error ? `套用模板失败：${err.message}` : '套用模板失败，请重试');
    } finally {
      setIsApplying(false);
    }
  };

  // Categories for presets tab
  const categories = ['全部', '人工智能', '技术研发', '数据与智能', '设计创意', '市场运营', '商业战略'];
  const filteredPresets = PRESET_RESUMES.filter((item) => {
    const matchCat = categoryFilter === '全部' || item.category.includes(categoryFilter);
    const matchSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Form field helpers
  const handleUpdatePersonalInfo = (key: keyof FinalResume['personalInfo'], val: string) => {
    setResumeData((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [key]: val
      }
    }));
  };

  const handleAddWork = () => {
    const newWork: WorkExperience = {
      company: '新科技有限公司',
      role: resumeData.jobIntent || '核心骨干',
      period: '2023.01 - 至今',
      bullets: ['负责核心业务需求推进与落地，达成关键考核指标。']
    };
    setResumeData((prev) => ({
      ...prev,
      workExperience: [...prev.workExperience, newWork]
    }));
  };

  const handleRemoveWork = (idx: number) => {
    setResumeData((prev) => ({
      ...prev,
      workExperience: prev.workExperience.filter((_, i) => i !== idx)
    }));
  };

  const handleMoveWork = (idx: number, direction: 'up' | 'down') => {
    setResumeData((prev) => {
      const list = [...prev.workExperience];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return prev;
      const [item] = list.splice(idx, 1);
      list.splice(targetIdx, 0, item);
      return { ...prev, workExperience: list };
    });
  };

  const handleUpdateWork = (idx: number, field: keyof WorkExperience, val: unknown) => {
    setResumeData((prev) => {
      const list = [...prev.workExperience];
      list[idx] = { ...list[idx], [field]: val };
      return { ...prev, workExperience: list };
    });
  };

  const handleAddProject = () => {
    const newProj: ProjectExperience = {
      name: '核心业务中台重构',
      role: '项目负责人',
      period: '2023.06 - 2023.12',
      bullets: ['设计系统技术架构方案，优化端到端性能与稳定性。']
    };
    setResumeData((prev) => ({
      ...prev,
      projectExperience: [...prev.projectExperience, newProj]
    }));
  };

  const handleRemoveProject = (idx: number) => {
    setResumeData((prev) => ({
      ...prev,
      projectExperience: prev.projectExperience.filter((_, i) => i !== idx)
    }));
  };

  const handleMoveProject = (idx: number, direction: 'up' | 'down') => {
    setResumeData((prev) => {
      const list = [...prev.projectExperience];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return prev;
      const [item] = list.splice(idx, 1);
      list.splice(targetIdx, 0, item);
      return { ...prev, projectExperience: list };
    });
  };

  const handleUpdateProject = (idx: number, field: keyof ProjectExperience, val: unknown) => {
    setResumeData((prev) => {
      const list = [...prev.projectExperience];
      list[idx] = { ...list[idx], [field]: val };
      return { ...prev, projectExperience: list };
    });
  };

  const handleParseJsonInput = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && typeof parsed === 'object') {
        setResumeData(parsed);
        showToast('success', 'JSON 简历数据解析载入成功！');
      }
    } catch {
      showToast('error', 'JSON 格式错误，请检查语法');
    }
  };

  return (
    <div className="fixed inset-0 z-[1001] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[880px] flex flex-col shadow-2xl overflow-hidden text-slate-100 relative">
        
        {/* Floating Notification Toast */}
        {toast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-200">
            <div
              className={`px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold border ${
                toast.type === 'success'
                  ? 'bg-emerald-600 text-white border-emerald-400/50 shadow-emerald-950/80'
                  : toast.type === 'error'
                  ? 'bg-rose-600 text-white border-rose-400/50 shadow-rose-950/80'
                  : 'bg-blue-600 text-white border-blue-400/50 shadow-blue-950/80'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-200 shrink-0" />
              )}
              <span>{toast.text}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                导入与管理初始简历
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
                  支持快速重填 · 一键套用排版
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                导入您的真实简历、选用精品模板或编辑结构化数据，一键秒级装填至积木画布
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/60 px-4 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'presets'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            🌟 热门行业预设模板
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-300">8 套</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileUp className="w-4 h-4" />
            📄 文件上传 / 文本解析
          </button>

          <button
            onClick={() => setActiveTab('form')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'form'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            ✍️ 结构化字段编辑
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full">
              {resumeData.personalInfo.name || '求职者'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'json'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            📦 JSON 数据
          </button>
        </div>

        {/* Status Alert Banner */}
        {parseStatus && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between border-b shrink-0 ${
              parseStatus.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                : parseStatus.type === 'error'
                ? 'bg-rose-950/50 border-rose-800/60 text-rose-300'
                : 'bg-blue-950/50 border-blue-800/60 text-blue-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {parseStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : parseStatus.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <Loader2 className="w-4 h-4 shrink-0 animate-spin text-blue-400" />
              )}
              <span>{parseStatus.message}</span>
            </div>
            <button
              onClick={() => setParseStatus(null)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-900/50">
          
          {/* TAB 1: PRESET INDUSTRY RESUMES */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索岗位或关键词..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Grid of Preset Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredPresets.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  const isExpanded = previewPresetId === preset.id;
                  const recTpl = PRESET_RECOMMENDED_TEMPLATE[preset.id] || 'modern-sidebar';

                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between cursor-pointer group select-none ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/15 ring-2 ring-blue-500'
                          : 'bg-slate-800/80 border-slate-700/80 hover:border-blue-400/60 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        {/* Header info */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <h3
                              className={`text-sm font-bold transition-colors flex items-center gap-1.5 ${
                                isSelected ? 'text-blue-300' : 'text-white group-hover:text-blue-300'
                              }`}
                            >
                              {preset.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-blue-400 font-medium">{preset.role}</span>
                              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                                🎨 推荐排版：{TEMPLATE_NAMES[recTpl]}
                              </span>
                            </div>
                          </div>

                          {/* Top right: Tag and Checkbox */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-slate-400 bg-slate-700/80 px-2 py-0.5 rounded-full shrink-0">
                              {preset.tag}
                            </span>
                            <div
                              title={isSelected ? '当前已选中' : '点击选中此模板'}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all border shrink-0 ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-400 shadow-sm shadow-blue-600/40 ring-2 ring-blue-400/30'
                                  : 'bg-slate-800/90 text-slate-400 border-slate-600 group-hover:border-blue-400 group-hover:text-blue-300'
                              }`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-white text-blue-600'
                                    : 'border border-slate-500 group-hover:border-blue-400'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              <span>{isSelected ? '已选用' : '点击选用'}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                          {preset.summary}
                        </p>

                        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 border-t border-slate-700/50 pt-2.5">
                          <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50">
                            👤 {preset.data.personalInfo.name} ({preset.experienceYears})
                          </span>
                          <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50">
                            🎓 {preset.degree}
                          </span>
                          <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50">
                            💼 {preset.data.workExperience.length} 段经历
                          </span>
                        </div>

                        {/* Inline Detail Preview Accordion */}
                        {isExpanded && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-3 pt-3 border-t border-slate-700/60 space-y-2.5 text-xs bg-slate-900/80 p-3 rounded-lg animate-in fade-in duration-200 cursor-default"
                          >
                            <div>
                              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                                📌 完整职业摘要：
                              </span>
                              <p className="text-slate-300 leading-relaxed text-[11px] bg-slate-950/60 p-2 rounded border border-slate-800 select-text">
                                {preset.data.summary}
                              </p>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                                💼 重点经历与工作业绩：
                              </span>
                              <div className="space-y-1.5">
                                {preset.data.workExperience.map((w, wIdx) => (
                                  <div key={wIdx} className="bg-slate-950/60 p-2 rounded border border-slate-800 text-[11px] select-text">
                                    <div className="font-semibold text-slate-200 flex items-center justify-between">
                                      <span>{w.company} · {w.role}</span>
                                      <span className="text-[10px] text-slate-400">{w.period}</span>
                                    </div>
                                    <ul className="mt-1 space-y-0.5 text-slate-300 list-disc list-inside">
                                      {w.bullets.slice(0, 2).map((b, bIdx) => (
                                        <li key={bIdx} className="line-clamp-2">{b}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                                ⚡ 核心专业技能：
                              </span>
                              <div className="flex flex-wrap gap-1 select-text">
                                {preset.data.coreSkills.map((sk, sIdx) => (
                                  <span key={sIdx} className="text-[10px] bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/60">
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-700/40 gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewPresetId(isExpanded ? null : preset.id);
                          }}
                          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {isExpanded ? '收起详情' : '展开详情'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isApplying}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyPresetDirectly(preset, 'refill');
                            }}
                            title="将此预设经历数据重填到当前画布（保留现有排版）"
                            className="text-xs px-2.5 py-1 rounded-md font-semibold bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" /> 仅重填
                          </button>

                          <button
                            type="button"
                            disabled={isApplying}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyPresetDirectly(preset, 'template');
                            }}
                            title={`使用推荐的【${TEMPLATE_NAMES[recTpl]}】排版渲染此简历`}
                            className="text-xs px-2.5 py-1 rounded-md font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/30 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" /> 一键套用
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD & RAW TEXT PARSER */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* File Upload Zone */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-800/40 hover:bg-slate-800/70 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  点击上传现有简历文件或截图
                </h4>
                <p className="text-xs text-slate-400 mb-2">
                  支持普通/扫描版 PDF、Word (.docx / .doc)、简历图片 (.png / .jpg) 或文本文件
                </p>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full border border-slate-700">
                  ✨ 智能视觉与高精 OCR 自动提炼姓名、经历、项目等所有积木数据
                </span>
              </div>

              {/* Raw Text Input Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    或直接粘贴纯文本简历内容：
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLoadSampleText}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors border border-slate-700 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" /> 载入经典示例文本
                    </button>
                    <button
                      type="button"
                      onClick={() => setRawText('')}
                      className="text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer px-1.5"
                    >
                      清空
                    </button>
                    <button
                      type="button"
                      onClick={() => handleParseText()}
                      disabled={isParsing || !rawText.trim()}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                    >
                      {isParsing ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" /> 正在解析...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" /> 智能解析提取
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="在此直接粘贴包含个人信息、工作经历、项目经历、教育经历的简历文本..."
                  className="w-full h-44 bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                />

                {/* Real-time Extracted Data Structure Preview with Direct Action Buttons */}
                {rawText.trim().length > 20 && (
                  <div className="bg-slate-800/90 border border-blue-500/50 rounded-xl p-3.5 space-y-3 shadow-md shadow-blue-950/40 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700/60 pb-2.5 gap-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-bold text-slate-100">已智能结构化提取的简历信息</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded font-medium">已就绪</span>
                      </div>
                      
                      {/* Direct Apply Action Buttons right inside preview */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isApplying}
                          onClick={handleRefillExistingCanvas}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> 立即重填画布
                        </button>
                        <button
                          type="button"
                          disabled={isApplying}
                          onClick={handleApplyWithNewTemplate}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" /> 套用新模板
                        </button>
                      </div>
                    </div>

                    {/* Basic Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/50">
                        <span className="text-[10px] text-slate-400 block mb-0.5">👤 候选人 / 意向</span>
                        <span className="font-semibold text-slate-100 truncate block">{resumeData.personalInfo.name || '求职者'} · {resumeData.jobIntent || '软件工程师'}</span>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/50">
                        <span className="text-[10px] text-slate-400 block mb-0.5">📞 联系电话 / 城市</span>
                        <span className="font-semibold text-slate-100 truncate block">{resumeData.personalInfo.phone || '暂无'} · {resumeData.personalInfo.location || '深圳'}</span>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/50">
                        <span className="text-[10px] text-slate-400 block mb-0.5">🎓 最高教育背景</span>
                        <span className="font-semibold text-slate-100 truncate block">{resumeData.education.school || '院校'} ({resumeData.education.degree || '本科'})</span>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/50">
                        <span className="text-[10px] text-slate-400 block mb-0.5">💼 经历与技能统计</span>
                        <span className="font-semibold text-emerald-400">{resumeData.workExperience.length + resumeData.projectExperience.length} 段经历 · {resumeData.coreSkills.length} 项技能</span>
                      </div>
                    </div>

                    {/* Experience Summary */}
                    {(resumeData.workExperience.length > 0 || resumeData.projectExperience.length > 0) && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-300">💼 提取到的经历模块：</span>
                        <div className="space-y-1">
                          {[...resumeData.workExperience, ...resumeData.projectExperience].slice(0, 3).map((exp, idx) => {
                            const expName = 'company' in exp ? exp.company : exp.name;
                            return (
                              <div key={idx} className="text-xs bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800 flex items-center justify-between text-slate-300">
                                <span className="font-medium text-slate-200">{expName} · <span className="text-blue-400">{exp.role}</span></span>
                                <span className="text-[10px] text-slate-400">{exp.period} ({exp.bullets.length} 条业绩要点)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Skill Tags */}
                    {resumeData.coreSkills.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-300">⚡ 提取到的核心技能标签：</span>
                        <div className="flex flex-wrap gap-1">
                          {resumeData.coreSkills.map((sk, sIdx) => (
                            <span key={sIdx} className="text-[11px] bg-blue-900/40 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded-md font-medium">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STRUCTURED FORM EDITOR */}
          {activeTab === 'form' && (
            <div className="space-y-5">
              {/* 1. Basic Info & Photo Upload */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> 个人基本资料
                </h4>

                {/* Avatar Control */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileUpload}
                />
                <div className="flex items-center gap-4 bg-slate-900/80 p-3 rounded-lg border border-slate-700/60 mb-2">
                  <div className="relative w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-600 overflow-hidden shrink-0 flex items-center justify-center">
                    {resumeData.personalInfo.avatarUrl ? (
                      <img
                        src={resumeData.personalInfo.avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <span>求职者头像照片</span>
                      {resumeData.personalInfo.avatarUrl && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded font-medium">已设置</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white rounded text-xs font-medium border border-blue-500/40 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3 h-3" /> 上传本地照片
                      </button>
                      {resumeData.personalInfo.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => handleUpdatePersonalInfo('avatarUrl', '')}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded text-xs transition-colors border border-slate-700 cursor-pointer"
                        >
                          移除照片
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-medium">姓名</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.name}
                      onChange={(e) => handleUpdatePersonalInfo('name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-medium">求职意向 / 岗位</label>
                    <input
                      type="text"
                      value={resumeData.jobIntent}
                      onChange={(e) => setResumeData((prev) => ({ ...prev, jobIntent: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-medium">联系电话</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.phone}
                      onChange={(e) => handleUpdatePersonalInfo('phone', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-medium">电子邮箱</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.email}
                      onChange={(e) => handleUpdatePersonalInfo('email', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-medium">所在城市 / 意向地</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.location}
                      onChange={(e) => handleUpdatePersonalInfo('location', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-medium">头像 URL 地址 (可选)</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.avatarUrl || ''}
                      onChange={(e) => handleUpdatePersonalInfo('avatarUrl', e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Summary */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> 职业摘要 / 自我评价
                </h4>
                <textarea
                  value={resumeData.summary}
                  onChange={(e) => setResumeData((prev) => ({ ...prev, summary: e.target.value }))}
                  className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* 3. Work Experience */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> 工作经历 ({resumeData.workExperience.length})
                  </h4>
                  <button
                    onClick={handleAddWork}
                    className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 添加经历
                  </button>
                </div>

                <div className="space-y-3">
                  {resumeData.workExperience.map((work, idx) => (
                    <div key={idx} className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                          <input
                            type="text"
                            value={work.company}
                            onChange={(e) => handleUpdateWork(idx, 'company', e.target.value)}
                            placeholder="公司名称"
                            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 font-semibold"
                          />
                          <input
                            type="text"
                            value={work.role}
                            onChange={(e) => handleUpdateWork(idx, 'role', e.target.value)}
                            placeholder="职位 / 角色"
                            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100"
                          />
                          <input
                            type="text"
                            value={work.period}
                            onChange={(e) => handleUpdateWork(idx, 'period', e.target.value)}
                            placeholder="时间周期 (例: 2021.09 - 至今)"
                            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100"
                          />
                        </div>

                        {/* Reordering and Delete Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveWork(idx, 'up')}
                            className="p-1 text-slate-400 hover:text-blue-400 disabled:opacity-20 transition-colors"
                            title="上移"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === resumeData.workExperience.length - 1}
                            onClick={() => handleMoveWork(idx, 'down')}
                            className="p-1 text-slate-400 hover:text-blue-400 disabled:opacity-20 transition-colors"
                            title="下移"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveWork(idx)}
                            className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                            title="删除此段经历"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          工作业绩 / Bullet Points (每行一条)：
                        </label>
                        <textarea
                          value={work.bullets.join('\n')}
                          onChange={(e) => {
                            const newBullets = e.target.value.split('\n');
                            handleUpdateWork(idx, 'bullets', newBullets);
                          }}
                          className="w-full h-18 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-200 leading-relaxed resize-none focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Project Experience */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5" /> 项目经历 ({resumeData.projectExperience.length})
                  </h4>
                  <button
                    onClick={handleAddProject}
                    className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 添加项目
                  </button>
                </div>

                <div className="space-y-3">
                  {resumeData.projectExperience.map((proj, idx) => (
                    <div key={idx} className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                          <input
                            type="text"
                            value={proj.name}
                            onChange={(e) => handleUpdateProject(idx, 'name', e.target.value)}
                            placeholder="项目名称"
                            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 font-semibold"
                          />
                          <input
                            type="text"
                            value={proj.role}
                            onChange={(e) => handleUpdateProject(idx, 'role', e.target.value)}
                            placeholder="担任角色"
                            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100"
                          />
                          <input
                            type="text"
                            value={proj.period}
                            onChange={(e) => handleUpdateProject(idx, 'period', e.target.value)}
                            placeholder="起止时间"
                            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100"
                          />
                        </div>

                        {/* Reordering and Delete Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveProject(idx, 'up')}
                            className="p-1 text-slate-400 hover:text-blue-400 disabled:opacity-20 transition-colors"
                            title="上移"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === resumeData.projectExperience.length - 1}
                            onClick={() => handleMoveProject(idx, 'down')}
                            className="p-1 text-slate-400 hover:text-blue-400 disabled:opacity-20 transition-colors"
                            title="下移"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveProject(idx)}
                            className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                            title="删除此项目"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          项目成果 / 职责描述 (每行一条)：
                        </label>
                        <textarea
                          value={proj.bullets.join('\n')}
                          onChange={(e) => {
                            const newBullets = e.target.value.split('\n');
                            handleUpdateProject(idx, 'bullets', newBullets);
                          }}
                          className="w-full h-16 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-200 leading-relaxed resize-none focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Education & Skills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Education */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" /> 教育背景
                  </h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">院校名称</label>
                        <input
                          type="text"
                          value={resumeData.education.school}
                          onChange={(e) =>
                            setResumeData((prev) => ({
                              ...prev,
                              education: { ...prev.education, school: e.target.value }
                            }))
                          }
                          placeholder="例如: 浙江大学"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">就读时间</label>
                        <input
                          type="text"
                          value={resumeData.education.period}
                          onChange={(e) =>
                            setResumeData((prev) => ({
                              ...prev,
                              education: { ...prev.education, period: e.target.value }
                            }))
                          }
                          placeholder="例如: 2017.09 - 2021.06"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">学历与专业 (例如: 硕士 · 计算机科学)</label>
                      <input
                        type="text"
                        value={resumeData.education.degree}
                        onChange={(e) =>
                          setResumeData((prev) => ({
                            ...prev,
                            education: { ...prev.education, degree: e.target.value }
                          }))
                        }
                        placeholder="例如: 硕士 · 计算机科学与技术"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" /> 核心专业技能
                  </h4>
                  <label className="text-[10px] text-slate-400 block">
                    以逗号、顿号或分行分隔各项技能标签：
                  </label>
                  <textarea
                    value={resumeData.coreSkills.join('、')}
                    onChange={(e) => {
                      const skills = e.target.value
                        .split(/[、,，\n]+/)
                        .map((s) => s.trim())
                        .filter(Boolean);
                      setResumeData((prev) => ({
                        ...prev,
                        coreSkills: skills,
                        skillsAndTools: skills
                      }));
                    }}
                    className="w-full h-24 bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-100 leading-relaxed resize-none focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: JSON DATA */}
          {activeTab === 'json' && (
            <div className="space-y-3 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  可直接在此编辑或粘贴标准的 FinalResume JSON 结构化数据：
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(jsonText);
                      setCopiedJson(true);
                      setTimeout(() => setCopiedJson(false), 2000);
                    }}
                    className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedJson ? '已复制' : '复制 JSON'}
                  </button>
                  <button
                    onClick={handleParseJsonInput}
                    className="text-xs px-2.5 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> 从 JSON 应用
                  </button>
                </div>
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full flex-1 min-h-[360px] bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed resize-none focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Layout Template Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
              <LayoutTemplate className="w-3.5 h-3.5 text-blue-400" /> 目标模版风格:
            </span>
            <select
              value={targetTemplate}
              onChange={(e) => setTargetTemplate(e.target.value as TemplateId)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="modern-sidebar">🖼️ 现代深色双栏 (推荐)</option>
              <option value="classic-minimal">📝 经典极简单栏</option>
              <option value="corporate-banner">🏢 商务 Header 沉稳范</option>
              <option value="timeline-tech">⏱️ 时间轴极客型</option>
              <option value="grid-cards">🎴 微阴影卡片流</option>
              <option value="minimal">🌿 简约清新风格</option>
              <option value="github-tech">💻 Github 极客风</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              取消
            </button>

            {/* Action 1: In-place Refill Canvas */}
            <button
              disabled={isApplying}
              onClick={handleRefillExistingCanvas}
              title="保留当前画布排版与组件位置，仅就地替换文本与经历数据"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {isApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              ⚡ 一键重填到当前画布
            </button>

            {/* Action 2: Apply with Fresh Template */}
            <button
              disabled={isApplying}
              onClick={handleApplyWithNewTemplate}
              title="根据选中的模板排版重新生成并装填简历数据"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              {isApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              🎨 载入并套用新模板
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
