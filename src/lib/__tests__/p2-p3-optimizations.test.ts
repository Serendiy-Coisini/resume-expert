import assert from "node:assert/strict";
import { test, mock } from "node:test";
import {
  cleanStringArraySchema,
  validOptimizedItemsSchema,
  workExperienceSchema,
  projectExperienceSchema,
  optimizedItemsResponseSchema,
  jdAnalysisResponseSchema,
} from "@/lib/ai/schemas";
import { ensureValidWidget } from "@/lib/schema-normalizer";
import { serializeTemplates, loadTemplatesFromStorage, SavedTemplate, DEFAULT_LEGO_SCHEMA } from "@/store/lego-designer-store";
import { sanitizePrintHTML } from "@/lib/safe-html";
import { saveLegoDraft, loadLegoDraft, LEGO_DRAFT_KEY, LEGO_DRAFT_TIME_KEY } from "@/lib/lego-draft";
import { useResumeStore, isCompleteAnalysisResult, getResumeSourceKey } from "@/store/resume-store";
import { safeBrowserStorage, subscribeStorageVolatile, isStorageVolatile } from "@/lib/safe-storage";
import { buildLegoSchemaFromResume } from "@/lib/lego-adapter";
import * as client from "@/lib/ai/client";
import * as safeFetch from "@/lib/ai/safe-fetch";
import { getAIConfig } from "@/lib/ai/config";

test("P2-02/P2-08 Schema validation rejects invalid/empty items and null entries", () => {
  // 1. cleanStringArraySchema trims and removes null, empty and whitespace strings
  const cleaned = cleanStringArraySchema.parse(["  hello  ", null, undefined, "   ", "world  "]);
  assert.deepEqual(cleaned, ["hello", "world"], "cleanStringArraySchema must trim and strip empty/null entries");

  // 2. validOptimizedItemsSchema strips empty objects {} or items with no content
  const filteredItems = validOptimizedItemsSchema.parse([
    {},
    { before: "   ", after: "" },
    { before: "老项目开发", after: "主导微服务化重构，提升 40% 吞吐量" },
  ]);
  assert.equal(filteredItems.length, 1, "validOptimizedItemsSchema must filter out empty objects");
  assert.equal(filteredItems[0].before, "老项目开发");

  // 3. workExperienceSchema cleans bullets and handles null items in bullets
  const workWithNullBullets = workExperienceSchema.parse({
    company: "Corp",
    role: "Dev",
    period: "2020",
    bullets: [null, "   ", "优化数据库索引提高响应速度"],
  });
  assert.deepEqual(workWithNullBullets.bullets, ["优化数据库索引提高响应速度"]);
  const projWithNullBullets = projectExperienceSchema.parse({
    name: "AI Platform",
    role: "Dev",
    period: "2021",
    bullets: [null, "   ", "构建高并发模型调用网关"],
  });
  assert.deepEqual(projWithNullBullets.bullets, ["构建高并发模型调用网关"]);

  // 4. optimizedItemsResponseSchema rejects when all items are empty {}
  const invalidOptimized = {
    optimizedItems: [{}],
  };
  const optResult = optimizedItemsResponseSchema.safeParse(invalidOptimized);
  assert.equal(optResult.success, false, "optimizedItems with only empty object {} must fail validation");

  // 5. optimizedItemsResponseSchema passes with valid items
  const validOptimized = {
    optimizedItems: [{ before: "负责开发", after: "主导微服务架构重构，提升吞吐量 40%" }],
  };
  const validOptResult = optimizedItemsResponseSchema.safeParse(validOptimized);
  assert.equal(validOptResult.success, true, "valid optimizedItems must pass validation");

  // 6. jdAnalysisResponseSchema rejects when all arrays contain only null/whitespace
  const invalidJD = {
    jdAnalysis: {
      responsibilities: [null],
      hardRequirements: ["   "],
      implicitRequirements: [],
      keywords: [],
      idealCandidate: "   ",
      coreCompetencies: [],
    },
  };
  const jdResult = jdAnalysisResponseSchema.safeParse(invalidJD);
  assert.equal(jdResult.success, false, "jdAnalysis with only null/empty items must fail validation");

  // 7. jdAnalysisResponseSchema passes with valid data
  const validJD = {
    jdAnalysis: {
      responsibilities: ["负责核心系统架构设计"],
      hardRequirements: ["本科及以上学历"],
      implicitRequirements: [],
      keywords: ["React", "TypeScript"],
      idealCandidate: "有大型系统架构经验",
      coreCompetencies: [],
    },
  };
  const validJdResult = jdAnalysisResponseSchema.safeParse(validJD);
  assert.equal(validJdResult.success, true, "valid jdAnalysis must pass validation");
});

