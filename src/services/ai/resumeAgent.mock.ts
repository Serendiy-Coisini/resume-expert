import { delay } from "@/lib/utils";
import { updateFinalResumeWithOptimizedItems } from "@/lib/ai/prompts";
import type {
  AnalysisResult,
  OptimizeStyle,
  UserInput,
} from "@/types/resume";
import { getCompanyTypeOption, isForeignCompany } from "@/lib/company-config";
import { getOrBuildEnglishResume } from "@/lib/english-resume-builder";

const STYLE_LABELS: Record<OptimizeStyle, string> = {
  concise: "标准精炼 (STAR法则)",
  "data-driven": "突出数据量化",
  leadership: "强化主导力与贡献",
  "reduce-exaggeration": "务实保真 (降低夸张)",
  "jd-matched": "深度贴合目标 JD",
  "ai-product": "标准精炼 (STAR法则)",
  "tob-saas": "深度贴合目标 JD",
};

export function buildJDAnalysis(input: UserInput): AnalysisResult["jdAnalysis"] {
  const companyOpt = getCompanyTypeOption(input.companyType);

  return {
    responsibilities: [
      "负责 AI 功能的产品规划与迭代（智能问答、文档理解、工作流自动化）",
      "深入理解 B 端客户业务场景，将 AI 能力转化为可落地产品方案",
      "与算法、工程团队协作，推动 AI 功能从 POC 到规模化上线",
      "建立 AI 产品效果评估体系，数据驱动持续优化",
      "跟踪 AI 行业趋势，输出竞品分析与产品策略",
    ],
    hardRequirements: [
      "3年以上产品经理经验",
      "ToB SaaS 或企业服务产品经验",
      "优秀的需求分析与逻辑思维能力",
      "良好的跨部门沟通与项目管理能力",
      "本科及以上学历",
    ],
    implicitRequirements: [
      `契合【${companyOpt.label} (${companyOpt.scale} · ${companyOpt.stage})】用人偏好：${companyOpt.aiFocus}`,
      "具备将传统 B 端系统经验迁移到 AI 场景的能力",
      "理解 LLM 能力边界，能设计合理的 AI 产品交互",
      "有数据驱动决策习惯，能量化 AI 功能效果",
      "对 AI 行业有持续学习意愿与基本认知",
      "能在目标企业资源约束下推动 MVP 快速验证与迭代",
    ],
    keywords: [
      "AI 产品经理",
      "LLM",
      "ToB SaaS",
      "产品规划",
      "Prompt",
      "POC",
      "数据驱动",
      "ERP",
      "WMS",
      "智能问答",
      "工作流自动化",
      "效果评估",
    ],
    idealCandidate:
      `具备 3-5 年 ToB 产品经验，有 ERP/WMS/数据报表等系统落地背景，近期主动学习 AI 并有小范围实践。深度匹配【${companyOpt.label} (${companyOpt.scale} · ${companyOpt.stage})】的招募定位，能结合业务抽象能力与 AI 能力，推动智能化功能落地。`,
    coreCompetencies: [
      {
        name: "AI 产品规划",
        importance: "high",
        description: "能将 LLM 能力映射到具体业务场景，设计可落地的 AI 功能路线图",
      },
      {
        name: "ToB 需求分析",
        importance: "high",
        description: "深入理解企业客户业务流程，将复杂需求抽象为产品方案",
      },
      {
        name: "跨团队协作",
        importance: "high",
        description: "协调算法、工程、实施团队，推动 AI 功能从 POC 到上线",
      },
      {
        name: "数据驱动",
        importance: "medium",
        description: "建立 AI 效果评估指标，用数据验证产品决策",
      },
      {
        name: "行业认知",
        importance: "medium",
        description: "跟踪 AI 行业趋势，具备竞品分析与策略输出能力",
      },
      {
        name: "项目管理",
        importance: "medium",
        description: "在资源约束下管理版本迭代与交付节奏",
      },
    ],
  };
}

export function buildDiagnosis(): AnalysisResult["diagnosis"] {
  return {
    overallScore: 58,
    dimensionScores: [
      {
        dimension: "岗位匹配度",
        score: 52,
        comment: "ToB 与数据产品背景契合，但 AI 相关经历描述不足",
      },
      {
        dimension: "经历表达",
        score: 55,
        comment: "多为功能描述，缺少量化成果与业务影响",
      },
      {
        dimension: "关键词覆盖",
        score: 48,
        comment: "缺少 LLM、Prompt、AI 效果评估等核心关键词",
      },
      {
        dimension: "结构完整性",
        score: 72,
        comment: "模块齐全，但职业摘要未突出转型动机与 AI 学习",
      },
      {
        dimension: "差异化亮点",
        score: 50,
        comment: "ERP/WMS/报表组合有价值，但未与 AI 岗位建立连接",
      },
    ],
    mainIssues: [
      "简历整体定位偏传统 B 端 PM，未体现 AI 产品转型意图",
      "工作经历 bullet 缺少 AI/智能化相关表述，关键词匹配度低",
      "量化数据偏少，部分表述（如 major 版本）不够专业",
      "补充信息中的 Demo 经验未体现在正文中",
      "职业摘要未呼应目标 JD 的核心能力要求",
    ],
    prioritySuggestions: [
      "重写职业摘要：突出 ToB + 数据产品背景向 AI 产品转型的路径",
      "将 WMS 补货、报表平台经历与「数据驱动」「智能化」建立关联",
      "补充 AI 学习与实践（文档问答 Demo）作为独立项目或技能模块",
      "每条 bullet 采用「动作 + 方法 + 量化结果」结构重写",
      "增加与 JD 关键词对齐的能力标签（LLM 应用、Prompt 设计等）",
    ],
  };
}

