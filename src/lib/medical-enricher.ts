import type {
  MedicalAnalysisResult,
  MedicalUserInput,
  SelfIntroVersion,
  EnglishSelfIntro,
  EnhancedInterviewQuestion,
  PSDiagnosis,
  StructuredPSSection,
  MedicalCVItem,
  MedicalFinalResume,
  MentorEmailDraft,
  DefenseSlideItem,
  EnglishLiteratureDefense,
  MedicalResearchProject,
  MedicalClinicalExperience,
} from "@/types/medical";

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

export function buildDynamicPSDiagnosis(
  input: Partial<MedicalUserInput> = {},
  details: ExtractedResumeDetails
): PSDiagnosis {
  const applicantName = input.name?.trim() || "推免申请人";
  const school = input.undergradSchool?.trim() || "本科院校";
  const major = input.major?.trim() || "医学专业";
  const gpaRank = input.gpaRank?.trim() || "推免综合排名前列";
  const englishLevel = input.englishLevel?.trim() || "大学英语六级良好";
  const targetUniv = input.targetUniversity?.trim() || input.targetHospital?.trim() || "目标院校";
  const mentorTitle = input.mentorName?.trim()
    ? (input.mentorName.includes("教授") || input.mentorName.includes("老师") || input.mentorName.includes("主任")
      ? input.mentorName.trim()
      : `${input.mentorName.trim()}教授`)
    : "导师课题组";
  const mentorDir = [input.targetHospital, input.targetDepartment, input.mentorResearchDirection]
    .filter(Boolean)
    .join(" · ") || "医学前沿攻坚方向";

  const primaryProject = details.primaryProject;
  const primaryMethods = details.primaryMethods;
  const primaryClinical = details.primaryClinical;
  const toolsStr = details.skillItems.slice(0, 4).join("、") || "医学统计分析与科学偏倚控制";

  const rawParas = ((input.originalPS || "").trim())
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const sections: StructuredPSSection[] = [
    {
      sectionName: "第一部分：学术初心与专业追求 (Problem & Mission)",
      sectionTitle: "学术初心与专业基石：从感性情怀向严谨科学思辨的跨越",
      originalText:
        rawParas[0] ||
        `我是来自${school}${major}的${applicantName}。本科阶段我刻苦学习，推免成绩为${gpaRank}，并通过${englishLevel}。我一直热爱医学，希望在推免中进入高水平学术团队继续深造。`,
      optimizedText: `我本科就读于${school}${major}。在扎实的专业学习与前沿文献研读中，我深刻认识到医学不仅是守卫生命健康的崇高事业，更是一门高度依赖客观证据、严密因果归因与方法学质控的严谨科学。本科前四年，我的推免综合排名为【${gpaRank}】，并通过了【${englishLevel}】，系统构筑起涵盖基础医学、专业主干课与统计分析的扎实学科底座。我不满足于教科书知识的记忆，而是始终关注重大健康问题背后的病因学机制与临床/人群转化价值，立志将严密的科学探究作为毕生追求。`,
      reason:
        "打破传统空洞的泛泛抒情与流水账罗列，直接以硬核学业绩点与科学探索内驱力破题，凸显扎实过硬的学术基本盘。",
      mentorFocusPoint:
        "考查推免生是否具备坚实全面的医学专业知识底座，以及从‘被动应试’向‘主动科学探究’蜕变的自驱意识。",
    },
    {
      sectionName: "第二部分：核心科研攻坚与方法学实操 (Action & Methodology)",
      sectionTitle: "核心科研攻坚：从被动执行到掌握方法学质控与独立排障",
      originalText:
        rawParas[1] ||
        `在校期间我参加了【${primaryProject}】的科研工作，负责查阅文献与整理数据，学习了${toolsStr}，完成了一定的科研训练。`,
      optimizedText: `在核心科研实践中，我拒绝形式化的走马观花，深度参与了【${primaryProject}】的攻关全过程。在该课题中，我作为核心执行骨干，重点推进【${primaryMethods}】。面对多源异构数据与复杂的分析需求，我熟练运用【${toolsStr}】等专业工具，建立起严密的数据清洗流线与变量质控标准。针对潜在的选择偏倚、测量误差与多因素残余混杂，我严格依照高水平医学顶刊的方法学规范，开展了多模型校正与系统性敏感性检验，确保推断结论的客观与稳健。这段科研攻坚淬炼了我‘求真求确’的严谨学风和应对复杂科研瓶颈的独立排障能力。`,
      reason:
        "摒弃空泛的项目列举，深入科研实战核心，详述个人在方法学推进、数据质控与偏倚排查中的实质贡献，树立核心科研骨干形象。",
      mentorFocusPoint:
        "导师最为看重推免生是‘挂名工具人’还是真正亲手实操并深刻领会统计推断/实验原理的科研生力军。",
    },
    {
      sectionName: "第三部分：临床轮转与现场实践实务 (Result & Evidence)",
      sectionTitle: "知行合一：在临床一线与现场实践中淬炼循证医学思维",
      originalText:
        rawParas[2] ||
        `在实践阶段，我在【${primaryClinical}】参加了一线轮转，认真跟随带教老师查房、整理病历和观摩学习，收获很大。`,
      optimizedText: `在实践历练阶段，我在【${primaryClinical}】完成了深入扎实的一线轮转。面对真实复杂的业务场景与患者需求，我时刻坚持‘循证决策第一、质量规范第一’，严格执行标准化病程记录、数据核查与操作规程。在带教老师悉心指导下，我深入参与典型案例与疑难问题研讨，深刻领会了‘从临床/现场发掘真问题，再以科学研究反哺一线干预’的转化闭环，极大地培养了我的临床循证批判性思辨、跨团队协同协作能力与高度的职业敬畏感。`,
      reason:
        "将原本日常的‘见习观摩流水账’提炼升华至遵循循证医学指南、具备敏锐问题发掘与团队协作抗压的高级职业素养。",
      mentorFocusPoint:
        "考查推免生在真实医疗/现场复杂高压环境下的操作规范性、人际沟通情商与解决实际问题的综合胜任力。",
    },
    {
      sectionName: "第四部分：读研规划与学术抱负 (Evaluation & Vision)",
      sectionTitle: "学术展望：对齐导师前沿课题，以方法学优势服务重大医学攻关",
      originalText:
        rawParas[3] ||
        `我非常渴望推免到【${targetUniv}】${mentorTitle}的课题组。如果能够录取，我一定认真服从老师安排，努力多读文献多做实验，争取早日毕业。`,
      optimizedText: `【${targetUniv}】拥有国家级医学科研高地与开放包容的浓厚学风，一直是我向往的学术圣地。${mentorTitle}团队在【${mentorDir}】领域的代表性探索与深厚学术造诣令我由衷钦佩。若有幸通过考核入组深造，我规划在读研期间，充分依托本科在【${toolsStr}】与【${primaryProject}】中沉淀的方法学与数据处理优势，深度融入课题组攻关主线；在老师悉心指引下，锚定学科前沿与重大疾病关键科学问题迎难而上，尽早完成高质量开题，争取产出经得起国际同行与时间检验的高水平原创学术成果！`,
      reason:
        "坚决剔除‘听话服从’等被动被催熟心态，换位思考导师招生痛点，展现目标明确、技能对齐、有备而来的学者型培养潜质。",
      mentorFocusPoint:
        "评估考生的学术志向成熟度、未来开题可行性，以及能否与课题组现有重大项目平台实现‘无缝即时对接’。",
    },
  ];

  const fullOptimizedPS = sections.map((s) => s.optimizedText).join("\n\n");

  return {
    overallScore: 68,
    dimensionScores: [
      {
        dimension: "学术初心与科学思维",
        score: 72,
        comment: `已结合${school}${major}背景由浅入深展开，立意严谨，展现真诚清晰的科研动机。`,
      },
      {
        dimension: "方法学实操与证据链",
        score: 66,
        comment: `突出【${primaryProject.slice(0, 15)}】攻坚与【${toolsStr}】工具链，量化质控细节与偏倚排查逻辑。`,
      },
      {
        dimension: "实践素养与抗压韧性",
        score: 69,
        comment: `在【${primaryClinical.slice(0, 15)}】轮转中提炼循证医学思辨与一线责任感，职业素养成熟。`,
      },
      {
        dimension: "导师对齐与未来规划",
        score: 65,
        comment: `精准锚定【${targetUniv}】与【${mentorTitle}】在【${mentorDir.slice(0, 18)}】方向，可行性强。`,
      },
    ],
    mainIssues: [
      `原陈述对核心科研课题【${primaryProject.slice(0, 16)}】的方法学描述较泛，缺乏具体的数据质控指标与偏倚检验细节；`,
      "对临床/现场一线实践的感悟偏于感性观摩，未充分凸显循证医学批判性思维与转化价值；",
      `读研规划部分需要更紧密贴合【${targetUniv}】与【${mentorTitle}】课题组的攻关前沿，展现即战力。`,
    ],
    strengths: [
      `学业指标扎实过硬（${school} · ${major} · 排名：${gpaRank} · ${englishLevel}），具备坚实的基础学科底盘；`,
      `具备真实课题【${primaryProject.slice(0, 18)}】的深入攻坚经历，熟练掌握【${toolsStr}】等专业工具；`,
      `在一线【${primaryClinical.slice(0, 16)}】历练中积累了扎实的循证实践思维，展现了优秀的学术严谨性与抗压韧性。`,
    ],
    prioritySuggestions: [
      "全文严格遵循 PARE（问题-行动-结果-评价）学术叙事架构，以实打实的方法学证据链为核心驱动；",
      `在科研段落中着力展现【${toolsStr}】实操中的偏倚控制、变量清洗与敏感性验证，树立独立攻坚学术形象；`,
      `读研规划紧扣【${mentorTitle}】代表作与课题布局，清晰陈述个人专业优势与课题组攻关方向的结合点。`,
    ],
    sections,
    fullOptimizedPS,
  };
}

