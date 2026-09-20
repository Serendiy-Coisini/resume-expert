# AGENTS.md

> 本文件是 AI Agent 在本代码库工作前的快速上下文指南。包含项目定位、技术栈、目录结构、开发命令、编码规范与禁止事项。

---

## Project Overview

**简历专家 (Resume Expert)** 是一款基于目标岗位 JD 的智能 **AI 简历诊断、启发式追问与 STAR 法则重构 Agent Web 应用**。

### 主要目标
- **JD 深度对齐与人岗缺口量化**：深度拆解岗位 JD 硬性条件与隐性职责，生成精准匹配度诊断与缺口报告。
- **启发式追问与 STAR 重构**：智能识别量化空白，提供大模型预设参考 Bullet，引导求职者补全量化成果并重构高说服力履历。
- **前后无损双栏对比**：原始简历 vs AI 优化简历同屏双栏对照，改动点与提升理由清晰可见。
- **积木排版设计器 (Lego Designer)**：多模板自适应排版、拖拽排序、精确动态高度折行计算，支持高保真矢量 PDF 与 Word (.docx) 导出。
- **安全 BYOK 架构与零门槛 Mock 双模**：支持 DeepSeek、SiliconFlow、OpenAI、Kimi 等服务商，未配置 Key 时自动运行高保真 Mock 演示模式。

---

## Tech Stack

- **Frontend Framework**: Next.js 15.2+ (App Router), React 19, TypeScript 5
- **Styling & UI Components**: Tailwind CSS, Radix UI (shadcn primitives), Lucide React
- **State Management**: Zustand 5.0+ (客户端响应式状态与数据持久化)
- **AI & Agent Architecture**:
  - 服务端 API 路由代理 (SSE 流式输出)
  - 多厂商模型适配 (DeepSeek / SiliconFlow / OpenAI / Moonshot / 自定义 OpenAI 兼容端点)
  - 双模分发层：真实 LLM 实时调用 + 离线高保真 Mock 数据模式
- **Document & PDF Processing**:
  - 导入解析：`pdfjs-dist`, `pdf-parse`, `mammoth` (Docx), `tesseract.js` (OCR 图片文字识别)
  - 导出渲染：`docx`, `jspdf`, `html2canvas`
- **Subproject**: `resume-design-main` (基于 Vite + Vue 3 的简历设计器扩展模块)
- **Package Manager**: `npm` (主工程使用 npm，子模块 `resume-design-main` 使用 pnpm)

---

## Repository Structure

```text
resume-expert/
├── src/
│   ├── app/                         # Next.js App Router 页面与 API 路由
│   │   ├── api/                     # 后端 API 路由 (代理 AI 请求、流式 SSE、解析服务)
│   │   │   ├── analyze/             # 简历与 JD 匹配度诊断接口 (SSE 流式)
│   │   │   ├── follow-up/           # 启发式追问与参考 Bullet 生成接口
│   │   │   ├── optimize/            # STAR 法则重构与改写接口
│   │   │   ├── apply-followup/      # 应用追问补充信息的重构接口
│   │   │   ├── parse-pdf/           # PDF 简历解析提取文本
│   │   │   ├── parse-resume-image/  # 简历图片 OCR 解析
│   │   │   ├── parse-jd-image/      # JD 岗位图片 OCR 解析
│   │   │   ├── extract-template/    # 模板结构化提取
│   │   │   └── settings/            # AI 配置检验、保存与读取
│   │   ├── expert/                  # 简历诊断与重构主流程页面 (包含 7 步指引)
│   │   ├── designer/                # 积木排版设计器主页面
│   │   ├── settings/                # 大模型参数与 BYOK 配置页面
│   │   ├── privacy/                 # 隐私政策页面
│   │   ├── terms/                   # 用户协议页面
│   │   ├── layout.tsx               # 全局根布局
│   │   ├── page.tsx                 # 首页 Landing Page
│   │   └── globals.css              # 全局样式与 Tailwind 基础指令
│   ├── components/                  # UI 组件
│   │   ├── steps/                   # 简历诊断流程核心 7 大步骤组件 (Step 1 ~ Step 7)
│   │   ├── legoDesigner/            # 积木排版设计器 (画布渲染、图层树、属性设置器、高度引擎)
│   │   ├── shared/                  # 跨流程业务共享组件 (双栏对比卡片、模板选择器等)
│   │   ├── ui/                      # 基础原子 UI 库 (Button, Dialog, Select, Tabs, Tooltip 等)
│   │   ├── landing/                 # 首页展示与特性介绍组件
│   │   └── layout/                  # 顶部导航栏、页眉页脚等框架布局组件
│   ├── lib/                         # 核心算法、转换工具与工具函数
│   │   ├── lego-adapter.ts          # 履历数据 -> 积木 Schema 转换引擎与精确折行高度计算
│   │   ├── industry-detector.ts     # 行业与职位智能识别算法
│   │   ├── docx-exporter.ts         # Word (.docx) 文档生成导出
│   │   ├── export-analysis-pdf.ts   # 诊断分析报告 PDF 导出
│   │   ├── resume-templates.ts      # 预设排版模板配置
│   │   ├── preset-resumes.ts        # 预设范例简历数据
│   │   ├── ai/                      # Prompt 提示词工程、数据 Schema 校验与解析
│   │   ├── privacy/                 # 敏感数据 (PII) 本地脱敏处理
│   │   ├── utils.ts                 # 通用辅助工具函数 (cn 等)
│   │   └── __tests__/               # 核心算法单元测试脚本
│   ├── services/                    # 业务服务调度层
│   │   └── ai/                      # AI 调度中心 (Mock 与 LLM 引擎分发调度)
│   ├── store/                       # Zustand 全局状态管理 (简历数据、积木画布 Store)
│   └── types/                       # TypeScript 全局类型声明定义
├── resume-design-main/              # 独立的简历排版子工程 (Vue 3 + Vite)
├── public/                          # 静态文件及 Tesseract 中英文离线识别字库
├── docs/                            # 项目文档与效果预览截图
├── .env.example                     # 环境变量模版
├── package.json                     # 项目配置与脚本
└── tsconfig.json                    # TypeScript 编译配置
```

