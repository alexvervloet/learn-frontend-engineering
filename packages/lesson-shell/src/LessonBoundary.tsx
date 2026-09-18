import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; resetKey: string };
type State = { error: Error | null };

/**
 * A lesson that throws should not take the sidebar down with it.
 *
 * This has to be a class. Error boundaries are the one piece of React with no
 * hook equivalent: `componentDidCatch` and `getDerivedStateFromError` only exist
 * on classes. In an app you would usually use react-error-boundary rather than
 * writing this, but it is worth seeing once.
 */
export class LessonBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Lesson threw:", error, info.componentStack);
  }

  // Without this, switching lessons would leave the boundary stuck showing the
  // previous lesson's error. resetKey is the active lesson id.
  override componentDidUpdate(prev: Props): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error !== null) {
      this.setState({ error: null });
    }
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error !== null) {
      return (
        <div className="lesson-error" role="alert">
          <h3>This lesson threw</h3>
          <pre>{error.message}</pre>
          <p>The stack is in the browser console.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
