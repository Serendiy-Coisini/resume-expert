import type {
  MedicalAnalysisResult,
  MedicalUserInput,
  SelfIntroVersion,
  EnglishSelfIntro,
  EnhancedInterviewQuestion,
} from "@/types/medical";
import {
  PRESET_ACADEMIC_MASTER,
  PRESET_CLINICAL_MASTER,
  PRESET_PREVENTIVE_PUBLIC_HEALTH,
} from "./medical-presets";

function replaceAllTokens(text: string, input: Partial<MedicalUserInput>): string {
  if (!text) return text;
  let res = text;

  // Placeholder map: [regex, placeholder]
  // Match specific/longer tokens first so shorter substrings don't clobber them
  const placeholderMap: [RegExp, string][] = [
    // 1. Preset Names
    [/周思敏|陈书涵|林逸舟/g, "___PH_NAME___"],

    // 2. Preset Mentors
    [/高建华教授|李维新教授|沈宏宇教授/g, "___PH_MENTOR_PROF___"],
    [/高教授|李教授|沈教授/g, "___PH_MENTOR_SHORT___"],
    [/高老师|李老师|沈老师/g, "___PH_MENTOR_TEACHER___"],

    // 3. Preset Target Institutions (match full college/hospital names first)
    [/北京大学公共卫生学院|复旦大学附属中山医院|中山大学肿瘤防治中心/g, "___PH_TARGET_FULL___"],
    [/北大公卫|中大肿瘤/g, "___PH_TARGET_COLLEGE___"],
    [/中山医院/g, "___PH_TARGET_HOSP___"],
    [/北京大学/g, "___PH_TARGET_UNIV___"],
    [/北大/g, "___PH_TARGET_SHORT___"],

    // 4. Preset Undergrad Schools
    [/中山大学公共卫生学院|华中科技大学同济医学院|中南大学湘雅医学院/g, "___PH_UNDERGRAD_FULL___"],
    [/中大公卫|同济公卫|湘雅公卫/g, "___PH_UNDERGRAD_GW___"],
    [/同济医学院|湘雅医学院/g, "___PH_UNDERGRAD_MED___"],
    [/中大|同济|湘雅/g, "___PH_UNDERGRAD_SHORT___"],

    // 5. Target Departments
    [/流行病与卫生统计学系|流行病与卫生统计学|心血管内科|肿瘤研究所/g, "___PH_TARGET_DEPT___"],

    // 6. Major
    [/预防医学（五年制本科）|预防医学（五年制）|预防医学专业/g, "___PH_MAJOR___"],

    // 7. GPA / Rank
    [/前四年推免综合排名为 2\/98|综合排名第 2\/98|2\/98（Top 2\.0%）|2\/98 \(前 2\.0%\)|2\/98 \(Top 2%\)/g, "___PH_GPA_FULL___"],
    [/2\/98/g, "___PH_GPA_SHORT___"],

    // 8. English
    [/英语六级\s*\(?635\s*分?\)?|六级\s*\(?635\s*分?\)?|\(CET-6\)\s*635\s*分|CET-6\s*635/gi, "___PH_ENG_FULL___"],
    [/635\s*分/g, "___PH_ENG_SCORE___"],
  ];

  for (const [pattern, ph] of placeholderMap) {
    res = res.replace(pattern, ph);
  }

  // Resolve placeholders to user-supplied values or contextual defaults
  const nameVal = input.name?.trim() || "申请人";
  const schoolVal = input.undergradSchool?.trim() || "本科院校";
  const shortSchool = schoolVal.replace(/公共卫生学院|同济医学院|湘雅医学院|医学院|医学部|大学|学院/g, "");
  const schoolGW = shortSchool ? `${shortSchool}公卫` : "本科公卫";
  const schoolMed = shortSchool ? `${shortSchool}医学院` : "本科医学院";
  const schoolShort = shortSchool || "本科院校";

  const targetUnivVal = input.targetUniversity?.trim() || "";
  const targetHospVal = input.targetHospital?.trim() || "";
  const targetFull = targetUnivVal || targetHospVal || "目标院校";
  const shortTarget = targetFull.replace(/公共卫生学院|附属中山医院|肿瘤防治中心|医学院|医学部|附属医院|医院/g, "");

  const rawMentor = input.mentorName?.trim() || "";
  const mentorProf = rawMentor
    ? (rawMentor.includes("教授") || rawMentor.includes("老师") || rawMentor.includes("主任") ? rawMentor : `${rawMentor}教授`)
    : "意向导师";
  const mentorShort = rawMentor
    ? (rawMentor.includes("教授") ? rawMentor : `${rawMentor.replace(/老师|主任|医师|博导/g, "")}教授`)
    : "教授";
  const mentorTeacher = rawMentor
    ? (rawMentor.includes("老师") ? rawMentor : `${rawMentor.replace(/教授|主任|医师|博导/g, "")}老师`)
    : "老师";

  const majorVal = input.major?.trim() || "本科专业";
  const deptVal = input.targetDepartment?.trim() || "意向学科方向";
  const gpaFull = input.gpaRank?.trim() || "推免综合排名前列";
  const gpaShort = input.gpaRank?.trim() || "推免前列";
  const engFull = input.englishLevel?.trim() || "大学英语六级";
  const engScore = input.englishLevel?.trim() || "英语六级良好";

  res = res
    .replace(/___PH_NAME___/g, nameVal)
    .replace(/___PH_MENTOR_PROF___/g, mentorProf)
    .replace(/___PH_MENTOR_SHORT___/g, mentorShort)
    .replace(/___PH_MENTOR_TEACHER___/g, mentorTeacher)
    .replace(/___PH_TARGET_FULL___/g, targetFull)
    .replace(/___PH_TARGET_COLLEGE___/g, targetFull)
    .replace(/___PH_TARGET_HOSP___/g, targetHospVal || targetFull)
    .replace(/___PH_TARGET_UNIV___/g, targetUnivVal || targetFull)
    .replace(/___PH_TARGET_SHORT___/g, shortTarget || "目标院校")
    .replace(/___PH_UNDERGRAD_FULL___/g, schoolVal)
    .replace(/___PH_UNDERGRAD_GW___/g, schoolGW)
    .replace(/___PH_UNDERGRAD_MED___/g, schoolMed)
    .replace(/___PH_UNDERGRAD_SHORT___/g, schoolShort)
    .replace(/___PH_TARGET_DEPT___/g, deptVal)
    .replace(/___PH_MAJOR___/g, majorVal)
    .replace(/___PH_GPA_FULL___/g, gpaFull)
    .replace(/___PH_GPA_SHORT___/g, gpaShort)
    .replace(/___PH_ENG_FULL___/g, engFull)
    .replace(/___PH_ENG_SCORE___/g, engScore);

  return res;
}

export interface ExtractedResumeProject {
  title: string;
  bullets: string[];
}

