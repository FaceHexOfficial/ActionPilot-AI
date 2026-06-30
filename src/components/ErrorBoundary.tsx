import { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetApp = () => {
    if (confirm("Are you sure you want to reset the application? This will clear active session settings but preserve tasks.")) {
      localStorage.removeItem('actionpilot-theme');
      localStorage.removeItem('actionpilot_prefilled_task_date');
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500"></div>
            
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Secured Error Guard
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  The application has intercepted an unexpected runtime state. Your session and credentials remain completely secure.
                </p>
              </div>

              <div className="w-full bg-slate-950 border border-slate-800/80 rounded-lg p-4 text-left font-mono text-xs text-slate-500 max-h-32 overflow-y-auto">
                <span className="text-red-400 font-semibold">Error:</span> {this.state.error?.message || "Unknown error context"}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button 
                  onClick={this.handleReload}
                  className="flex-1 gap-2 bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload App
                </Button>
                <Button 
                  onClick={this.handleResetApp}
                  variant="outline"
                  className="flex-1 gap-2 border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Session
                </Button>
              </div>

              <a 
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary/80 hover:text-primary transition-colors uppercase tracking-wider"
              >
                <Home className="w-3.5 h-3.5" />
                Return to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
