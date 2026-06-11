import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from './StateViews';
import { reportClientError } from '../lib/monitoring';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportClientError(error, {
      componentStack: errorInfo.componentStack || undefined,
      source: 'react.error_boundary',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="container page">
          <ErrorState
            title="We hit an unexpected issue"
            message="Refresh the page to keep shopping. Our team can use the error report to investigate."
            action={{
              label: 'Refresh Page',
              onClick: () => window.location.reload(),
            }}
          />
        </main>
      );
    }

    return this.props.children;
  }
}
