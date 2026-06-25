import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "../../services/Logger";
import { BentoErrorCard } from "./BentoErrorCard";

type Props = {
  children: ReactNode;
  bento?: string;
  onRetry?: () => void;
};

type State = {
  error: Error | null;
};

export class BentoErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const bento = this.props.bento ?? "UnknownBento";
    logger.error("Bento crash", "BentoErrorBoundary", {
      bento,
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack
    });
    if (typeof window !== "undefined") {
      window.__lastBentoCrash = {
        bento,
        error: error.message,
        stack: error.stack
      };
    }
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <BentoErrorCard
          title="Section unavailable"
          message={this.state.error.message}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
