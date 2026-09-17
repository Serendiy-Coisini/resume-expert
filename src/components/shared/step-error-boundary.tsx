"use client";

import React, { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Undo } from "lucide-react";
import { useResumeStore } from "@/store/resume-store";

interface StepErrorBoundaryProps {
  children: ReactNode;
  stepId: string;
}

interface StepErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class StepErrorBoundary extends Component<StepErrorBoundaryProps, StepErrorBoundaryState> {
  constructor(props: StepErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): StepErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[StepErrorBoundary] Caught component crash in step:", this.props.stepId, error, errorInfo);
  }

  componentDidUpdate(prevProps: StepErrorBoundaryProps) {
    if (prevProps.stepId !== this.props.stepId && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoBack = () => {
    this.setState({ hasError: false, error: null });
    useResumeStore.getState().goToPreviousStep();
  };

  handleResetToInput = () => {
    this.setState({ hasError: false, error: null });
    useResumeStore.getState().setCurrentStep("input");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center my-8 rounded-xl border border-rose-200 bg-rose-50/50 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-rose-900 mb-2">
            当前步骤（{this.props.stepId}）渲染异常
          </h3>
          <p className="text-sm text-neutral-600 max-w-md mb-4">
            组件在执行过程中遇到了未捕获的错误。您的数据已保存在内存和会话中，无需担心丢失。
          </p>

          {this.state.error && (
            <div className="text-left w-full max-w-lg mb-6 p-3 bg-white border border-rose-200 rounded-lg text-xs font-mono text-rose-700 overflow-x-auto max-h-32">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              onClick={this.handleRetry}
              variant="default"
              className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              重试当前步骤
            </Button>
            <Button
              onClick={this.handleGoBack}
              variant="outline"
              className="border-neutral-300 text-neutral-700 hover:bg-neutral-100 gap-2"
            >
              <Undo className="h-4 w-4" />
              返回上一步
            </Button>
            <Button
              onClick={this.handleResetToInput}
              variant="ghost"
              className="text-neutral-500 hover:text-neutral-800 text-xs"
            >
              返回第一步输入
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
