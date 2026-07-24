import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  // @ts-ignore
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    // @ts-ignore
    this.setState({ hasError: false, error: null });
  };

  public render() {
    // @ts-ignore
    const { hasError, error } = this.state || {};
    // @ts-ignore
    const { children, fallbackTitle } = this.props || {};

    if (hasError) {
      return (
        <div className="bg-white p-8 rounded-3xl border border-rose-200 shadow-md max-w-2xl mx-auto my-8 text-center animate-in fade-in duration-300">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            {fallbackTitle || '화면을 불러오는 도중 일시적인 오류가 발생했습니다.'}
          </h3>
          <p className="text-xs text-slate-500 mb-4 font-mono bg-slate-50 p-3 rounded-xl border border-slate-200 text-left overflow-auto max-h-32">
            {error?.message || '알 수 없는 오류'}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>다시 시도하기</span>
          </button>
        </div>
      );
    }

    return children;
  }
}