export function buildDynamicCVOptimization(
  input: Partial<MedicalUserInput> = {},
  details: ExtractedResumeDetails
): { optimizedItems: MedicalCVItem[]; finalMedicalResume: MedicalFinalResume } {
  const applicantName = input.name?.trim() || "推免申请人";
  const school = input.undergradSchool?.trim() || "本科院校";
  const major = input.major?.trim() || "医学专业";
  const gpaRank = input.gpaRank?.trim() || "推免综合排名前列";
  const englishLevel = input.englishLevel?.trim() || "大学英语六级良好";
  const targetUniv = input.targetUniversity?.trim() || input.targetHospital?.trim() || "目标院校";
  const mentorTitle = input.mentorName?.trim()
    ? (input.mentorName.includes("教授") || input.mentorName.includes("老师") ? input.mentorName.trim() : `${input.mentorName.trim()}教授`)
    : "";
  const primaryProject = details.primaryProject;
  const primaryMethods = details.primaryMethods;
  const primaryClinical = details.primaryClinical;
  const toolsStr = details.skillItems.slice(0, 4).join("、") || "医学统计分析、数据质控、R语言";

  const academicSummary = `${school} ${major} 推免生（综合排名：${gpaRank}，${englishLevel}）。本科期间深度参与【${primaryProject}】等核心科研课题，熟练掌握【${toolsStr}】等专业工具，具备扎实的数据清洗、多模型统计推断与偏倚质控实战能力；在【${primaryClinical}】完成系统一线实践轮转，筑牢严谨的循证医学思维、良好的跨团队协作沟通与高抗压科研学术自驱力。`;

  const optimizedItems: MedicalCVItem[] = [
    {
      id: "cv-item-1",
      section: "核心科研经历：项目描述与方法学量化",
      before: `参与课题【${primaryProject}】，负责整理查阅文献，处理相关数据。`,
      after: `作为核心骨干深度参与【${primaryProject}】，主导推进【${primaryMethods}】；熟练运用【${toolsStr}】建立标准化数据清洗与质控流程，系统排查选择偏倚与混杂效应，执行多模型校正与敏感性检验，确保推论结论真实稳健。`,
      reason:
        "摒弃‘参与/协助’等被动弱动词，以主导动词与具体方法学工具链重构，量化个人核心攻坚成果与质控细节。",
      academicStandardTip:
        "医学学术规范要求：以强动词（主导/设计/构建）开头，明确列出样本规模、核心算法及偏倚控制策略。",
    },
    {
      id: "cv-item-2",
      section: "专业技能树：数据分析与实验技术精细化标注",
      before: "熟悉常用医学统计学分析软件，具备文献检索和阅读能力。",
      after: `熟练掌握【${toolsStr}】等专业工具，可独立开展复杂数据清洗、多因素回归、广义加性模型、敏感性分析及顶刊级统计可视化；具备流畅精读专业英文医学顶刊与综述撰写能力。`,
      reason:
        "将模棱两可的‘熟悉软件’细化为能够‘独立排障’的具体分析技能与应用场景，直接击中导师实验室日常科研痛点。",
      academicStandardTip:
        "导师筛选简历重点考察‘免培训即战力’，技能项需精确到具体算法模型与独立排障实操层面。",
    },
    {
      id: "cv-item-3",
      section: "实践/临床轮转经历：从观摩到循证医学转化",
      before: `在【${primaryClinical}】实习轮转，跟随老师日常查房和打杂。`,
      after: `在【${primaryClinical}】完成一线规范化轮转，恪守医疗/流调核心质控安全规程；严谨参与真实案例研讨与关键数据核查，深化循证决策思辨，展现扎实严谨的职业素养与团队协同力。`,
      reason:
        "剔除‘打杂/观摩’等自我矮化措辞，从医疗质量、标准化规范与循证批判性思辨维度凸显临床胜任力。",
      academicStandardTip:
        "医学推免评审严查实践含金量，重点强调标准化规范（SOP）执行意识与循证思辨素养。",
    },
    {
      id: "cv-item-4",
      section: "学业素养与推免资格：客观硬指标背书",
      before: "专业基础扎实，成绩优异，多次获得奖学金，英语流利。",
      after: `推免综合成绩排名【${gpaRank}】，通过【${englishLevel}】；系统研读国内外医学前沿论著，具备优秀的学术逻辑思辨与严谨求实的学风底色。`,
      reason:
        "以客观无可争议的学分绩点排位与外语证书取代自夸式形容词，瞬间建立学霸第一印象与学术信任感。",
      academicStandardTip:
        "学术简历的第一行需通过量化排名与外语硬核指标实现 3 秒吸睛，奠定坚实学术底座。",
    },
  ];

  // Build research projects for CV
  const researchProjects: MedicalResearchProject[] =
    details.researchProjects.length > 0
      ? details.researchProjects.map((p, idx) => ({
          title: p.title,
          role: idx === 0 ? "项目主要完成人 / 核心骨干" : "团队成员 / 统计分析参与者",
          period: "本科攻读期间",
          mentor: school || "本科科研团队",
          bullets:
            p.bullets.length > 0
              ? p.bullets.map((b) => (b.endsWith("；") || b.endsWith("。") ? b : `${b}；`))
              : [
                  `负责${p.title}的研究方案落实、数据清洗与质控，运用${toolsStr}展开深入分析；`,
                  `系统核查选择偏倚与多因素残余混杂，执行稳健性检验保障分析结论可重复。`,
                ],
        }))
      : [
          {
            title: primaryProject,
            role: "核心执行骨干 / 分析推进者",
            period: "本科攻读期间",
            mentor: school || "本科科研团队",
            bullets: [
              `深入参与课题的技术路线执行与数据采集质控，运用【${toolsStr}】完成结构化数据治理；`,
              `主导推进【${primaryMethods}】，严格执行多模型校正与敏感性检验，保障研究结果经得起同行重复。`,
            ],
          },
        ];

  // Build clinical experiences for CV
  const clinicalExperiences: MedicalClinicalExperience[] =
    details.clinicalItems.length > 0
      ? details.clinicalItems.map((cTitle) => ({
          hospital: cTitle.includes("医院") || cTitle.includes("中心") ? cTitle.split(/[，,。\s]/)[0] : (school ? `${school}教学医院` : "医学院附属医院"),
          department: cTitle.includes("科") ? cTitle : "临床/实务规范化轮转",
          period: "临床实践阶段",
          bullets: [
            `深入一线规范参与${cTitle}日常工作，严格执行医疗文书与质量安全规范；`,
            `在带教老师指导下参与病例研讨，培养扎实的循证思辨与医患沟通胜任力。`,
          ],
        }))
      : [
          {
            hospital: primaryClinical.includes("医院") || primaryClinical.includes("中心") ? primaryClinical.split(/[，,。\s]/)[0] : (school ? `${school}教学医院` : "医学院附属医院"),
            department: primaryClinical.includes("科") ? primaryClinical : "临床/实务规范化轮转",
            period: "临床实践阶段",
            bullets: [
              `深入一线扎实轮转，规范化书写文书并严谨核对关键指标，守牢医疗质量红线；`,
              `积极参与带教查房与疑难案例讨论，深化循证医学理解并提升团队协作抗压能力。`,
            ],
          },
        ];

  const finalMedicalResume: MedicalFinalResume = {
    personalInfo: {
      name: applicantName,
      undergradSchool: school,
      major,
      gpaRank,
      englishLevel,
      phone: input.phone?.trim() || "",
      email: input.email?.trim() || "",
      targetTrack: input.track || "preventive-public-health",
      targetIntent: mentorTitle
        ? `意向导师：${mentorTitle}${targetUniv ? ` · ${targetUniv}` : ""}`
        : targetUniv
        ? `目标院校：${targetUniv}`
        : "",
      targetUniversity: targetUniv,
    },
    academicSummary,
    labSkills: [
      {
        category: "科研方法与统计工具",
        items: details.skillItems.length > 0 ? details.skillItems : ["医学统计分析", "数据质控与清洗", "R语言/Python", "偏倚排查"],
      },
      {
        category: "专业医学实践与文献能力",
        items: ["专业英文顶刊精读与综述撰写", "临床规范化文书与医疗质控", "敏感性分析与多模型验证", "循证医学批判性思辨"],
      },
    ],
    researchProjects,
    publications: [], // Never fabricate fake papers!
    clinicalExperiences,
    honorsAndScholarships: [
      "本科推免学业综合奖学金 / 优秀生表彰",
      "校级优秀共青团员 / 优秀学生干部",
      "医学专业技能竞赛 / 科研学术实践表彰",
    ],
  };

  return { optimizedItems, finalMedicalResume };
}

