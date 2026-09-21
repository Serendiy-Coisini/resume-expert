import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeLegoSchema, validateAndNormalizeLegoJson, validateAndNormalizeStructuredResume } from "@/lib/schema-normalizer";
import { useLegoDesignerStore } from "@/store/lego-designer-store";
import { useResumeStore, getResumeSourceKey } from "@/store/resume-store";
import {
  fillAiDataIntoExistingSchema,
  hasManualCanvasEdits,
  extractResumeFromLegoSchema,
  buildLegoSchemaFromResume,
  isDecorativeOrBackgroundWidget,
  calculateA4PageHeight,
  reflowCanvasWidgetsForPagination,
} from "@/lib/lego-adapter";
import { sanitizePrintHTML } from "@/lib/safe-html";
import { calculatePrintSlices, generateLegoPrintHtml } from "@/components/legoDesigner/utils/printLego";
import { getClientIp } from "@/lib/rate-limit";
import { WIDGET_CONFIG_LIST, DEFAULT_AVATAR_PLACEHOLDER } from "@/components/legoDesigner/schema/widgetConfig";
import type { IHJSchema, IWidget } from "@/types/lego";
import type { FinalResume, UserInput } from "@/types/resume";

const mockResume: FinalResume = {
  personalInfo: {
    name: "张三",
    phone: "13800138000",
    email: "zhangsan@example.com",
    location: "北京",
  },
  jobIntent: "高级全栈工程师",
  summary: "7年全栈研发经验，精通 React 与 Node.js 架构设计。",
  coreSkills: ["TypeScript", "React", "Next.js", "Node.js", "Tailwind CSS"],
  skillsAndTools: ["TypeScript", "React", "Next.js", "Node.js", "Tailwind CSS"],
  workExperience: [
    {
      company: "未来科技有限公司",
      role: "资深前端专家",
      period: "2021.03 - 至今",
      bullets: [
        "负责企业核心低代码平台架构重构，使大型工程编译速度提升 45%",
        "主导微前端方案落地，降低团队跨模块协作冲突 60%",
      ],
    },
    {
      company: "创新数字集团",
      role: "前端工程师",
      period: "2018.07 - 2021.02",
      bullets: [
        "完成数据可视化大屏系统开发，支持亿级数据毫秒级流畅渲染",
      ],
    },
  ],
  projectExperience: [
    {
      name: "积木式智能简历重构引擎",
      role: "技术负责人",
      period: "2023.01 - 2023.12",
      bullets: [
        "设计基于 STAR 法则的启发式追问与改写闭环，提升简历与目标 JD 匹配度 30%",
      ],
    },
  ],
  education: {
    school: "清华大学",
    degree: "软件工程硕士",
    period: "2015.09 - 2018.06",
  },
};

const mockUserInput: UserInput = {
  targetRole: "全栈工程师",
  industry: "互联网",
  companyType: "头部大厂 (10000人以上 · 已上市)",
  jobStage: "社招-高级/专家 (5-10年+经验 · 团队Lead/专家)",
  highlightSkills: "React, Node.js",
  jobDescription: "负责核心架构设计与低代码系统搭建",
  originalResume: "张三简历...",
  additionalInfo: "7年全栈研发经验",
};

const mockAnalysisResult: import("@/types/resume").AnalysisResult = {
  finalResume: mockResume,
  jdAnalysis: {
    responsibilities: ["负责核心系统设计"],
    hardRequirements: ["精通 React"],
    implicitRequirements: ["良好的架构思维"],
    keywords: ["React", "TypeScript"],
    idealCandidate: "资深工程师",
    coreCompetencies: [{ name: "前端架构", importance: "high", description: "丰富经验" }],
  },
  diagnosis: {
    overallScore: 88,
    dimensionScores: [{ dimension: "专业度", score: 90, comment: "优秀" }],
    mainIssues: ["量化成果需更具体"],
    prioritySuggestions: ["增强数据支撑"],
  },
  matchItems: [],
  followUpQuestions: [],
  optimizedItems: [],
  interviewPrep: {
    likelyQuestions: [],
    evidenceToPrepare: [],
    possibleExaggerations: [],
    dataToSupplement: [],
    selfIntroduction: "自我介绍",
  },
};

test("R01 Schema 无损往返 & 幂等标准化: 保留 pagePadding, opacity 0, textDecoration, 尺寸不无限自增", () => {
  const schemaWithSpecialProps: IHJSchema = {
    id: "schema-r01",
    version: "1.0.0",
    config: { title: "测试" },
    css: {
      width: 820,
      height: 1160,
      background: "#ffffff",
      opacity: 1,
      pagePadding: { top: 25, right: 30, bottom: 35, left: 40 },
    },
    componentsTree: [
      {
        id: "page-1",
        componentName: "page",
        commentType: "page",
        children: [
          {
            id: "w-1",
            title: "透明测试文本",
            componentName: "hj-text-1",
            css: {
              left: 50,
              top: 50,
              width: 200,
              height: 40,
              opacity: 0,
              textDecoration: "underline",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              zIndex: 2,
            },
            dataSource: { text: "透明测试文本" },
          },
          {
            id: "w-2",
            title: "矩形装饰",
            componentName: "hj-rectangle",
            css: {
              left: 50,
              top: 120,
              width: 300,
              height: 100,
              opacity: 0.65,
              borderRadius: 8,
              zIndex: 1,
            },
            dataSource: {},
          },
        ],
      },
    ],
  };

  const normalized1 = normalizeLegoSchema(schemaWithSpecialProps);
  assert.deepEqual(normalized1.css?.pagePadding, { top: 25, right: 30, bottom: 35, left: 40 });
  assert.strictEqual(normalized1.componentsTree[0].children[0].css.opacity, 0);
  assert.strictEqual(normalized1.componentsTree[0].children[0].css.textDecoration, "underline");
  assert.strictEqual(normalized1.componentsTree[0].children[0].css.boxShadow, "0 4px 6px rgba(0,0,0,0.1)");
  assert.strictEqual(normalized1.componentsTree[0].children[1].css.opacity, 0.65);

  const normalized2 = normalizeLegoSchema(normalized1);
  assert.strictEqual(normalized2.css?.height, normalized1.css?.height);
  assert.strictEqual(normalized2.componentsTree[0].children.length, 2);
  assert.deepEqual(normalized2.componentsTree[0].children[0].css, normalized1.componentsTree[0].children[0].css);
});