export function buildMatchItems(): AnalysisResult["matchItems"] {
  return [
    {
      jdRequirement: "3年以上产品经理经验",
      resumeEvidence: "3.5年 B 端产品经验，含产品助理至产品经理完整路径",
      evidenceStrength: "strong",
      needsSupplement: false,
      optimizationSuggestion: "在摘要中明确年限与 B 端产品全周期经验",
    },
    {
      jdRequirement: "ToB SaaS 或企业服务产品经验",
      resumeEvidence: "WMS、ERP、经营数据报表平台，服务 50+ 企业客户",
      evidenceStrength: "strong",
      needsSupplement: false,
      optimizationSuggestion: "强调 SaaS 多租户、标准化交付等企业服务特征",
    },
    {
      jdRequirement: "AI 产品或智能化功能落地经验",
      resumeEvidence: "WMS 智能补货（基于历史数据的策略模型）",
      evidenceStrength: "weak",
      needsSupplement: true,
      optimizationSuggestion: "将补货策略与 AI/智能化关联；补充文档问答 Demo 项目",
    },
    {
      jdRequirement: "了解 LLM 基本原理",
      resumeEvidence: "补充信息提到 Prompt Engineering 和 LangChain 学习",
      evidenceStrength: "weak",
      needsSupplement: true,
      optimizationSuggestion: "在技能区增加 LLM/Prompt/LangChain；描述 Demo 具体能力",
    },
    {
      jdRequirement: "数据驱动与效果评估",
      resumeEvidence: "报表平台月活 200+、报表效率提升 60%、缺货率下降 25%",
      evidenceStrength: "medium",
      needsSupplement: false,
      optimizationSuggestion: "将数据成果与「产品效果评估体系」话术对齐",
    },
    {
      jdRequirement: "ERP/WMS 系统产品经验",
      resumeEvidence: "ERP 采购模块、WMS 核心模块、库存盘点重构",
      evidenceStrength: "strong",
      needsSupplement: false,
      optimizationSuggestion: "保留并强化，作为差异化竞争优势突出",
    },
    {
      jdRequirement: "跨部门沟通与项目管理",
      resumeEvidence: "协调研发、测试、实施团队，交付 3 个 major 版本",
      evidenceStrength: "medium",
      needsSupplement: false,
      optimizationSuggestion: "补充具体协作对象（算法/工程等）与交付里程碑",
    },
    {
      jdRequirement: "竞品分析与产品策略",
      resumeEvidence: "简历中无直接证据",
      evidenceStrength: "none",
      needsSupplement: true,
      optimizationSuggestion: "补充行业调研或竞品分析经历，哪怕是内部报告",
    },
  ];
}

export function buildFollowUpQuestions(): AnalysisResult["followUpQuestions"] {
  return [
    {
      id: "fu-1",
      question: "能否详细描述 Enterprise AI 助手从 POC 到规模化上线的完整流程？包括与算法、工程团队的具体协作模式，遇到的挑战及解决方案。",
      purpose: "补充大模型关心 POC 到规模化全流程以及跨团队协作细节",
      userAnswer: "",
      presetBullet: "主导 Enterprise AI 助手全流程落地，制定算法与工程团队标准化协作机制，攻克模型上线评估难题，推动 POC 至规模化上线闭环。",
      generatedBullet: "主导 Enterprise AI 助手全流程落地，制定算法与工程团队标准化协作机制，攻克模型上线评估难题，推动 POC 至规模化上线闭环。",
    },
    {
      id: "fu-2",
      question: "在建立 AI 效果评估维度体系时，你具体设计了哪些评估维度？如何使用用户反馈和指标最终指导产品迭代？请举例说明一次基于数据的产品优化决策。",
      purpose: "挖掘指标提取能力与数据驱动落地经验",
      userAnswer: "",
      presetBullet: "构建 AI 效果多维评估体系（准确率、响应时延、满意度），建立数据闭环指导产品迭代，提升高频场景问答准确率 35%。",
      generatedBullet: "构建 AI 效果多维评估体系（准确率、响应时延、满意度），建立数据闭环指导产品迭代，提升高频场景问答准确率 35%。",
    },
    {
      id: "fu-3",
      question: "验证大厂所需的规模化运营经验，凸显高数据量级下的技术认知。",
      purpose: "验证高并发高数据量级落地方案与架构认知",
      userAnswer: "",
      presetBullet: "针对高并发及海量数据场景优化架构方案，主导大模型 Prompt 与向量检索瓶颈调优，保障系统 99.9% 稳定可用。",
      generatedBullet: "针对高并发及海量数据场景优化架构方案，主导大模型 Prompt 与向量检索瓶颈调优，保障系统 99.9% 稳定可用。",
    },
    {
      id: "fu-4",
      question: "WMS 智能补货的「策略模型」具体是什么逻辑？有没有 A/B 测试或效果数据？",
      purpose: "强化智能化经历表达",
      userAnswer: "",
      presetBullet: "设计 WMS 智能补货策略模型，基于历史销量与季节性波动算法实现自动推单，经 A/B 测试验证减少库存积压 25%。",
      generatedBullet: "设计 WMS 智能补货策略模型，基于历史销量与季节性波动算法实现自动推单，经 A/B 测试验证减少库存积压 25%。",
    },
    {
      id: "fu-5",
      question: "与研发协作中，有没有遇到过技术方案与产品预期不一致的情况？如何解决？",
      purpose: "挖掘跨团队协作细节",
      userAnswer: "",
      presetBullet: "建立原型 POC 快速验证机制解决技术与产品分歧，推动团队达成可行性与体验闭环平衡，保障项目 100% 按期高质量交付。",
      generatedBullet: "建立原型 POC 快速验证机制解决技术与产品分歧，推动团队达成可行性与体验闭环平衡，保障项目 100% 按期高质量交付。",
    },
  ];
}

const ZHANG_MING_BULLETS = [
  {
    id: "opt-1",
    section: "职业摘要",
    before: "3年互联网产品经理经验，专注于 AI 智能体与 ToB SaaS 产品落地。熟练掌握大模型 Prompt 调优、工作流设计与 RAG 检索增强体系，具备从 0 到 1 打造 AI 产品的闭环经验。",
  },
  {
    id: "opt-2",
    section: "工作经历",
    before: "主导 Enterprise AI 助手产品规划与落地，覆盖智能问答、文档分析与客服自动化三大场景；",
  },
  {
    id: "opt-3",
    section: "工作经历",
    before: "优化 Prompt 架构与 RAG 检索链路，将知识库回答准确率提升 25%，响应时延降低 40%；",
  },
  {
    id: "opt-4",
    section: "工作经历",
    before: "建立 AI 效果评测基准体系 (Benchmarking)，收集 1000+ 真实反馈轮次，推动产品月活跃用户突破 50 万。",
  },
  {
    id: "opt-5",
    section: "工作经历",
    before: "负责自动化流程建构器设计，服务超过 200 家中大型企事业单位；",
  },
];