export function buildDynamicMentorEmail(
  input: Partial<MedicalUserInput> = {},
  details: ExtractedResumeDetails
): MentorEmailDraft {
  const applicantName = input.name?.trim() || "推免申请人";
  const school = input.undergradSchool?.trim() || "本科院校";
  const major = input.major?.trim() || "医学专业";
  const gpaRank = input.gpaRank?.trim() || "推免综合排名前列";
  const englishLevel = input.englishLevel?.trim() || "大学英语六级良好";
  const targetUniv = input.targetUniversity?.trim() || input.targetHospital?.trim() || "目标院校";
  const mentorTitle = input.mentorName?.trim()
    ? (input.mentorName.includes("教授") || input.mentorName.includes("老师") || input.mentorName.includes("主任")
      ? input.mentorName.trim()
      : `${input.mentorName.trim()}教授`)
    : "意向导师";
  const mentorShort = mentorTitle.replace(/教授|老师|主任/g, "");
  const stage = input.applicationStage?.trim() || "推免";
  const stageTag = stage.includes("自荐") || stage.includes("申请") ? stage : `${stage}自荐`;
  const paperOrDir = input.mentorKeyPaper?.trim() || input.mentorResearchDirection?.trim() || "课题组科研前沿方向";

  const primaryProject = details.primaryProject;
  const primaryMethods = details.primaryMethods;
  const primaryClinical = details.primaryClinical;
  const toolsStr = details.skillItems.slice(0, 3).join("、") || "专业统计分析与数据质控";

  const subjectOptions = [
    {
      style: "学术自驱型 (推荐首选)",
      subject: `【${stageTag}】${applicantName}（${school} · ${gpaRank}）申请加入${mentorTitle}课题组深造`,
    },
    {
      style: "方法学探讨型",
      subject: `【${stageTag}】${applicantName}（${school}）拜读${mentorShort}老师${paperOrDir.slice(0, 20)}近作汇报及读研设想`,
    },
    {
      style: "规范严谨型",
      subject: `【推免生自荐信】${school}${applicantName}（排名：${gpaRank}）申请攻读${targetUniv}研究生`,
    },
  ];

  const salutation = `尊敬的${mentorTitle}：`;

  const bodyText = `${salutation}
您好！非常抱歉在您百忙之中打扰。

我是来自${school}${major}的推免生${applicantName}。我一直密切关注并深入学习您团队在【${paperOrDir.slice(0, 35)}】方向的学术建树。借本次推免选拔契机，我怀着十分诚挚与向往的心情，渴望申请加入您在【${targetUniv}】的课题组攻读研究生学位。

【学术底座与硬核素养】
本科期间，我始终保持求真务实的学习态度，推免综合排名为【${gpaRank}】，并以高分通过【${englishLevel}】，具备扎实的专业学科基础与流畅阅读研析国际一流顶刊文献的专业外语素养。

【简历核心科研与方法学实战】
在科研实战中，我拒绝形式化走马观花，深度参与了【${primaryProject}】。在该课题中，我主要承担【${primaryMethods}】攻关，熟练运用【${toolsStr}】等专业工具推进数据治理。针对研究中的偏倚控制与多因素混杂，我严格执行标准化多模型校正与敏感性检验，积累了扎实的方法学实操与排障韧性。这段经历让我深深领会到：严密求实是科学研究不可逾越的生命线。

【一线实践历练与责任意识】
在实践轮转方面，我在【${primaryClinical}】中完成了深入的一线工作，严谨执行各项规范，培养了从实践中发掘真问题、多学科协同攻坚的循证思维与敬业素养。

【向往理由与读研攻坚设想】
拜读您团队近年来的代表性论著，深刻体会到您在推动本学科前沿发展与重大疾病机制探索中的卓越造诣。若有幸通过推免选拔进入您的团队，我将充分发挥本科沉淀的方法学与数据分析优势，在您的指引下全心投入科研攻坚，争取早日产出经得起同行严格检验的高水平原创成果！

随信附上我的【个人学术简历】、【成绩单与排名证明】及【科研实践总结】。非常期待能有机会得到您的批评指点与当面/线上汇报交流的机会！

谨祝
身体健康，工作顺意！

学生：${applicantName} 谨呈
${school} · ${major}
联系电话：${input.phone || "见简历附件"} | 电子邮箱：${input.email || "见简历附件"}`;

  const attachmentChecklist = [
    `1. 本科成绩单与推免专业排名证明（官方盖章件，当前排名：${gpaRank}）`,
    `2. 规范化个人学术简历（重点呈现【${primaryProject.slice(0, 15)}】攻坚与【${toolsStr}】技能树）`,
    `3. 英语水平证明（${englishLevel}）及核心专业课优异成绩佐证`,
    `4. 本科科研实践报告摘要（重点阐释【${primaryMethods.slice(0, 18)}】质控实操细节）`,
  ];

  const strategyTips = [
    "发送黄金时段：建议在工作日（周二至周四）早晨 07:30 - 08:30 发送，避开周一例会高峰与周末休息时间；",
    "正文排版规范：控制在 500~700 字，段落分明，核心推免排名与方法学关键词加粗，便于导师手机秒读；",
    `附件格式要求：所有附件务必整合转为 PDF，统一命名规范，如“【${applicantName}-推免】本科院校-文件名.pdf”；`,
    "礼貌回访节奏：若发送后 5~7 个工作日未获回复，可在原邮件基础上礼貌跟进一封汇报（Follow-up），切忌多渠道催促。",
  ];

  return {
    subjectOptions,
    salutation,
    bodyText,
    attachmentChecklist,
    strategyTips,
  };
}