export interface ExtractedResumeDetails {
  isDefault24kCohort: boolean;
  hasCustomResume: boolean;
  primaryProject: string;
  primaryMethods: string;
  primaryClinical: string;
  researchItems: string[];
  researchProjects: ExtractedResumeProject[];
  clinicalItems: string[];
  skillItems: string[];
}

function extractResumeDetails(input?: Partial<MedicalUserInput>): ExtractedResumeDetails {
  const resumeText = (input?.originalResume || "").trim();
  const psText = (input?.originalPS || "").trim();
  const combined = `${resumeText}\n${psText}`;

  const isDefault24kCohort =
    resumeText.includes("2.4 万") ||
    resumeText.includes("24,000") ||
    resumeText.includes("2.4万人") ||
    psText.includes("2.4 万") ||
    psText.includes("24,000");

  const lines = (resumeText ? resumeText.split("\n") : psText.split("\n"))
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const toolKeywords = [
    "R语言", "R 语言", "Python", "SPSS", "Stata", "SAS", "EpiData",
    "GraphPad", "Prism", "Linux", "SQL", "PCR", "Western Blot",
    "ELISA", "免疫组化", "流式细胞", "细胞培养", "类器官", "动物实验",
    "GWAS", "孟德尔随机化", "Cox", "Logistic", "GAM", "因果推断", "Meta分析"
  ];

  const skillItems: string[] = [];
  for (const tool of toolKeywords) {
    if (new RegExp(tool.replace("+", "\\+"), "i").test(combined) && !skillItems.includes(tool)) {
      skillItems.push(tool);
    }
  }

  function getSectionType(line: string): "education" | "research" | "clinical" | "skills" | "honors" | "publications" | "other" | null {
    const clean = line
      .replace(/^[【\[\(（#\-\*\d\.\s、一二三四五六七八九十]+|[】\]\)）\s：:]+$/g, "")
      .trim();
    if (clean.length === 0 || clean.length > 15) return null;

    if (/教育|学习经历|基本信息|主修课程/.test(clean)) return "education";
    if (/科研|课题|项目|论文|学术|研究经历|核心科研/.test(clean) && !/荣誉|奖励|奖学金/.test(clean)) return "research";
    if (/实习|临床|见习|轮转|规培|实践|工作经历|医院见习|疾控/.test(clean)) return "clinical";
    if (/技能|特长|软件|语言能力|计算机|实验技能/.test(clean)) return "skills";
    if (/荣誉|奖励|奖学金|所获荣誉|评优/.test(clean)) return "honors";
    if (/发表|成果|产出/.test(clean)) return "publications";
    if (/自我评价|个人简介|研究方向|意向导师|报考意向/.test(clean)) return "other";
    return null;
  }

  function cleanLineContent(line: string): string {
    let text = line.trim();
    text = text.replace(/^[【\[\(（#\-\*•\s、]+/, "");
    text = text.replace(/^(?:项目|课题|研究|论文)?\s*(?:\d+|[一二三四五六七八九十]+)?[：:\-、\.\s]+/, "");
    text = text.replace(/[】\]\)）]+$/, "").replace(/[；;。]+$/, "").trim();
    return text;
  }

  let currentSection: "education" | "research" | "clinical" | "skills" | "honors" | "publications" | "other" | null = null;
  const researchProjects: ExtractedResumeProject[] = [];
  const clinicalItems: string[] = [];

  const researchKeywords = [
    "课题", "科研", "项目", "研究", "队列", "实验", "论文", "分析", "调查", "生信", "模型",
    "Cox", "Logistic", "回归", "因果", "MR", "随访", "机制", "干预", "试验", "清洗", "建模"
  ];
  const clinicalKeywords = [
    "实习", "见习", "医院", "科室", "病房", "门诊", "疾控", "CDC", "中心", "内科", "外科",
    "儿科", "妇产", "感染", "肿瘤", "急诊", "重症", "轮转", "流调", "疫情", "处方", "病历", "规培"
  ];

  for (const rawLine of lines) {
    const sec = getSectionType(rawLine);
    if (sec) {
      currentSection = sec;
      continue;
    }

    const cleaned = cleanLineContent(rawLine);
    if (cleaned.length < 3) continue;

    if (currentSection === "research") {
      const hasBulletMarker = /^[-\*•]\s*/.test(rawLine);
      const isActionVerb = /^(运用|负责|使用|采用|利用|主要负责|独立完成|配合|参与编写)/.test(cleaned);
      const isBullet = hasBulletMarker || (researchProjects.length > 0 && isActionVerb);

      if (isBullet && researchProjects.length > 0) {
        researchProjects[researchProjects.length - 1].bullets.push(cleaned);
      } else {
        researchProjects.push({ title: cleaned, bullets: [] });
      }
    } else if (currentSection === "clinical") {
      clinicalItems.push(cleaned);
    } else if (currentSection === "skills") {
      // already captured by toolKeywords
    } else if (!currentSection) {
      // Freeform fallback if user didn't use section headers
      if (clinicalKeywords.some((k) => cleaned.includes(k))) {
        clinicalItems.push(cleaned);
      } else if (researchKeywords.some((k) => cleaned.includes(k))) {
        researchProjects.push({ title: cleaned, bullets: [] });
      }
    }
  }

  const researchItems = researchProjects.map((p) => p.title);

  const primaryProject =
    researchProjects.length > 0
      ? researchProjects[0].title
      : input?.mentorResearchDirection
      ? `${input.mentorResearchDirection}相关课题探索`
      : "医学学术科研与专业数据分析实践";

  const primaryMethods =
    researchProjects[0]?.bullets?.[0]
      ? researchProjects[0].bullets[0]
      : researchProjects.length > 1
      ? researchProjects[1].title
      : skillItems.length > 0
      ? skillItems.slice(0, 3).join("、")
      : "医学统计分析与科学偏倚控制";

  const primaryClinical =
    clinicalItems.length > 0
      ? clinicalItems[0]
      : input?.targetHospital || input?.targetDepartment
      ? `${input?.targetHospital || ""}${input?.targetDepartment || ""}实践轮转`
      : "医学院附属医院临床规范化轮转与现场实践";

  return {
    isDefault24kCohort,
    hasCustomResume: Boolean(resumeText.length > 10 || psText.length > 15),
    primaryProject,
    primaryMethods,
    primaryClinical,
    researchItems,
    researchProjects,
    clinicalItems,
    skillItems: skillItems.length > 0 ? skillItems : ["医学统计分析", "科研数据治理", "文献系统评价"],
  };
}

function buildResumeBasedSelfIntroductions(
  input: Partial<MedicalUserInput>,
  details: ReturnType<typeof extractResumeDetails>
): SelfIntroVersion[] {
  const applicantName = input?.name?.trim() || "推免申请人";
  const school = input?.undergradSchool?.trim() || "本科院校";
  const major = input?.major?.trim() || "医学相关专业";
  const gpa = input?.gpaRank?.trim() || "专业综合排名前列";
  const english = input?.englishLevel?.trim() || "大学英语六级良好";
  const targetUniv = input?.targetUniversity?.trim() || "目标院校";
  const mentorTitle = input?.mentorName?.trim()
    ? (input.mentorName.includes("教授") || input.mentorName.includes("老师") ? input.mentorName : `${input.mentorName}教授`)
    : "各位评审专家与导师";
  const mentorDir = [input?.targetHospital, input?.targetDepartment, input?.mentorResearchDirection]
    .filter(Boolean)
    .join(" · ") || "意向学科前沿方向";

  const toolsStr = details.skillItems.slice(0, 3).join("、");
  const clinicalBrief = details.clinicalItems.length > 0 ? details.clinicalItems[0] : details.primaryClinical;

  return [
    {
      title: "1分钟闪电版 (夏令营破冰/考官赶时间)",
      duration: "60秒",
      targetAudience: "极简学术画像",
      speechText: `各位老师好！非常荣幸参加本次推免面试。我是来自${school}${major}的${applicantName}。

本科期间，我推免学分绩点与综合排名为${gpa}，${english}，打下了扎实的医学专业功底。
在核心科研上，我紧密结合简历中的经历，主要参与了【${details.primaryProject}】。在此期间熟练运用了${toolsStr}等专业方法，重点负责【${details.primaryMethods}】，培养了严谨的病因分析与实操排障能力；
在临床与现场实践上，我在【${clinicalBrief}】中完成了系统性轮转，筑牢了循证思维与医疗责任意识。
本次申报，我非常渴望推免进入【${targetUniv}】${mentorTitle}团队，将我的专业背景与团队在【${mentorDir}】方向的顶尖平台紧密结合，开展高质量前沿探索！谢谢各位老师！`,
      breakdownTips: [
        "开篇 15 秒极速报出校系姓名、GPA 与英语硬指标，建立学霸第一印象；",
        `中段 30 秒紧扣简历实际参与的【${details.primaryProject.slice(0, 15)}...】与核心工具，拒绝空洞模版套话；`,
        `结尾 15 秒精准对齐【${targetUniv}】与【${mentorTitle}】，表达明确的开题意向。`,
      ],
      keyHighlights: [
        `真实学术背景：${school} · ${major} · ${gpa}`,
        `简历核心科研：${details.primaryProject.slice(0, 25)}`,
        `熟练方法学：${toolsStr}`,
      ],
    },
    {
      title: "3分钟标准学术版 (推免面试黄金标杆)",
      duration: "180秒",
      targetAudience: "常规推免面试主考自述",
      speechText: `各位尊敬的评审专家、${mentorTitle}：您好！非常荣幸参加本次推免直博/硕士考核。我是来自${school}${major}的${applicantName}。

【学术背景与专业基石】
本科前四年，我始终以高标准要求自己，推免综合成绩排名为${gpa}，${english}，具备流畅研读国际顶刊文献与撰写专业医学文书的能力。扎实的基础课与方法学训练，让我建立起严谨的医学思辨框架。

【简历核心科研攻坚与方法学实操】
在科研实践上，我拒绝走马观花式的‘挂名’，而是追求真正掌握实战分析能力。本科期间，我深度参与了【${details.primaryProject}】。在该项目中，面对真实业务与复杂数据，我熟练运用【${toolsStr}】等专业工具，具体负责并推进了【${details.primaryMethods}】。
在项目推进过程中，我曾遇到过关键变量异常与偏倚控制的难点，通过查阅同行经典文献与规范化敏感性分析，最终保证了结果的客观稳健。这次经历让我深刻体会到：真实的数据质量与严密的方法学控制是医学研究的生命线。

【临床轮转与现场实践实战】
在临床与实务历练方面，我在【${clinicalBrief}】中完成了深入的一线实践。面对真实病例与现场复杂条件，我坚持‘循证医学与规范第一’，严格执行标准化操作与医疗记录，锻炼了扎实的应变决策能力与医患沟通素养。

【为何向往本平台与未来攻关设想】
【${targetUniv}】拥有国家级高水平科研平台与雄厚的师资力量。${mentorTitle}在【${mentorDir}】领域的造诣与代表性成果深深启发了我。如果荣幸入选团队深造，我将充分发挥本科积累的方法学与实践基础，在老师指导下迎难而上，产出高水平原创医学成果。谢谢各位老师！`,
      breakdownTips: [
        "第 1 分钟：院校专业、学分绩点与核心专业素养，展现学术基本盘；",
        `第 2 分钟：重锤简历科研【${details.primaryProject.slice(0, 20)}...】，说明具体方法【${toolsStr}】与排障韧性；`,
        `第 3 分钟：临床实践一线感悟，衔接【${targetUniv}】与【${mentorTitle}】团队课题方向。`,
      ],
      keyHighlights: [
        `硬核科研背书：深度参与【${details.primaryProject.slice(0, 20)}】`,
        `方法工具实操：${toolsStr}`,
        `临床现场历练：${clinicalBrief.slice(0, 20)}`,
        `院校导师对齐：对齐${targetUniv} · ${mentorTitle}`,
      ],
    },
    {
      title: "5分钟答辩讲稿完整版 (PPT汇报配套)",
      duration: "300秒",
      targetAudience: "带PPT答辩时的完整逐字讲稿",
      speechText: `各位评委专家、${mentorTitle}：上午好！我是${school}${major}的推免生${applicantName}。非常荣幸向各位老师汇报我的个人背景、科研实践与未来研究规划。

【第一部分 · 个人画像与专业基础】
首先请看第 1 张幻灯片。本科阶段我的综合推免成绩排名为${gpa}，${english}。在扎实掌握专业主干课程的同时，我积极拓展统计学与实验技能，为后续独立科研打下了坚实的底座。

【第二部分 · 简历代表性科研课题攻关】
请看第 2 张幻灯片。本科期间，我最核心的科研经历是参与【${details.primaryProject}】。
在该项研究中，我的主要角色是【核心分析与执行骨干】。针对课题面临的技术挑战，我综合运用了【${toolsStr}】，深入开展了【${details.primaryMethods}】。在研究设计与分析中，我们系统排查了选择偏倚与混杂因素，确保每一个统计推断和实验数据都经得起推敲。这项工作极大地训练了我的独立科研思维与实战动手能力。

【第三部分 · 临床一线实战与职业胜任力】
请看第 3 张幻灯片。在实践历练上，我在【${clinicalBrief}】完成了一线轮转与实务训练。在带教老师指导下，我规范参与临床病程记录、疑难病例讨论与现场调研，深刻认识到基础医学研究与临床实际转化相契合的重要性。

【第四部分 · 科研挫折排障与学术韧性】
请看第 4 张幻灯片。科研绝非一帆风顺。在处理【${details.primaryProject}】的实操过程中，我们曾遭遇过异常数据波动与质控瓶颈。当时我没有急功近利，而是花了数周时间回溯原始记录与操作规范，修正逻辑映射，最终攻克难关。这次经历让我明白，严谨求实与经得起检验是青年学者立身之本。

【第五部分 · 读研规划与融入课题组设想】
最后请看第 5 张幻灯片。【${targetUniv}】学术平台顶尖，${mentorTitle}团队在【${mentorDir}】领域的代表性探索非常契合我的学术志趣。若有幸被拟录取入组，我计划在研究生期间，将本科沉淀的【${toolsStr}】优势与课题组优势队列/实验平台深度结合，争取尽早开题并产出高质量成果。
我的汇报完毕，恳请各位评审专家批评指正！`,
      breakdownTips: [
        "配合 5 张 PPT 架构推进，每张幻灯片对应一分钟逐字讲稿；",
        `重点突出第 2、3 张 PPT：详述简历科研【${details.primaryProject.slice(0, 18)}】的数据、工具与贡献；`,
        "语言学术规范、节奏张弛有度，结尾自然过渡到答辩问答阶段。",
      ],
      keyHighlights: [
        "结构化 5 张 PPT 完美配合逐字稿",
        `简历真实项目：${details.primaryProject.slice(0, 22)}`,
        `熟练掌握工具：${toolsStr}`,
        `目标导师结合：${mentorTitle} · ${mentorDir}`,
      ],
    },
  ];
}

function buildResumeBasedEnglishSelfIntro(
  input: Partial<MedicalUserInput>,
  details: ReturnType<typeof extractResumeDetails>
): EnglishSelfIntro {
  const applicantName = input?.name?.trim() || "Applicant";
  const school = input?.undergradSchool?.trim() || "my undergraduate university";
  const major = input?.major?.trim() || "Preventive Medicine and Public Health";
  const gpa = input?.gpaRank?.trim() || "top academic ranking";
  const english = input?.englishLevel?.trim() || "proficient English skills (CET-6)";
  const targetUniv = input?.targetUniversity?.trim() || "your esteemed university";
  const mentorTitle = input?.mentorName?.trim()
    ? `Professor ${input.mentorName.replace(/教授|老师|主任/g, "")}`
    : "distinguished professors";
  const mentorDir = input?.mentorResearchDirection?.trim() || "your pioneering research field";

  const englishText = `Good morning, distinguished professors! It is a great honor to attend this recommendation interview. My name is ${applicantName}, majoring in ${major} at ${school}.

During my undergraduate studies, I have consistently pursued excellence, achieving an academic ranking of ${gpa}, with ${english}. This solid foundation has equipped me with strong professional competence and critical thinking skills.

In terms of scientific research, I actively engaged in the project regarding "${details.primaryProject}". Within this project, I was mainly responsible for ${details.primaryMethods}, utilizing analytical and laboratory tools such as ${details.skillItems.slice(0, 3).join(", ")}. Through rigorous methodology and sensitivity analyses, I developed solid hands-on experience in data governance, bias control, and causal inference.

Regarding clinical and field practice, I completed my internship and rotation at ${details.primaryClinical}, where I gained practical insights into evidence-based medical standards and interdisciplinary collaboration.

I have always admired the exceptional academic reputation of ${targetUniv}, particularly the cutting-edge achievements in ${mentorDir} led by ${mentorTitle}. I am eager to join this distinguished team and contribute my dedication to future breakthroughs. Thank you very much!`;

  const chineseTranslation = `尊敬的各位评审专家，早上好！非常荣幸参加本次推免面试。我是来自${school}${major}的${applicantName}。

在本科期间，我始终保持优异的学业表现，推免成绩排名为${gpa}，${english}。扎实的专业课基础培养了我严密的医学思维与综合素质。

在科研实践方面，我重点参与了【${details.primaryProject}】。在此期间，我主要负责【${details.primaryMethods}】，熟练运用了${details.skillItems.slice(0, 3).join("、")}等专业工具。通过严谨的方法学实践与敏感性分析，我积累了扎实的数据质控、偏倚排查与实战攻关能力。

在临床轮转与实战历练方面，我在【${details.primaryClinical}】中完成了系统实践，深化了对循证医学规范与多学科协作的理解。

我一直十分向往【${targetUniv}】卓越的学术声誉，尤其是${mentorTitle}在【${mentorDir}】领域的开创性成就。我非常渴望加入这个优秀的团队，全心投入科研攻坚，争取早日产出高质量学术成果。非常感谢各位老师！`;

  return {
    duration: "90~120秒",
    englishText,
    chineseTranslation,
    phoneticsAndKeyTerms: [
      { term: "Causal Inference [ˈkɔːzl ˈɪnfərəns]", explanation: "因果推断：医学流行病学中排除混杂、论证真实病因的关键方法" },
      { term: "Residual Confounding [rɪˈzɪdʒuəl kənˈfaʊndɪŋ]", explanation: "残余混杂：即使调整多因素后依然存在的潜在混杂偏倚" },
      { term: "Sensitivity Analysis [ˌsensəˈtɪvəti əˈnæləsɪs]", explanation: "敏感性分析：检验研究假说、缺失插补及效应估计稳健性的核心技术" },
      { term: "Evidence-Based Medicine [ˈevɪdəns beɪst ˈmedsn]", explanation: "循证医学：临床与公共卫生决策的最高金标准" },
    ],
    deliveryTips: [
      "语速保持在每分钟 110~130 词，发音清晰，关键专业词汇与项目名称适度重音放慢；",
      `介绍科研项目【${details.primaryProject.slice(0, 15)}...】时，神情自信坚定，眼神与主考老师保持自然交流；`,
      "遇到专业名词停顿半秒，体现沉稳成熟的学术气质，切忌慌张背诵。",
    ],
  };
}

function buildResumeBasedQuestions(
  input: Partial<MedicalUserInput>,
  details: ReturnType<typeof extractResumeDetails>
): EnhancedInterviewQuestion[] {
  const targetUniv = input?.targetUniversity?.trim() || "目标院校";
  const mentorTitle = input?.mentorName?.trim()
    ? (input.mentorName.includes("教授") || input.mentorName.includes("老师") ? input.mentorName : `${input.mentorName}教授`)
    : "导师课题组";
  const mentorDir = input?.mentorResearchDirection?.trim() || "本学科前沿重大课题";
  const primaryProject = details.primaryProject;
  const primaryMethods = details.primaryMethods;
  const toolName = details.skillItems[0] || "多因素回归与数据清洗";
  const clinicalName = details.primaryClinical;

  return [
    {
      category: "因果推断与混杂偏倚",
      difficulty: "地狱级 (Hardcore)",
      question: `针对你在简历中重点参与的【${primaryProject}】，在运用【${primaryMethods}】进行分析时，你如何评估并证明研究结论没有受到‘选择偏倚（Selection Bias）’或‘残余混杂（Residual Confounding）’的虚假影响？你计算过敏感性指标或 E-value 吗？`,
      coreIntent: "考查学生对自己简历科研经历是真正亲手实操、深入理解方法学局限，还是仅仅挂名或当“跑代码工具人”。",
      badAnswer: "“报告老师，我们在分析中把有意义的单因素变量都放进多因素模型了，P值都小于0.05，所以肯定是真实的因果关系。”（严重错误！把统计学相关等同于因果，暴露出对方法学基础概念的严重欠缺）",
      recommendedAnswer: `“感谢老师的深度提问！针对【${primaryProject}】，我们从三个层面进行了严密质控：第一，在设计阶段通过严格的入排标准与变量定义规避选择偏倚；第二，在分析阶段通过多因素回归、亚组分析与交互作用检验排查残余混杂；第三，进行多维敏感性分析（如排除随访前期的事件发生者以规避反向因果，并计算E-value评估未测混杂的鲁棒性）。实践证明，严密的方法学控制是确保研究结论经得起同行重复的基石。”`,
      evidencePoints: [
        "严格设定纳入排除标准规避选择偏倚",
        "多因素模型严密调整核心混杂变量并排查共线性",
        "敏感性分析与 E-value 因果鲁棒性检验",
      ],
      academicWeapons: [
        "VanderWeele E-value 灵敏度分析 [Ann Intern Med 2017]",
        "残余混杂多维控制策略",
        "反向因果时序排查机制",
      ],
    },
    {
      category: "统计模型与分析工具假设",
      difficulty: "高难度 (Hard)",
      question: `你在【${primaryProject}】中运用了【${toolName}】。请问该方法的核心适用前提（Assumptions）是什么？在处理实际数据时，如果这些假设被违背，你会选择什么替代模型或修正策略？`,
      coreIntent: "考查学生在简历中声称掌握的技能是否具备底层原理认知，严防只会套包调参的“黑盒”应试者。",
      badAnswer: "“只要把数据导入软件运行出结果就行了，通常默认都能跑，没有专门去检验假设。”",
      recommendedAnswer: `“老师提到了非常关键的方法学基石。以【${toolName}】为例，其核心在于自变量的线性假定、残差独立同分布及无严重多重共线性。当实际数据违背该前提时，我们通常采用限制性立方样条 (RCS) 放宽线性限制，或采用广义估计方程 (GEE) / 混合效应模型处理相关数据，确保统计推断的严密性。”`,
      evidencePoints: [
        "掌握核心算法前提假设检验与诊断图",
        "熟练处理非线性关系与多重共线性 (VIF)",
        "具备替代模型诊断与切换能力",
      ],
      academicWeapons: [
        "限制性立方样条 (Restricted Cubic Splines, RCS)",
        "方差膨胀因子 (VIF > 5 报警阈值)",
        "广义估计方程 (GEE)",
      ],
    },
    {
      category: "临床实践与实战决策",
      difficulty: "考官陷阱 (Trap)",
      question: `在简历提及的【${clinicalName}】实践过程中，如果一线遭遇突发临床矛盾（或现场流调数据缺失严重、配合度极低），常规教科书方案受阻，你当时的处理原则与应对策略是什么？结合循证依据谈谈你的体会。`,
      coreIntent: "考查学生的临床/公卫实战应变能力、人际沟通情商与职业成熟度。",
      badAnswer: "“现场不配合的人就直接当缺失值删掉不管了，或者跟家属据理力争吵起来。”",
      recommendedAnswer: `“在一线实践中，教科书的理想假设常与现实复杂条件碰撞。在【${clinicalName}】中，我的第一原则是‘生命安全第一 / 公共利益优先’，严格遵循标准化处置规范；第二是及时向上级医师/带教老师精准汇报并请求协同支援；第三是运用规范的医患沟通话术化解矛盾，以客观、同理心与专业指南为依据做好完整记录，筑牢医疗质量与科研数据防线。”`,
      evidencePoints: [
        "急救与医疗核心安全第一原则",
        "规范分级汇报与团队协作意识",
        "良好医患沟通与客观病程记录规范",
      ],
      academicWeapons: [
        "临床急救 ABCDE 评估法则",
        "医疗质量不良事件分级防范",
        "循证临床指南推荐等级 (GRADE)",
      ],
    },
    {
      category: "数据质控与学术诚信",
      difficulty: "高难度 (Hard)",
      question: `在推进【${primaryProject}】的过程中，是否遇到过与最初假说截然相反的‘阴性结果’或大面积‘逻辑异常值’？你当时是如何判断这是数据录入/实验失误，还是真实生物学差异？你是怎么处理的？`,
      coreIntent: "检验科研道德红线、对待实验/数据异常值的科学态度以及抗压解决难题的能力。",
      badAnswer: "“如果结果不显著就多试几种统计方法，或者把不好的离群值删掉，直到P小于0.05为止。”（严重违背学术道德的大雷！）",
      recommendedAnswer: `“科研中阴性或异常结果往往比预期阳性更能揭示真问题。在【${primaryProject}】中，面对异常数据，我的做法绝非随意剔除，而是‘三步排查法’：第一，追溯原始记录与底层代码，排查是否存在录入、单位转换或代码逻辑错误；第二，确认数据无误后，排查是否存在未考虑到的亚组异质性或效应修饰作用；第三，客观记录并如实呈现阴性结果，并在讨论中深入探讨其机制成因。‘真实是科学的生命线’，这种严谨作风是我最看重的科研素养。”`,
      evidencePoints: [
        "绝不篡改、伪造或选择性剔除数据",
        "建立三步回溯审计机制与敏感性检验",
        "客观对待阴性结果并深挖科学机制",
      ],
      academicWeapons: [
        "数据回溯审计与敏感性分析",
        "亚组效应修饰探索 (Interaction Term)",
        "科研诚信学术道德规范 (ICMJE准则)",
      ],
    },
    {
      category: "前沿文献与导师代表作批判性反思",
      difficulty: "地狱级 (Hardcore)",
      question: `结合【${targetUniv}】【${mentorTitle}】团队在【${mentorDir}】方向的研究布局，如果录取你入组，依托你在【${primaryProject}】中沉淀的方法与经验，你打算开展哪一项具体课题？你预判最大的科研瓶颈是什么？`,
      coreIntent: "考查学生对目标导师研究方向的真实调研深度、科研自主思考能力与开题可行性。",
      badAnswer: "“听老师安排，老师让我做什么我就做什么，目前还没想过具体做什么。”",
      recommendedAnswer: `“通过精读【${mentorTitle}】团队在【${mentorDir}】领域的代表性论著，我发现团队正在从宏观关联向微观机制与前瞻队列因果推断深度进阶。如果荣幸入组，我计划的第一步是：充分利用我在【${primaryProject}】中积累的【${primaryMethods}】实战经验，结合团队的现有平台与队列资源，开展前期探索性分析；预判最大的技术阻碍在于多源数据的标准化对齐与高维数据的降维质控，对此我已在自学相关前沿算法，有信心在老师的指引下迎难而上攻克瓶颈！”`,
      evidencePoints: [
        "深度研读导师课题组近期代表作",
        "将本科所学方法优势与导师课题无缝对接",
        "清醒预判技术瓶颈并展现攻坚韧性",
      ],
      academicWeapons: [
        "导师前沿课题演进图谱",
        "多源异构队列数据治理标准",
        "前瞻性开题与可行性论证框架",
      ],
    },
  ];
}

/**
 * Ensures all 4 modules of MedicalAnalysisResult are populated and deeply personalized
 * according to the user's specific inputs (name, undergrad school, mentor, target university, GPA rank, etc.)
 */
export function enrichMedicalResult(
  result: Partial<MedicalAnalysisResult> | null | undefined,
  input?: Partial<MedicalUserInput>
): MedicalAnalysisResult {
  let basePreset = PRESET_CLINICAL_MASTER;
  const major = input?.major || "";
  const track = input?.track || "";
  const dept = input?.targetDepartment || "";
  const hospital = input?.targetHospital || "";
  const targetUniv = input?.targetUniversity || "";

  if (
    track === "preventive-public-health" ||
    major.includes("预防") ||
    major.includes("公共卫生") ||
    dept.includes("流行病") ||
    dept.includes("疾控") ||
    dept.includes("统计") ||
    hospital.includes("公共卫生") ||
    targetUniv.includes("公共卫生")
  ) {
    basePreset = PRESET_PREVENTIVE_PUBLIC_HEALTH;
  } else if (
    track === "academic-research" ||
    major.includes("基础") ||
    dept.includes("实验室") ||
    dept.includes("研究所")
  ) {
    basePreset = PRESET_ACADEMIC_MASTER;
  }

  const mock = JSON.parse(JSON.stringify(basePreset.mockResult)) as MedicalAnalysisResult;
  const merged: MedicalAnalysisResult = {
    psDiagnosis:
      result?.psDiagnosis && result.psDiagnosis.sections?.length
        ? { ...mock.psDiagnosis, ...result.psDiagnosis }
        : mock.psDiagnosis,
    cvOptimization:
      result?.cvOptimization && result.cvOptimization.optimizedItems?.length
        ? { ...mock.cvOptimization, ...result.cvOptimization }
        : mock.cvOptimization,
    mentorEmail:
      result?.mentorEmail && result.mentorEmail.bodyText?.length
        ? { ...mock.mentorEmail, ...result.mentorEmail }
        : mock.mentorEmail,
    labInterviewPrep: {
      selfIntroductions:
        result?.labInterviewPrep?.selfIntroductions && result.labInterviewPrep.selfIntroductions.length > 0
          ? result.labInterviewPrep.selfIntroductions
          : mock.labInterviewPrep.selfIntroductions,
      englishSelfIntro:
        result?.labInterviewPrep?.englishSelfIntro && result.labInterviewPrep.englishSelfIntro.englishText?.length
          ? result.labInterviewPrep.englishSelfIntro
          : mock.labInterviewPrep.englishSelfIntro,
      defenseSlideFramework:
        result?.labInterviewPrep?.defenseSlideFramework && result.labInterviewPrep.defenseSlideFramework.length > 0
          ? result.labInterviewPrep.defenseSlideFramework
          : mock.labInterviewPrep.defenseSlideFramework,
      englishLiteratureDefense:
        result?.labInterviewPrep?.englishLiteratureDefense &&
        result.labInterviewPrep.englishLiteratureDefense.articleTitle?.length
          ? result.labInterviewPrep.englishLiteratureDefense
          : mock.labInterviewPrep.englishLiteratureDefense,
      questions:
        result?.labInterviewPrep?.questions && result.labInterviewPrep.questions.length > 0
          ? result.labInterviewPrep.questions
          : mock.labInterviewPrep.questions,
      mentorMindsetAnalysis:
        result?.labInterviewPrep?.mentorMindsetAnalysis &&
        result.labInterviewPrep.mentorMindsetAnalysis.length > 0
          ? result.labInterviewPrep.mentorMindsetAnalysis
          : mock.labInterviewPrep.mentorMindsetAnalysis,
      defenseChecklist:
        result?.labInterviewPrep?.defenseChecklist && result.labInterviewPrep.defenseChecklist.length > 0
          ? result.labInterviewPrep.defenseChecklist
          : mock.labInterviewPrep.defenseChecklist,
    },
  };

  if (!input) return merged;

  const applicantName = input.name?.trim() || "";
  const school = input.undergradSchool?.trim() || "";
  const targetUnivName = input.targetUniversity?.trim() || input.targetHospital?.trim() || "";
  const mentorTitle = input.mentorName?.trim()
    ? input.mentorName.includes("教授") || input.mentorName.includes("老师") || input.mentorName.includes("主任")
      ? input.mentorName.trim()
      : `${input.mentorName.trim()}教授`
    : "";
  const stage = input.applicationStage?.trim() || "推免";
  const stageTag = stage.includes("自荐") || stage.includes("申请") ? stage : `${stage}自荐`;
  const paperOrDir = input.mentorKeyPaper?.trim() || input.mentorResearchDirection?.trim() || "";

  // 1. DYNAMIC RECONSTRUCTION OF EMAIL SUBJECTS (Never hardcode example values)
  const nameLabel = applicantName || "医学推免生";
  const schoolRank = [school, input.gpaRank?.trim()].filter(Boolean).join("·");
  const schoolRankLabel = schoolRank ? `(${schoolRank})` : "";
  const targetApplyLabel = mentorTitle
    ? `申请加入${mentorTitle}课题组深造`
    : targetUnivName
    ? `申请攻读${targetUnivName}研究生`
    : "申请攻读研究生深造自荐";

  merged.mentorEmail.subjectOptions = [
    {
      style: "学术自驱型 (推荐)",
      subject: `【${stageTag}】${nameLabel}${schoolRankLabel}${targetApplyLabel}`,
    },
    {
      style: "方法学探讨型",
      subject: paperOrDir
        ? `【${stageTag}】${nameLabel}拜读${mentorTitle || "课题组"}${paperOrDir.slice(0, 24)}近作及科研设想`
        : `【${stageTag}】${nameLabel}${schoolRankLabel}-科研设想与自荐信`,
    },
    {
      style: "规范严谨型",
      subject: `【推免生自荐】${school ? `${school}` : ""}${nameLabel}申请加入${targetUnivName || mentorTitle || "医学科研团队"}`,
    },
  ];

  merged.mentorEmail.salutation = mentorTitle ? `尊敬的${mentorTitle}：` : "尊敬的老师：";
  merged.mentorEmail.bodyText = replaceAllTokens(merged.mentorEmail.bodyText, input);
  if (applicantName) {
    merged.mentorEmail.bodyText = merged.mentorEmail.bodyText.replace(/学生：.*谨呈/g, `学生：${applicantName} 谨呈`);
  } else {
    merged.mentorEmail.bodyText = merged.mentorEmail.bodyText.replace(/学生：.*谨呈/g, `推免申请人 谨呈`);
  }

  // 2. PERSONAL STATEMENT BEFORE / AFTER DEEP BINDING
  if (input.originalPS && input.originalPS.trim().length > 20) {
    const rawParas = input.originalPS
      .split(/\n\s*\n|\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (merged.psDiagnosis.sections && merged.psDiagnosis.sections.length > 0) {
      const secCount = merged.psDiagnosis.sections.length;
      merged.psDiagnosis.sections.forEach((sec, sIdx) => {
        if (rawParas.length >= secCount) {
          sec.originalText = rawParas[sIdx] || rawParas[rawParas.length - 1];
        } else if (rawParas.length > 0) {
          const chunkIdx = Math.min(sIdx, rawParas.length - 1);
          sec.originalText = rawParas[chunkIdx];
        }
        sec.optimizedText = replaceAllTokens(sec.optimizedText, input);
        sec.reason = replaceAllTokens(sec.reason, input);
        sec.mentorFocusPoint = replaceAllTokens(sec.mentorFocusPoint, input);
      });
    }
  } else {
    if (merged.psDiagnosis.sections) {
      merged.psDiagnosis.sections.forEach((sec) => {
        sec.originalText = replaceAllTokens(sec.originalText, input);
        sec.optimizedText = replaceAllTokens(sec.optimizedText, input);
        sec.reason = replaceAllTokens(sec.reason, input);
        sec.mentorFocusPoint = replaceAllTokens(sec.mentorFocusPoint, input);
      });
    }
  }

  merged.psDiagnosis.fullOptimizedPS = replaceAllTokens(merged.psDiagnosis.fullOptimizedPS, input);

  // 3. CV PERSONAL INFO & SUMMARY DEEP BINDING (Do NOT inherit fake preset phones/emails/names)
  if (merged.cvOptimization?.finalMedicalResume?.personalInfo) {
    const pInfo = merged.cvOptimization.finalMedicalResume.personalInfo;
    pInfo.name = applicantName;
    pInfo.undergradSchool = school;
    pInfo.major = input.major?.trim() || "";
    pInfo.gpaRank = input.gpaRank?.trim() || "";
    pInfo.englishLevel = input.englishLevel?.trim() || "";
    pInfo.targetUniversity = targetUnivName;
    pInfo.phone = input.phone?.trim() || "";
    pInfo.email = input.email?.trim() || "";
    pInfo.targetIntent = mentorTitle
      ? `意向导师：${mentorTitle}${targetUnivName ? ` · ${targetUnivName}` : ""}`
      : targetUnivName
      ? `目标院校：${targetUnivName}`
      : "";
  }

  // If user provided custom text without mentioning publications, never fabricate fake papers
  if (merged.cvOptimization?.finalMedicalResume) {
    const resume = merged.cvOptimization.finalMedicalResume;
    const rawAll = ((input.originalPS || "") + " " + (input.originalResume || "")).trim();
    if (rawAll.length > 0 && !rawAll.includes("中华") && !rawAll.includes("Lancet") && !rawAll.includes("SCI") && !rawAll.includes("论文") && !rawAll.includes("录用") && !rawAll.includes("发表")) {
      resume.publications = [];
    }
  }

  if (merged.cvOptimization?.finalMedicalResume?.academicSummary) {
    merged.cvOptimization.finalMedicalResume.academicSummary = replaceAllTokens(
      merged.cvOptimization.finalMedicalResume.academicSummary,
      input
    );
  }

  if (merged.cvOptimization?.optimizedItems) {
    merged.cvOptimization.optimizedItems.forEach((item) => {
      item.before = replaceAllTokens(item.before, input);
      item.after = replaceAllTokens(item.after, input);
      item.reason = replaceAllTokens(item.reason, input);
    });
  }

  if (merged.cvOptimization?.finalMedicalResume?.honorsAndScholarships) {
    merged.cvOptimization.finalMedicalResume.honorsAndScholarships =
      merged.cvOptimization.finalMedicalResume.honorsAndScholarships.map((h) => replaceAllTokens(h, input));
  }

  const resDetails = extractResumeDetails(input);
  const firstQ = merged.labInterviewPrep?.questions?.[0]?.question || "";
  const firstIntro = merged.labInterviewPrep?.selfIntroductions?.[0]?.speechText || "";
  const firstEng = merged.labInterviewPrep?.englishSelfIntro?.englishText || "";

  const needsResumeOverhaul =
    !resDetails.isDefault24kCohort &&
    (
      resDetails.hasCustomResume ||
      firstQ.includes("2.4 万人") ||
      firstIntro.includes("2.4 万人") ||
      firstEng.includes("24,000")
    );

  if (needsResumeOverhaul) {
    // 1. Rewrite self-introductions with real resume
    merged.labInterviewPrep.selfIntroductions = buildResumeBasedSelfIntroductions(input || {}, resDetails);

    // 2. Rewrite English self-intro with real resume
    merged.labInterviewPrep.englishSelfIntro = buildResumeBasedEnglishSelfIntro(input || {}, resDetails);

    // 3. Rewrite 5 questions with real resume
    merged.labInterviewPrep.questions = buildResumeBasedQuestions(input || {}, resDetails);

    // 4. Update CV research projects with real resume if needed
    if (merged.cvOptimization?.finalMedicalResume) {
      const cvResume = merged.cvOptimization.finalMedicalResume;
      const firstProjTitle = cvResume.researchProjects?.[0]?.title || "";
      if (
        firstProjTitle.includes("2.4 万") ||
        firstProjTitle.includes("华南社区居民") ||
        firstProjTitle.includes("国家自然科学基金重大慢性病专项") ||
        (resDetails.researchItems.length > 0 && !resDetails.isDefault24kCohort)
      ) {
        if (resDetails.researchProjects.length > 0) {
          cvResume.researchProjects = resDetails.researchProjects.map((proj, idx) => {
            const bullets =
              proj.bullets.length > 0
                ? proj.bullets.map((b) => (b.endsWith("；") || b.endsWith("。") ? b : `${b}；`))
                : [
                    `负责${proj.title}的方案设计、数据采集与质控，运用${resDetails.skillItems.slice(0, 3).join("、") || "专业统计方法"}开展深入分析；`,
                    `针对关键变量与潜在偏倚开展系统核查，保障研究结果的科学性与客观可重复性。`,
                  ];
            return {
              title: proj.title,
              role: idx === 0 ? "项目负责人 / 核心骨干" : "团队成员 / 统计分析参与者",
              period: "本科攻读期间",
              mentor: school || "本科院校科研团队",
              bullets,
            };
          });
        }
      }

      const firstClinicHosp = cvResume.clinicalExperiences?.[0]?.hospital || "";
      if (
        firstClinicHosp.includes("广东省疾病预防控制中心") ||
        firstClinicHosp.includes("传染病预防控制所") ||
        (resDetails.clinicalItems.length > 0 && !resDetails.isDefault24kCohort)
      ) {
        if (resDetails.clinicalItems.length > 0) {
          cvResume.clinicalExperiences = resDetails.clinicalItems.map((cTitle) => ({
            hospital: cTitle.includes("医院") || cTitle.includes("中心") ? cTitle.split(/[，,。\s]/)[0] : (school ? `${school}教学医院` : "医学院附属医院"),
            department: cTitle.includes("科") ? cTitle : "临床通科规范化轮转",
            period: "临床实践阶段",
            bullets: [
              `深入一线规范参与${cTitle}的日常工作，书写医疗文书并严守医疗质量安全；`,
              `在带教老师指导下参与疑难病例讨论，培养扎实的循证临床思辨与医患沟通能力。`,
            ],
          }));
        }
      }
    }
  }

  if (!needsResumeOverhaul) {
    if (merged.cvOptimization?.finalMedicalResume?.researchProjects) {
      merged.cvOptimization.finalMedicalResume.researchProjects.forEach((proj) => {
        proj.title = replaceAllTokens(proj.title, input);
        proj.role = replaceAllTokens(proj.role, input);
        if (proj.mentor) {
          proj.mentor = replaceAllTokens(proj.mentor, input);
        }
        proj.bullets = proj.bullets.map((b) => replaceAllTokens(b, input));
      });
    }

    if (merged.cvOptimization?.finalMedicalResume?.clinicalExperiences) {
      merged.cvOptimization.finalMedicalResume.clinicalExperiences.forEach((exp) => {
        exp.hospital = replaceAllTokens(exp.hospital, input);
        exp.department = replaceAllTokens(exp.department, input);
        exp.bullets = exp.bullets.map((b) => replaceAllTokens(b, input));
      });
    }

    // INTERVIEW STUDIO replacements for preset mock fallback
    if (merged.labInterviewPrep?.selfIntroductions) {
      merged.labInterviewPrep.selfIntroductions.forEach((intro) => {
        intro.speechText = replaceAllTokens(intro.speechText, input);
        intro.breakdownTips = intro.breakdownTips.map((tip) => replaceAllTokens(tip, input));
        intro.keyHighlights = intro.keyHighlights.map((hl) => replaceAllTokens(hl, input));
      });
    }

    if (merged.labInterviewPrep?.englishSelfIntro) {
      const eng = merged.labInterviewPrep.englishSelfIntro;
      eng.chineseTranslation = replaceAllTokens(eng.chineseTranslation, input);
      if (applicantName) {
        eng.englishText = eng.englishText.replace(/Simin Zhou|Shuhan Chen|Yizhou Lin/gi, applicantName);
      } else {
        eng.englishText = eng.englishText.replace(/Simin Zhou|Shuhan Chen|Yizhou Lin/gi, "the applicant");
      }
      if (school) {
        eng.englishText = eng.englishText.replace(
          /Sun Yat-sen University|Huazhong University|Central South University/gi,
          school
        );
      } else {
        eng.englishText = eng.englishText.replace(
          /Sun Yat-sen University|Huazhong University|Central South University/gi,
          "my undergraduate university"
        );
      }
      if (targetUnivName) {
        eng.englishText = eng.englishText.replace(
          /Peking University|Fudan University|Sun Yat-sen University/gi,
          targetUnivName
        );
      } else {
        eng.englishText = eng.englishText.replace(
          /Peking University|Fudan University|Sun Yat-sen University/gi,
          "your esteemed institution"
        );
      }
      if (mentorTitle && input.mentorName) {
        eng.englishText = eng.englishText.replace(
          /Professor Gao|Professor Li|Professor Shen/gi,
          `Professor ${input.mentorName.replace(/教授|老师|主任/g, "")}`
        );
      } else {
        eng.englishText = eng.englishText.replace(
          /Professor Gao|Professor Li|Professor Shen/gi,
          "the distinguished professors"
        );
      }

      if (input.englishLevel) {
        eng.englishText = eng.englishText.replace(/CET-6\s*635|635\s*in\s*CET-6|score\s*of\s*635/gi, input.englishLevel);
      } else {
        eng.englishText = eng.englishText.replace(/CET-6\s*635|635\s*in\s*CET-6|score\s*of\s*635/gi, "passed CET-6");
      }
    }

    if (merged.labInterviewPrep?.questions) {
      merged.labInterviewPrep.questions.forEach((q) => {
        q.question = replaceAllTokens(q.question, input);
        if (q.coreIntent) q.coreIntent = replaceAllTokens(q.coreIntent, input);
        if (q.badAnswer) q.badAnswer = replaceAllTokens(q.badAnswer, input);
        if (q.recommendedAnswer) q.recommendedAnswer = replaceAllTokens(q.recommendedAnswer, input);
        if (q.evidencePoints) q.evidencePoints = q.evidencePoints.map((p) => replaceAllTokens(p, input));
        if (q.academicWeapons) q.academicWeapons = q.academicWeapons.map((w) => replaceAllTokens(w, input));
      });
    }
  }

  if (merged.labInterviewPrep?.defenseSlideFramework) {
    merged.labInterviewPrep.defenseSlideFramework.forEach((slide) => {
      slide.speakingScript = replaceAllTokens(slide.speakingScript, input);
      slide.contentFocus = replaceAllTokens(slide.contentFocus, input);
      slide.title = replaceAllTokens(slide.title, input);
      slide.visualAdvice = replaceAllTokens(slide.visualAdvice, input);
    });
  }

  if (merged.mentorEmail.attachmentChecklist) {
    merged.mentorEmail.attachmentChecklist = merged.mentorEmail.attachmentChecklist.map((item) =>
      replaceAllTokens(item, input)
    );
  }
  if (merged.mentorEmail.strategyTips) {
    merged.mentorEmail.strategyTips = merged.mentorEmail.strategyTips.map((tip) =>
      replaceAllTokens(tip, input)
    );
  }

  if (merged.psDiagnosis.strengths) {
    merged.psDiagnosis.strengths = merged.psDiagnosis.strengths.map((s) => replaceAllTokens(s, input));
  }
  if (merged.psDiagnosis.mainIssues) {
    merged.psDiagnosis.mainIssues = merged.psDiagnosis.mainIssues.map((s) => replaceAllTokens(s, input));
  }
  if (merged.psDiagnosis.prioritySuggestions) {
    merged.psDiagnosis.prioritySuggestions = merged.psDiagnosis.prioritySuggestions.map((s) => replaceAllTokens(s, input));
  }

  if (merged.labInterviewPrep?.mentorMindsetAnalysis) {
    merged.labInterviewPrep.mentorMindsetAnalysis = merged.labInterviewPrep.mentorMindsetAnalysis.map((m) =>
      typeof m === "string" ? replaceAllTokens(m, input) : m
    );
  }

  if (merged.labInterviewPrep?.defenseChecklist) {
    merged.labInterviewPrep.defenseChecklist = merged.labInterviewPrep.defenseChecklist.map((c) =>
      typeof c === "string" ? replaceAllTokens(c, input) : c
    );
  }

  return merged;
}