export function buildOptimizedItems(
  style: OptimizeStyle = "concise"
): AnalysisResult["optimizedItems"] {

  if (style === "leadership") {
    return [
      {
        ...ZHANG_MING_BULLETS[0],
        after: "拥有 3 年互联网产品经理经验，主导 0 到 1 的 AI 智能体与 ToB SaaS 产品全链路落地。精通 Prompt 调优、工作流设计与 RAG 架构，驱动多个 AI 产品从概念验证到规模化交付，累计贡献核心产品线月活超 50 万。",
        reason: "原摘要偏描述性，改用“主导”、“驱动”、“贡献”等主动动词，并量化月活成果，增强主导力与贡献感。",
        riskWarning: "需确保“主导0到1”与后文经历一致，避免过度承诺；月活数据需与具体产品关联，避免歧义。",
      },
      {
        ...ZHANG_MING_BULLETS[1],
        after: "独立主导 Enterprise AI 助手从 0 到 1 的产品规划与落地，全面覆盖智能问答、文档分析与客服自动化三大核心场景，实现 B 端客户从 POC 到规模化上线的完整闭环。",
        reason: "强调“独立主导”和“从 0 到 1”，并加入“POC 到规模化上线”与 JD 高度契合，突出主导力和落地闭环能力。",
        riskWarning: "需确认是否真正独立主导，以及与算法、工程团队协作的具体分工，避免被质疑夸大角色。",
      },
      {
        ...ZHANG_MING_BULLETS[2],
        after: "主导优化 Prompt 架构与 RAG 检索链路，通过系统性设计迭代，将知识库回答准确率提升 25%，响应时延降低 40%，显著提升用户满意度与产品竞争力。",
        reason: "增加“主导”和“系统性设计迭代”，强调技术主导力，同时将指标与满意度挂钩，突出贡献价值。",
        riskWarning: "需明确优化方法是否为个人主导，以及提升指标是否经过严格 A/B 测试，避免夸大效果。",
      },
      {
        ...ZHANG_MING_BULLETS[3],
        after: "从 0 到 1 搭建 AI 效果评测基准体系 (Benchmarking)，主导收集 1000+ 真实用户反馈轮次，基于数据驱动决策推动产品月活跃用户突破 50 万，成为企业级 AI 助手市场标杆。",
        reason: "加入“从 0 到 1 搭建”、“主导”、“基于数据驱动决策”等表达，突出体系构建的主导力和对业务增长的直接贡献。",
        riskWarning: "需确认月活增长是否主要由评测体系驱动，以及市场标杆是否有第三方佐证，避免过度包装。",
      },
      {
        ...ZHANG_MING_BULLETS[4],
        after: "全权负责自动化流程建构器产品设计，主导覆盖 200+ 中大型企事业单位的交付与迭代，通过优化核心使用路径指引使用户首周留存率提升 18%，巩固了产品在 B 端市场的竞争力。",
        reason: "将“负责”改为“全权负责”并加入“主导交付与迭代”，同时关联后续留存率提升数据，突出对产品全生命周期的主导力。",
        riskWarning: "需确认留存率提升是否确实来自该建构器设计，且“全权负责”是否反映实际权限，避免与团队分工矛盾。",
      },
    ];
  }

  if (style === "jd-matched") {
    return [
      {
        ...ZHANG_MING_BULLETS[0],
        after: "3年互联网产品经理经验，深耕 ToB SaaS 领域，专注于 AI 智能体与 LLM 应用落地。精通 Prompt 工程、Agent 工作流及 RAG 检索增强架构，具备从需求分析到规模化上线的全链路产品方案能力，深入理解 B 端客户业务场景，将大模型能力转化为可落地的产品方案。",
        reason: "JD 强调“深入理解 B 端客户业务场景，将大模型能力转化为可落地的产品方案”，原摘要未突出“客户场景”与“规模化上线”，调整后更贴合岗位要求，并显式标注了 LLM 应用设计的核心能力。",
        riskWarning: "若面试官追问具体 B 端客户场景案例，需准备详细的行业痛点分析及解决方案，否则可能被质疑场景理解深度。",
      },
      {
        ...ZHANG_MING_BULLETS[1],
        after: "作为核心 PM，主导 Enterprise AI 助手从0到1的产品规划与落地，覆盖智能问答、文档理解与客服自动化三大核心场景，与算法、工程团队紧密协作，推动功能从 POC 验证到规模化上线。",
        reason: "JD 要求“与算法、工程团队紧密协作，推动 AI 功能从 POC 验证到规模化上线”，原句未体现团队协作与 POC 阶段，优化后直接呼应岗位职责，并突出“从 0 到 1”的完整产品周期。",
        riskWarning: "若面试官询问 POC 阶段的具体协作细节及难点，需准备技术方案与跨团队协调案例，否则可能显得经验不够深入。",
      },
      {
        ...ZHANG_MING_BULLETS[2],
        after: "主导 Prompt 架构优化与 RAG 检索链路重构，通过系统性调优（包括多轮对话上下文压缩、检索策略调整），使知识库回答准确率提升 25%，响应时延降低 40%，并建立持续监控机制，确保效果的稳定性与可复现性。",
        reason: "JD 强调“建立 AI 产品效果评估体系，通过数据分析与用户反馈持续优化产品体验”，原句只描述了结果，未体现评估体系与持续优化机制，优化后补充了“监控机制”与“可复现性”，更贴合数据驱动迭代的要求。",
        riskWarning: "若被追问具体如何建立监控机制，需准备指标定义、数据采集流程及复现性验证方法，否则仅是经验而非系统化思维。",
      },
      {
        ...ZHANG_MING_BULLETS[3],
        after: "搭建 AI 产品效果评测基准体系，涵盖自动化指标与人工评估相结合，累计收集 1000+ 轮次真实用户反馈，基于数据驱动持续优化产品体验，推动月活跃用户从 0 增长至 50 万，验证了 AI 功能在 B 端场景的规模化价值。",
        reason: "JD 要求“建立 AI 产品效果评测体系，通过数据分析与用户反馈持续优化产品体验”，原句仅提及“建立评测体系”，优化后补充了评测方式（自动化+人工）、数据起点（0 增长）及 B 端场景价值，更贴合 ToB SaaS 背景。",
        riskWarning: "若面试官细问具体评测指标（如准确率、召回率、用户满意度）及如何平衡自动化与人工评估，需准备详细案例，否则可能显得框架不完整。",
      },
    ];
  }

  if (style === "data-driven") {
    return [
      {
        ...ZHANG_MING_BULLETS[0],
        after: "3年互联网产品经理，累计主导交付 2 款 AI 产品与 1 款 SaaS 流程引擎，服务 200+ 企事业单位。通过 Prompt 与 RAG 检索调优，将知识库回答准确率由 65% 提升至 90%（+25%）、响应时延由 2.5s 降低至 1.5s（-40%），驱动核心产品 MAU 从 0 突破 50 万。",
        reason: "按「突出数据量化」方向重写，将技能概括转化为明确的客户数、起止基线与 MAU 突破数据，极富说服力。",
        riskWarning: "备齐 MAU 50万 的口径统计图表与起止点基线数据，防面试官追问真假活跃。",
      },
      {
        ...ZHANG_MING_BULLETS[1],
        after: "主导 Enterprise AI 助手从0到1落地，覆盖 3 大核心场景，为 200+ 家中大型企事业单位提供服务，日均处理智能问答与文档检索请求 15 万+ 次，实现 POC 到生产全量上线。",
        reason: "补充日均请求数（15万+）与客户量级，突出大并发业务规模与量化成效。",
        riskWarning: "日均 15万+ 请求需确认是否符合生产环境日志口径。",
      },
      {
        ...ZHANG_MING_BULLETS[2],
        after: "优化 Prompt 架构与 RAG 检索链路，将知识库回答准确率由 65% 提升至 90%（提升 25%），平均响应时延由 2.5 秒降至 1.5 秒（缩短 40%），检索召回率提升 30%。",
        reason: "补充召回率与起止基线数据，消除相对百分比的模糊感。",
        riskWarning: "召回率 30% 需准备评估集的具体计算公式与测试样本规模。",
      },
      {
        ...ZHANG_MING_BULLETS[3],
        after: "搭建包含 12 项评测维度的 AI 效果 Benchmarking 体系，收集 1000+ 轮次真实用户反馈，数据驱动优化后产品 MAU 由 20万 增长至 50万（+150%）。",
        reason: "补齐评测维度数量与增幅百分比，凸显数据驱动业务增长的效果。",
        riskWarning: "确定 MAU 从 20万 增长至 50万 的具体归因图表。",
      },
    ];
  }

  if (style === "reduce-exaggeration") {
    return [
      {
        ...ZHANG_MING_BULLETS[0],
        after: "3年产品经理经验，参与过 AI 智能体与 ToB SaaS 产品研发。掌握 Prompt 调优、工作流设计与 RAG 检索基础原理，具备实际产品规划与项目跟进经验。",
        reason: "去除“闭环”、“精通”等夸大词汇，用客观严谨的态度呈现经历，防面试追问问倒。",
        riskWarning: "修改后求真务实，完全消除夸大被质问的风险。",
      },
      {
        ...ZHANG_MING_BULLETS[1],
        after: "作为产品经理参与 Enterprise AI 助手的需求梳理与功能落地，跟进智能问答、文档分析与客服自动化三大场景的交付。",
        reason: "准确描述为“参与”与“需求跟进”，实事求是反映团队协作关系。",
        riskWarning: "真实表达团队分工，面试展现踏实作风。",
      },
      {
        ...ZHANG_MING_BULLETS[2],
        after: "针对知识库场景跟进 Prompt 调试与 RAG 检索优化，协助技术团队提升回答准确率并降低响应延时。",
        reason: "客观描述技术协助过程，避免把算法团队的工作全归因于个人。",
        riskWarning: "保持客观真实，防止技术深扣失误。",
      },
    ];
  }

  // Default: concise (标准精炼 STAR法则)
  return [
    {
      ...ZHANG_MING_BULLETS[1],
      after: "负责企业级 AI 助手从 0 到 1 的产品规划与落地，聚焦智能问答、文档分析与客服自动化三个核心场景。通过深入调研 20+ B端客户业务痛点，明确 MVP 功能边界，并协同算法团队完成多轮 Prompt 调优，在 3 个月内实现 POC 到生产环境的全量上线。",
      reason: "原表述仅为概括性陈述，缺少 STAR 要素。通过补充情境（B端客户调研）、任务（明确 MVP 边界）、行动（协同算法团队调优）和结果（3个月内 POC 到生产上线），更清晰地展示产品落地全流程。",
      riskWarning: "需确认客户调研的具体数量及 POC 到上线的时间周期是否与事实完全一致，避免过度具体化。",
    },
    {
      ...ZHANG_MING_BULLETS[2],
      after: "针对知识库问答场景中回答准确率低、响应慢的问题，重构 Prompt 提示策略与 RAG 检索链路。通过引入多轮对话上下文压缩、语义分块及重排序机制，使知识库回答准确率从 65% 提升至 90%，响应时延从 2.5 秒降低至 1.5 秒，显著改善用户体验。",
      reason: "原表述已包含结果，但缺少问题背景与具体技术手段。此处补充了初始指标（65%、2.5秒）和具体技术手段（语义分块、重排序），使量化成果更具说服力。",
      riskWarning: "初始指标（65%、2.5秒）需确认是否来自真实质验或真实数据，若无法提供，建议改为“显著缩短延时”并避免猜测。",
    },
    {
      ...ZHANG_MING_BULLETS[3],
      after: "为了量化 AI 产品效果并驱动持续迭代，主导构建了包含准确率、相关性、用户满意度等维度的评测基准体系。累计收集来自 1000+ 真实用户反馈轮次，并基于数据洞察优化问答重排策略与内容生成策略，最终推动产品月活跃用户从 20 万增长至 50 万。",
      reason: "原表述仅提及了基准和收集反馈，未说明为什么做、如何做、以及用户增长与评测的因果关系。通过补充初始 MAU（20万）和行动细节（优化策略），突出数据驱动产品增长的能力。",
      riskWarning: "初始 MAU 20 万为推测数据，需确认实际基线数据；若无法提供，建议改为“月活跃用户突破 50 万”并避免提及具体增长量。",
    },
    {
      id: "opt-6",
      section: "项目经历",
      before: "针对多格式长文档（PDF/Word/PPT）分析痛点，策划并构建 AI 智能摘要与对话功能；",
      after: "调研发现企业用户在处理长文档时存在摘要提取耗时长、内容理解不准确等痛点，因此策划并设计了 AI 智能摘要与对话功能。通过设计基于 LangChain 的文档解析管道，支持 PDF/Word/PPT 多格式，实现单页文档 10 秒内生成摘要，并支持多轮追问，用户采纳率达 85%。",
      reason: "原表述缺少具体行动和量化结果。补充了技术选型（LangChain）、性能指标（10秒）和用户采纳率，使项目成果更可信。",
      riskWarning: "用户采纳率 85% 为假设数据，需确认是否来自实际测试或用户反馈；若无法提供，建议改为“获得内部测试团队积极反馈”。",
    },
    {
      id: "opt-7",
      section: "项目经历",
      before: "设计灵活的微调及评估标准，协助工程团队搭建模型评测流水线。",
      after: "基于模型在实际场景中的表现差异，设计了包含多维指标（准确率、召回率、生成流畅度）的微调与评估标准，并主导搭建了自动化评测流水线，将模型迭代周期从 2 周缩短至 3 天，同时支持线上 A/B 测试。",
      reason: "原表述过于笼统，未体现设计计划和实际效果。通过补充具体指标（迭代周期缩短）和自动化能力，展示工程化思维。",
      riskWarning: "迭代周期缩短数值（2周→3天）需确认与项目实际情况吻合；若不确定，可改为“显著缩短迭代周期”。",
    },
  ];
}

