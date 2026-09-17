"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { renderTemplateHTML } from "@/lib/resume-templates";
import { useResumeStore } from "@/store/resume-store";
import type { FinalResume, TemplateId } from "@/types/resume";

interface ResumeTemplateViewProps {
  resume: FinalResume;
  templateId: TemplateId;
}

export function ResumeTemplateView({ resume, templateId }: ResumeTemplateViewProps) {
  const { customTemplateHTML, templateOptions, showPageBreakGuide } = useResumeStore();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [contentHeight, setContentHeight] = useState<number>(1160);
  const [iframeWidth, setIframeWidth] = useState<number>(820);

  const compiledHTML = renderTemplateHTML(
    resume,
    templateId,
    customTemplateHTML,
    templateOptions
  );

  // Measure actual iframe rendered content height
  const updateIframeDimensions = useCallback(() => {
    if (!iframeRef.current) return;
    try {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc && doc.body) {
        const bodyH = doc.body.scrollHeight;
        const elemH = doc.documentElement.scrollHeight;
        const actualH = Math.max(bodyH, elemH, 800);
        setContentHeight(actualH);

        const currentW = iframeRef.current.clientWidth || doc.body.clientWidth || 820;
        if (currentW > 200) {
          setIframeWidth(currentW);
        }
      }
    } catch {
      // Ignore sandbox/cross-origin fallback
    }
  }, []);

  useEffect(() => {
    updateIframeDimensions();
    const t1 = setTimeout(updateIframeDimensions, 300);
    const t2 = setTimeout(updateIframeDimensions, 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [compiledHTML, updateIframeDimensions]);

  // Listen to window resizing to re-calculate aspect ratio
  useEffect(() => {
    const handleResize = () => {
      updateIframeDimensions();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateIframeDimensions]);

  // Standard A4 aspect ratio is 210mm x 297mm (1 : 1.4142)
  const a4PageHeightPx = Math.round(iframeWidth * (297 / 210));
  const effectivePageHeight = Math.max(a4PageHeightPx, 800);
  // Total pages based on content height
  const totalPages = Math.max(1, Math.ceil((contentHeight - 15) / effectivePageHeight));

  return (
    <Card className="relative overflow-hidden border-slate-200 shadow-md bg-white rounded-xl w-full">
      {/* Smart Pagination Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 text-xs select-none">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-2 w-2 rounded-full ${
              totalPages === 1 ? "bg-emerald-500" : "bg-blue-500"
            }`}
          />
          <span className="font-semibold text-slate-700">A4 分页诊断：</span>
          {totalPages === 1 ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
              ✅ 完美收敛为标准 A4 单页 (无多余空白与跨页腰斩)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-medium">
              📄 标准 A4 篇幅约 {totalPages} 页 (已开启标题孤行避让与段落防截断)
            </span>
          )}
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-3">
          <span>
            智能防截断:{" "}
            <strong
              className={
                templateOptions.enableSmartPagination !== false
                  ? "text-emerald-600 font-bold"
                  : "text-amber-600 font-bold"
              }
            >
              {templateOptions.enableSmartPagination !== false ? "已开启" : "已关闭"}
            </strong>
          </span>
          <span className="text-slate-300">|</span>
          <span>
            密度:{" "}
            <strong className="text-slate-700 font-semibold">
              {templateOptions.density === "compact"
                ? "紧凑 (冲刺单页)"
                : templateOptions.density === "relaxed"
                ? "宽松"
                : "标准"}
            </strong>
          </span>
        </div>
      </div>

      {/* Main Preview Container with Dynamic Multi-Page Guides */}
      <div ref={containerRef} className="relative w-full overflow-x-auto touch-pan-x bg-slate-100/50 p-2 md:p-4">
        <div className="relative mx-auto bg-white shadow-md rounded-sm overflow-hidden" style={{ minWidth: "720px", maxWidth: "900px" }}>
          {/* Dynamic Multi-Page A4 Cut Guides */}
          {showPageBreakGuide && (
            <>
              {Array.from({ length: totalPages }).map((_, index) => {
                const cutTop = (index + 1) * effectivePageHeight;
                const isLastPageEnd = index === totalPages - 1;

                if (cutTop > contentHeight + 80 && !isLastPageEnd) {
                  return null;
                }

                return (
                  <div
                    key={`a4-cut-guide-${index}`}
                    className="pointer-events-none absolute inset-x-0 z-30 flex items-center justify-between border-b-2 border-dashed border-rose-500 bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-700 backdrop-blur-[1px] shadow-2xs"
                    style={{ top: `${cutTop}px` }}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>✂️ A4 物理分页切割线</span>
                      <span className="font-mono text-[11px] bg-rose-600 text-white px-1.5 py-0.2 rounded shadow-2xs">
                        第 {index + 1} 页结束 / 第 {index + 2} 页开始
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold text-rose-600/90">
                      标准 A4 高度 297mm 截断警戒线
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {/* Seamless Iframe with Dynamically Calculated Height */}
          <iframe
            ref={iframeRef}
            key={`${templateId}-${JSON.stringify(templateOptions)}-${resume?.personalInfo?.avatarUrl || "no-avatar"}-${resume?.personalInfo?.name || ""}`}
            srcDoc={compiledHTML}
            title="Resume Template Live Preview"
            sandbox="allow-same-origin"
            onLoad={updateIframeDimensions}
            className="w-full border-0 bg-white block transition-all duration-200"
            style={{
              height: `${Math.max(contentHeight, effectivePageHeight)}px`,
              minHeight: `${effectivePageHeight}px`,
            }}
          />
        </div>
      </div>
    </Card>
  );
}
