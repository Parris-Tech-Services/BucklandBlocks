import { Component, type ReactNode } from 'react';

export default class GameErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main role="alert" style={{ padding: 24, background: '#1f2937', color: 'white', minHeight: '100vh' }}>
      <h1>The game could not start or continue</h1>
      <p>The graphics engine or game encountered an error. Your saved world has not been deleted.</p>
      <p>If this happens at startup, check that your browser supports WebGL and has graphics acceleration available.</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </main>;
  }
}