export function buildFinalResume(input: UserInput): AnalysisResult["finalResume"] {
  return {
    personalInfo: {
      name: "张明",
      email: "zhangming@email.com",
      phone: "138****5678",
      location: "上海",
    },
    jobIntent: `${input.targetRole} | ${input.industry}`,
    summary:
      "3.5年 ToB SaaS 产品经理，深耕 ERP/WMS 及经营数据报表领域，服务 50+ 企业客户。具备从 0 到 1 搭建数据产品与智能化功能（智能补货策略）的完整经验，近期系统学习 LLM 应用与 Prompt 设计，独立完成内部文档问答 Demo，正将数据驱动的产品方法论延伸至 AI 产品场景。",
    coreSkills: [
      "AI 产品规划与场景落地",
      "ToB 需求分析与业务流程抽象",
      "数据驱动决策与效果评估",
      "跨团队（研发/算法/实施）协作交付",
      "ERP/WMS/SaaS 产品全周期管理",
    ],
    workExperience: [
      {
        company: "某 SaaS 公司",
        role: "产品经理",
        period: "2021.06 - 至今",
        bullets: [
          "负责 WMS 仓储管理系统核心模块（入库/出库/盘点/补货）产品规划与迭代，覆盖 50+ 企业客户的 SaaS 标准化交付",
          "主导库存盘点流程重构（移动端扫码 + 差异自动核对），单次盘点耗时从 4h 降至 2.4h，效率提升 40%",
          "从 0 到 1 设计经营数据报表平台，支持 20+ 自定义模板，月活 200+，报表生成效率提升 60%",
          "协调研发、测试、实施团队，按时交付 3 个 Major 版本，零重大生产事故",
        ],
      },
      {
        company: "某软件公司",
        role: "产品助理",
        period: "2020.07 - 2021.05",
        bullets: [
          "参与 ERP 采购模块需求调研与原型设计，输出 15+ PRD 文档",
          "跟进开发进度与 UAT 测试，推动订单审批流程优化，审批周期缩短 30%",
          "建立客户反馈收集机制，月均处理 40+ 需求工单",
        ],
      },
    ],
    projectExperience: [
      {
        name: "内部文档问答 Demo",
        role: "独立开发者",
        period: "2024.10 - 2024.12",
        bullets: [
          "基于 LangChain + 向量检索 + GPT 构建 RAG 文档问答系统，支持产品文档语义搜索",
          "设计 Prompt 模板与检索策略，问答准确率达 85%",
          "验证 RAG 方案在企业知识库场景的可行性，为后续 AI 功能规划提供参考",
        ],
      },
      {
        name: "WMS 智能补货",
        role: "产品经理",
        period: "2023.01 - 2023.09",
        bullets: [
          "设计基于历史销售与季节性波动的智能补货策略（规则引擎 + 安全库存模型）",
          "经 3 个月 A/B 验证后全量上线，缺货率从 12% 降至 9%",
          "建立补货效果监控看板，支持策略参数动态调优",
        ],
      },
    ],
    skillsAndTools: [
      "Axure",
      "Figma",
      "SQL",
      "Jira",
      "Confluence",
      "Prompt Engineering",
      "LangChain",
      "LLM 应用基础",
    ],
    education: {
      school: "清华大学",
      degree: "信息管理与信息系统 | 本科",
      period: "2016 - 2020",
    },

  };
}