export function buildDynamicDefenseSlideFramework(
  input: Partial<MedicalUserInput> = {},
  details: ExtractedResumeDetails
): DefenseSlideItem[] {
  const applicantName = input.name?.trim() || "推免申请人";
  const school = input.undergradSchool?.trim() || "本科院校";
  const major = input.major?.trim() || "医学专业";
  const gpaRank = input.gpaRank?.trim() || "推免综合排名前列";
  const englishLevel = input.englishLevel?.trim() || "大学英语六级良好";
  const targetUniv = input.targetUniversity?.trim() || input.targetHospital?.trim() || "目标院校";
  const mentorTitle = input.mentorName?.trim()
    ? (input.mentorName.includes("教授") || input.mentorName.includes("老师") ? input.mentorName.trim() : `${input.mentorName.trim()}教授`)
    : "导师课题组";
  const mentorDir = [input.targetHospital, input.targetDepartment, input.mentorResearchDirection]
    .filter(Boolean)
    .join(" · ") || "前沿科研攻坚方向";

  const primaryProject = details.primaryProject;
  const primaryMethods = details.primaryMethods;
  const primaryClinical = details.primaryClinical;
  const toolsStr = details.skillItems.slice(0, 3).join("、") || "医学统计分析与偏倚质控";

  return [
    {
      slideNumber: 1,
      title: "学术画像与推免资质 (Academic Profile & Credentials)",
      timeAllocation: "0:00 - 1:00 (60秒)",
      contentFocus: "院校专业、推免排位、外语能力与主干课程底座",
      speakingScript: `各位评审专家、老师好！我是来自${school}${major}的推免生${applicantName}。本科前四年，我的推免综合排名为【${gpaRank}】，并通过了【${englishLevel}】。在校期间系统筑牢了医学基础理论与统计方法学底座，今天非常荣幸向各位老师汇报我的学术历练与未来规划！`,
      visualAdvice: "以简洁高雅学术蓝/白配色为主，右上方放置专业答辩证件照，以图表化信息卡片呈现 GPA、英语与荣誉指标。",
    },
    {
      slideNumber: 2,
      title: "核心科研攻坚与方法学实战 (Core Research & Methodology)",
      timeAllocation: "1:00 - 2:30 (90秒)",
      contentFocus: `【${primaryProject.slice(0, 20)}】研究设计、方法学质控与个人推进贡献`,
      speakingScript: `在核心科研方面，我深度参与了【${primaryProject}】。针对该研究的技术难点，我主要推进【${primaryMethods}】，熟练运用【${toolsStr}】开展结构化数据清洗与分析。针对潜在的选择偏倚与残余混杂，我们严密执行多模型校正与敏感性分析，确保推断结论客观稳健。`,
      visualAdvice: "居中展示课题的技术路线图或方法学执行流线，将个人负责的【质控流程】与【核心算法】用彩色框着重高亮。",
    },
    {
      slideNumber: 3,
      title: "一线实践胜任力与循证思辨 (Clinical & Field Competency)",
      timeAllocation: "2:30 - 3:30 (60秒)",
      contentFocus: `【${primaryClinical.slice(0, 20)}】一线轮转经历与实战转化感悟`,
      speakingScript: `在实践历练方面，我在【${primaryClinical}】完成了扎实的一线轮转。面对真实复杂的业务场景，我严格恪守标准化操作规程与数据质控红线。在带教老师指导下深入剖析真实案例，深化了对循证医学的理解，锻炼了跨学科团队协同与抗压应变能力。`,
      visualAdvice: "展示一线实践业务流线图或质控规范核查表，突出恪守医疗/流调安全规范与严谨求实的学风。",
    },
    {
      slideNumber: 4,
      title: "科研排障韧性与学术诚信反思 (Troubleshooting & Integrity)",
      timeAllocation: "3:30 - 4:15 (45秒)",
      contentFocus: `【${primaryProject.slice(0, 16)}】中的异常排查、算法修正与求实态度`,
      speakingScript: `科研绝非一帆风顺。在处理【${primaryProject}】过程中，我们曾遭遇过异常数据波动瓶颈。我没有急功近利，而是通过回溯底层操作与代码逻辑、补充敏感性检验攻克难关。这次经历让我深刻认识到：真实严谨是青年学者立身之本。`,
      visualAdvice: "展示排障前后的诊断散点图或决策树比对，突出严谨求真、绝不造假修图的崇高学术品德。",
    },
    {
      slideNumber: 5,
      title: "读研设想与融入课题组规划 (Research Proposal & Vision)",
      timeAllocation: "4:15 - 5:00 (45秒)",
      contentFocus: `对齐【${targetUniv}】及【${mentorTitle}】在【${mentorDir.slice(0, 20)}】的研究布局`,
      speakingScript: `【${targetUniv}】学术平台卓越，${mentorTitle}团队在【${mentorDir}】方向的代表性建树令我由衷向往。若有幸入组，我计划将本科沉淀的方法学技能与课题组前沿平台深度结合，在老师指导下全力攻坚，争取早日产出原创成果！我的汇报完毕，恳请各位老师批评指正！`,
      visualAdvice: "展示 1~3 年读研阶段清晰的学术研究规划甘特图，明确个人方法学基础与导师课题组平台的结合路径。",
    },
  ];
}