test("P1/P2-08 Geometry robustness in ensureValidWidget retains thin lines and clamps strings/NaN/Infinity", () => {
  // 1. Thin line widgets (hj-rectangle, hj-circle, hj-bg) preserve 1~2px width/height
  const dividerLine = {
    id: "divider-1",
    componentName: "hj-rectangle",
    title: "分割线",
    css: {
      left: 20,
      top: 100,
      width: 780,
      height: 2,
    },
    dataSource: {},
  };
  const safeDivider = ensureValidWidget(dividerLine);
  assert.equal(safeDivider.css.height, 2, "hj-rectangle must preserve 2px height for divider lines");
  assert.equal(safeDivider.css.width, 780, "hj-rectangle width must be preserved");

  const thinLine = {
    id: "divider-2",
    componentName: "hj-rectangle",
    title: "1px分割线",
    css: {
      left: 20,
      top: 100,
      width: 1,
      height: 1,
    },
    dataSource: {},
  };
  const safeThinLine = ensureValidWidget(thinLine);
  assert.equal(safeThinLine.css.width, 1, "hj-rectangle must preserve 1px width");
  assert.equal(safeThinLine.css.height, 1, "hj-rectangle must preserve 1px height");

  // 2. Negative strings and non-finite strings are normalized safely
  const malformedStringWidget = {
    id: "test-widget-strings",
    componentName: "hj-rectangle",
    title: "字符串测试组件",
    css: {
      width: "-50",
      height: "1e309",
      left: "0",
      top: "100",
    },
    dataSource: {},
  };
  const safeStrings = ensureValidWidget(malformedStringWidget);
  assert.equal(safeStrings.css.width, 1, "Negative string width '-50' must be clamped to minWidth 1");
  assert.ok(Number.isFinite(safeStrings.css.height), "Overflown string '1e309' must fallback to finite height");
  assert.equal(safeStrings.css.left, 0);
  assert.equal(safeStrings.css.top, 100);

  // 3. Text widget malformed geometry clamps to minimum 10
  const malformedWidget = {
    id: "test-widget",
    componentName: "hj-text-1",
    title: "测试组件",
    css: {
      left: NaN,
      top: Infinity,
      width: -50,
      height: 0,
      fontSize: 1000,
      lineHeight: NaN,
      rotate: Infinity,
      zIndex: NaN,
      padding: {
        top: NaN,
        right: Infinity,
        bottom: null,
        left: "abc",
      },
    },
    dataSource: { text: "Hello" },
  };

  const safeWidget = ensureValidWidget(malformedWidget);

  // Assert all numeric properties are strictly finite
  assert.ok(Number.isFinite(safeWidget.css.left), "left must be finite");
  assert.ok(Number.isFinite(safeWidget.css.top), "top must be finite");
  assert.ok(Number.isFinite(safeWidget.css.width), "width must be finite");
  assert.ok(Number.isFinite(safeWidget.css.height), "height must be finite");
  assert.ok(Number.isFinite(safeWidget.css.fontSize), "fontSize must be finite");
  assert.ok(Number.isFinite(safeWidget.css.lineHeight), "lineHeight must be finite");
  assert.ok(Number.isFinite(safeWidget.css.rotate), "rotate must be finite");
  assert.ok(Number.isFinite(safeWidget.css.zIndex), "zIndex must be finite");

  // Assert clamped boundaries for text
  assert.ok((safeWidget.css.width as number) >= 10, "text width must be clamped >= 10");
  assert.ok((safeWidget.css.height as number) >= 10, "text height must be clamped >= 10");
  assert.ok((safeWidget.css.fontSize as number) <= 72, "fontSize must be clamped <= 72");
  assert.ok((safeWidget.css.fontSize as number) >= 8, "fontSize must be clamped >= 8");
  assert.ok((safeWidget.css.lineHeight as number) <= 4, "lineHeight must be clamped <= 4");
  assert.ok((safeWidget.css.lineHeight as number) >= 0.8, "lineHeight must be clamped >= 0.8");
});