function buildEnglishResume(input: UserInput): AnalysisResult["finalResume"] {
  const baseResume = buildFinalResume(input);
  return getOrBuildEnglishResume(baseResume, input);
}

export function buildInterviewPrep(): AnalysisResult["interviewPrep"] {
  return {
    likelyQuestions: [
      {
        question: "你为什么想从传统 B 端 PM 转型做 AI 产品经理？",
        suggestedAnswer:
          "我的 WMS 智能补货和报表平台经历让我理解数据驱动的产品方法论。近期 LLM 能力成熟，我认为 AI 会重塑 ToB 产品交互，我的行业 know-how 加上 AI 能力可以创造更大价值。",
        evidenceNeeded: ["转型动机真实案例", "AI 学习路径与时间投入"],
      },
      {
        question: "你的文档问答 Demo 技术方案是什么？效果如何评估？",
        suggestedAnswer:
          "采用 RAG 架构：文档切片 → 向量检索 → Prompt 组装 → GPT 生成。准确率 85% 基于 50 条测试问答集的人工评估。",
        evidenceNeeded: ["Demo 可演示", "测试集样例", "失败 case 分析"],
      },
      {
        question: "智能补货的策略模型是 AI 吗？和 LLM 有什么关系？",
        suggestedAnswer:
          "当前是基于规则引擎和统计模型的智能化方案，不是 LLM。但它培养了我设计「输入→策略→输出→评估」闭环的方法论，可直接迁移到 AI 功能设计。",
        evidenceNeeded: ["策略逻辑细节", "A/B 测试数据", "与 AI 的方法论关联"],
      },
      {
        question: "如何评估一个 AI 功能是否值得做？",
        suggestedAnswer:
          "参考我的报表平台经验：先定义核心指标（准确率/采纳率/效率提升）→ MVP 验证 → 数据驱动迭代。AI 功能还需额外评估幻觉风险和人工 fallback 成本。",
        evidenceNeeded: ["指标框架", "MVP 案例", "ROI 思考"],
      },
      {
        question: "描述一个复杂需求从调研到上线的完整过程",
        suggestedAnswer: "以报表平台为例：客户访谈 → 竞品分析 → 拖拽配置器 MVP → 20 模板试点 → 全量推广",
        evidenceNeeded: ["PRD 片段", "里程碑时间线", "关键决策点"],
      },
      {
        question: "你和算法/研发团队如何协作？",
        suggestedAnswer:
          "在 WMS 项目中，我会先输出业务规则文档和数据字段定义，与研发对齐接口方案，再分 Sprint 交付。AI 协作会增加 Prompt 迭代和效果评估环节。",
        evidenceNeeded: ["协作文档样例", "分歧解决案例"],
      },
      {
        question: "你关注哪些 AI 产品？优缺点是什么？",
        suggestedAnswer:
          "关注 Notion AI、飞书智能助手、Coze。Notion AI 集成自然但能力边界模糊；飞书助手覆盖广但定制化不足。",
        evidenceNeeded: ["实际使用体验", "具体功能对比"],
      },
      {
        question: "盘点效率提升 40% 是怎么算的？",
        suggestedAnswer:
          "选取 10 家试点客户，对比重构前后单次全仓盘点平均耗时，从 4 小时降至 2.4 小时。",
        evidenceNeeded: ["试点客户数", "统计口径", "前后对比方法"],
      },
      {
        question: "你的劣势是什么？如何弥补？",
        suggestedAnswer:
          "正式 AI 产品落地经验不足。已通过 Demo 实践和系统学习弥补，并计划在下一份工作中从 AI 辅助功能切入。",
        evidenceNeeded: ["学习计划", "Demo 成果", "谦逊且积极的态度"],
      },
      {
        question: "你对我们公司和这个岗位了解多少？",
        suggestedAnswer: "提前研究公司 AI 产品布局、目标客户、与自身经验的契合点",
        evidenceNeeded: ["公司调研笔记", "产品体验记录", "针对性问题"],
      },
    ],
    evidenceToPrepare: [
      "文档问答 Demo 的可演示环境或录屏",
      "报表平台与智能补货的关键数据口径说明",
      "WMS 产品架构图或核心流程图",
      "Prompt 模板样例与迭代记录",
      "客户访谈或需求调研的方法论案例",
    ],
    possibleExaggerations: [
      "「智能补货策略模型」可能被理解为深度学习模型，需澄清为规则引擎",
      "「AI 产品经验」来自 Demo 而非商业落地，需主动说明",
      "「准确率 85%」的测试集规模和评估方法可能被追问",
      "「服务 50+ 企业客户」中个人贡献范围需明确",
    ],
    dataToSupplement: [
      "Demo 项目的测试集规模和评估方法论",
      "盘点效率提升的试点样本与统计口径",
      "报表平台月活 200+ 的定义（UV/PV/生成次数）",
      "Major 版本的具体功能清单与个人贡献",
    ],
    selfIntroduction:
      "您好，我是张明，有 3.5 年 ToB SaaS 产品经验，主导过 WMS 和经营数据报表平台。我在工作中设计了智能补货策略，近期系统学习 AI 并完成了文档问答 Demo。我希望将 B 端行业理解与 AI 产品能力结合，贵司的 AI 产品方向与我的经验高度契合，期待进一步交流。",
  };
}

