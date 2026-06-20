import { Component, type ErrorInfo, type ReactNode } from 'react';

import { CrashScreen } from './CrashScreen';

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Catches render-time errors and shows the CrashScreen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info);
  }

  render(): ReactNode {
    return this.state.hasError ? <CrashScreen /> : this.props.children;
  }
}