export function buildDynamicEnglishLiteratureDefense(
  input: Partial<MedicalUserInput> = {},
  details: ExtractedResumeDetails
): EnglishLiteratureDefense {
  const mentorDir = input.mentorResearchDirection?.trim() || details.primaryProject;
  const targetUniv = input.targetUniversity?.trim() || "Top Medical Institutions";

  return {
    articleTitle: `Methodological Advances and Causal Evidence in ${mentorDir.slice(0, 30)}: A Multicenter Study at ${targetUniv}`,
    journalAndYear: "The Lancet / JAMA Network / BMC Medicine (Recent Advance)",
    abstractSnippet: `Background: Investigating the underlying causal relationships and mitigating confounding biases remain paramount in modern biomedical research. Methods: Using a rigorous prospective cohort design and robust sensitivity models, we evaluated risk trajectories and long-term outcomes. Findings: After controlling for multiple confounding factors and calculating E-values, significant robust associations were identified. Interpretation: These findings highlight the critical importance of standardized quality control and advanced causal inference in evidence-based translation.`,
    chineseTranslation: `背景：深入探究潜在因果机制并系统规避混杂偏倚是现代生物医学研究的核心基石。方法：依托严密的前瞻性队列设计与稳健的敏感性分析模型，本研究评估了疾病风险演进轨迹与远期转归。结果：在全面校正多维混杂因素并计算 E-value 灵敏度指标后，证实了强稳健的因果关联。解释：该结论着重凸显了标准化质量控制与前沿因果推断方法在循证医学成果转化中的重大价值。`,
    commonQuestions: [
      "考官追问 1：How did the authors handle potential selection bias and residual confounding in this observational framework?",
      "考官追问 2：If you were to design a follow-up study based on this paper, what specific statistical model or experimental assay would you adopt to validate the causal pathway?",
      "考官追问 3：Please summarize the core clinical/public health implications of this study in three concise sentences.",
    ],
    keyGlossary: [
      { term: "Causal Inference", translation: "因果推断（突破单纯相关性，严密求证真实病因）" },
      { term: "Residual Confounding", translation: "残余混杂（即使多因素校正后依然可能存留的混杂偏倚）" },
      { term: "Sensitivity Analysis", translation: "敏感性分析（评估假说与统计推断在极端设定下的稳健性）" },
      { term: "E-value", translation: "E值（衡量未测量混杂需要达到多大效应强度才能推翻现有因果结论的指标）" },
    ],
    translationStrategy:
      "抽题朗读与翻译时，保持沉着自信，遇到核心方法学术语（Causal inference, Sensitivity analysis）自然放慢重读；作答时先用 1 句话概括文献核心研究目的（What & Why），再用 2 点陈述其方法学创新点与局限性，体现出超越同龄人的国际顶刊精读思辨力。",
  };
}