test("R02 JSON 和组件运行时校验: 重复 ID 自动去重, 边界截断, 评分上限约束", () => {
  const dirtyJson = {
    id: "dirty-schema",
    css: { width: 820, height: 1160, background: "#fff", opacity: 1 },
    componentsTree: [
      {
        id: "page-1",
        children: [
          {
            id: "dup-id",
            title: "文本1",
            componentName: "hj-text-1",
            css: { left: 10, top: 10, width: 100, height: 30, zIndex: 1 },
            dataSource: { text: "First" },
          },
          {
            id: "dup-id",
            title: "文本2",
            componentName: "hj-text-2",
            css: { left: 10, top: 50, width: 100, height: 30, zIndex: 1 },
            dataSource: { text: "Second duplicate" },
          },
          {
            id: "w-rate",
            title: "评分",
            componentName: "hj-rate-1",
            css: { left: 10, top: 90, width: 150, height: 24, zIndex: 1 },
            dataSource: { rate: 10, maxRate: 5 },
          },
        ],
      },
    ],
  };

  const res = validateAndNormalizeLegoJson(dirtyJson);
  assert.ok(res.success);
  const validated = res.data!;
  const ids = validated.componentsTree[0].children.map((c: IWidget) => c.id);
  assert.strictEqual(new Set(ids).size, 3, "All widget IDs must be globally unique");
  assert.notStrictEqual(ids[0], ids[1]);

  const rateWidget = validated.componentsTree[0].children.find((c: IWidget) => c.componentName === "hj-rate-1");
  assert.ok(rateWidget);
  assert.strictEqual(rateWidget.dataSource.rate, 5, "Rate must be clamped to maxRate");
});

test("R05 选中状态不变量: 复制、删除、撤销后 selectedWidgetId 与 selectedWidgetIds 严格同步", () => {
  const store = useLegoDesignerStore.getState();

  const testSchema: IHJSchema = {
    id: "test-sel-schema",
    version: "1.0.0",
    config: { title: "测试" },
    css: { width: 820, height: 1160, background: "#fff", opacity: 1 },
    componentsTree: [
      {
        id: "page-1",
        componentName: "page",
        commentType: "page",
        children: [
          {
            id: "target-1",
            title: "组件1",
            componentName: "hj-text-1",
            css: { left: 50, top: 50, width: 150, height: 30, zIndex: 1 },
            dataSource: { text: "Component 1" },
          },
          {
            id: "target-2",
            title: "组件2",
            componentName: "hj-text-2",
            css: { left: 50, top: 90, width: 150, height: 30, zIndex: 1 },
            dataSource: { text: "Component 2" },
          },
        ],
      },
    ],
  };

  store.setSchema(testSchema, true);

  store.setSelectedWidgetId("target-1");
  let state = useLegoDesignerStore.getState();
  assert.strictEqual(state.selectedWidgetId, "target-1");
  assert.deepEqual(state.selectedWidgetIds, ["target-1"]);

  store.duplicateWidget("target-1");
  state = useLegoDesignerStore.getState();
  assert.notStrictEqual(state.selectedWidgetId, "target-1");
  assert.strictEqual(state.selectedWidgetIds.length, 1);
  assert.strictEqual(state.selectedWidgetId, state.selectedWidgetIds[0]);

  const duplicatedId = state.selectedWidgetId!;
  store.deleteWidget(duplicatedId);
  state = useLegoDesignerStore.getState();
  assert.ok(!state.selectedWidgetIds.includes(duplicatedId));
  assert.notStrictEqual(state.selectedWidgetId, duplicatedId);

  store.setSelectedWidgetIds(["target-1", "target-2"]);
  state = useLegoDesignerStore.getState();
  assert.strictEqual(state.selectedWidgetId, "target-2");
  store.batchDeleteWidgets(["target-1", "target-2"]);
  state = useLegoDesignerStore.getState();
  assert.strictEqual(state.selectedWidgetId, null);
  assert.deepEqual(state.selectedWidgetIds, []);
});

test("R06 来源版本与头像同步: 头像变更不篡改 getResumeSourceKey", () => {
  const store = useResumeStore.getState();

  store.setUserInput({
    ...mockUserInput,
    avatarUrl: "",
  });
  const keyWithoutAvatar = getResumeSourceKey();

  store.setUserInput({
    ...mockUserInput,
    avatarUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  });
  const keyWithAvatar = getResumeSourceKey();

  assert.strictEqual(
    keyWithoutAvatar,
    keyWithAvatar,
    "getResumeSourceKey must not be affected by avatarUrl changes"
  );

  store.setUserInput({
    ...mockUserInput,
    targetRole: "首席架构师 (已更新)",
  });
  const keyWithNewText = getResumeSourceKey();
  assert.notStrictEqual(
    keyWithoutAvatar,
    keyWithNewText,
    "getResumeSourceKey must change when substantive text changes"
  );
});