test("P2-06 Template serialization deduplicates alias fields and restores them on load", () => {
  const dummyTemplate: SavedTemplate = {
    id: "tpl-custom-1",
    _id: "tpl-custom-1",
    name: "测试模板",
    title: "测试模板",
    category: "个人自定义",
    description: "自定义模板描述",
    cover: "data:image/png;base64,abc123456",
    previewUrl: "data:image/png;base64,abc123456",
    createTime: "2026-03-21",
    schema: DEFAULT_LEGO_SCHEMA,
    template_json: DEFAULT_LEGO_SCHEMA,
    isCustom: true,
  };

  // 1. Test serialization deduplication
  const serialized = serializeTemplates([dummyTemplate]);
  const parsedRaw = JSON.parse(serialized);
  assert.ok(Array.isArray(parsedRaw));
  const rawItem = parsedRaw[0];

  // Serialized JSON must NOT contain duplicated alias keys:
  assert.equal(rawItem.previewUrl, undefined, "previewUrl alias should not be in serialized JSON");
  assert.equal(rawItem.template_json, undefined, "template_json alias should not be in serialized JSON");
  assert.equal(rawItem._id, undefined, "_id alias should not be in serialized JSON");
  assert.equal(rawItem.title, undefined, "title alias should not be in serialized JSON");
  assert.equal(rawItem.name, "测试模板");
  assert.equal(rawItem.cover, "data:image/png;base64,abc123456");

  // 2. Test loading with backward-compatible restoration
  const storageMock = new Map<string, string>();
  storageMock.set("LEGO_MY_TEMPLATES", serialized);

  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  try {
    // @ts-expect-error Mocking window and localStorage for test
    globalThis.window = {};
    // @ts-expect-error Mocking localStorage
    globalThis.localStorage = {
      getItem: (key: string) => storageMock.get(key) ?? null,
      setItem: (key: string, val: string) => storageMock.set(key, val),
    };

    const loaded = loadTemplatesFromStorage();
    assert.equal(loaded.length, 1);
    const loadedItem = loaded[0];

    // Restored aliases must be present
    assert.equal(loadedItem.title, "测试模板", "title alias must be restored");
    assert.equal(loadedItem._id, "tpl-custom-1", "_id alias must be restored");
    assert.equal(loadedItem.previewUrl, "data:image/png;base64,abc123456", "previewUrl alias must be restored");
    assert.deepEqual(loadedItem.template_json, DEFAULT_LEGO_SCHEMA, "template_json alias must be restored");
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("P2-10 CSS @import, escapes, image-set, external urls and scripts are sanitized in sanitizePrintHTML", () => {
  const dirtyHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Resume</title>
        <style>
          @import url("https://malicious.com/evil.css");
          @import/**/url("https://malicious.com/obfuscated.css");
          @\\69mport "https://malicious.com/escaped.css";
          @\\000069mport 'https://malicious.com/hex6.css';
          @import 'https://malicious.com/evil2.css';
          body { color: red; font-family: sans-serif; background-image: \\75rl("https://evil.com/leak.png"); }
          .escaped { background-image: \\000075\\000072\\00006c('http://evil.com/leak2.png'); }
          .imgset { background-image: image-set("https://evil.com/1x.png" 1x, "https://evil.com/2x.png" 2x); }
          .nestedimgset { background-image: image-set(url("https://evil.com/nested1x.png") 1x, "/tracking" 2x); }
          .webkitimgset { background-image: -webkit-image-set("https://evil.com/1x.png" 1x); }
          .logo { background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==); }
        </style>
      </head>
      <body>
        <script>window.location.href = "https://phishing.com";</script>
        <div class="header" style="background-image: \\75rl('https://tracker.com/pixel.gif'); color: blue;">
          <h1>张三</h1>
          <p>高级前端工程师</p>
        </div>
      </body>
    </html>
  `;

  const cleanHTML = sanitizePrintHTML(dirtyHTML);

  // Assert @import is stripped (including obfuscated and escaped)
  assert.doesNotMatch(cleanHTML, /@import/i, "@import must be completely stripped");
  assert.doesNotMatch(cleanHTML, /escaped\.css/i, "escaped import must be stripped");
  assert.doesNotMatch(cleanHTML, /hex6\.css/i, "hex6 escaped import must be stripped");

  // Assert script tag is stripped
  assert.doesNotMatch(cleanHTML, /<script/i, "<script> tag must be stripped");
  assert.doesNotMatch(cleanHTML, /phishing\.com/i, "malicious script content must be stripped");

  // Assert external tracking urls are stripped (including escapes and image-set)
  assert.doesNotMatch(cleanHTML, /evil\.com/i, "external url in style block must be stripped");
  assert.doesNotMatch(cleanHTML, /tracker\.com/i, "external url in inline style must be stripped");
  assert.doesNotMatch(cleanHTML, /1x\.png/i, "image-set external url must be stripped");
  assert.doesNotMatch(cleanHTML, /2x\.png/i, "image-set external url must be stripped");
  assert.doesNotMatch(cleanHTML, /nested1x\.png/i, "nested image-set first candidate must be stripped");
  assert.doesNotMatch(cleanHTML, /\/tracking/i, "nested image-set second candidate must be stripped");

  // Assert data:image/ base64 URI is preserved
  assert.match(cleanHTML, /data:image\/png;base64/i, "safe data:image base64 URI should be preserved");

  // Assert benign markup and CSS rules are preserved
  assert.match(cleanHTML, /color:\s*red/, "safe CSS body style should be preserved");
  assert.match(cleanHTML, /张三/, "user resume content should be preserved");
});

test("P2/P3 Lego draft single-write versioned atomic persistence and backward compatibility", () => {
  const storageMock = new Map<string, string>();
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  try {
    // @ts-expect-error Mocking window and localStorage
    globalThis.window = {};
    // @ts-expect-error Mocking localStorage
    globalThis.localStorage = {
      getItem: (key: string) => storageMock.get(key) ?? null,
      setItem: (key: string, val: string) => storageMock.set(key, val),
      removeItem: (key: string) => storageMock.delete(key),
    };

    // 1. Successful save writes a single versioned JSON record to LEGO_DRAFT_KEY
    const testSchema = { ...DEFAULT_LEGO_SCHEMA, config: { title: "草稿简历" } };
    const saveRes = saveLegoDraft(testSchema);

    assert.equal(saveRes.success, true);
    assert.ok(typeof saveRes.savedTime === "string" && saveRes.savedTime.length > 0);
    assert.ok(storageMock.has(LEGO_DRAFT_KEY), "LEGO_DRAFT_KEY must exist");

    const rawSaved = storageMock.get(LEGO_DRAFT_KEY);
    const parsedEnvelope = JSON.parse(rawSaved!);
    assert.equal(parsedEnvelope.version, 1, "Must store version: 1 in single envelope");
    assert.equal(parsedEnvelope.savedTime, saveRes.savedTime, "Saved time must be in envelope");
    assert.equal(parsedEnvelope.schema?.config?.title, "草稿简历");

    // 2. loadLegoDraft reads versioned record and sets exists: true, corrupted: false
    const loaded = loadLegoDraft();
    assert.equal(loaded.exists, true);
    assert.equal(loaded.corrupted, false);
    assert.ok(loaded.schema !== null);
    assert.equal(loaded.schema?.config?.title, "草稿简历");
    assert.equal(loaded.savedTime, saveRes.savedTime);

    // 3. Backward compatibility: reading legacy raw schema from LEGO_DRAFT_KEY and time from LEGO_DRAFT_TIME_KEY
    storageMock.clear();
    storageMock.set(LEGO_DRAFT_KEY, JSON.stringify(testSchema));
    storageMock.set(LEGO_DRAFT_TIME_KEY, "12:34");

    const legacyLoaded = loadLegoDraft();
    assert.equal(legacyLoaded.exists, true);
    assert.equal(legacyLoaded.corrupted, false);
    assert.equal(legacyLoaded.schema?.config?.title, "草稿简历");
    assert.equal(legacyLoaded.savedTime, "12:34");

    // 4. Corrupted storage: invalid JSON string returns exists: true, corrupted: true, schema: null
    storageMock.set(LEGO_DRAFT_KEY, "INVALID{NOT_JSON");
    const corruptedLoaded = loadLegoDraft();
    assert.equal(corruptedLoaded.exists, true);
    assert.equal(corruptedLoaded.corrupted, true);
    assert.equal(corruptedLoaded.schema, null);

    // 4b. Corrupted envelope: non-object schema or unsupported version marks corrupted
    storageMock.set(LEGO_DRAFT_KEY, JSON.stringify({ version: 1, schema: "bad" }));
    const badSchemaLoaded = loadLegoDraft();
    assert.equal(badSchemaLoaded.exists, true);
    assert.equal(badSchemaLoaded.corrupted, true);
    assert.equal(badSchemaLoaded.schema, null);

    storageMock.set(LEGO_DRAFT_KEY, JSON.stringify({ version: 99, schema: null }));
    const badVersionLoaded = loadLegoDraft();
    assert.equal(badVersionLoaded.exists, true);
    assert.equal(badVersionLoaded.corrupted, true);
    assert.equal(badVersionLoaded.schema, null);

    // 4c. Corrupted legacy format: non-schema object marks corrupted
    storageMock.set(LEGO_DRAFT_KEY, JSON.stringify({ invalid: "not a lego schema" }));
    const badLegacyLoaded = loadLegoDraft();
    assert.equal(badLegacyLoaded.exists, true);
    assert.equal(badLegacyLoaded.corrupted, true);
    assert.equal(badLegacyLoaded.schema, null);

    // 5. loadLegoDraft catches security error / exception when reading storage
    globalThis.localStorage.getItem = () => {
      throw new Error("SecurityError: storage disabled");
    };
    const safeLoaded = loadLegoDraft();
    assert.equal(safeLoaded.schema, null);
    assert.equal(safeLoaded.savedTime, null);
    assert.equal(safeLoaded.exists, false);
    assert.equal(safeLoaded.corrupted, false);
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("P2 Follow-up answers and bullets can be edited when only partialAnalysisResult is available", () => {
  const previousState = useResumeStore.getState();

  try {
    // Set up partialAnalysisResult with follow-up questions, analysisResult is null
    const partialData: Partial<import("@/types/resume").AnalysisResult> = {
      followUpQuestions: [
        {
          id: "q-1",
          question: "你在该微服务重构中如何保障灰度发布与服务可用性？",
          purpose: "考察高可用架构与容灾把控能力",
          userAnswer: "",
          generatedBullet: "",
          presetBullet: "采用双写方案与金丝雀灰度，达成 99.99% 可用性",
        },
      ],
    };

    useResumeStore.setState({
      analysisResult: null,
      partialAnalysisResult: partialData as import("@/types/resume").AnalysisResult,
    });

    const store = useResumeStore.getState();
    assert.equal(store.analysisResult, null, "analysisResult must be null");
    assert.ok(store.partialAnalysisResult !== null, "partialAnalysisResult must be present");

    // 1. Test updateFollowUpAnswer
    store.updateFollowUpAnswer("q-1", "通过金丝雀发布机制逐步放量，并设置全自动告警熔断");

    const updatedState = useResumeStore.getState();
    assert.equal(
      updatedState.partialAnalysisResult?.followUpQuestions?.[0]?.userAnswer,
      "通过金丝雀发布机制逐步放量，并设置全自动告警熔断",
      "userAnswer must be updated in partialAnalysisResult when analysisResult is null"
    );

    // 2. Test setFollowUpBullet
    updatedState.setFollowUpBullet("q-1", "采用自研流量染色网关实现全链路灰度分流");
    const bulletState = useResumeStore.getState();
    assert.equal(
      bulletState.partialAnalysisResult?.followUpQuestions?.[0]?.generatedBullet,
      "采用自研流量染色网关实现全链路灰度分流",
      "generatedBullet must be updated in partialAnalysisResult"
    );

    // 3. Test patchAnalysisResult updates partialAnalysisResult
    bulletState.patchAnalysisResult({
      matchItems: [
        {
          jdRequirement: "高可用架构",
          resumeEvidence: "具备微服务高可用经验",
          evidenceStrength: "strong",
          needsSupplement: false,
          optimizationSuggestion: "量化指标已达标",
        },
      ],
    });

    const patchedState = useResumeStore.getState();
    assert.equal(
      patchedState.partialAnalysisResult?.matchItems?.[0]?.jdRequirement,
      "高可用架构",
      "patchAnalysisResult must patch partialAnalysisResult when analysisResult is null"
    );
  } finally {
    useResumeStore.setState(previousState);
  }
});

test("P1 patchAnalysisResult preserves partial status and does NOT upgrade without complete structure", () => {
  const previousState = useResumeStore.getState();

  try {
    const partialData: Partial<import("@/types/resume").AnalysisResult> = {
      jdAnalysis: {
        responsibilities: ["核心职责"],
        hardRequirements: ["硬性要求"],
        implicitRequirements: [],
        keywords: ["React", "TypeScript"],
        idealCandidate: "资深工程师",
        coreCompetencies: [],
      },
      diagnosis: {
        overallScore: 80,
        dimensionScores: [],
        mainIssues: [],
        prioritySuggestions: [],
      },
      matchItems: [],
      followUpQuestions: [],
      optimizedItems: [],
      finalResume: {
        personalInfo: { name: "张三", email: "zhangsan@test.com", phone: "13800000000", location: "北京" },
        jobIntent: "资深前端专家",
        summary: "拥有多年大型前端架构经验",
        coreSkills: ["React", "Next.js"],
        workExperience: [{ company: "Tech Inc", role: "Frontend Lead", period: "2020-至今", bullets: ["架构设计"] }],
        projectExperience: [],
        skillsAndTools: [],
        education: { school: "北京大学", degree: "本科", period: "2016-2020" },
      },
      // Note: interviewPrep is intentionally MISSING!
    };

    useResumeStore.setState({
      analysisResult: null,
      partialAnalysisResult: partialData as import("@/types/resume").AnalysisResult,
      currentStep: "optimize",
      maxReachedStepIndex: 5,
    });

    const store = useResumeStore.getState();
    assert.equal(store.analysisResult, null, "Initially analysisResult must be null");

    // Patch with more data, but interviewPrep is still missing
    const success = store.patchAnalysisResult({
      optimizedItems: [{ id: "opt-1", section: "work", before: "旧代码", after: "新架构", reason: "性能提升", riskWarning: "" }],
    });

    assert.equal(success, true, "Patch should succeed");
    const updated = useResumeStore.getState();
    assert.equal(updated.analysisResult, null, "analysisResult must remain null when interviewPrep is missing");
    assert.ok(updated.partialAnalysisResult !== null, "partialAnalysisResult must hold the patched data");
    assert.equal(updated.partialAnalysisResult?.optimizedItems?.length, 1);

    // Interview step must NOT be unlocked as completed/accessible
    const interviewStatus = updated.getStepStatus("interview");
    assert.notEqual(interviewStatus, "completed", "Interview step must not be completed when interviewPrep is missing");

    // Now supply interviewPrep to make it genuinely complete
    const fullSuccess = updated.patchAnalysisResult({
      interviewPrep: {
        likelyQuestions: [],
        evidenceToPrepare: [],
        possibleExaggerations: [],
        dataToSupplement: [],
        selfIntroduction: "自我介绍",
      },
    });

    assert.equal(fullSuccess, true);
    const completeState = useResumeStore.getState();
    assert.ok(completeState.analysisResult !== null, "analysisResult should now be upgraded to complete");
    assert.equal(completeState.partialAnalysisResult, null, "partialAnalysisResult should be cleared when complete");
  } finally {
    useResumeStore.setState(previousState);
  }
});

test("P2 isCompleteAnalysisResult strictly validates arrays and nested structures to reject {} empty objects", () => {
  // 1. null / non-objects
  assert.equal(isCompleteAnalysisResult(null), false);
  assert.equal(isCompleteAnalysisResult(undefined), false);
  assert.equal(isCompleteAnalysisResult(""), false);
  assert.equal(isCompleteAnalysisResult({}), false);

  // 2. Object with all empty objects {}
  const emptyObjCandidate = {
    jdAnalysis: {},
    diagnosis: {},
    matchItems: {},
    followUpQuestions: {},
    optimizedItems: {},
    finalResume: {},
    interviewPrep: {},
  };
  assert.equal(isCompleteAnalysisResult(emptyObjCandidate), false, "Must reject candidate where all fields are empty objects");

  // 3. Object missing interviewPrep.likelyQuestions
  const missingLikelyQuestions = {
    jdAnalysis: { responsibilities: ["test"], hardRequirements: [], implicitRequirements: [], keywords: [], idealCandidate: "", coreCompetencies: [] },
    diagnosis: { overallScore: 80, dimensionScores: [], mainIssues: [], prioritySuggestions: [] },
    matchItems: [],
    followUpQuestions: [],
    optimizedItems: [],
    finalResume: {
      personalInfo: { name: "张三", email: "a@b.com", phone: "13800000000", location: "北京" },
      jobIntent: "工程师",
      summary: "",
      coreSkills: [],
      workExperience: [],
      projectExperience: [],
      skillsAndTools: [],
      education: { school: "大学", degree: "学士", period: "2020" },
    },
    interviewPrep: {},
  };
  assert.equal(isCompleteAnalysisResult(missingLikelyQuestions), false, "Must reject candidate when interviewPrep has no likelyQuestions array");

  // 4. Genuine complete object
  const genuineComplete = {
    ...missingLikelyQuestions,
    interviewPrep: {
      likelyQuestions: [{ question: "q1", suggestedAnswer: "a1", evidenceNeeded: [] }],
      evidenceToPrepare: [],
      possibleExaggerations: [],
      dataToSupplement: [],
      selfIntroduction: "自我介绍",
    },
  };
  assert.equal(isCompleteAnalysisResult(genuineComplete), true, "Must accept genuine complete analysis result");

  // 5. Object missing jdAnalysis.coreCompetencies (User reproduction case: page directly calls coreCompetencies.map)
  const missingCoreCompetencies = {
    ...genuineComplete,
    jdAnalysis: {
      responsibilities: ["test"],
      hardRequirements: [],
      implicitRequirements: [],
      keywords: [],
      idealCandidate: "",
      // coreCompetencies is missing!
    },
  };
  assert.equal(isCompleteAnalysisResult(missingCoreCompetencies), false, "Must reject candidate when jdAnalysis.coreCompetencies is missing");

  // 6. Object missing finalResume.education
  const missingEducation = {
    ...genuineComplete,
    finalResume: {
      personalInfo: { name: "张三", email: "a@b.com", phone: "13800000000", location: "北京" },
      jobIntent: "工程师",
      summary: "",
      coreSkills: [],
      workExperience: [],
      projectExperience: [],
      skillsAndTools: [],
      // education is missing!
    },
  };
  assert.equal(isCompleteAnalysisResult(missingEducation), false, "Must reject candidate when finalResume.education is missing");

  // 7. Object missing diagnosis.dimensionScores
  const missingDimensionScores = {
    ...genuineComplete,
    diagnosis: {
      overallScore: 80,
      mainIssues: [],
      prioritySuggestions: [],
      // dimensionScores is missing!
    },
  };
  assert.equal(isCompleteAnalysisResult(missingDimensionScores), false, "Must reject candidate when diagnosis.dimensionScores is missing");

  // 8. Invalid evidenceStrength value (P1 reproduction: non-enum value like "invalid" causes badge crash)
  const invalidEvidenceStrength = {
    ...genuineComplete,
    matchItems: [
      {
        jdRequirement: "架构设计",
        resumeEvidence: "负责系统重构",
        evidenceStrength: "invalid", // Not in strong / medium / weak / none
        needsSupplement: false,
        optimizationSuggestion: "无",
      },
    ],
  };
  assert.equal(isCompleteAnalysisResult(invalidEvidenceStrength), false, "Must reject candidate with invalid evidenceStrength");

  // 9. Invalid importance in coreCompetencies (must be high / medium / low)
  const invalidImportance = {
    ...genuineComplete,
    jdAnalysis: {
      ...genuineComplete.jdAnalysis,
      coreCompetencies: [
        {
          name: "算法开发",
          importance: "super-high", // Not in high / medium / low
          description: "核心技能",
        },
      ],
    },
  };
  assert.equal(isCompleteAnalysisResult(invalidImportance), false, "Must reject candidate with invalid coreCompetency importance");

  // 10. Malformed englishResume (P2 reproduction: invalid englishResume structure must not bypass validation)
  const malformedEnglishResume = {
    ...genuineComplete,
    englishResume: {
      invalid: "not a valid final resume",
    },
  };
  assert.equal(isCompleteAnalysisResult(malformedEnglishResume), false, "Must reject candidate with malformed englishResume");

  // 11. Valid englishResume passes validation
  const validWithEnglish = {
    ...genuineComplete,
    englishResume: {
      ...genuineComplete.finalResume,
      summary: "Senior Fullstack Engineer with 5+ years experience",
    },
  };
  assert.equal(isCompleteAnalysisResult(validWithEnglish), true, "Must accept candidate with valid englishResume");
});

test("P2 getResumeSourceKey reacts to partialAnalysisResult.finalResume changes", () => {
  const previousState = useResumeStore.getState();

  try {
    useResumeStore.setState({
      analysisResult: null,
      partialAnalysisResult: null,
      userInput: {
        ...previousState.userInput,
        targetRole: "初始角色",
      },
    });

    const keyInitial = getResumeSourceKey();

    // 1. Set partialAnalysisResult with finalResume
    useResumeStore.setState({
      partialAnalysisResult: {
        finalResume: {
          personalInfo: { name: "王五", email: "wang@test.com", phone: "13500000000", location: "深圳" },
          jobIntent: "资深后端",
          summary: "Go / K8s",
          coreSkills: ["Go"],
          workExperience: [{ company: "Tech Corp", role: "Dev", period: "2020", bullets: ["服务优化"] }],
          projectExperience: [],
          skillsAndTools: [],
          education: { school: "大学", degree: "本科", period: "2020" },
        },
      },
    });

    const keyWithPartialResume = getResumeSourceKey();
    assert.notEqual(keyWithPartialResume, keyInitial, "Source key must change when partialAnalysisResult.finalResume is introduced");

    // 2. Modify finalResume inside partialAnalysisResult
    useResumeStore.setState({
      partialAnalysisResult: {
        finalResume: {
          personalInfo: { name: "王五", email: "wang@test.com", phone: "13500000000", location: "深圳" },
          jobIntent: "技术总监",
          summary: "Go / K8s / 架构设计",
          coreSkills: ["Go", "Architecture"],
          workExperience: [{ company: "Tech Corp", role: "Tech Lead", period: "2020", bullets: ["整体重构"] }],
          projectExperience: [],
          skillsAndTools: [],
          education: { school: "大学", degree: "本科", period: "2020" },
        },
      },
    });

    const keyAfterPartialEdit = getResumeSourceKey();
    assert.notEqual(keyAfterPartialEdit, keyWithPartialResume, "Source key must change when partial finalResume is updated");
  } finally {
    useResumeStore.setState(previousState);
  }
});

test("P2 export-step Lego schema builder and avatar upload handle partial analysis results", () => {
  const previousState = useResumeStore.getState();

  try {
    const partialData: Partial<import("@/types/resume").AnalysisResult> = {
      finalResume: {
        personalInfo: { name: "李四", email: "lisi@test.com", phone: "13900000000", location: "上海" },
        jobIntent: "全栈工程师",
        summary: "精通前后端全栈开发",
        coreSkills: ["TypeScript", "Node.js"],
        workExperience: [
          { company: "Cloud Corp", role: "Fullstack Dev", period: "2021-2024", bullets: ["微服务拆分"] },
        ],
        projectExperience: [],
        skillsAndTools: ["Node.js", "PostgreSQL"],
        education: { school: "复旦大学", degree: "硕士", period: "2018-2021" },
      },
    };

    useResumeStore.setState({
      analysisResult: null,
      partialAnalysisResult: partialData as import("@/types/resume").AnalysisResult,
      userInput: {
        ...previousState.userInput,
        targetRole: "全栈工程师",
      },
    });

    // 1. Build Lego schema from exportSafeResult even when analysisResult is null
    const effectiveResult = useResumeStore.getState().partialAnalysisResult!;
    const exportSafeResult: import("@/types/resume").AnalysisResult = {
      jdAnalysis: { responsibilities: [], hardRequirements: [], implicitRequirements: [], keywords: [], idealCandidate: "", coreCompetencies: [] },
      diagnosis: { overallScore: 0, dimensionScores: [], mainIssues: [], prioritySuggestions: [] },
      matchItems: [],
      followUpQuestions: [],
      optimizedItems: [],
      finalResume: effectiveResult.finalResume!,
      interviewPrep: { likelyQuestions: [], evidenceToPrepare: [], possibleExaggerations: [], dataToSupplement: [], selfIntroduction: "" },
    };

    const schema = buildLegoSchemaFromResume(useResumeStore.getState().userInput, exportSafeResult);
    assert.ok(schema !== null, "Schema must be generated successfully");
    assert.ok(Array.isArray(schema.componentsTree), "componentsTree must be an array");

    // Verify work experience is present in the schema widgets
    const hasWorkExp = schema.componentsTree[0]?.children?.some((w) =>
      JSON.stringify(w.dataSource || {}).includes("Cloud Corp")
    );
    assert.ok(hasWorkExp, "Lego schema must contain work experience from partial finalResume");

    // 2. Avatar upload in partial mode updates partialAnalysisResult.finalResume
    const mockAvatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const currentPartial = useResumeStore.getState().partialAnalysisResult!;
    useResumeStore.setState({
      userInput: { ...useResumeStore.getState().userInput, avatarUrl: mockAvatar },
      partialAnalysisResult: {
        ...currentPartial,
        finalResume: {
          ...currentPartial.finalResume!,
          personalInfo: {
            ...currentPartial.finalResume!.personalInfo,
            avatarUrl: mockAvatar,
          },
        },
      },
    });

    const stateAfterUpload = useResumeStore.getState();
    assert.equal(stateAfterUpload.userInput.avatarUrl, mockAvatar);
    assert.equal(stateAfterUpload.partialAnalysisResult?.finalResume?.personalInfo?.avatarUrl, mockAvatar);
    assert.equal(stateAfterUpload.analysisResult, null, "analysisResult must still remain null");
  } finally {
    useResumeStore.setState(previousState);
  }
});

test("P2 Reactive storage volatile alerts on quota exhaustion and recovers", () => {
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  try {
    let volatileChangeCount = 0;
    const unsubscribe = subscribeStorageVolatile(() => {
      volatileChangeCount++;
    });

    let failSetItem = false;
    const storeMap = new Map<string, string>();

    const mockStorage = {
      getItem: (key: string) => storeMap.get(key) ?? null,
      setItem: (key: string, val: string) => {
        if (failSetItem) throw new Error("QuotaExceededError");
        storeMap.set(key, val);
      },
      removeItem: (key: string) => storeMap.delete(key),
    };

    // @ts-expect-error Mocking window and localStorage
    globalThis.window = { localStorage: mockStorage };
    // @ts-expect-error Mocking localStorage
    globalThis.localStorage = mockStorage;

    assert.equal(isStorageVolatile(), false, "Initial storage should not be volatile");

    // Trigger failure
    failSetItem = true;
    safeBrowserStorage.setItem("test-key", "test-val");

    assert.equal(isStorageVolatile(), true, "Storage should be volatile after failed write");
    assert.equal(isStorageVolatile("test-key"), true, "Key should be volatile");
    assert.ok(volatileChangeCount >= 1, "Volatile listener must be notified");

    // Recover
    failSetItem = false;
    safeBrowserStorage.setItem("test-key", "test-val-recovered");

    assert.equal(isStorageVolatile(), false, "Storage should recover from volatile state after success");
    assert.ok(volatileChangeCount >= 2, "Volatile listener must be notified of recovery");

    unsubscribe();
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("P2-04/P2-09 client.ts differentiates HTTP 429 rate limit vs quota depletion", async () => {
  const config = getAIConfig();
  const fakeConfig = {
    ...config,
    apiKey: "test-key",
    baseUrl: "https://api.mock-ai.com/v1",
  };

  // 1. Test 429 with Insufficient Quota
  const quotaResponse = new Response(JSON.stringify({
    error: { message: "insufficient_quota: You have exceeded your current quota", code: "insufficient_quota" }
  }), {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });

  const stubQuota = mock.method(safeFetch, "safeAIFetch", async () => quotaResponse);
  try {
    await assert.rejects(
      async () => {
        await client.chatCompletionJSON({ system: "助手", user: "test", maxTokens: 100 }, fakeConfig);
      },
      (err: Error) => {
        return err.message.includes("额度已用尽 (Insufficient Quota)");
      },
      "Must throw friendly Insufficient Quota error when quota error detail is received"
    );
  } finally {
    stubQuota.mock.restore();
  }

  // 2. Test 429 with Rate Limit
  const rateLimitResponse = new Response(JSON.stringify({
    error: { message: "Rate limit reached for requests", code: "rate_limit_exceeded" }
  }), {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });

  const stubRateLimit = mock.method(safeFetch, "safeAIFetch", async () => rateLimitResponse);
  try {
    await assert.rejects(
      async () => {
        await client.chatCompletionJSON({ system: "助手", user: "test", maxTokens: 100 }, fakeConfig);
      },
      (err: Error) => {
        return err.message.includes("请求频率过高 (HTTP 429 Rate Limit)");
      },
      "Must throw friendly HTTP 429 Rate Limit error when rate limit error detail is received"
    );
  } finally {
    stubRateLimit.mock.restore();
  }
});
