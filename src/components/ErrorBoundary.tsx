import React, { Component, ErrorInfo, ReactNode } from 'react';
import { isStaleChunkError, reloadForNewBuild } from '../app/appUtils';
import { Art } from '../art/Art';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // A new deploy removed the chunk this page was built with: load the new build instead of failing
    if (isStaleChunkError(error) && reloadForNewBuild()) return;
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 bg-[#F9F8F6] dark:bg-[#111111] text-black dark:text-white">
          <Art id="error-oops" className="h-[120px] w-auto mb-3" />
          <div className="text-xs font-bold uppercase tracking-widest text-red-500 mb-4">
            Render Error
          </div>
          <div className="text-sm font-mono text-black/60 dark:text-white/60 max-w-lg text-center break-all">
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn btn-primary mt-6"
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