test("R07 重填语义绑定与装饰组件过滤: 绝不将正文写入背景矩形或圆形", () => {
  const rectWidget: IWidget = {
    id: "rect-1",
    title: "矩形",
    componentName: "hj-rectangle",
    css: { left: 0, top: 0, width: 100, height: 100, zIndex: 1 },
    dataSource: {},
  };
  const textWidget: IWidget = {
    id: "text-1",
    title: "正文",
    componentName: "hj-text-1",
    css: { left: 0, top: 0, width: 100, height: 100, zIndex: 1 },
    dataSource: { text: "正文内容" },
  };

  assert.strictEqual(isDecorativeOrBackgroundWidget(rectWidget), true);
  assert.strictEqual(isDecorativeOrBackgroundWidget(textWidget), false);

  const schema = buildLegoSchemaFromResume(
    mockUserInput,
    mockAnalysisResult,
    "grid-cards"
  );

  for (const page of schema.componentsTree || []) {
    for (const w of page.children || []) {
      if (isDecorativeOrBackgroundWidget(w)) {
        const text = String(w.dataSource?.text || "");
        assert.ok(
          !text.includes("企业核心低代码平台架构重构"),
          `Decorative widget ${w.componentName} (${w.id}) should not contain work bullet content`
        );
      }
    }
  }

  const emptyResume: FinalResume = {
    ...mockResume,
    workExperience: [],
    projectExperience: [],
  };
  const refilledSchema = fillAiDataIntoExistingSchema(schema, mockUserInput, {
    ...mockAnalysisResult,
    finalResume: emptyResume,
  });
  const allTexts = refilledSchema.componentsTree
    .flatMap((p) => p.children)
    .map((w) => String(w.dataSource?.text || ""))
    .join(" ");

  assert.ok(!allTexts.includes("未来科技有限公司"), "Orphaned work company should be removed");
  assert.ok(!allTexts.includes("企业核心低代码平台"), "Orphaned work bullets should be removed");
});

test("R08 手工修改检测与画布数据提取: 正确检测画布手工编辑并提取结构化简历", () => {
  const schema = buildLegoSchemaFromResume(
    mockUserInput,
    mockAnalysisResult,
    "classic-minimal"
  );

  assert.strictEqual(hasManualCanvasEdits(schema, mockResume), false);

  const editedSchema: IHJSchema = JSON.parse(JSON.stringify(schema));
  const nameWidget = editedSchema.componentsTree[0].children.find(
    (w) => w.dataSource?.text === "张三"
  );
  assert.ok(nameWidget);
  nameWidget.dataSource.text = "张三 (已手工微调)";

  assert.strictEqual(hasManualCanvasEdits(editedSchema, mockResume), true);

  const extracted = extractResumeFromLegoSchema(editedSchema, mockResume);
  assert.strictEqual(extracted.personalInfo.name, "张三 (已手工微调)");
  assert.strictEqual(extracted.personalInfo.phone, mockResume.personalInfo.phone);
});

test("R09 撤销重做按用户操作提交: commitHistorySnapshot 仅在发生实际位移时入栈", () => {
  const store = useLegoDesignerStore.getState();
  const initSchema: IHJSchema = {
    id: "history-test-schema",
    version: "1.0.0",
    config: { title: "测试" },
    css: { width: 820, height: 1160, background: "#fff", opacity: 1 },
    componentsTree: [
      {
        id: "page-1",
        componentName: "page",
        commentType: "page",
        children: [
          {
            id: "w-move",
            title: "移动测试",
            componentName: "hj-text-1",
            css: { left: 100, top: 100, width: 200, height: 40, zIndex: 1 },
            dataSource: { text: "Move me" },
          },
        ],
      },
    ],
  };

  store.setSchema(initSchema, true);
  assert.strictEqual(useLegoDesignerStore.getState().redoStack.length > 0, false);

  const snapshotBefore = JSON.parse(JSON.stringify(useLegoDesignerStore.getState().schema));

  store.updateWidgetCss("w-move", { left: 150, top: 120 });
  store.commitHistorySnapshot(snapshotBefore);

  assert.strictEqual(useLegoDesignerStore.getState().undoStack.length > 0, true);
  store.undo();
  assert.strictEqual(useLegoDesignerStore.getState().schema.componentsTree[0].children[0].css.left, 100);
  assert.strictEqual(useLegoDesignerStore.getState().redoStack.length > 0, true);

  store.redo();
  assert.strictEqual(useLegoDesignerStore.getState().schema.componentsTree[0].children[0].css.left, 150);
});

