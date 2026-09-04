import type { FinalResume, WorkExperience, ProjectExperience, UserInput } from '@/types/resume';

const COMMON_CITIES = [
  '广州', '深圳', '北京', '上海', '杭州', '成都', '武汉', '南京',
  '西安', '苏州', '重庆', '天津', '长沙', '厦门', '青岛', '大连',
  '宁波', '合肥', '郑州', '沈阳', '济南', '福州', '无锡', '东莞',
  '佛山', '昆明', '南宁', '贵阳', '海口', '香港', '澳门', '台北',
  '远程', '全国'
];

const FORBIDDEN_NAMES = new Set([
  ...COMMON_CITIES,
  '个人简历', '我的简历', '求职简历', '简历', '求职者', '基本信息',
  '本科生', '研究生', '硕士生', '博士生', '大专生', '软件工程',
  '计算机', '应聘', '求职意向', '意向', '联系方式', '自我评价', '项目经验'
]);

/**
 * Smart layout-aware and semantic text resume parser.
 * Handles diverse styles (standard headings, bullet styles, in-line headings, informal headings).
 */
export function parseResumeFromText(rawText: string): {
  finalResume: FinalResume;
  userInput: Partial<UserInput>;
  stats: {
    workCount: number;
    projectCount: number;
    skillCount: number;
    hasEducation: boolean;
    hasContact: boolean;
  };
} {
  const text = (rawText || '').trim();
  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Contact & Identity Extraction
  let name = '';
  let phone = '';
  let email = '';
  let location = '';
  let jobIntent = '';

  // Phone Regex
  const phoneMatch = text.match(/(?:(?:\+?86)?\s*)?(1[3-9]\d{9}|1[3-9]\d[-\s]\d{4}[-\s]\d{4}|\d{3}[-\s]\d{4}[-\s]\d{4})/);
  if (phoneMatch) {
    phone = phoneMatch[1].replace(/\s+/g, '-');
  }

  // Email Regex
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    email = emailMatch[1];
  }

  // Name Extraction
  // Strategy A: Check explicit name field
  const explicitNameMatch = text.match(/(?:姓名|Name|联系人)[:：]\s*([^\s|/,\n]+)/i);
  if (explicitNameMatch && !FORBIDDEN_NAMES.has(explicitNameMatch[1].trim())) {
    name = explicitNameMatch[1].trim();
  }

  // Strategy B: Check first 2 lines for "Name · 个人简历" or "Name 的简历"
  if (!name && rawLines.length > 0) {
    for (const line of rawLines.slice(0, 3)) {
      const resumeSuffixMatch = line.match(/^([^\s·|/—\d]{2,6})\s*[·|/—\s]?(?:个人简历|的简历|简历|Resume)/i);
      if (resumeSuffixMatch) {
        const cand = resumeSuffixMatch[1].trim();
        if (!FORBIDDEN_NAMES.has(cand)) {
          name = cand;
          break;
        }
      }
    }
  }

  // Strategy C: Check line 1 for standalone Chinese name
  if (!name && rawLines.length > 0) {
    const firstLine = rawLines[0].replace(/[#*•|]/g, '').trim();
    const candidate = firstLine.split(/[\s·|/—]/)[0].trim();
    if (
      candidate.length >= 2 &&
      candidate.length <= 5 &&
      !FORBIDDEN_NAMES.has(candidate) &&
      !/\d/.test(candidate)
    ) {
      name = candidate;
    }
  }

  if (!name) name = '求职者';

  // Location Extraction (Check top 6 lines first)
  const topLinesText = rawLines.slice(0, 6).join(' ');
  const locationMatch = topLinesText.match(/(?:城市|所在地|现居|居住地|坐标|意向城市|地址|Location)[:：]\s*([^\s|/,\n()（）]+)/i);
  if (locationMatch) {
    location = locationMatch[1].trim();
  } else {
    for (const city of COMMON_CITIES) {
      if (topLinesText.includes(city)) {
        location = city;
        break;
      }
    }
  }
  if (!location) {
    for (const city of COMMON_CITIES) {
      if (text.includes(city)) {
        location = city;
        break;
      }
    }
  }
  if (!location) location = '深圳';

  // Job Intent Extraction
  const intentMatch = text.match(/(?:求职意向|期望岗位|应聘岗位|目标岗位|求职职位|意向职位|意向|Target Role|Job Intent)[:：]\s*([^\n|]+)/i);
  if (intentMatch) {
    jobIntent = intentMatch[1].trim().split(/[|/（(]/)[0].trim();
  } else {
    const commonRoleMatch = text.match(/(?:高级|资深|架构师|工程师|产品经理|运营专家|开发专家|总监|设计师|分析师|独立开发者|实习生)/);
    if (commonRoleMatch) {
      for (const line of rawLines.slice(0, 8)) {
        if (line.includes(commonRoleMatch[0]) && line.length < 35 && !line.includes('•') && !line.includes('20')) {
          jobIntent = line.replace(/.*[:：]/, '').trim();
          break;
        }
      }
    }
  }
  if (!jobIntent) jobIntent = '软件工程师';

  // 2. Education Extraction
  let school = '';
  let degree = '';
  let major = '';
  let eduPeriod = '';

  const schoolMatch = text.match(/([\u4e00-\u9fa5a-zA-Z\s]{2,16}(?:大学|学院|分校|分院|师范|理工|科技|商学院|Institute|University|College))/);
  if (schoolMatch) {
    school = schoolMatch[1].trim();
  }

  const degreeMatch = text.match(/(博士|硕士|研究生|本科生|本科|学士|大专|专科|MBA|Master|Bachelor|PhD)/i);
  if (degreeMatch) {
    const rawDegree = degreeMatch[1].trim();
    degree = rawDegree.includes('本科') ? '本科' : rawDegree.includes('硕士') ? '硕士' : rawDegree;
  }

  const majorMatch = text.match(/[（(]([\u4e00-\u9fa5a-zA-Z\s]{2,15}(?:工程|科学|技术|专业|系|学))[)）]/) ||
    text.match(/(?:专业|Major)[:：]?\s*([\u4e00-\u9fa5a-zA-Z\s]{2,15})/) ||
    text.match(/(计算机科学与技术|软件工程|电子信息|人工智能|数学与应用数学|统计学|通信工程|自动化|信息安全|金融学|工商管理|视觉传达|市场营销)/);
  if (majorMatch) {
    major = majorMatch[1].trim();
  }

  const gradYearMatch = text.match(/(\d{4})\s*届/);
  const eduDateMatch = text.match(/(\d{4}[./-]\d{1,2}\s*(?:[-–—~至到]\s*(?:\d{4}[./-]\d{1,2}|至今|现在|Present)))/);
  if (gradYearMatch) {
    const gYear = parseInt(gradYearMatch[1]);
    eduPeriod = `${gYear - 4}.09 - ${gYear}.06 (${gYear}届)`;
  } else if (eduDateMatch) {
    eduPeriod = eduDateMatch[1].trim();
  }

  if (!school) school = '重点大学';
  if (!degree) degree = '本科';
  if (!major) major = '软件工程';
  if (!eduPeriod) eduPeriod = '2023.09 - 2027.06';

  // 3. Classify and Extract Lines into Experience / Skills / Summary
  const dateRegex = /(\d{4}[./-]\d{1,2}\s*(?:[-–—~至到]\s*(?:\d{4}[./-]\d{1,2}|至今|现在|Present|present))|\d{4}\s*[-–—~至到]\s*\d{4}|\d{4}[./-]\d{1,2}\s*至今)/;

  const rawWorkItems: WorkExperience[] = [];
  const rawProjectItems: ProjectExperience[] = [];
  const extractedSkills: string[] = [];
  const summaryParagraphs: string[] = [];

  let currentExp: {
    type: 'work' | 'project';
    name: string;
    role: string;
    period: string;
    bullets: string[];
  } | null = null;

  const flushCurrentExp = () => {
    if (!currentExp) return;
    const finalBullets = currentExp.bullets.length > 0
      ? currentExp.bullets
      : ['负责核心业务需求推进与技术方案落地。'];

    if (currentExp.type === 'project') {
      rawProjectItems.push({
        name: currentExp.name,
        role: currentExp.role,
        period: currentExp.period,
        bullets: finalBullets
      });
    } else {
      rawWorkItems.push({
        company: currentExp.name,
        role: currentExp.role,
        period: currentExp.period,
        bullets: finalBullets
      });
    }
    currentExp = null;
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    // Check if line is a section divider comment like "// 01. 个人优势", "// 02. 工作经历"
    if (/^\/\/\s*\d+[\s.]*(?:个人优势|工作经历|项目经历|荣誉与竞赛|技能)/.test(line)) {
      flushCurrentExp();
      continue;
    }

    // Check if line is a skill definition line
    const isSkillLine = /^(?:[#*▌\s-]*)(?:产品核心能力|产品能力|AI与数据能力|AI与数据|AI能力|数据能力|工具与技术基础|工具与技术|核心技能|专业技能|技能特长|技术栈|掌握技能|技能清单|Skills|Tools)[:：]/i.test(line) ||
      (line.startsWith('产品核心能力：') || line.startsWith('AI 与数据能力：') || line.startsWith('工具与技术基础：') || line.startsWith('专业技能：') || line.startsWith('核心技能：'));

    if (isSkillLine) {
      flushCurrentExp();
      const contentPart = line.replace(/^[^:：]+[:：]/, '').trim();
      const parts = contentPart.split(/[、,，;；|/·\t]+|\s{2,}/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 35);
      parts.forEach((p) => {
        let cleaned = p.replace(/^[•*\-\d.]+\s*/, '').replace(/[（(].*?[)）]/g, '').trim();
        if (cleaned.includes('（') || cleaned.includes('(')) {
          cleaned = cleaned.replace(/[（(].*$/, '').trim();
        }
        if (cleaned && cleaned.length > 1 && !extractedSkills.includes(cleaned)) {
          extractedSkills.push(cleaned);
        }
      });
      continue;
    }

    // Check if line is an Experience Header:
    // A non-education line containing a date range (e.g. "陆丰市人民检察院 · 信息化运维实习生 (2025.01 - 2025.02)")
    const hasDateInLine = dateRegex.test(line);
    const isExplicitEduLine = (line.includes('基本信息') || line.includes('届本科生') || line.includes('求职意向') || line.includes('最高学历')) &&
      !line.includes('竞赛') && !line.includes('挑战杯') && !line.includes('实习生') && !line.includes('大使') && !line.includes('推行官');

    if (hasDateInLine && !isExplicitEduLine) {
      flushCurrentExp();

      const dateMatch = line.match(dateRegex);
      const period = dateMatch ? dateMatch[1].trim() : '2023.01 - 至今';
      const cleanLine = line.replace(dateRegex, '').replace(/[（()）]/g, ' ').trim();

      let expName = '';
      let expRole = jobIntent;

      if (cleanLine.includes('·') || cleanLine.includes('|') || cleanLine.includes('——') || cleanLine.includes(' - ')) {
        const parts = cleanLine.split(/[·|—]{1,2}|\s+-\s+/).map((s) => s.trim()).filter(Boolean);
        expName = parts[0] || '核心业务平台研发';
        expRole = parts[1] || jobIntent;
      } else {
        expName = cleanLine || '核心项目研发';
      }

      expName = expName.replace(/^[#*•\s\d.、]+/, '').trim();
      if (!expName) expName = '业务系统研发与重构';

      // Decide if it belongs to Project or Work experience
      const isProject = expName.includes('「') ||
        expName.includes('项目') ||
        expName.includes('系统') ||
        expName.includes('平台') ||
        expName.includes('工具') ||
        expName.includes('竞赛') ||
        expName.includes('大赛') ||
        expName.includes('挑战杯') ||
        expName.includes('创投') ||
        expName.includes('App') ||
        expRole.includes('独立开发') ||
        expRole.includes('参赛');

      currentExp = {
        type: isProject ? 'project' : 'work',
        name: expName,
        role: expRole,
        period,
        bullets: []
      };
      continue;
    }

    // Check if line is a Bullet Point belonging to current experience
    const isBullet = /^[•*·\-▌\d.、]/.test(line) ||
      line.startsWith('【') ||
      (line.includes('：') && currentExp !== null && !isSkillLine);

    if (currentExp && (isBullet || line.length > 15)) {
      const cleanBullet = line.replace(/^[•*·\-▌\d.、\s]+/, '').trim();
      if (cleanBullet && !cleanBullet.includes('求职意向') && !cleanBullet.includes('基本信息')) {
        currentExp.bullets.push(cleanBullet);
      }
      continue;
    }

    // Check if line is a Summary / Background paragraph
    const isSummaryLine = /^(?:[#*▌\s-]*)(?:技术背景与产品思维|技术背景|产品思维|从0到1|从 0 到 1|职业摘要|个人优势|自我评价|个人简介|个人总结|职业概述|SUMMARY|PROFILE)[:：]?/i.test(line) ||
      (line.length > 20 && !line.includes('基本信息') && !line.includes('求职意向') && !line.includes('@') && !line.includes('13') && !line.includes('18') && summaryParagraphs.length < 3 && !currentExp);

    if (isSummaryLine) {
      flushCurrentExp();
      const cleanSum = line.replace(/^[^:：]+[:：]/, '').trim();
      if (cleanSum && cleanSum.length > 10 && !cleanSum.includes('@')) {
        summaryParagraphs.push(cleanSum);
      }
      continue;
    }
  }

  flushCurrentExp();

  // 4. Construct Clean Summary (Keep concise: 120-220 chars)
  let summary = '';
  if (summaryParagraphs.length > 0) {
    summary = summaryParagraphs.slice(0, 2).join(' ');
  }
  if (!summary || summary.length < 15) {
    summary = `${school} ${major} ${degree}，兼具扎实的专业技术功底与敏锐的产品/工程思维。熟练掌握 ${extractedSkills.slice(0, 4).join('、') || '需求分析与架构设计'}，具备从 0 到 1 打造高质量项目的闭环实践经验。`;
  }
  if (summary.length > 240) {
    summary = summary.slice(0, 235) + '...';
  }

  // 5. Finalize Skills
  const coreSkills: string[] = extractedSkills.length > 0
    ? extractedSkills.slice(0, 10)
    : ['需求分析与架构设计', 'Prompt Engineering', 'RAG 检索', 'AI 评测体系设计', '原型设计', 'MVP 验证'];

  // 6. Finalize Work & Project Experience
  let finalWork = rawWorkItems;
  let finalProject = rawProjectItems;

  if (finalWork.length === 0 && finalProject.length > 0) {
    finalWork = finalProject.map((p) => ({
      company: p.name,
      role: p.role,
      period: p.period,
      bullets: p.bullets
    }));
  } else if (finalWork.length > 0 && finalProject.length === 0) {
    finalProject = finalWork.map((w) => ({
      name: w.company,
      role: w.role,
      period: w.period,
      bullets: w.bullets
    }));
  }

  if (finalWork.length === 0) {
    finalWork = [
      {
        company: '科技创新研发项目',
        role: jobIntent,
        period: '2024.03 - 至今',
        bullets: [
          '主导核心模块架构设计与功能落地，提升业务处理效率与稳定性；',
          '优化端到端性能，解决关键技术瓶颈，保障项目按期高质交付。'
        ]
      }
    ];
  }

  if (finalProject.length === 0) {
    finalProject = [
      {
        name: '智能协同系统从 0 到 1 构建',
        role: '核心负责人',
        period: '2024.06 - 2024.12',
        bullets: [
          '主导系统整体架构方案与核心链路编排，实现多端协同与高可用性能调优；',
          '建立标准化评估基准体系，客户满意度达到 95% 以上。'
        ]
      }
    ];
  }

  const finalResume: FinalResume = {
    personalInfo: {
      name,
      email: email || 'user@example.com',
      phone: phone || '138-0000-0000',
      location,
      avatarUrl: ''
    },
    jobIntent,
    summary,
    coreSkills,
    skillsAndTools: coreSkills,
    workExperience: finalWork,
    projectExperience: finalProject,
    education: {
      school,
      degree: `${degree} · ${major}`,
      period: eduPeriod
    }
  };

  const userInput: Partial<UserInput> = {
    targetRole: jobIntent,
    originalResume: rawText,
    highlightSkills: coreSkills.join('、'),
    additionalInfo: summary
  };

  return {
    finalResume,
    userInput,
    stats: {
      workCount: finalResume.workExperience.length,
      projectCount: finalResume.projectExperience.length,
      skillCount: finalResume.coreSkills.length,
      hasEducation: Boolean(finalResume.education.school),
      hasContact: Boolean(phone || email)
    }
  };
}