export function buildDynamicMentorMindsetAnalysis(
  input: Partial<MedicalUserInput> = {},
  details: ExtractedResumeDetails
): string[] {
  const mentorTitle = input.mentorName?.trim() || "目标导师";
  const targetUniv = input.targetUniversity?.trim() || "目标院校";
  const primaryProject = details.primaryProject;
  const toolsStr = details.skillItems.slice(0, 3).join("、") || "统计与实验技能";

  return [
    `【科研自驱力与即战力】${mentorTitle}最看重推免生是否具备真实实操经验，能否将本科掌握的【${toolsStr}】快速无缝应用到课题组在研项目中，拒绝只会背书、缺乏动手排障能力的应试型学生；`,
    `【方法学深度与科学求实】在推免面试中，考官极为警惕‘简历造假’或‘挂名刷成果’。针对【${primaryProject.slice(0, 15)}】，导师会死磕数据清洗逻辑与偏倚排查手段，考查学生对底层科学原理的真实敬畏；`,
    `【抗压韧性与科研伦理】医学科研常伴随阴性结果或实验反复失败，${mentorTitle}看重学生在遭遇科研瓶颈时是否具备稳健的心态、严谨求真的回溯排查作风，绝不容忍选择性篡改或隐瞒数据；`,
    `【团队协作与培养意向】顶尖平台【${targetUniv}】强调跨学科团队作战，导师偏爱沟通礼貌得体、具备大局观且能主动担当一线繁复质控任务的青年后备人才。`,
  ];
}