test("R11 多页打印切片与动态比例换算: calculatePrintSlices 精确适配标准与自定义宽度", () => {
  // 1. 标准 820px 宽度 (标准 A4 比例换算高度为 1160px)
  const res820_1 = calculatePrintSlices(820, 1160);
  assert.strictEqual(res820_1.sliceHeight, 1160);
  assert.strictEqual(res820_1.pageSlices, 1);
  assert.deepEqual(res820_1.offsets, [0]);

  const res820_overflow = calculatePrintSlices(820, 1400);
  assert.strictEqual(res820_overflow.pageSlices, 2, "1400px canvas must generate 2 print pages");
  assert.deepEqual(res820_overflow.offsets, [0, 1160]);

  const res820_edge = calculatePrintSlices(820, 1161);
  assert.strictEqual(res820_edge.pageSlices, 2);

  const res820_two = calculatePrintSlices(820, 2320);
  assert.strictEqual(res820_two.pageSlices, 2);
  assert.deepEqual(res820_two.offsets, [0, 1160]);

  const res820_three = calculatePrintSlices(820, 2400);
  assert.strictEqual(res820_three.pageSlices, 3);
  assert.deepEqual(res820_three.offsets, [0, 1160, 2320]);

  // 2. 自定义宽度 1000px (A4 换算: 1000 * 297 / 210 = 1414px)
  const res1000 = calculatePrintSlices(1000, 1414);
  assert.strictEqual(res1000.sliceHeight, 1414);
  assert.strictEqual(res1000.pageSlices, 1);
  assert.deepEqual(res1000.offsets, [0]);

  const res1000_2 = calculatePrintSlices(1000, 2000);
  assert.strictEqual(res1000_2.sliceHeight, 1414);
  assert.strictEqual(res1000_2.pageSlices, 2);
  assert.deepEqual(res1000_2.offsets, [0, 1414]);

  // 3. 自定义宽度 700px (A4 换算: 700 * 297 / 210 = 990px)
  const res700 = calculatePrintSlices(700, 1500);
  assert.strictEqual(res700.sliceHeight, 990);
  assert.strictEqual(res700.pageSlices, 2);
  assert.deepEqual(res700.offsets, [0, 990]);
});

test("R12 可信打印资源与安全 HTML: 放行 Lucide SVG 元素, 严格封堵脚本与外链注入", () => {
  const printContent = `
    <html>
      <head>
        <title>打印简历</title>
        <style>
          @import url("https://malicious.com/tracker.css");
          .name { font-size: 20px; }
        </style>
      </head>
      <body>
        <script>alert("xss")</script>
        <div class="user-info">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <span style="color: #333; font-weight: bold;">zhangsan@example.com</span>
        </div>
      </body>
    </html>
  `;

  const sanitized = sanitizePrintHTML(printContent);

  assert.match(sanitized, /<svg/i, "<svg> tag must be preserved for Lucide icons");
  assert.match(sanitized, /viewBox="0 0 24 24"/i, "viewBox must be preserved");
  assert.match(sanitized, /<path/i, "<path> tag must be preserved");
  assert.match(sanitized, /<polyline/i, "<polyline> tag must be preserved");

  assert.doesNotMatch(sanitized, /<script/i, "<script> must be stripped");
  assert.doesNotMatch(sanitized, /@import/i, "@import must be stripped");
  assert.doesNotMatch(sanitized, /malicious\.com/i, "external domain must be stripped");
});

test("R17 外部资源隐私: 默认头像全部使用离线内联 SVG, 无任何外部 Unsplash 外链", () => {
  assert.ok(DEFAULT_AVATAR_PLACEHOLDER.startsWith("data:image/svg+xml;utf8,<svg"));

  const avatarTab = WIDGET_CONFIG_LIST.find((tab) => tab.category === "avatar");
  assert.ok(avatarTab, "Avatar widget tab must exist");

  assert.ok(
    !String(avatarTab.dataSource?.avatarSrc || "").includes("unsplash.com"),
    "Avatar tab must not use Unsplash"
  );

  for (const widget of avatarTab.list) {
    const src = String(widget.dataSource?.avatarSrc || "");
    assert.ok(
      !src.includes("unsplash.com"),
      `Widget ${widget.componentName} must not use external Unsplash URL`
    );
    assert.ok(
      src.startsWith("data:image/svg+xml"),
      `Widget ${widget.componentName} should use inline SVG avatar placeholder`
    );
  }
});

test("P1-2 / P1-3 严格数据校验与假阳性防护: 拒收空对象、页数越界与无组件结构", () => {
  // 1. Lego JSON 导入拒收空对象与无结构数据
  const emptyRes = validateAndNormalizeLegoJson({});
  assert.strictEqual(emptyRes.success, false);
  assert.match(emptyRes.error || "", /为空对象/);

  const junkRes = validateAndNormalizeLegoJson({ foo: "bar" });
  assert.strictEqual(junkRes.success, false);
  assert.match(junkRes.error || "", /不包含有效/);

  // 2. 超过 20 页明确报错而非静默截断
  const excessPages = Array.from({ length: 21 }, (_, i) => ({
    id: `page-${i + 1}`,
    componentName: "page",
    children: [
      {
        id: `w-${i}`,
        componentName: "hj-text-1",
        css: { left: 10, top: 10, width: 100, height: 30, zIndex: 1 },
        dataSource: { text: `Item ${i}` },
      },
    ],
  }));
  const excessRes = validateAndNormalizeLegoJson({
    id: "excess-doc",
    componentsTree: excessPages,
  });
  assert.strictEqual(excessRes.success, false);
  assert.match(excessRes.error || "", /超出最大允许页数限制/);

  // 3. 单页超过 500 个组件明确报错
  const excessWidgets = Array.from({ length: 501 }, (_, i) => ({
    id: `w-huge-${i}`,
    componentName: "hj-text-1",
    css: { left: 10, top: i * 5, width: 100, height: 30, zIndex: 1 },
    dataSource: { text: `Item ${i}` },
  }));
  const pageExcessRes = validateAndNormalizeLegoJson({
    id: "huge-page-doc",
    componentsTree: [{ id: "page-1", componentName: "page", children: excessWidgets }],
  });
  assert.strictEqual(pageExcessRes.success, false);
  assert.match(pageExcessRes.error || "", /超出限制/);

  // 4. 0 个组件的空文档明确报错
  const zeroWidgetRes = validateAndNormalizeLegoJson({
    id: "zero-doc",
    componentsTree: [{ id: "page-1", componentName: "page", children: [] }],
  });
  assert.strictEqual(zeroWidgetRes.success, false);
  assert.match(zeroWidgetRes.error || "", /不包含任何有效组件/);
});

