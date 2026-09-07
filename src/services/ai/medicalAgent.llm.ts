import { chatCompletionJSON } from "@/lib/ai/client";
import type { AIConfig } from "@/lib/ai/config";
import type { MedicalAnalysisResult, MedicalUserInput } from "@/types/medical";
import { enrichMedicalResult } from "@/lib/medical-enricher";

export const MEDICAL_DOCS_SYSTEM_PROMPT = `你是「医学生保研学术文书重构专家」，专门针对医学生保研拟录取后的个人陈述（PS）、学术简历（CV）与联系导师自荐信（Cover Letter）进行顶级深度重构。
【核心纪律 · 严禁捏造虚构信息，严格基于用户实际输入】：
1. 凡是用户【未填写】的字段（如未填导师姓名、未填目标院校、未填外语具体分数/GPA排名、未提供具体论文经历等）：
   - 绝对严禁自行虚构捏造具体的导师姓名（如高建华、李维新等）、虚假学校名称（如北京大学、中山大学、同济医学院等）、具体分数（如635分、3.91分）或虚假论文与奖项！
   - 保持真实克制：对于未填写的项目，使用规范的通用学术表述（如称呼【尊敬的老师】、目标称【目标院校/贵院】、本科称【本科院校】、成绩称【综合排名前列】、署名称【推免申请人】），绝不强行插入范例模版内容！
2. 聚焦真实输入：仅对用户实际提供的经历进行学术升华与逻辑强化，绝不无中生有。
3. 输出要求：严格输出合法的 JSON 格式，不得包含 Markdown 外部包裹标记（如 \`\`\`json 等）。`;

export const MEDICAL_INTERVIEW_SYSTEM_PROMPT = `你是「医学生推免考核答辩与进组面试命题专家」，专门针对医学生保研后（拟录取/锁定导师阶段）的进组答辩、专业英语文献抽题翻译与博导连环追问攻防进行超高水平命题。
【核心纪律 · 严禁捏造虚构信息，100% 严格基于申请人原始简历与实际经历定制】：
1. 必须深度提取用户【原始个人简历 (CV)】中实际填写的具体科研项目、实验技术、统计学方法、临床轮转科室或流调经历：
   - 自我介绍（1分钟、3分钟、5分钟）：必须把用户简历中的真实科研课题、负责板块、临床实习、掌握的专业软件与工具作为核心学术亮点逐一展开！绝对严禁脱离用户的简历内容去套用任何模版中的“2.4万人队列”或“非酒精性脂肪肝”！
   - 专业英语自我介绍 (English Self-Intro)：英文发言稿必须精确对齐用户简历里的真实经历与技能！
   - 5 道高难度专业考核追问 (Questions)：必须紧扣用户简历中提到的具体课题设计、统计/实验方法、临床科室或意向导师方向进行针对性深挖，绝不能出现与简历脱节的通用套题！
2. 凡是用户【未填写】的字段，保持学术通用表述，严禁凭空捏造具体数字与假人名。
3. 务必输出完整的 5 张 Slide PPT 架构与 5 道高难度深度专业追问，严禁省略或输出空数组！
4. 输出要求：严格输出合法的 JSON 格式，不得包含 Markdown 外部包裹标记（如 \`\`\`json 等）。`;