export function buildDynamicDefenseChecklist(
  input: Partial<MedicalUserInput> = {},
  details: ExtractedResumeDetails
): string[] {
  const applicantName = input.name?.trim() || "考生";
  const gpaRank = input.gpaRank?.trim() || "推免证明";
  const primaryProject = details.primaryProject;

  return [
    `【硬件材料清单】由${applicantName}携带 5 份彩色打印并胶装成册的个人学术简历、本科官方成绩单（盖章原件）、推免排名证明（${gpaRank}）及外语成绩单原件；`,
    `【答辩 PPT 严谨核查】确保 PPT 严格控制在 5 页以内，16:9 比例，导出 PDF 备用版以防考场 Office 字体或排版错乱；`,
    `【简历科研死磕准备】对简历中【${primaryProject.slice(0, 18)}】的样本量、关键变量编码、异常值处理及敏感性分析细节烂熟于心，随时应对考官地狱级追问；`,
    `【英文口试实战推演】熟练脱稿背诵 90 秒英文学术自述，关键专业术语发音清晰标准，提前模拟文献抽题翻译；`,
    "【礼仪心理调适】身着得体正装，答辩全程与各位考官保持眼神交流，回答问题先致谢再有条理分点陈述，展现谦逊自信的大将之风。",
  ];
}

/**
 * Ensures all 4 modules of MedicalAnalysisResult are populated and deeply personalized
 * according to the user's specific inputs (name, undergrad school, mentor, target university, GPA rank, etc.)
 * GUARANTEE: Zero hardcoded example data ("周思敏", "2.4万人", etc.) leaks into user results!
 */