test("P1-2 结构化简历 JSON 严格校验与归一化: 拦截非法空对象并防崩溃", () => {
  // 1. 拒收空对象
  const emptyRes = validateAndNormalizeStructuredResume({});
  assert.strictEqual(emptyRes.success, false);
  assert.match(emptyRes.error || "", /为空对象/);

  // 2. 拒收缺少 personalInfo
  const noInfoRes = validateAndNormalizeStructuredResume({ jobIntent: "产品经理" });
  assert.strictEqual(noInfoRes.success, false);
  assert.match(noInfoRes.error || "", /缺少个人基本信息/);

  // 3. 拒收缺少姓名
  const noNameRes = validateAndNormalizeStructuredResume({
    personalInfo: { phone: "13800000000" },
  });
  assert.strictEqual(noNameRes.success, false);
  assert.match(noNameRes.error || "", /缺少有效的姓名/);

  // 4. 拒收非数组经历
  const badExpRes = validateAndNormalizeStructuredResume({
    personalInfo: { name: "李四" },
    workExperience: "三年大厂经验" as unknown as [],
  });
  assert.strictEqual(badExpRes.success, false);
  assert.match(badExpRes.error || "", /必须为数组/);

  // 5. 正确校验并解包嵌套 finalResume
  const validNested = {
    finalResume: {
      personalInfo: { name: "王五", phone: "13900000000" },
      jobIntent: "架构师",
      workExperience: [
        {
          company: "创新科技",
          role: "技术总监",
          period: "2020-至今",
          bullets: ["领导技术重构"],
        },
      ],
    },
  };
  const validRes = validateAndNormalizeStructuredResume(validNested);
  assert.strictEqual(validRes.success, true);
  assert.strictEqual(validRes.data?.personalInfo.name, "王五");
  assert.strictEqual(validRes.data?.jobIntent, "架构师");
  assert.strictEqual(validRes.data?.workExperience.length, 1);
  assert.ok(Array.isArray(validRes.data?.projectExperience));
  assert.ok(Array.isArray(validRes.data?.coreSkills));
});

test("P1 备份正文超长防护: 超过最大字符限制明确拒绝且不断字", () => {
  // 1. 10001 字符的正文组件应当被明确拒绝，不得静默截断
  const oversizedText = "x".repeat(10001);
  const oversizedSchema = {
    id: "oversized-schema",
    componentsTree: [
      {
        id: "page-1",
        componentName: "page",
        children: [
          {
            id: "widget-text-huge",
            componentName: "hj-text-1",
            css: { left: 50, top: 50, width: 700, height: 100, zIndex: 1 },
            dataSource: { text: oversizedText },
          },
        ],
      },
    ],
  };
  const oversizedRes = validateAndNormalizeLegoJson(oversizedSchema);
  assert.strictEqual(oversizedRes.success, false);
  assert.match(oversizedRes.error || "", /内容长度超出限制.*10000/);

  // 2. 10000 字符的正文组件应被允许且原样保留（无丢字）
  const exactLimitText = "y".repeat(10000);
  const exactSchema = {
    id: "exact-schema",
    componentsTree: [
      {
        id: "page-1",
        componentName: "page",
        children: [
          {
            id: "widget-text-limit",
            componentName: "hj-text-1",
            css: { left: 50, top: 50, width: 700, height: 100, zIndex: 1 },
            dataSource: { text: exactLimitText },
          },
        ],
      },
    ],
  };
  const exactRes = validateAndNormalizeLegoJson(exactSchema);
  assert.strictEqual(exactRes.success, true);
  const recoveredText = exactRes.data?.componentsTree[0]?.children[0]?.dataSource?.text;
  assert.strictEqual(recoveredText?.length, 10000);
  assert.strictEqual(recoveredText, exactLimitText);

  // 3. hj-li 列表项单项超出 5000 字符明确拒绝
  const oversizedLiSchema = {
    id: "oversized-li",
    componentsTree: [
      {
        id: "page-1",
        componentName: "page",
        children: [
          {
            id: "widget-li-huge",
            componentName: "hj-li",
            css: { left: 50, top: 50, width: 700, height: 100, zIndex: 1 },
            dataSource: {
              list: ["a".repeat(5001)],
            },
          },
        ],
      },
    ],
  };
  const oversizedLiRes = validateAndNormalizeLegoJson(oversizedLiSchema);
  assert.strictEqual(oversizedLiRes.success, false);
  assert.match(oversizedLiRes.error || "", /条目内容长度超出限制.*5000/);
});