export async function runMockResumeAnalysis(
  input: UserInput,
  optimizeStyle: OptimizeStyle = "concise"
): Promise<AnalysisResult> {
  await delay(1800);

  const optimizedItems = buildOptimizedItems(optimizeStyle);
  const baseFinalResume = buildFinalResume(input);
  const finalResume = updateFinalResumeWithOptimizedItems(baseFinalResume, optimizedItems);
  const englishResume = isForeignCompany(input.companyType) ? buildEnglishResume(input) : undefined;

  return {
    jdAnalysis: buildJDAnalysis(input),
    diagnosis: buildDiagnosis(),
    matchItems: buildMatchItems(),
    followUpQuestions: buildFollowUpQuestions(),
    optimizedItems,
    finalResume,
    englishResume,
    interviewPrep: buildInterviewPrep(),
  };
}

export async function runMockResumeAnalysisStream(
  input: UserInput,
  optimizeStyle: OptimizeStyle = "concise",
  onStageUpdate?: (update: {
    stage: string;
    status: "start" | "complete";
    data?: Partial<AnalysisResult>;
  }) => void
): Promise<AnalysisResult> {
  onStageUpdate?.({ stage: "jd-analysis", status: "start" });
  await delay(400);
  const jdAnalysis = buildJDAnalysis(input);
  onStageUpdate?.({ stage: "jd-analysis", status: "complete", data: { jdAnalysis } });

  onStageUpdate?.({ stage: "diagnosis", status: "start" });
  await delay(500);
  const diagnosis = buildDiagnosis();
  const matchItems = buildMatchItems();
  const followUpQuestions = buildFollowUpQuestions();
  onStageUpdate?.({
    stage: "diagnosis",
    status: "complete",
    data: { diagnosis, matchItems, followUpQuestions },
  });

  onStageUpdate?.({ stage: "optimize", status: "start" });
  await delay(600);
  const optimizedItems = buildOptimizedItems(optimizeStyle);
  const baseFinalResume = buildFinalResume(input);
  const finalResume = updateFinalResumeWithOptimizedItems(baseFinalResume, optimizedItems);
  const englishResume = isForeignCompany(input.companyType) ? buildEnglishResume(input) : undefined;
  onStageUpdate?.({
    stage: "optimize",
    status: "complete",
    data: { optimizedItems, finalResume, englishResume },
  });

  onStageUpdate?.({ stage: "interview", status: "start" });
  await delay(400);
  const interviewPrep = buildInterviewPrep();
  onStageUpdate?.({
    stage: "interview",
    status: "complete",
    data: { interviewPrep },
  });

  return {
    jdAnalysis,
    diagnosis,
    matchItems,
    followUpQuestions,
    optimizedItems,
    finalResume,
    interviewPrep,
  };
}