function buildMedicalDocumentsPrompt(input: MedicalUserInput): string {
  let trackLabel = "临床医学专业型硕士（规培四证合一）";
  if (input.track === "academic-research") {
    trackLabel = "科研学术型硕士/直博";
  } else if (input.track === "preventive-public-health") {
    trackLabel = "公共卫生与预防医学（流行病与卫生统计学/前瞻队列/MPH）";
  }

  const applicantName = input.name?.trim() || "（用户未填，请使用【推免申请人】）";
  const undergradSchool = input.undergradSchool?.trim() || "（用户未填具体本科学校，请使用【本科院校】统称，严禁捏造具体大学）";
  const undergradMajor = input.major?.trim() || "（用户未填具体专业，请基于医学/公卫大类统称）";
  const gpa = input.gpaRank?.trim() || "（用户未具体填写绩点排名，请使用【综合排名前列】统称，严禁捏造具体数字）";
  const english = input.englishLevel?.trim() || "（用户未具体填写外语成绩，严禁捏造具体分数）";
  const targetUniv = input.targetUniversity?.trim() || "（用户未指定具体目标院校，请使用【目标院校/贵院】统称，严禁捏造具体学校）";
  const stage = input.applicationStage?.trim() || "保研推免考核";
  const mentor = input.mentorName?.trim() || "（用户未指定具体导师姓名，自荐信中称呼【尊敬的老师：】，严禁捏造导师名字）";
  const mentorDir = [input.targetHospital, input.targetDepartment, input.mentorResearchDirection].filter(Boolean).join(" · ") || "（未指定具体课题方向）";
  const mentorPaper = input.mentorKeyPaper?.trim() || "（未提供导师代表作，严禁捏造虚假论文名）";

  return `请根据以下医学生保研申请信息，完成第一部分成果：「个人陈述(PS)诊断重构」、「学术简历(CV)优化」与「联系导师自荐信」。
【重要提示：用户未提供的信息，请严格使用通用学术表述，严禁无中生有捏造具体的人名、校名或论文！】

【申请人真实画像】：
• 姓名：${applicantName}
• 本科院校与专业：${undergradSchool} · ${undergradMajor}
• 推免成绩/排名：${gpa}
• 专业英语水平：${english}
• 拟攻读类型：${trackLabel}
• 细分方向：${input.preventiveSubSpecialty?.trim() || "（未指定细分方向）"}
• 目标申报院校与院系：${targetUniv}
• 申请考核阶段：${stage}
• 意向导师：${mentor}
• 意向课题方向：${mentorDir}
• 导师代表作：${mentorPaper}

【原始个人陈述 (PS)】：
${input.originalPS || "无"}

【原始个人简历 (CV)】：
${input.originalResume || "无"}

请严格按照如下 JSON 结构返回（只返回合法 JSON）：
{
  "psDiagnosis": {
    "overallScore": number (0-100),
    "dimensionScores": [
      { "dimension": "学术初心与切入点", "score": number, "comment": string },
      { "dimension": "科研逻辑与数据思维", "score": number, "comment": string },
      { "dimension": "临床/实验胜任力", "score": number, "comment": string },
      { "dimension": "导师课题与未来规划契合度", "score": number, "comment": string },
      { "dimension": "学术规范与语言严谨性", "score": number, "comment": string }
    ],
    "mainIssues": string[],
    "strengths": string[],
    "prioritySuggestions": string[],
    "sections": [
      {
        "sectionName": "motivation",
        "sectionTitle": "第一部分 · 临床/学术初心与问题意识",
        "originalText": string,
        "optimizedText": string,
        "reason": string,
        "mentorFocusPoint": string
      },
      {
        "sectionName": "research",
        "sectionTitle": "第二部分 · 科研潜质与核心技术突破",
        "originalText": string,
        "optimizedText": string,
        "reason": string,
        "mentorFocusPoint": string
      },
      {
        "sectionName": "clinical",
        "sectionTitle": "第三部分 · 临床实践胜任力 / 实验平台搭建",
        "originalText": string,
        "optimizedText": string,
        "reason": string,
        "mentorFocusPoint": string
      },
      {
        "sectionName": "plan",
        "sectionTitle": "第四部分 · 读研规划与导师课题结合设想",
        "originalText": string,
        "optimizedText": string,
        "reason": string,
        "mentorFocusPoint": string
      }
    ],
    "fullOptimizedPS": string
  },
  "cvOptimization": {
    "optimizedItems": [
      {
        "id": string,
        "section": string,
        "before": string,
        "after": string,
        "reason": string,
        "academicStandardTip": string
      }
    ],
    "finalMedicalResume": {
      "personalInfo": {
        "name": string,
        "undergradSchool": string,
        "major": string,
        "gpaRank": string,
        "englishLevel": string,
        "phone": string,
        "email": string,
        "targetTrack": string,
        "targetIntent": string
      },
      "academicSummary": string,
      "labSkills": [
        { "category": string, "items": string[] }
      ],
      "researchProjects": [
        { "title": string, "role": string, "period": string, "mentor": string, "bullets": string[] }
      ],
      "publications": [
        { "title": string, "authors": string, "journal": string, "impactFactor": string, "status": "已见刊 (Published)"|"已接收 (Accepted)"|"在审中 (Under Review)"|"在写/准备中 (In Prep)", "summary": string }
      ],
      "clinicalExperiences": [
        { "hospital": string, "department": string, "period": string, "bullets": string[] }
      ],
      "honorsAndScholarships": string[]
    }
  },
  "mentorEmail": {
    "subjectOptions": [
      { "style": string, "subject": string }
    ],
    "salutation": string,
    "bodyText": string,
    "attachmentChecklist": string[],
    "strategyTips": string[]
  }
}`;
}