---

## Development Commands

### 依赖安装
```bash
npm install
```

### 启动主应用 (开发模式)
```bash
npm run dev
```
启动后在浏览器打开 [http://localhost:3000](http://localhost:3000) 访问应用。

### 运行测试
```bash
npm test
```
*注：测试脚本位于 `src/lib/__tests__/`，运行核心算法单元测试（如行业与职位智能识别）。*

### 代码检查 (Lint)
```bash
npm run lint
```

### 生产打包构建
```bash
npm run build
```

### 子模块 (resume-design-main) 独立命令
```bash
# 安装子模块依赖
npm run install:resume-design

# 启动子模块开发服务器
npm run dev:resume-design
```

---

## Code Conventions & Architecture Guidelines

1. **TypeScript 强类型规范**：
   - 避免使用 `any`，所有 API 请求体、返回结果、Zustand Store 状态均需在 `src/types/` 或对应模块中声明严格类型。
   - 统一使用 `@/*` 路径别名引用 `src/` 下的代码（例如 `import { Button } from "@/components/ui/button"`）。

2. **Next.js App Router 客户端与服务端边界**：
   - 包含状态、DOM 操作或交互事件的组件顶部必须声明 `'use client'`。
   - 所有 LLM API Key 的消费与外部大模型请求转发必须限制在服务端的 `src/app/api/` 或 `services/ai/resumeAgent.server.ts` 中，杜绝 Key 泄露到客户端 Bundle。

3. **双模架构 (LLM & Mock) 一致性**：
   - 任何涉及 AI 生成、改写或分析的特性，必须确保 **真实 LLM 模式** 与 **Mock 模式**（`src/services/ai/resumeAgent.mock.ts`）提供相同的数据结构接口，保证在无 API Key 场景下应用功能完整可用。

4. **UI 样式规范**：
   - 统一使用 Tailwind CSS 类名，条件样式使用 `@/lib/utils` 的 `cn(...)` 函数组合。
   - 遵循现有的设计色彩风格（以 Indigo / Slate / Sky 为主调），保持暗色与亮色模式视觉一致性。

5. **状态管理**：
   - 跨步骤的核心简历数据（如当前分析阶段、原始简历、JD 内容、STAR 建议等）保存在 Zustand Store 中，注意避免无意义的频繁全局重渲染。

---

## Prohibited Items & Guardrails

- 🚫 **严禁硬编码 API Key / 凭据**：绝不允许在代码中写死任何真实的 API Key 或 Token，且不得将包含真实密钥的 `.env.local` 提交进代码库。
- 🚫 **严禁破坏 Mock 演示链路**：修改 AI 分析或重构的返回字段时，必须同步更新 `resumeAgent.mock.ts`，禁止导致离线 Mock 模式报错或白屏。
- 🚫 **严禁直接篡改核心排版高度算法**：`src/lib/lego-adapter.ts` 负责排版自适应与 PDF 导出分页高度计算，未经充分测试不可随意修改高度推导参数，防止导出 PDF 出现截断或跨页空白。
- 🚫 **严禁在根目录下混用其他包管理器**：根项目严格使用 `npm` 进行依赖管理，请勿在根目录执行 `yarn` 或 `pnpm install` 避免生成冲突的 Lock 文件。子项目 `resume-design-main` 使用 `pnpm`。
- 🚫 **严禁在未经脱敏的情况下向不可信第三方发送 PII**：简历包含姓名、联系方式、公司等个人隐私数据（PII），处理外发逻辑时必须确保遵守 Privacy-First 原则。