export async function runMockRegenerateOptimizedItems(
  input: UserInput,
  style: OptimizeStyle
): Promise<{ optimizedItems: AnalysisResult["optimizedItems"]; finalResume: AnalysisResult["finalResume"] }> {
  await delay(800);
  const optimizedItems = buildOptimizedItems(style);
  const baseFinalResume = buildFinalResume(input);
  const finalResume = updateFinalResumeWithOptimizedItems(baseFinalResume, optimizedItems);
  return { optimizedItems, finalResume };
}

export async function runMockFollowUpBullet(
  purpose: string,
  userAnswer: string
): Promise<string> {
  await delay(400);
  return `基于${purpose.replace(/[？?]/g, "")}，${userAnswer.trim().replace(/[。.!！]$/, "")}，体现 AI 产品落地能力与业务理解深度。`;
}

export async function runMockReoptimizeWithBullets(
  input: UserInput,
  style: OptimizeStyle,
  bullets: { purpose: string; bullet: string }[]
): Promise<Pick<AnalysisResult, "optimizedItems" | "finalResume">> {
  await delay(1200);
  const optimizedItems = buildOptimizedItems(style);

  // Append bullet-derived entries to optimizedItems
  bullets.forEach((b, i) => {
    optimizedItems.push({
      id: `opt-bullet-${i + 1}`,
      section: "追问补充",
      before: "（原简历无相关描述）",
      after: b.bullet,
      reason: `基于追问「${b.purpose}」补充的新经历`,
      riskWarning: "确保该描述可在面试中详细展开",
    });
  });

  const finalResume = buildFinalResume(input);
  // Inject bullets into the first work experience entry
  if (finalResume.workExperience.length > 0) {
    finalResume.workExperience[0].bullets.push(
      ...bullets.map((b) => b.bullet)
    );
  }

  return { optimizedItems, finalResume };
}