function buildMedicalInterviewPrompt(input: MedicalUserInput): string {
  let trackLabel = "临床医学专业型硕士（规培四证合一）";
  if (input.track === "academic-research") {
    trackLabel = "科研学术型硕士/直博";
  } else if (input.track === "preventive-public-health") {
    trackLabel = "公共卫生与预防医学（流行病与卫生统计学/前瞻队列/MPH）";
  }

  const applicantName = input.name?.trim() || "（未填写姓名，自述中署名或称谓请使用【推免申请人】）";
  const undergradSchool = input.undergradSchool?.trim() || "（未填写具体学校，请使用【本科院校】统称，严禁捏造具体学校）";
  const undergradMajor = input.major?.trim() || "（未填写具体专业，请基于医学相关专业通用表述）";
  const targetUniv = input.targetUniversity?.trim() || "（未指定申报院校，请使用【目标院校/贵院】统称）";
  const mentor = input.mentorName?.trim() || "（未指定具体导师姓名，严禁捏造导师名字）";
  const mentorDir = [input.targetHospital, input.targetDepartment, input.mentorResearchDirection].filter(Boolean).join(" · ") || "（未指定具体课题方向）";
  const mentorPaper = input.mentorKeyPaper?.trim() || "（未提供导师代表作，严禁捏造虚假论文名）";

  return `请根据以下医学生保研申请信息，专门生成第二部分成果：「考核答辩工作台、中英文自我介绍、5分钟PPT架构与5大巅峰考官追问攻防」。
【极度重要纪律 · 严禁捏造模版假经历】：
请仔细阅读并完全提取下方的【原始个人简历 (CV)】！所有自我介绍（1/3/5分钟）、专业英文自我介绍与 5 道高难度专业追问，必须 100% 严格以该简历中填写的具体科研项目、实验技术、统计模型或临床轮转经历为事实依据展开！严禁使用任何模板中无关的“2.4万人队列”或“非酒精性脂肪肝”！

【申请人真实画像】：
• 姓名：${applicantName}
• 本科院校与专业：${undergradSchool} · ${undergradMajor}
• 拟攻读类型：${trackLabel}
• 细分方向：${input.preventiveSubSpecialty?.trim() || "（未指定细分方向）"}
• 目标申报院校与院系：${targetUniv}
• 意向导师：${mentor}
• 导师研究方向：${mentorDir}
• 导师代表作：${mentorPaper}

【申请人原始学术简历 (CV)】（！！！核心提取依据，自我介绍与追问必须以此为中心！！！）：
${input.originalResume || "（用户未单独上传简历原稿，请严格提取下方个人陈述中的科研项目与临床经历）"}

【申请人原始个人陈述 (PS)】：
${input.originalPS || "无"}

【申请人补充说明】：
${input.additionalNotes || "无"}

【生成要求 · 严格对齐简历】：
1. 必须生成 3 套自述（1分钟闪电版、3分钟标准学术版、5分钟答辩讲稿完整版）：必须直接基于用户简历中的真实科研项目、临床科室或社会调查经历展开阐述！
2. 必须生成 地道专业英语自我介绍（含生词音标解释）：必须用专业学术英文介绍用户简历中的真实科研课题与实操技能！
3. 必须生成 5 张 Slide PPT 答辩幻灯片精益规划；
4. 必须生成 专业英语文献抽题翻译与局限性批判；
5. 必须生成 5 道具备极高专业技术杀伤力的博导高难追问：
   - 第1题：深挖用户简历中核心科研项目的方法学局限、偏倚控制或混杂调整；
   - 第2题：质询用户简历中使用的具体统计模型或实验技术的核心前提假设与异常处理；
   - 第3题：考核用户简历中临床轮转或现场流调经历的实战决策与指南规范；
   - 第4题：考核用户简历科研中阴性结果、异常值排查与学术诚信；
   - 第5题：结合目标院校【${targetUniv}】与意向导师【${mentor}】的【${mentorDir}】方向，考查学生的课题结合点与攻关可行性。
   每题务必包含考官心机、踩雷回答、推荐高分回答、证据要点与学术武器库；
6. 必须生成 考核心态分析与排坑清单。

请严格按照如下 JSON 结构返回：
{
  "labInterviewPrep": {
    "selfIntroductions": [
      {
        "title": "1分钟闪电版 (夏令营破冰/考官赶时间)",
        "duration": "60秒",
        "targetAudience": "极简学术画像",
        "speechText": string,
        "breakdownTips": string[],
        "keyHighlights": string[]
      },
      {
        "title": "3分钟标准学术版 (推免面试黄金标杆)",
        "duration": "180秒",
        "targetAudience": "常规推免面试主考自述",
        "speechText": string,
        "breakdownTips": string[],
        "keyHighlights": string[]
      },
      {
        "title": "5分钟答辩讲稿完整版 (PPT汇报配套)",
        "duration": "300秒",
        "targetAudience": "带PPT答辩时的完整逐字讲稿",
        "speechText": string,
        "breakdownTips": string[],
        "keyHighlights": string[]
      }
    ],
    "englishSelfIntro": {
      "duration": "90~120秒",
      "englishText": string,
      "chineseTranslation": string,
      "phoneticsAndKeyTerms": [
        { "term": string, "explanation": string }
      ],
      "deliveryTips": string[]
    },
    "defenseSlideFramework": [
      {
        "slideNumber": number,
        "title": string,
        "timeAllocation": string,
        "contentFocus": string,
        "speakingScript": string,
        "visualAdvice": string
      }
    ],
    "englishLiteratureDefense": {
      "articleTitle": string,
      "journalAndYear": string,
      "abstractSnippet": string,
      "chineseTranslation": string,
      "commonQuestions": string[],
      "keyGlossary": [
        { "term": string, "translation": string }
      ],
      "translationStrategy": string
    },
    "questions": [
      {
        "category": "因果推断与混杂偏倚" | "孟德尔随机化假设与多效性" | "队列随访与竞争风险模型" | "突发公共卫生现场流调决策" | "前沿文献与导师代表作批判性反思" | "专硕规培与时间分配" | "实验原理与排查",
        "difficulty": "地狱级 (Hardcore)" | "高难度 (Hard)" | "考官陷阱 (Trap)",
        "question": string,
        "coreIntent": string,
        "badAnswer": string,
        "recommendedAnswer": string,
        "evidencePoints": string[],
        "academicWeapons": string[]
      }
    ],
    "mentorMindsetAnalysis": string[],
    "defenseChecklist": string[]
  }
}`;
}

