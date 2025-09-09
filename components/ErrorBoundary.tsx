import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('ErrorBoundary caught an error:', error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary details:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4" data-testid="error-title">
              TaskMaster Error
            </h1>
            <p className="text-gray-300 mb-4" data-testid="error-message">
              Something went wrong. Please refresh the page.
            </p>
            <pre className="text-xs bg-gray-800 p-4 rounded text-left overflow-auto">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
              data-testid="refresh-button"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
