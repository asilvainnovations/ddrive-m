import React from "react";

interface State {
  error: Error | null;
}

// Catches a crash in any module so the user sees a recovery screen instead of a blank page.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[DDRiVE-M] Screen crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center p-6 font-poppins">
        <div className="max-w-md text-center rounded-2xl border border-slate-200 bg-white p-8 shadow">
          <h1 className="text-2xl font-bold font-montserrat text-slate-900 mb-2">This screen stopped working</h1>
          <p className="text-sm text-slate-600 mb-6">
            Your saved data is not affected. Reload the page to try again. If it keeps happening, tell your
            administrator what you were doing when it stopped.
          </p>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold"
          >
            Reload the dashboard
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