export async function runMockExtractTemplate(rawContent: string): Promise<string> {
  await delay(1000);
  const lower = rawContent.toLowerCase();

  // 1. Single Column Minimal
  if (lower.includes("单栏") || lower.includes("极简") || lower.includes("经典") || lower.includes("minimal")) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{姓名}} - 经典单栏自定义模板</title>
  <style>
    @page { size: A4; margin: 4mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 13.5px; line-height: 1.55; color: #1e293b; margin: 0; padding: 12px 24px; background: #ffffff; }
    .layout-single-column { max-width: 800px; margin: 0 auto; }
    .header-center { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 16px; }
    .header-name { font-size: 24px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.5px; margin-bottom: 4px; }
    .header-intent { font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; }
    .header-contact { font-size: 12px; color: #64748b; display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
    .sec-title { font-size: 14.5px; font-weight: 700; color: #1e3a8a; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; margin-top: 18px; margin-bottom: 10px; text-transform: uppercase; }
    ul { margin: 6px 0 10px 0; padding-left: 18px; }
    li { margin-bottom: 4px; color: #334155; }
  </style>
</head>
<body>
  <div class="layout-single-column">
    <div class="header-center">
      <div class="header-name">{{姓名}}</div>
      <div class="header-intent">🎯 意向：{{求职意向}}</div>
      <div class="header-contact">
        <span>🏫 {{学校}}</span>
        <span>📞 {{电话}}</span>
        <span>✉️ {{邮箱}}</span>
        <span>📍 {{城市}}</span>
      </div>
    </div>
    <div class="sec-title">教育背景</div>
    <div>{{教育背景}}</div>
    <div class="sec-title">工作与校园经历</div>
    <div>{{工作经历}}</div>
    <div class="sec-title">项目经历</div>
    <div>{{项目经历}}</div>
    <div class="sec-title">核心能力与所获荣誉</div>
    <div>{{核心能力}}</div>
    <p style="margin-top: 8px; font-size: 12.5px; color: #475569;">{{技能工具}}</p>
  </div>
</body>
</html>`;
  }

  // 2. Corporate Banner Header
  if (lower.includes("商务") || lower.includes("banner") || lower.includes("header") || lower.includes("深色")) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{姓名}} - 商务 Banner 自定义模板</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 13.5px; line-height: 1.55; color: #1e293b; margin: 0; padding: 0; background: #f8fafc; }
    .layout-corporate-banner { width: 100%; min-height: 100vh; }
    .top-banner { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #ffffff; padding: 30px 40px; display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid #6366f1; }
    .banner-left { flex: 1; }
    .banner-name { font-size: 26px; font-weight: 800; letter-spacing: 1px; margin-bottom: 6px; }
    .banner-intent { font-size: 14px; color: #c7d2fe; font-weight: 500; }
    .banner-info { margin-top: 10px; font-size: 12px; color: #e0e7ff; display: flex; gap: 16px; flex-wrap: wrap; }
    .body-content { padding: 24px 40px; background: #ffffff; margin: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .sec-title { font-size: 15px; font-weight: 700; color: #1e1b4b; border-left: 4px solid #6366f1; padding-left: 8px; margin-top: 20px; margin-bottom: 10px; }
    ul { margin: 6px 0 10px 0; padding-left: 18px; }
    li { margin-bottom: 4px; color: #334155; }
  </style>
</head>
<body>
  <div class="layout-corporate-banner">
    <div class="top-banner">
      <div class="banner-left">
        <div class="banner-name">{{姓名}}</div>
        <div class="banner-intent">🎯 意向：{{求职意向}}</div>
        <div class="banner-info">
          <span>🏫 {{学校}}</span>
          <span>📞 {{电话}}</span>
          <span>✉️ {{邮箱}}</span>
          <span>📍 {{城市}}</span>
        </div>
      </div>
      <div>{{头像}}</div>
    </div>
    <div class="body-content">
      <div class="sec-title">教育背景</div>
      <div>{{教育背景}}</div>
      <div class="sec-title">工作与校园经历</div>
      <div>{{工作经历}}</div>
      <div class="sec-title">项目经历</div>
      <div>{{项目经历}}</div>
      <div class="sec-title">核心能力与技能</div>
      <div>{{核心能力}}</div>
      <p style="margin-top: 8px; font-size: 12.5px; color: #475569;">{{技能工具}}</p>
    </div>
  </div>
</body>
</html>`;
  }

  // 3. Timeline Tech
  if (lower.includes("时间轴") || lower.includes("timeline") || lower.includes("极客") || lower.includes("tech")) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{姓名}} - 时间轴极客自定义模板</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 13.5px; line-height: 1.55; color: #1e293b; margin: 0; padding: 24px 36px; background: #ffffff; }
    .layout-timeline-tech { max-width: 820px; margin: 0 auto; }
    .tech-header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .tech-name { font-size: 26px; font-weight: 800; color: #2563eb; }
    .tech-intent { font-size: 13px; font-weight: 600; color: #475569; }
    .tech-contact { font-size: 12px; color: #64748b; margin-top: 6px; display: flex; gap: 14px; flex-wrap: wrap; }
    .sec-title { font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 22px; margin-bottom: 12px; display: flex; items-center: center; gap: 8px; }
    .sec-title::before { content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #2563eb; }
    .timeline-container { border-left: 2px solid #dbeafe; padding-left: 18px; margin-left: 4px; }
    ul { margin: 6px 0 10px 0; padding-left: 18px; }
    li { margin-bottom: 4px; color: #334155; }
  </style>
</head>
<body>
  <div class="layout-timeline-tech">
    <div class="tech-header">
      <div>
        <div class="tech-name">{{姓名}}</div>
        <div class="tech-intent">🎯 求职意向：{{求职意向}}</div>
        <div class="tech-contact">
          <span>🏫 {{学校}}</span>
          <span>📞 {{电话}}</span>
          <span>✉️ {{邮箱}}</span>
          <span>📍 {{城市}}</span>
        </div>
      </div>
      <div>{{头像}}</div>
    </div>
    <div class="sec-title">教育背景</div>
    <div>{{教育背景}}</div>
    <div class="sec-title">工作与校园经历</div>
    <div class="timeline-container">{{工作经历}}</div>
    <div class="sec-title">项目经历</div>
    <div class="timeline-container">{{项目经历}}</div>
    <div class="sec-title">核心能力与技术栈</div>
    <div>{{核心能力}}</div>
    <p style="margin-top: 8px; font-size: 12.5px; color: #475569;">{{技能工具}}</p>
  </div>
</body>
</html>`;
  }

  // 4. Default: Modern Left Sidebar Double Column
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{姓名}} - 1.3 简历双栏自定义模板</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; margin: 0; padding: 0; background: #ffffff; color: #1e293b; font-size: 13px; line-height: 1.6; }
    .layout-modern-sidebar { display: flex; min-height: 100vh; width: 100%; }
    .sidebar { width: 32%; background-color: #f1f5f9; padding: 32px 20px; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 20px; }
    .avatar-wrapper { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .name-title { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: 1px; margin: 10px 0 4px 0; }
    .sidebar-sec-title { font-size: 13.5px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #334155; padding-bottom: 4px; margin-bottom: 10px; }
    .info-item { font-size: 12px; color: #475569; margin-bottom: 8px; line-height: 1.5; }
    .main-content { flex: 1; padding: 32px 32px; background: #ffffff; }
    .main-sec-title { font-size: 14.5px; font-weight: 800; color: #0f172a; border-bottom: 2px dashed #94a3b8; padding-bottom: 6px; margin-top: 20px; margin-bottom: 12px; }
    .main-sec-title:first-child { margin-top: 0; }
    ul { margin: 6px 0 12px 0; padding-left: 18px; }
    li { margin-bottom: 4px; color: #334155; }
  </style>
</head>
<body>
  <div class="layout-modern-sidebar">
    <div class="sidebar">
      <div class="avatar-wrapper">
        {{头像}}
        <div class="name-title">{{姓名}}</div>
      </div>
      <div>
        <div class="sidebar-sec-title">基本信息</div>
        <div class="info-item">🏫 院校：{{学校}}</div>
        <div class="info-item">📞 手机：{{电话}}</div>
        <div class="info-item">✉️ 邮箱：{{邮箱}}</div>
        <div class="info-item">📍 城市：{{城市}}</div>
        <div class="info-item">🎯 意向：{{求职意向}}</div>
      </div>
      <div>
        <div class="sidebar-sec-title">自我评价</div>
        <div style="font-size: 12px; color: #475569; line-height: 1.65;">{{职业摘要}}</div>
      </div>
    </div>
    <div class="main-content">
      <div class="main-sec-title">教育背景</div>
      <div>{{教育背景}}</div>
      <div class="main-sec-title">工作与校园经历</div>
      <div>{{工作经历}}</div>
      <div class="main-sec-title">项目经历</div>
      <div>{{项目经历}}</div>
      <div class="main-sec-title">核心能力与所获荣誉</div>
      <div>{{核心能力}}</div>
      <p style="margin-top: 10px; font-size: 12.5px; color: #475569;">{{技能工具}}</p>
    </div>
  </div>
</body>
</html>`;
}

export { STYLE_LABELS };
