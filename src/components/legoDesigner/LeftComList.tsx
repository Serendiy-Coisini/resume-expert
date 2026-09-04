import React, { useState, useMemo, useEffect } from 'react';
import { WIDGET_CONFIG_LIST } from './schema/widgetConfig';
import { useLegoDesignerStore } from '@/store/lego-designer-store';
import { useResumeStore } from '@/store/resume-store';
import { RESUME_MODEL_DATA } from '@/lib/resume-model-data';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { ImportResumeDialog } from './ImportResumeDialog';
import {
  LayoutGrid,
  Layers,
  Code,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  GraduationCap,
  Award,
  User,
  Heart,
  Sparkles,
  FolderKanban,
  Star,
  BookmarkPlus,
  FolderOpen,
  Download,
  FileUp,
  X as XIcon
} from 'lucide-react';
import type { IWidget } from '@/types/lego';

interface LeftComListProps {
  width: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const LeftComList: React.FC<LeftComListProps> = ({
  width,
  isCollapsed,
  onToggleCollapse
}) => {
  const [activeTab, setActiveTab] = useState<'widgets' | 'modules' | 'layers' | 'json' | 'templates'>('widgets');
  const {
    schema,
    selectedWidgetId,
    addWidget,
    addWidgets,
    setSelectedWidgetId,
    deleteWidget,
    moveWidgetLayer,
    savedTemplates,
    loadSavedTemplate,
    deleteSavedTemplate,
    loadSavedTemplates
  } = useLegoDesignerStore();
  const { userInput } = useResumeStore();

  useEffect(() => {
    loadSavedTemplates();
  }, [loadSavedTemplates]);

  const [copied, setCopied] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [importResumeDialogOpen, setImportResumeDialogOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('全部');

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCanvasNextY = () => {
    const children = schema.componentsTree[0]?.children || [];
    if (children.length === 0) return 40;
    let maxY = 40;
    children.forEach((w) => {
      const top = Number(w.css.top) || 0;
      const height = Number(w.css.height) || 40;
      const bottom = top + height;
      if (bottom > maxY) {
        maxY = bottom;
      }
    });
    return maxY + 24;
  };

  // Helper to add structured resume modules
  const handleAddModule = (moduleKey: string) => {
    const nextY = getCanvasNextY();
    const newWidgets: IWidget[] = [];

    switch (moduleKey) {
      case 'BASE_INFO':
        newWidgets.push({
          id: '',
          componentName: 'hj-text-2',
          title: '基本资料块',
          css: {
            left: 40,
            top: nextY,
            width: 740,
            height: 48,
            zIndex: 2,
            fontColor: '#0f172a',
            fontSize: 22,
            fontWeight: 'bold',
            textAlign: 'left'
          },
          dataSource: { text: `${RESUME_MODEL_DATA.BASE_INFO.name} · ${RESUME_MODEL_DATA.BASE_INFO.abstract}` }
        });
        break;

      case 'WORK_EXPERIENCE':
        newWidgets.push({
          id: '',
          componentName: 'hj-text-8',
          title: '工作经验标题',
          css: {
            left: 40,
            top: nextY,
            width: 740,
            height: 36,
            zIndex: 2,
            fontColor: '#1e3a8a',
            fontSize: 16,
            fontWeight: 'bold',
            borderColor: '#2563eb',
            borderStyle: 'solid',
            borderWidth: 0,
            padding: { top: 0, right: 0, bottom: 0, left: 10 }
          },
          dataSource: { text: '▌ 工作经验 WORK EXPERIENCE' }
        });
        newWidgets.push({
          id: '',
          componentName: 'hj-[#exper-1]',
          title: '工作经历条目',
          css: {
            left: 40,
            top: nextY + 45,
            width: 740,
            height: 120,
            zIndex: 2,
            fontColor: '#334155',
            fontSize: 13,
            lineHeight: 1.6
          },
          dataSource: {
            companyName: '某知名科技公司',
            jobTitle: '高级产品经理',
            workTime: '2021.09 - 至今',
            workContent: '1. 负责核心产品线的规划与落地，推动月活跃用户增长 35%；\n2. 跨团队协调开发与设计资源，按时交付 10+ 核心功能模块。'
          }
        });
        break;

      case 'PROJECT_EXPERIENCE':
        newWidgets.push({
          id: '',
          componentName: 'hj-text-8',
          title: '项目经验标题',
          css: {
            left: 40,
            top: nextY,
            width: 740,
            height: 36,
            zIndex: 2,
            fontColor: '#1e3a8a',
            fontSize: 16,
            fontWeight: 'bold',
            borderColor: '#2563eb',
            borderStyle: 'solid',
            borderWidth: 0,
            padding: { top: 0, right: 0, bottom: 0, left: 10 }
          },
          dataSource: { text: '▌ 项目经验 PROJECT EXPERIENCE' }
        });
        newWidgets.push({
          id: '',
          componentName: 'hj-[#exper-1]',
          title: '项目经历条目',
          css: {
            left: 40,
            top: nextY + 45,
            width: 740,
            height: 110,
            zIndex: 2,
            fontColor: '#334155',
            fontSize: 13,
            lineHeight: 1.6
          },
          dataSource: {
            companyName: '智能协作平台从 0 到 1 构建',
            jobTitle: '项目负责人',
            workTime: '2023.03 - 2023.12',
            workContent: '1. 负责项目架构设计与需求拆解，建立端到端指标跟踪；\n2. 完成 50+ 企业客户 POC 验证，满意度评分达 95%。'
          }
        });
        break;

      case 'EDU_BACKGROUND':
        newWidgets.push({
          id: '',
          componentName: 'hj-text-8',
          title: '教育背景标题',
          css: {
            left: 40,
            top: nextY,
            width: 740,
            height: 36,
            zIndex: 2,
            fontColor: '#1e3a8a',
            fontSize: 16,
            fontWeight: 'bold',
            borderColor: '#2563eb',
            borderStyle: 'solid',
            borderWidth: 0,
            padding: { top: 0, right: 0, bottom: 0, left: 10 }
          },
          dataSource: { text: '▌ 教育背景 EDUCATION' }
        });
        newWidgets.push({
          id: '',
          componentName: 'hj-[#exper-1]',
          title: '教育经历条目',
          css: {
            left: 40,
            top: nextY + 45,
            width: 740,
            height: 70,
            zIndex: 2,
            fontColor: '#334155',
            fontSize: 13
          },
          dataSource: {
            companyName: '重点大学',
            jobTitle: '计算机科学与技术 · 本科',
            workTime: '2017.09 - 2021.06',
            workContent: '主修课程：数据结构、算法分析、计算机网络、操作系统、软件工程'
          }
        });
        break;

      case 'SKILL_SPECIALTIES':
        newWidgets.push({
          id: '',
          componentName: 'hj-text-8',
          title: '技能特长标题',
          css: {
            left: 40,
            top: nextY,
            width: 740,
            height: 36,
            zIndex: 2,
            fontColor: '#1e3a8a',
            fontSize: 16,
            fontWeight: 'bold',
            borderColor: '#2563eb',
            borderStyle: 'solid',
            borderWidth: 0,
            padding: { top: 0, right: 0, bottom: 0, left: 10 }
          },
          dataSource: { text: '▌ 技能特长 SKILLS & TOOLS' }
        });
        newWidgets.push({
          id: '',
          componentName: 'hj-text-6',
          title: '技能详情',
          css: {
            left: 40,
            top: nextY + 45,
            width: 740,
            height: 60,
            zIndex: 2,
            fontColor: '#334155',
            fontSize: 13,
            lineHeight: 1.8
          },
          dataSource: { text: '• 专业技能：JavaScript / TypeScript / React / Next.js / Tailwind CSS / Node.js\n• 工具协作：Git / Figma / Axure / Docker / CI/CD' }
        });
        break;

      case 'SELF_EVALUATION':
        newWidgets.push({
          id: '',
          componentName: 'hj-text-8',
          title: '自我评价标题',
          css: {
            left: 40,
            top: nextY,
            width: 740,
            height: 36,
            zIndex: 2,
            fontColor: '#1e3a8a',
            fontSize: 16,
            fontWeight: 'bold',
            borderColor: '#2563eb',
            borderStyle: 'solid',
            borderWidth: 0,
            padding: { top: 0, right: 0, bottom: 0, left: 10 }
          },
          dataSource: { text: '▌ 自我评价 SUMMARY' }
        });
        newWidgets.push({
          id: '',
          componentName: 'hj-text-6',
          title: '自我评价内容',
          css: {
            left: 40,
            top: nextY + 45,
            width: 740,
            height: 50,
            zIndex: 2,
            fontColor: '#334155',
            fontSize: 13,
            lineHeight: 1.7
          },
          dataSource: { text: '具备扎实的专业基础与丰富的业务实战经验，抗压能力强，具备良好的团队沟通与敏捷迭代意识。' }
        });
        break;

      case 'AWARDS':
        newWidgets.push({
          id: '',
          componentName: 'hj-text-8',
          title: '荣誉奖项标题',
          css: {
            left: 40,
            top: nextY,
            width: 740,
            height: 36,
            zIndex: 2,
            fontColor: '#1e3a8a',
            fontSize: 16,
            fontWeight: 'bold',
            borderColor: '#2563eb',
            borderStyle: 'solid',
            borderWidth: 0,
            padding: { top: 0, right: 0, bottom: 0, left: 10 }
          },
          dataSource: { text: '▌ 荣誉奖项 HONORS & AWARDS' }
        });
        newWidgets.push({
          id: '',
          componentName: 'hj-text-6',
          title: '奖项列表',
          css: {
            left: 40,
            top: nextY + 45,
            width: 740,
            height: 50,
            zIndex: 2,
            fontColor: '#334155',
            fontSize: 13,
            lineHeight: 1.7
          },
          dataSource: { text: '• 2023.06 - 全国大学生程序设计大赛一等奖\n• 2022.12 - 校级优秀奖学金' }
        });
        break;

      default:
        break;
    }

    if (newWidgets.length > 0) {
      addWidgets(newWidgets);
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 h-full bg-white border-r border-slate-200 flex flex-col items-center py-3 select-none shrink-0 transition-all">
        <button
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 mb-4"
          onClick={onToggleCollapse}
          title="展开左侧积木面板"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex flex-col gap-3">
          <button
            className={`p-2 rounded-lg ${
              activeTab === 'widgets' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
            onClick={() => {
              setActiveTab('widgets');
              onToggleCollapse();
            }}
            title="积木组件"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            className={`p-2 rounded-lg ${
              activeTab === 'modules' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
            onClick={() => {
              setActiveTab('modules');
              onToggleCollapse();
            }}
            title="简历模块"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            className={`p-2 rounded-lg ${
              activeTab === 'layers' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
            onClick={() => {
              setActiveTab('layers');
              onToggleCollapse();
            }}
            title="图层管理"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            className={`p-2 rounded-lg ${
              activeTab === 'json' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
            onClick={() => {
              setActiveTab('json');
              onToggleCollapse();
            }}
            title="JSON 数据"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            className={`p-2 rounded-lg ${
              activeTab === 'templates' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
            onClick={() => {
              setActiveTab('templates');
              onToggleCollapse();
            }}
            title="我的模板"
          >
            <BookmarkPlus className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const moduleList = [
    { key: 'BASE_INFO', name: '基本资料', desc: '姓名、简介与个人头衔', icon: User, color: 'text-blue-600 bg-blue-50' },
    { key: 'WORK_EXPERIENCE', name: '工作经验', desc: '公司履历、岗位职责与产出', icon: Briefcase, color: 'text-indigo-600 bg-indigo-50' },
    { key: 'PROJECT_EXPERIENCE', name: '项目经验', desc: '项目名称、角色与业绩亮点', icon: FolderKanban, color: 'text-purple-600 bg-purple-50' },
    { key: 'EDU_BACKGROUND', name: '教育背景', desc: '院校、专业、学历与主修课程', icon: GraduationCap, color: 'text-emerald-600 bg-emerald-50' },
    { key: 'SKILL_SPECIALTIES', name: '技能特长', desc: '硬核技能、软件工具与熟悉度', icon: Star, color: 'text-amber-600 bg-amber-50' },
    { key: 'SELF_EVALUATION', name: '自我评价', desc: '综合素质、性格优势与职业总结', icon: Heart, color: 'text-rose-600 bg-rose-50' },
    { key: 'AWARDS', name: '荣誉奖项', desc: '证书、奖项名称与获得时间', icon: Award, color: 'text-yellow-600 bg-yellow-50' }
  ];

  return (
    <div
      className="h-full bg-white border-r border-slate-200 flex flex-col select-none shrink-0 overflow-hidden transition-all"
      style={{ width: `${width}px` }}
    >
      {/* Sidebar Header */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50 justify-between pr-2">
        <div className="flex flex-1">
          <button
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
              activeTab === 'widgets'
                ? 'text-blue-600 bg-white border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('widgets')}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> 积木
          </button>
          <button
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
              activeTab === 'modules'
                ? 'text-blue-600 bg-white border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('modules')}
          >
            <Sparkles className="w-3.5 h-3.5" /> 模块
          </button>
          <button
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
              activeTab === 'layers'
                ? 'text-blue-600 bg-white border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('layers')}
          >
            <Layers className="w-3.5 h-3.5" /> 图层
          </button>
          <button
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
              activeTab === 'json'
                ? 'text-blue-600 bg-white border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('json')}
          >
            <Code className="w-3.5 h-3.5" /> JSON
          </button>
          <button
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
              activeTab === 'templates'
                ? 'text-blue-600 bg-white border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('templates')}
          >
            <BookmarkPlus className="w-3.5 h-3.5" /> 模板
          </button>
        </div>

        <button
          className="p-1 hover:bg-slate-200 rounded text-slate-500 ml-1"
          onClick={onToggleCollapse}
          title="折叠左侧侧边栏"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Quick Resume Import Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-2.5 mb-3 flex items-center justify-between shadow-xs">
          <div className="min-w-0 pr-2">
            <div className="text-xs font-bold text-blue-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              导入初始简历数据
            </div>
            <div className="text-[10px] text-blue-700/80 truncate">
              8套行业模板 / 上传解析 / 快速重填
            </div>
          </div>
          <button
            onClick={() => setImportResumeDialogOpen(true)}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shrink-0 shadow-sm transition-all cursor-pointer flex items-center gap-1"
          >
            <FileUp className="w-3 h-3" /> 导入
          </button>
        </div>

        {/* Tab 1: Widgets Library (All 9 Categories) */}
        {activeTab === 'widgets' && (
          <div className="space-y-4">
            {WIDGET_CONFIG_LIST.map((category) => (
              <div key={category.title} className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-full"></span>
                  {category.title}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {category.list.map((widget, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm rounded-md p-2 flex flex-col items-center justify-center cursor-pointer transition-all group"
                      onClick={() => {
                        const widgetToInsert = {
                          ...widget,
                          dataSource: {
                            ...widget.dataSource,
                            avatarSrc:
                              widget.componentName.includes('avatar') && userInput.avatarUrl
                                ? userInput.avatarUrl
                                : widget.dataSource.avatarSrc
                          }
                        };
                        addWidget(widgetToInsert);
                      }}
                    >
                      <div className="text-slate-700 font-medium text-xs mb-1 group-hover:text-blue-600 truncate max-w-full">
                        {widget.title}
                      </div>
                      <div className="text-[10px] text-slate-400 text-center line-clamp-1">
                        {widget.description || '点击添加到画布'}
                      </div>
                      <button className="mt-1.5 text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 font-medium">
                        <Plus className="w-3 h-3" /> 添加
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Resume Modules */}
        {activeTab === 'modules' && (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-500 mb-2 px-1">点击快速向画布追加预置简历模块：</p>
            {moduleList.map((m) => {
              const IconComp = m.icon;
              return (
                <div
                  key={m.key}
                  className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all group"
                  onClick={() => handleAddModule(m.key)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg ${m.color} flex items-center justify-center shrink-0`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {m.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{m.desc}</div>
                    </div>
                  </div>
                  <button className="text-xs text-blue-600 opacity-80 group-hover:opacity-100 font-medium flex items-center gap-0.5 shrink-0 bg-blue-50 px-2 py-1 rounded-md">
                    <Plus className="w-3 h-3" /> 追加
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Layers */}
        {activeTab === 'layers' && (
          <div className="space-y-1">
            <p className="text-xs text-slate-500 mb-2 px-1">当前页面包含的积木图层（上层在前）：</p>
            {schema.componentsTree[0]?.children.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8">画布上暂无积木组件</div>
            ) : (
              [...(schema.componentsTree[0]?.children || [])].reverse().map((widget: IWidget) => {
                const isSelected = selectedWidgetId === widget.id;
                return (
                  <div
                    key={widget.id}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs border transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedWidgetId(widget.id)}
                  >
                    <span className="truncate max-w-[140px]">
                      {widget.title || widget.componentName}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1 hover:bg-slate-200 rounded text-slate-600"
                        title="上移"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveWidgetLayer(widget.id, 'up');
                        }}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        className="p-1 hover:bg-slate-200 rounded text-slate-600"
                        title="下移"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveWidgetLayer(widget.id, 'down');
                        }}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        className="p-1 hover:bg-rose-100 rounded text-rose-600"
                        title="删除"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteWidget(widget.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 4: JSON View */}
        {activeTab === 'json' && (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500 font-mono">HJSchema JSON</span>
              <button
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                onClick={handleCopyJson}
              >
                {copied ? '已复制 ✓' : '复制 JSON'}
              </button>
            </div>
            <pre className="flex-1 bg-slate-900 text-slate-100 p-3 rounded-lg text-[11px] font-mono overflow-auto leading-relaxed">
              {JSON.stringify(schema, null, 2)}
            </pre>
          </div>
        )}

        {/* Tab 5: My Templates */}
        {activeTab === 'templates' && (
          <TemplatesPanel
            savedTemplates={savedTemplates}
            activeCategoryFilter={activeCategoryFilter}
            setActiveCategoryFilter={setActiveCategoryFilter}
            onSaveTemplate={() => setSaveDialogOpen(true)}
            onLoadTemplate={(id) => {
              if (confirm('确定要载入此模板吗？当前画布中的内容将被替换。')) {
                loadSavedTemplate(id);
              }
            }}
            onDeleteTemplate={(id) => {
              if (confirm('确定要删除此模板吗？此操作不可撤销。')) {
                deleteSavedTemplate(id);
              }
            }}
          />
        )}
      </div>

      <SaveTemplateDialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} />
      <ImportResumeDialog open={importResumeDialogOpen} onClose={() => setImportResumeDialogOpen(false)} />
    </div>
  );
};

// ---- Templates Panel Sub-Component ----
interface TemplatesPanelProps {
  savedTemplates: ReturnType<typeof useLegoDesignerStore.getState>['savedTemplates'];
  activeCategoryFilter: string;
  setActiveCategoryFilter: (cat: string) => void;
  onSaveTemplate: () => void;
  onLoadTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
}

const TemplatesPanel: React.FC<TemplatesPanelProps> = ({
  savedTemplates,
  activeCategoryFilter,
  setActiveCategoryFilter,
  onSaveTemplate,
  onLoadTemplate,
  onDeleteTemplate
}) => {
  const categories = useMemo(() => {
    const cats = new Set<string>();
    savedTemplates.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return ['全部', ...Array.from(cats)];
  }, [savedTemplates]);

  const filtered = useMemo(() => {
    if (activeCategoryFilter === '全部') return savedTemplates;
    return savedTemplates.filter(t => t.category === activeCategoryFilter);
  }, [savedTemplates, activeCategoryFilter]);

  return (
    <div className="space-y-3">
      {/* Save Button */}
      <button
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
        onClick={onSaveTemplate}
      >
        <BookmarkPlus className="w-4 h-4" />
        将当前画布存为模板
      </button>

      {/* Category Filter */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map(cat => (
            <button
              key={cat}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                activeCategoryFilter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
              onClick={() => setActiveCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Template Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <FolderOpen className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500 font-medium">暂无自定义模板</p>
          <p className="text-[10px] text-slate-400 mt-1">点击上方按钮，将当前简历保存为可复用模板</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(tpl => (
            <div
              key={tpl.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all group"
            >
              {/* Cover */}
              <div className="relative h-28 bg-slate-50 overflow-hidden">
                {tpl.cover ? (
                  <img
                    src={tpl.cover}
                    alt={tpl.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <FolderOpen className="w-8 h-8 text-slate-300" />
                    <span className="text-[10px] text-slate-400 mt-1">{tpl.name}</span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold rounded-lg flex items-center gap-1 shadow-md transition-all"
                    onClick={() => onLoadTemplate(tpl.id)}
                  >
                    <Download className="w-3 h-3" />
                    载入模板
                  </button>
                  <button
                    className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-md transition-all"
                    onClick={() => onDeleteTemplate(tpl.id)}
                    title="删除此模板"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{tpl.name}</span>
                  <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                    {tpl.category}
                  </span>
                </div>
                {tpl.description && (
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{tpl.description}</p>
                )}
                <p className="text-[10px] text-slate-300 mt-0.5">{tpl.createTime}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
