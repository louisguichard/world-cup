import { Component, type ReactNode } from "react";

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  crashed: boolean;
}

/** Isolates enrichment panel failures from the critical path (scores, standings). */
export class PanelErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  componentDidCatch(err: Error): void {
    console.warn(`[${this.props.name}] panel crashed:`, err.message);
  }

  render(): ReactNode {
    if (this.state.crashed) {
      return <div className="panel-error">{this.props.name} unavailable</div>;
    }
    return this.props.children;
  }
}
