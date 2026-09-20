<div align="center">

# 📄 简历专家 (Resume Expert)

**基于目标岗位 JD 的 AI 简历诊断、启发式追问与 STAR 重构 Agent Web 应用**

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3-06B6D4?style=for-the-badge&logo=tailwindcss)
![Zustand](https://img.shields.io/badge/Zustand-State_Management-764ABC?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

[功能特性](#-核心特性) • [快速开始](#-快速开始) • [AI 模型配置](#%EF%B8%8F-ai-大模型配置-byok-模式) • [项目架构](#-项目架构) • [常见问题](#-常见问题-faq)

</div>

---

## 💡 项目简介

**简历专家** 是一款针对招聘与求职场景研发的智能 **AI 简历优化 Agent Web 应用**。告别通用大模型的泛泛润色，本项目通过目标岗位 JD 深度拆解、匹配度量化打分、STAR 法则启发式追问及矢量级积木排版设计器，帮助求职者打造极具说服力的高含金量简历。

无论您拥有 API Key 与否，系统均提供 **真实 AI 模型** 与 **Mock 演示模式** 的无缝切换，方便快速体验或深度定制重构。

---

## ✨ 核心特性

- 🎯 **JD 深度对齐与硬性要求拆解**
  - 自动解析目标岗位 JD 的硬性条件、核心技能与隐性职责，生成 0-100 分的精准匹配度诊断报告。
- 💡 **STAR 启发式追问与【💡 AI 预设参考 Bullet】**
  - 自动识别履历中的“量化空白”与“成果缺失”。提供大模型拟定的 **预设参考 Bullet** 范例，引导求职者快速补全数据与关键成果。
- 📊 **前后无损双栏对比模式**
  - 提供原始简历 vs AI 优化简历同屏左右双栏无损对照，改动点高亮呈现，优化效果一目了然。
- 🧱 **积木排版设计器 (Lego Designer)**
  - 内置双栏侧边栏、商务 Header、时间轴极客、微阴影卡片流、经典单栏等多套顶级精美排版模板。
  - 支持积木图层拖拽排序、自适应动态高度折行计算、样式微调与一键导出。
- 🤖 **多大模型支持 (BYOK 模式)**
  - 原生适配 **DeepSeek (V3/R1)**、**硅基流动 (SiliconFlow)**、**OpenAI (GPT-4o/4o-mini)**、**月之暗面 (Kimi)** 及任何 **自定义 OpenAI 兼容接口**。
- 🎭 **Mock 演示与离线体验模式**
  - 未配置 API Key 时自动启动 Mock 模式，不消耗 Token、零费用，内置高保真专业简历范例，方便零门槛体验全流程。
- 🔒 **Privacy-First 隐私安全**
  - 开启隐私保护后，自动替换识别到的姓名、联系方式、公司、地址等信息，并提供发送预览。规则可能遗漏或误判，请人工核对；图片由本应用服务器 OCR 处理。页面配置的 API Key 仅持久化在当前浏览器，调用时经本应用服务端内存转发给所选模型服务商，不写入服务端磁盘。
- 📄 **ATS 友好与多格式导出**
  - 支持导出文字可复制的 **PDF**、便于二次编辑的结构化 **Word (.docx)** 内容版及 **纯文本格式**（注：Word 导出为标准结构化版式，非积木绝对坐标层完全映射）；实际 ATS 解析效果取决于模板和招聘系统。

---

## 📸 界面预览 (Screenshots & Previews)

#### 🏠 1. 首页 Landing Page
![首页 Landing Page](docs/images/hero.png)

#### 📝 2. 目标岗位 JD 与简历材料录入 (Step 1)
![目标岗位 JD 与简历材料录入](docs/images/input-step.png)

#### 🔍 3. JD 匹配度与人岗缺口深度分析 (Step 4)
![JD 匹配度与人岗缺口深度分析](docs/images/match-analysis.png)

#### ⚡ 4. STAR 法则履历重构与改写对比 (Step 6)
![STAR 法则履历重构与改写对比](docs/images/optimization.png)

#### 🎯 5. 目标岗位面试准备与可能追问预测 (Step 7)
![目标岗位面试准备与可能追问预测](docs/images/interview-prep.png)

#### 📥 6. 全景综合岗位分析与面试报告 PDF 导出
![全景综合岗位分析与面试报告 PDF 导出](docs/images/pdf-export.png)

#### 🧱 7. 积木自由排版设计器 (Lego Designer)
![积木自由排版设计器](docs/images/lego-designer.png)

#### ⚙️ 8. 可视化 AI 大模型配置面板 (BYOK 模式)
![可视化 AI 大模型配置面板](docs/images/settings.png)

---

## 🛠️ 技术栈

- **框架与构建**：Next.js 15 (App Router), React 19, TypeScript
- **样式与 UI**：Tailwind CSS, shadcn/ui, Lucide Icons
- **状态管理**：Zustand (支持持久化与历史撤销重做)
- **文档生成与导出**：html2canvas, 原生打印 / 矢量 PDF, docx.js (结构化内容版)
- **AI 架构**：服务端 OpenAI 兼容 HTTP 适配层（支持 Server-Sent Events 流式输出）

---

## 🚀 快速开始

### 1. 克隆项目与安装依赖

```bash
# 克隆仓库
git clone https://github.com/Serendiy-Coisini/my-resume-project.git

# 进入目录
cd my-resume-project

# 安装依赖
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 即可访问应用。

---

## ⚙️ AI 大模型配置 (BYOK 模式)

应用采用全新的 **安全 BYOK (Bring Your Own Key)** 架构。您可以通过界面或环境变量配置您喜欢的大模型服务商：

### 方式 A：图形化页面配置（推荐 · 纯客户端安全隔离）
直接点击页面右上角的 **`⚙️ AI 配置`** 按钮：
1. 选择服务商（DeepSeek / 硅基流动 / OpenAI / Kimi / 自定义 Endpoint）；
2. 填入您的 API Key；
3. 点击 **`测试连接`** 并 **`保存配置`** 即可。

> 💡 **免重复配置与多用户隔离保障**：
> - **持久化免重复输入**：配置采用浏览器本地存储（`localStorage`）安全持久保存，下次访问、刷新或关闭浏览器后重新进入**自动生效，无需每次重新输入**。
> - **零服务端落盘**：API Key 仅持久化在当前访问者的浏览器中，不保存到应用服务器磁盘。
> - **请求级透传**：调用 AI 服务时通过单次请求头传给应用后端，后端仅在当前请求内存中使用，并转发给所选模型服务商。请只在可信部署环境中配置 Key。

### 方式 B：环境变量文件配置 (`.env.local`)
在项目根目录创建或编辑 `.env.local` 文件：

```env
# 必填：您的 API Key
LLM_API_KEY=sk-xxxx...

# 默认关闭；开启共享 Key 必须同时配置以下访问控制
ALLOW_SERVER_LLM_KEY=true
SERVER_LLM_DEPLOYMENT=single-instance
# 替换为独立随机口令，每名用户一个，每个 32–256 字符，最多 100 个
SERVER_LLM_ACCESS_TOKENS=["replace-with-a-long-random-token-per-user"]
SERVER_LLM_USER_DAILY_CALLS=40
SERVER_LLM_TOTAL_DAILY_CALLS=200

# 可选：API 服务 Base URL
LLM_BASE_URL=https://api.deepseek.com/v1

# 可选：使用的模型名称
LLM_MODEL=deepseek-chat

# 可选：服务商 ID (deepseek | siliconflow | openai | moonshot | custom)
LLM_PROVIDER=deepseek
```

用户需要在「AI 配置 → 使用部署方的共享模型」保存管理员提供的个人访问口令。缺少口令、口令错误或未声明单实例部署时，共享 Key 请求会被拒绝；个人 BYOK 和显式 Mock 不受此限制。不要把真实口令提交到代码库。

共享模型按实际上游请求计数（含重试），每日默认每人 40 次、总计 200 次，同时最多每人 2 个、全局 4 个请求。计数在单个 Node 进程内维护，UTC 日切换或进程重启会重置；这不是金额上限。请同时设置模型服务商的消费上限。多实例、集群和 Serverless 部署应保持 `ALLOW_SERVER_LLM_KEY=false`、使用 BYOK，直到接入共享鉴权和持久化配额服务。只有入口代理会覆盖客户端伪造的 IP 头时，才启用 `TRUST_PROXY_HEADERS=true`。

### 文件解析部署与限制

PDF、Word 和 OCR 在独立 Node 子进程处理：最多 2 个并发解析、4 个排队请求，排队与处理总计最多 45 秒；取消请求会终止子进程。生产部署须允许创建子进程，并保留 `scripts/document-worker.cjs`、根目录 `chi_sim.traineddata` 及完整生产依赖（推荐 `npm ci` 后 `npm run build && npm start`）。裁剪或 standalone 部署须验证解析依赖及字库完整；不支持创建子进程的平台需另部署解析服务。

上传文件最多 15 MB，表单体最多 16 MB；图片 JSON 请求最多 21 MB，一次最多 4 张，累计解码后最多 15 MB。图片单边最多 12000 像素、总像素最多 2500 万，未知格式拒绝处理。PDF 文本解析最多 40 页，扫描件前端 OCR 最多前 4 页并提示；Word ZIP 声明解压大小最多 40 MB、2000 个文件。超限会明确报错。

子进程的 192 MB 限制只约束 V8 堆，不能代替操作系统级内存限制（OCR/WASM 和解压缓冲区在堆外）。公网部署请为解析服务配置容器内存/CPU 上限和入口请求限制；当前方案不提供跨实例资源调度。

### 常见服务商配置对照表

| 服务商 (Provider) | API Base URL | 推荐模型 (Model) | 说明 |
| :--- | :--- | :--- | :--- |
| **DeepSeek** | `https://api.deepseek.com/v1` | `deepseek-chat` | 推荐，性价比高，理解力极强 |
| **硅基流动 (SiliconFlow)** | `https://api.siliconflow.cn/v1` | `Qwen/Qwen2.5-7B-Instruct` | 部分开源模型完全免费调用 |
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o-mini` | 全球通用顶级大模型 |
| **月之暗面 (Kimi)** | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` | 国产优质文本模型 |
| **自定义兼容 Endpoint** | `https://your-custom-domain/v1` | 自定义模型名 | 适用于自建中转服务或私有化部署 |

---

## 📁 项目架构

```
resume-expert/
├── src/
│   ├── app/                     # Next.js App Router 页面路由
│   │   ├── api/                 # API Routes (代理 AI 请求，保护 Key)
│   │   │   ├── analyze/         # 简历诊断分析接口 (流式 SSE)
│   │   │   ├── follow-up/       # 启发式追问与参考 Bullet 生成
│   │   │   ├── parse-pdf/       # PDF/文档解析
│   │   │   └── settings/        # 服务端环境配置状态检验与连通性测试 (客户端持久化，服务端无状态代理)
│   │   ├── designer/            # 积木排版设计器主页面
│   │   ├── expert/              # 简历诊断优化主流程
│   │   └── settings/            # AI 大模型设置页面
│   ├── components/
│   │   ├── legoDesigner/        # 积木排版设计器核心组件 (画布、图层、属性面板)
│   │   ├── shared/              # 共享 UI 组件 (模板选择器、对照卡片等)
│   │   ├── steps/               # 诊断流程 8 大步骤视图组件 (输入/JD分析/诊断/匹配度/追问/重构/模板/导出)
│   │   └── ui/                  # 基础 UI 库组件 (Button, Dialog, Input 等)
│   ├── lib/
│   │   ├── ai/                  # AI Prompt 模版、数据 Schema 与解析工具
│   │   ├── lego-adapter.ts      # 履历数据 -> 积木 Schema 转换与精确折行高度引擎
│   │   ├── lego-draft.ts        # 积木设计器本地草稿统一存储与时间戳同步
│   │   └── utils.ts             # 辅助工具函数
│   ├── services/ai/             # AI 服务调度层 (Mock / LLM 引擎分发)
│   ├── store/                   # Zustand 全局状态 (简历数据、积木画布 Store)
│   └── types/                   # TypeScript 类型声明定义
├── public/                      # 静态资源
├── .env.example                 # 环境变量模版
└── README.md                    # 项目说明文档
```

---

## ❓ 常见问题 (FAQ)

### Q: 界面顶部的「Mock · 未配置 LLM_API_KEY」是什么模式？
**A**: **Mock 模式（演示与离线模拟数据模式）**：当您未配置 API Key 时系统自动开启。无需填 Key、不消耗 Token、零费用。系统内置了一套高保真专业简历的离线诊断与改写范例，方便您零门槛体验诊断对齐、启发式追问、积木排版与 PDF 导出的全流程。配置并保存自己的 API Key 后，系统将自动无缝切换至真实大模型实时分析重构模式。

### Q: 使用自己的 API Key 大概需要多少费用？
**A**: 消耗量取决于简历、JD 长度、重试次数和所选模型。请以模型服务商当前的计费页面和实际用量为准。

### Q: 我的 API Key 安全吗？
**A**: 页面配置的 Key 仅持久化在浏览器；环境变量 Key 保存在部署环境。真实模型调用时，Key 会经本应用服务端内存转发给所选模型服务商，因此应使用可信部署、HTTPS 和权限受限的专用 Key。

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 协议开源。欢迎 Fork、Star 或提交 PR！