test("P2 旧模板兼容与外层包装解包: 完整支持 template_json / lego_json / HJSchemaJsonStore / data 嵌套包裹", () => {
  const innerSchema: IHJSchema = {
    id: "wrapped-schema-1",
    version: "1.0.0",
    config: { title: "包装模板测试" },
    css: { width: 820, height: 1160, background: "#fff", opacity: 1 },
    componentsTree: [
      {
        id: "page-1",
        componentName: "page",
        commentType: "page",
        children: [
          {
            id: "w-text-wrapped",
            title: "包裹文本",
            componentName: "hj-text-1",
            css: { left: 40, top: 40, width: 300, height: 40, zIndex: 1 },
            dataSource: { text: "包裹测试文本" },
          },
        ],
      },
    ],
  };

  // 1. template_json 包裹测试
  const wrapped1 = { template_json: innerSchema };
  const res1 = validateAndNormalizeLegoJson(wrapped1);
  assert.strictEqual(res1.success, true, res1.error);
  assert.strictEqual(res1.data?.id, "wrapped-schema-1");
  assert.strictEqual(res1.data?.componentsTree[0]?.children[0]?.id, "w-text-wrapped");

  // 2. lego_json 包裹测试
  const wrapped2 = { lego_json: innerSchema };
  const res2 = validateAndNormalizeLegoJson(wrapped2);
  assert.strictEqual(res2.success, true, res2.error);
  assert.strictEqual(res2.data?.id, "wrapped-schema-1");

  // 3. HJSchemaJsonStore 包裹测试
  const wrapped3 = { HJSchemaJsonStore: innerSchema };
  const res3 = validateAndNormalizeLegoJson(wrapped3);
  assert.strictEqual(res3.success, true, res3.error);
  assert.strictEqual(res3.data?.id, "wrapped-schema-1");

  // 4. data 包裹测试
  const wrapped4 = { data: innerSchema };
  const res4 = validateAndNormalizeLegoJson(wrapped4);
  assert.strictEqual(res4.success, true, res4.error);
  assert.strictEqual(res4.data?.id, "wrapped-schema-1");
});

test("P2 限流身份认证防伪造: 随意编造口令无法逃逸 IP/untrusted 分桶，仅合规口令获得 credential 身份", () => {
  const originalDeployment = process.env.SERVER_LLM_DEPLOYMENT;
  const originalTokens = process.env.SERVER_LLM_ACCESS_TOKENS;
  const originalTrust = process.env.TRUST_PROXY_HEADERS;

  try {
    process.env.TRUST_PROXY_HEADERS = "false";

    // 1. 在未配置有效 server tokens 时，任何携带伪造口令的请求均无法逃逸
    process.env.SERVER_LLM_DEPLOYMENT = undefined;
    process.env.SERVER_LLM_ACCESS_TOKENS = undefined;

    const fakeToken1 = "a".repeat(40);
    const fakeToken2 = "b".repeat(40);

    const reqFake1 = new Request("http://localhost/api/analyze", {
      headers: { "x-server-access-token": fakeToken1 },
    });
    const reqFake2 = new Request("http://localhost/api/analyze", {
      headers: { "x-server-access-token": fakeToken2 },
    });

    const ipFake1 = getClientIp(reqFake1);
    const ipFake2 = getClientIp(reqFake2);

    assert.ok(!ipFake1.startsWith("credential:"), "Unconfigured fake token 1 must not get credential bucket");
    assert.ok(!ipFake2.startsWith("credential:"), "Unconfigured fake token 2 must not get credential bucket");
    assert.strictEqual(ipFake1, "untrusted-client");
    assert.strictEqual(ipFake2, "untrusted-client");
    // 两个伪造口令落入相同不受信分桶，限流绕过被彻底堵塞
    assert.strictEqual(ipFake1, ipFake2);

    // 2. 配置合规服务口令后，仅真实口令可获得 credential 分桶，伪造口令依然落入 untrusted-client
    const legitimateToken = "valid_admin_secret_token_1234567890abcdef12345678";
    process.env.SERVER_LLM_DEPLOYMENT = "single-instance";
    process.env.SERVER_LLM_ACCESS_TOKENS = JSON.stringify([legitimateToken]);

    const reqValid = new Request("http://localhost/api/analyze", {
      headers: { "x-server-access-token": legitimateToken },
    });
    const ipValid = getClientIp(reqValid);
    assert.ok(ipValid.startsWith("credential:"), "Legitimate token must receive credential bucket");

    const reqTampered = new Request("http://localhost/api/analyze", {
      headers: { "x-server-access-token": "tampered_wrong_secret_1234567890abcdef12345678" },
    });
    const ipTampered = getClientIp(reqTampered);
    assert.ok(!ipTampered.startsWith("credential:"), "Tampered token must not receive credential bucket");
    assert.strictEqual(ipTampered, "untrusted-client");
  } finally {
    process.env.SERVER_LLM_DEPLOYMENT = originalDeployment;
    process.env.SERVER_LLM_ACCESS_TOKENS = originalTokens;
    process.env.TRUST_PROXY_HEADERS = originalTrust;
  }
});