export async function runLLMMedicalAnalysis(
  input: MedicalUserInput,
  config?: AIConfig
): Promise<MedicalAnalysisResult> {
  // Execute Document Optimization (PS, CV, Email) and Interview Studio (Defense, Q&A) concurrently
  const [docRes, interviewRes] = await Promise.allSettled([
    chatCompletionJSON<{
      psDiagnosis: MedicalAnalysisResult["psDiagnosis"];
      cvOptimization: MedicalAnalysisResult["cvOptimization"];
      mentorEmail: MedicalAnalysisResult["mentorEmail"];
    }>(
      {
        system: MEDICAL_DOCS_SYSTEM_PROMPT,
        user: buildMedicalDocumentsPrompt(input),
        maxTokens: 4096,
        temperature: 0.3,
      },
      config
    ),
    chatCompletionJSON<{
      labInterviewPrep: MedicalAnalysisResult["labInterviewPrep"];
    }>(
      {
        system: MEDICAL_INTERVIEW_SYSTEM_PROMPT,
        user: buildMedicalInterviewPrompt(input),
        maxTokens: 4096,
        temperature: 0.3,
      },
      config
    ),
  ]);

  const docs = docRes.status === "fulfilled" ? docRes.value : null;
  const interview = interviewRes.status === "fulfilled" ? interviewRes.value : null;

  if (!docs && !interview) {
    const err =
      docRes.status === "rejected"
        ? docRes.reason
        : interviewRes.status === "rejected"
        ? interviewRes.reason
        : new Error("大模型调用失败");
    throw err;
  }

  const combinedResult: Partial<MedicalAnalysisResult> = {
    psDiagnosis: docs?.psDiagnosis,
    cvOptimization: docs?.cvOptimization,
    mentorEmail: docs?.mentorEmail,
    labInterviewPrep: interview?.labInterviewPrep,
  };

  return enrichMedicalResult(combinedResult, input);
}
