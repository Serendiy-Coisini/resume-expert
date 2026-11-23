import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "简历专家 - 大模型对齐 JD · 简历深度重构 Agent",
  description:
    "结合目标岗位 JD 深度诊断、匹配技能差距、启发挖掘经历细节、一键重构高含金量 Bullet 点",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body
        className="antialiased h-full font-sans bg-slate-950 text-slate-50"
      >
        {children}
      </body>
    </html>
  );
}