test("P2 画布分页、打印切片与顺流防截断三位一体动态 A4 几何一致性", () => {
  // 1. 标准 820px 宽度
  const stdH = calculateA4PageHeight(820);
  assert.strictEqual(stdH, 1160, "Standard 820px canvas must have 1160px A4 page height");

  const stdSlices = calculatePrintSlices(820, 2320);
  assert.strictEqual(stdSlices.sliceHeight, 1160);
  assert.strictEqual(stdSlices.pageSlices, 2);
  assert.deepStrictEqual(stdSlices.offsets, [0, 1160]);

  // 2. 自定义 1000px 宽度
  const customW = 1000;
  const customPageH = calculateA4PageHeight(customW);
  assert.strictEqual(customPageH, 1414, "1000px canvas A4 page height must be 1414px (Math.round(1000 * 297 / 210))");

  const customSlices = calculatePrintSlices(customW, 2000);
  assert.strictEqual(customSlices.sliceHeight, 1414, "Print sliceHeight must match calculateA4PageHeight");
  assert.strictEqual(customSlices.pageSlices, 2);
  assert.deepStrictEqual(customSlices.offsets, [0, 1414]);

  // 3. 验证 reflowCanvasWidgetsForPagination 使用动态 pageHeight (1414px)
  // 构造 1000px 宽画布，放置一个跨越 1414px 分割线的组件 (top: 1360, height: 80, 1360 + 80 = 1440 > 1414 - 35 = 1379)
  const customSchema: IHJSchema = {
    id: "custom-width-schema",
    version: "1.0.0",
    config: { title: "宽画布" },
    css: { width: 1000, height: 1414, background: "#fff", opacity: 1 },
    componentsTree: [
      {
        id: "page-1",
        componentName: "page",
        commentType: "page",
        children: [
          {
            id: "header-1",
            title: "Header",
            componentName: "hj-text-1",
            css: { left: 50, top: 40, width: 400, height: 30, zIndex: 1 },
            dataSource: { text: "顶部标题" },
          },
          {
            id: "work-card-1",
            title: "工作经历",
            componentName: "hj-text-1",
            css: { left: 50, top: 1360, width: 600, height: 80, zIndex: 1 },
            dataSource: { text: "经历描述穿透 1414 切割线" },
          },
        ],
      },
    ],
  };

  const reflowed = reflowCanvasWidgetsForPagination(customSchema);
  const reflowedWorkCard = reflowed.componentsTree[0].children.find((w) => w.id === "work-card-1");
  assert.ok(reflowedWorkCard);

  // 验证组件被推进至第二页顶部安全区：1414 + 35 = 1449
  assert.strictEqual(
    Number(reflowedWorkCard.css.top),
    1414 + 35,
    `Work card must be pushed to next page safe top (1449) instead of hardcoded 1160 + 35`
  );

  // 验证总高度按 1414 规整为 2 页 = 2828
  assert.strictEqual(
    Number(reflowed.css.height),
    2828,
    `Total canvas height must be 2 * 1414 = 2828 instead of multiple of 1160`
  );
});

test("P2 明确打印样式与清洗链路: 彻底消除外部 link 依赖并保证内嵌打印样式完整保留", () => {
  // 1. 模拟画页面元素
  const mockPageEl = {
    getAttribute: (attr: string) => (attr === "data-page-padding" ? '{"top":30,"right":30,"bottom":30,"left":30}' : null),
    cloneNode: () => ({
      querySelectorAll: () => [],
      children: [
        {
          style: { position: "" },
        },
      ],
      innerHTML: '<div id="widget-mock-1" class="flex items-center w-full font-bold">张三 · 资深前端架构师</div>',
    }),
    style: { width: "820px", height: "1160px", backgroundColor: "#ffffff" },
    offsetWidth: 820,
    offsetHeight: 1160,
  } as unknown as HTMLElement;

  const rawPrintHtml = generateLegoPrintHtml([mockPageEl]);

  // 2. 验证 rawPrintHtml 绝不包含任何外部 <link rel="stylesheet">
  assert.ok(!rawPrintHtml.includes("<link"), "generateLegoPrintHtml must not emit any external <link> stylesheet");
  assert.ok(!rawPrintHtml.includes('rel="stylesheet"'), "generateLegoPrintHtml must not reference rel=stylesheet");

  // 3. 验证 rawPrintHtml 包含自包含的明确打印样式
  assert.ok(rawPrintHtml.includes("size: 210mm 297mm"), "Must include @page A4 size");
  assert.ok(rawPrintHtml.includes(".w-full { width: 100% !important; }"), "Must include .w-full Tailwind utility");
  assert.ok(rawPrintHtml.includes(".flex { display: flex !important; }"), "Must include .flex utility");
  assert.ok(rawPrintHtml.includes(".items-center { align-items: center !important; }"), "Must include .items-center");
  assert.ok(rawPrintHtml.includes("ul.list-disc"), "Must include list disc styling");
  assert.ok(rawPrintHtml.includes(".lego-canvas-printed-page > *"), "Must include widget absolute positioning rule");

  // 4. 经由 sanitizePrintHTML 清洗后，验证关键打印样式无一丢失
  const cleanedHtml = sanitizePrintHTML(rawPrintHtml);
  assert.ok(cleanedHtml.includes("<style>"), "Cleaned HTML must contain <style> block");
  assert.ok(cleanedHtml.includes("size: 210mm 297mm"), "Cleaned HTML must retain @page A4 rule");
  assert.ok(cleanedHtml.includes(".w-full"), "Cleaned HTML must retain .w-full");
  assert.ok(cleanedHtml.includes(".flex"), "Cleaned HTML must retain .flex");
  assert.ok(cleanedHtml.includes(".items-center"), "Cleaned HTML must retain .items-center");
  assert.ok(cleanedHtml.includes("widget-mock-1"), "Cleaned HTML must retain canvas widgets");
  assert.ok(!cleanedHtml.includes("<link"), "Cleaned HTML must definitely have no <link> tags");

  // 5. 验证如果有人恶意或错误注入外部 <link>，清洗器能将其安全剔除
  const poisonedHtml = rawPrintHtml.replace("<head>", '<head><link rel="stylesheet" href="http://evil.com/leak.css">');
  const sanitizedPoison = sanitizePrintHTML(poisonedHtml);
  assert.ok(!sanitizedPoison.includes("evil.com"), "Sanitizer must strip external stylesheet links");
  assert.ok(!sanitizedPoison.includes("<link"), "Sanitizer must strip link tags");
  assert.ok(sanitizedPoison.includes(".w-full"), "Legitimate explicit print styles must remain completely intact");
});