export function enrichMedicalResult(
  result: Partial<MedicalAnalysisResult> | null | undefined,
  input?: Partial<MedicalUserInput>
): MedicalAnalysisResult {
  const effectiveInput: Partial<MedicalUserInput> = input || {};
  const resDetails = extractResumeDetails(effectiveInput);

  // Dynamically build user-grounded defaults for all 4 deliverables
  const dynamicPS = buildDynamicPSDiagnosis(effectiveInput, resDetails);
  const dynamicCV = buildDynamicCVOptimization(effectiveInput, resDetails);
  const dynamicEmail = buildDynamicMentorEmail(effectiveInput, resDetails);
  const dynamicSlides = buildDynamicDefenseSlideFramework(effectiveInput, resDetails);
  const dynamicLit = buildDynamicEnglishLiteratureDefense(effectiveInput, resDetails);
  const dynamicMindset = buildDynamicMentorMindsetAnalysis(effectiveInput, resDetails);
  const dynamicChecklist = buildDynamicDefenseChecklist(effectiveInput, resDetails);
  const dynamicIntros = buildResumeBasedSelfIntroductions(effectiveInput, resDetails);
  const dynamicEngIntro = buildResumeBasedEnglishSelfIntro(effectiveInput, resDetails);
  const dynamicQuestions = buildResumeBasedQuestions(effectiveInput, resDetails);

  // If LLM returned valid structured modules, use them and sanitize; otherwise use 100% dynamic synthesis
  const llmPS = result?.psDiagnosis;
  const llmCV = result?.cvOptimization;
  const llmEmail = result?.mentorEmail;
  const llmPrep = result?.labInterviewPrep;

  const hasValidLLMPS = Boolean(llmPS && llmPS.sections && llmPS.sections.length > 0);
  const hasValidLLMCV = Boolean(llmCV && llmCV.optimizedItems && llmCV.optimizedItems.length > 0);
  const hasValidLLMEmail = Boolean(llmEmail && llmEmail.bodyText && llmEmail.bodyText.length > 20);
  const hasValidLLMQuestions = Boolean(llmPrep?.questions && llmPrep.questions.length > 0);

  const merged: MedicalAnalysisResult = {
    psDiagnosis: hasValidLLMPS && llmPS
      ? {
          overallScore: llmPS.overallScore || dynamicPS.overallScore,
          dimensionScores: llmPS.dimensionScores?.length ? llmPS.dimensionScores : dynamicPS.dimensionScores,
          mainIssues: (llmPS.mainIssues?.length ? llmPS.mainIssues : dynamicPS.mainIssues).map((s) => replaceAllTokens(s, effectiveInput)),
          strengths: (llmPS.strengths?.length ? llmPS.strengths : dynamicPS.strengths).map((s) => replaceAllTokens(s, effectiveInput)),
          prioritySuggestions: (llmPS.prioritySuggestions?.length ? llmPS.prioritySuggestions : dynamicPS.prioritySuggestions).map((s) => replaceAllTokens(s, effectiveInput)),
          sections: llmPS.sections.map((sec, idx) => ({
            sectionName: sec.sectionName || dynamicPS.sections[idx]?.sectionName || `第${idx + 1}部分`,
            sectionTitle: replaceAllTokens(sec.sectionTitle || dynamicPS.sections[idx]?.sectionTitle || "", effectiveInput),
            originalText: replaceAllTokens(sec.originalText || dynamicPS.sections[idx]?.originalText || "", effectiveInput),
            optimizedText: replaceAllTokens(sec.optimizedText || dynamicPS.sections[idx]?.optimizedText || "", effectiveInput),
            reason: replaceAllTokens(sec.reason || dynamicPS.sections[idx]?.reason || "", effectiveInput),
            mentorFocusPoint: replaceAllTokens(sec.mentorFocusPoint || dynamicPS.sections[idx]?.mentorFocusPoint || "", effectiveInput),
          })),
          fullOptimizedPS: replaceAllTokens(llmPS.fullOptimizedPS || dynamicPS.fullOptimizedPS, effectiveInput),
        }
      : dynamicPS,

    cvOptimization: hasValidLLMCV && llmCV
      ? {
          optimizedItems: llmCV.optimizedItems.map((item, idx) => ({
            id: item.id || `cv-opt-${idx}`,
            section: replaceAllTokens(item.section || dynamicCV.optimizedItems[idx]?.section || "", effectiveInput),
            before: replaceAllTokens(item.before || dynamicCV.optimizedItems[idx]?.before || "", effectiveInput),
            after: replaceAllTokens(item.after || dynamicCV.optimizedItems[idx]?.after || "", effectiveInput),
            reason: replaceAllTokens(item.reason || dynamicCV.optimizedItems[idx]?.reason || "", effectiveInput),
            academicStandardTip: replaceAllTokens(item.academicStandardTip || dynamicCV.optimizedItems[idx]?.academicStandardTip || "", effectiveInput),
          })),
          finalMedicalResume: {
            personalInfo: {
              name: effectiveInput.name?.trim() || "推免申请人",
              undergradSchool: effectiveInput.undergradSchool?.trim() || "本科院校",
              major: effectiveInput.major?.trim() || "医学专业",
              gpaRank: effectiveInput.gpaRank?.trim() || "推免综合排名前列",
              englishLevel: effectiveInput.englishLevel?.trim() || "大学英语六级良好",
              phone: effectiveInput.phone?.trim() || "",
              email: effectiveInput.email?.trim() || "",
              targetTrack: effectiveInput.track || "preventive-public-health",
              targetIntent: effectiveInput.mentorName
                ? `意向导师：${effectiveInput.mentorName}${effectiveInput.targetUniversity ? ` · ${effectiveInput.targetUniversity}` : ""}`
                : effectiveInput.targetUniversity
                ? `目标院校：${effectiveInput.targetUniversity}`
                : "",
              targetUniversity: effectiveInput.targetUniversity?.trim() || "",
            },
            academicSummary: replaceAllTokens(
              llmCV.finalMedicalResume?.academicSummary || dynamicCV.finalMedicalResume.academicSummary,
              effectiveInput
            ),
            labSkills: llmCV.finalMedicalResume?.labSkills?.length
              ? llmCV.finalMedicalResume.labSkills
              : dynamicCV.finalMedicalResume.labSkills,
            researchProjects: llmCV.finalMedicalResume?.researchProjects?.length
              ? llmCV.finalMedicalResume.researchProjects.map((p) => ({
                  title: replaceAllTokens(p.title, effectiveInput),
                  role: replaceAllTokens(p.role, effectiveInput),
                  period: p.period || "本科攻读期间",
                  mentor: p.mentor ? replaceAllTokens(p.mentor, effectiveInput) : effectiveInput.undergradSchool || "本科科研团队",
                  bullets: p.bullets.map((b) => replaceAllTokens(b, effectiveInput)),
                }))
              : dynamicCV.finalMedicalResume.researchProjects,
            publications: llmCV.finalMedicalResume?.publications || [],
            clinicalExperiences: llmCV.finalMedicalResume?.clinicalExperiences?.length
              ? llmCV.finalMedicalResume.clinicalExperiences.map((c) => ({
                  hospital: replaceAllTokens(c.hospital, effectiveInput),
                  department: replaceAllTokens(c.department, effectiveInput),
                  period: c.period || "临床实践阶段",
                  bullets: c.bullets.map((b) => replaceAllTokens(b, effectiveInput)),
                }))
              : dynamicCV.finalMedicalResume.clinicalExperiences,
            honorsAndScholarships: (llmCV.finalMedicalResume?.honorsAndScholarships?.length
              ? llmCV.finalMedicalResume.honorsAndScholarships
              : dynamicCV.finalMedicalResume.honorsAndScholarships
            ).map((h) => replaceAllTokens(h, effectiveInput)),
          },
        }
      : dynamicCV,

    mentorEmail: hasValidLLMEmail && llmEmail
      ? {
          subjectOptions: dynamicEmail.subjectOptions, // Always dynamically tailored to user's real name/mentor/rank
          salutation: dynamicEmail.salutation,
          bodyText: replaceAllTokens(llmEmail.bodyText, effectiveInput),
          attachmentChecklist: dynamicEmail.attachmentChecklist,
          strategyTips: dynamicEmail.strategyTips,
        }
      : dynamicEmail,

    labInterviewPrep: {
      selfIntroductions: dynamicIntros,
      englishSelfIntro: dynamicEngIntro,
      questions: hasValidLLMQuestions && llmPrep?.questions
        ? llmPrep.questions.map((q) => ({
            category: q.category || "专业方法学与科研攻坚",
            difficulty: q.difficulty || "高难度 (Hard)",
            question: replaceAllTokens(q.question, effectiveInput),
            coreIntent: replaceAllTokens(q.coreIntent, effectiveInput),
            badAnswer: q.badAnswer ? replaceAllTokens(q.badAnswer, effectiveInput) : undefined,
            recommendedAnswer: replaceAllTokens(q.recommendedAnswer, effectiveInput),
            evidencePoints: q.evidencePoints.map((p) => replaceAllTokens(p, effectiveInput)),
            academicWeapons: q.academicWeapons?.map((w) => replaceAllTokens(w, effectiveInput)),
          }))
        : dynamicQuestions,
      defenseSlideFramework: dynamicSlides,
      englishLiteratureDefense: dynamicLit,
      mentorMindsetAnalysis: dynamicMindset,
      defenseChecklist: dynamicChecklist,
    },
  };

  return merged;
}


