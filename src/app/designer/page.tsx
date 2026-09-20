"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, FileText, FileUp } from "lucide-react";
import { LegoDesigner } from "@/components/legoDesigner";
import { ImportResumeDialog } from "@/components/legoDesigner/ImportResumeDialog";
import { useLegoDesignerStore } from "@/store/lego-designer-store";
import { saveLegoDraft } from "@/lib/lego-draft";

export default function DesignerPage() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { schema } = useLegoDesignerStore();

  const handleSaveDraft = () => {
    const result = saveLegoDraft(schema);
    if (result.success) {
      alert(`🎉 草稿已成功保存到浏览器本地存储！(${result.savedTime})`);
    } else {
      alert("草稿保存失败，浏览器存储空间可能已满");
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 text-slate-50 overflow-hidden">
      {/* Top Header Bar */}
      <header className="flex-none h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className="p-2 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-slate-100 flex items-center justify-center"
            title="返回首页"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-wide">自由积木简历设计器</h1>
              <p className="text-[10px] text-slate-400 hidden sm:block">自由拖拽 · 导入数据 · 任意排版风格一键套用</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setImportDialogOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>导入初始简历</span>
          </button>

          <button
            onClick={handleSaveDraft}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>保存草稿</span>
          </button>
        </div>
      </header>
      
      {/* Designer Content */}
      <main className="flex-1 overflow-hidden relative">
        <LegoDesigner standalone={true} />
      </main>

      <ImportResumeDialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} />
    </div>
  );
}