test("P1 侧边栏布局无重叠与背景框防污染校验", () => {
  const schema = buildLegoSchemaFromResume(
    mockUserInput,
    mockAnalysisResult,
    "modern-sidebar"
  );

  const page = schema.componentsTree[0];
  assert.ok(page && page.children, "Schema must have page with children");

  const contactBg = page.children.find((w) => w.id === "widget-contact-bg-sidebar");
  const contactText = page.children.find((w) => w.id === "widget-contact-sidebar-text");
  const summaryBg = page.children.find((w) => w.id === "widget-summary-sidebar-bg");
  const summaryText = page.children.find((w) => w.id === "widget-summary-sidebar-text");

  assert.ok(contactBg && contactText && summaryBg && summaryText, "All sidebar components must exist");

  // 1. 验证背景框不包含任何污染的正文文字（R07 强化防重叠）
  assert.strictEqual(
    contactBg.dataSource?.text,
    undefined,
    "Contact background rectangle must NOT have dataSource.text"
  );
  assert.strictEqual(
    summaryBg.dataSource?.text,
    undefined,
    "Summary background rectangle must NOT have dataSource.text"
  );

  // 2. 验证几何坐标绝对无重叠：基本信息框底部必须严格小于或等于自我评价框顶部
  const contactBgTop = Number(contactBg.css.top) || 0;
  const contactBgHeight = Number(contactBg.css.height) || 0;
  const summaryBgTop = Number(summaryBg.css.top) || 0;
  const summaryBgHeight = Number(summaryBg.css.height) || 0;

  assert.ok(
    contactBgTop + contactBgHeight <= summaryBgTop,
    `Contact box bottom (${contactBgTop + contactBgHeight}) must not overlap summary box top (${summaryBgTop})`
  );

  // 3. 验证文本组件正确嵌套在对应背景框内
  const contactTextTop = Number(contactText.css.top) || 0;
  const contactTextHeight = Number(contactText.css.height) || 0;
  assert.ok(contactTextTop >= contactBgTop, "Contact text must start inside contact background");
  assert.ok(
    contactTextTop + contactTextHeight <= contactBgTop + contactBgHeight + 2,
    "Contact text must fit inside contact background frame"
  );

  const summaryTextTop = Number(summaryText.css.top) || 0;
  const summaryTextHeight = Number(summaryText.css.height) || 0;
  assert.ok(summaryTextTop >= summaryBgTop, "Summary text must start inside summary background");
  assert.ok(
    summaryTextTop + summaryTextHeight <= summaryBgTop + summaryBgHeight + 2,
    "Summary text must fit inside summary background frame"
  );

  // 4. 验证 fillAiDataIntoExistingSchema 重填后同样保持无重叠与无背景框污染
  const refilled = fillAiDataIntoExistingSchema(schema, mockUserInput, mockAnalysisResult);
  const refilledPage = refilled.componentsTree[0];
  const refilledContactBg = refilledPage.children.find((w) => w.id === "widget-contact-bg-sidebar");
  const refilledSummaryBg = refilledPage.children.find((w) => w.id === "widget-summary-sidebar-bg");

  assert.strictEqual(refilledContactBg?.dataSource?.text, undefined, "Refilled contact bg must stay clean");
  assert.strictEqual(refilledSummaryBg?.dataSource?.text, undefined, "Refilled summary bg must stay clean");

  const rContactBot = (Number(refilledContactBg?.css.top) || 0) + (Number(refilledContactBg?.css.height) || 0);
  const rSummaryTop = Number(refilledSummaryBg?.css.top) || 0;
  assert.ok(rContactBot <= rSummaryTop, "Refilled sidebar contact box must not overlap summary box");
});

test("P1 统一动态 A4 高度推导校验", () => {
  assert.strictEqual(calculateA4PageHeight(820), 1160);
  assert.strictEqual(calculateA4PageHeight(794), 1123);
  assert.strictEqual(calculateA4PageHeight(1000), 1414);

  // 验证所有预设模板构建结果高度均为 calculateA4PageHeight(820) 的整数倍
  const templates = [
    "modern-sidebar",
    "corporate-banner",
    "classic-minimal",
    "timeline-tech",
    "grid-cards",
    "minimal",
    "github-tech"
  ] as const;

  for (const tpl of templates) {
    const s = buildLegoSchemaFromResume(mockUserInput, mockAnalysisResult, tpl);
    const canvasHeight = Number(s.css.height) || 0;
    const a4Height = calculateA4PageHeight(820);
    assert.ok(
      canvasHeight >= a4Height && canvasHeight % a4Height === 0,
      `Template ${tpl} canvas height (${canvasHeight}) must be exact multiple of calculateA4PageHeight(820) (${a4Height})`
    );
  }
});

