import React from 'react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: unknown }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('Safety Dashboard crashed:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const message =
      this.state.error instanceof Error
        ? this.state.error.message
        : typeof this.state.error === 'string'
          ? this.state.error
          : 'Unknown error';

    return (
      <div style={{
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial',
        padding: 24,
        color: '#0f172a'
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Safety Dashboard failed to load</h1>
        <p style={{ marginBottom: 12 }}>
          เปิด Developer Console (F12) เพื่อดูรายละเอียด error ได้เลย
        </p>
        <pre style={{
          whiteSpace: 'pre-wrap',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 12,
          maxWidth: 900
        }}>{message}</pre>
      </div>
    );
  }
}
