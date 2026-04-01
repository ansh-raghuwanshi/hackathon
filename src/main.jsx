import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global error boundary to catch Firebase init crashes and show a readable message
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || String(this.state.error);
      const missingEnv = msg.includes('Firebase') || msg.includes('undefined') || msg.includes('apiKey');
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0f0f13', color: '#f0f0f0', fontFamily: 'sans-serif',
          padding: '2rem', textAlign: 'center', gap: '1rem'
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h1 style={{ color: '#f87171', fontSize: '1.5rem', margin: 0 }}>App failed to start</h1>
          {missingEnv && (
            <div style={{
              background: '#1e1e2e', border: '1px solid #f87171', borderRadius: 8,
              padding: '1rem 1.5rem', maxWidth: 520, textAlign: 'left'
            }}>
              <p style={{ color: '#fbbf24', fontWeight: 700, margin: '0 0 8px' }}>
                🔑 Missing environment variables detected
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
                Your Firebase / Cloudinary keys are not set on Vercel.<br /><br />
                Go to: <strong style={{ color: '#fff' }}>Vercel Dashboard → Settings → Environment Variables</strong><br />
                Add all <code style={{ color: '#a78bfa' }}>VITE_FIREBASE_*</code> and <code style={{ color: '#a78bfa' }}>VITE_CLOUDINARY_*</code> keys, then <strong>Redeploy</strong>.
              </p>
            </div>
          )}
          <details style={{ color: '#64748b', fontSize: '0.8rem', maxWidth: 560 }}>
            <summary style={{ cursor: 'pointer' }}>Technical error details</summary>
            <pre style={{ marginTop: 8, textAlign: 'left', background: '#1e1e2e', padding: '0.75rem', borderRadius: 6, overflowX: 'auto' }}>
              {msg}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
