import { Component, ErrorInfo, ReactNode } from 'react';
import { notify } from '../utils/feedback';

// Error boundary for one full-screen layer (v1.3). If the wallet, palette, Remix sheet or departure
// board fails to render or load, only that layer closes with a short notice; the page underneath
// keeps working instead of falling through to the app-wide error screen.

interface Props {
  name: string;
  onClose: () => void;
  children: ReactNode;
}

export class LayerBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.name}] layer failed:`, error, info);
    notify(`${this.props.name}을(를) 열지 못했습니다. 잠시 후 다시 시도해 주세요.`, 'error');
    // Close after the current render so the parent is not updated mid-render
    setTimeout(() => this.props.onClose(), 0);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
