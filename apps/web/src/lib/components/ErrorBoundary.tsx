'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import logger from '@/lib/utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component to catch errors in React component tree
 * and display a fallback UI instead of crashing the app
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error to logger service
    logger.error('Error caught by ErrorBoundary:', error, errorInfo);

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      // Render fallback UI
      return this.props.fallback;
    }

    return this.props.children;
  }
}
