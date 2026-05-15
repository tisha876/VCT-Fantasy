// src/pages/Login.jsx
import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogle() {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 16, padding: '48px 40px', width: '100%', maxWidth: 420, textAlign: 'center',
      }}>
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--red)', marginBottom: 6 }}>
          VCT <span style={{ color: 'var(--text)' }}>Fantasy</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 36 }}>
          Draft your pro roster. Score fantasy points. Win your league.
        </div>

        {[
          { icon: '🎮', text: 'Draft 5 VCT pros from any region' },
          { icon: '📊', text: 'Live points from real match stats' },
          { icon: '🏆', text: 'Private leagues with invite codes' },
          { icon: '⚡', text: 'Chips, wildcards & H2H matchups' },
        ].map(f => (
          <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11, textAlign: 'left' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{f.text}</span>
          </div>
        ))}

        <div style={{ borderTop: '0.5px solid var(--border)', margin: '24px 0' }} />

        <button onClick={handleGoogle} disabled={loading} style={{
          width: '100%', background: loading ? 'rgba(255,255,255,0.06)' : 'white',
          color: '#1a1a1a', border: 'none', borderRadius: 10, padding: '13px 20px',
          fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          opacity: loading ? 0.6 : 1, transition: 'opacity 0.12s',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {error && (
          <div style={{ marginTop: 14, fontSize: 12, color: '#ff8a93', background: 'rgba(255,70,85,0.08)', borderRadius: 8, padding: '8px 14px' }}>
            {error}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 20 }}>
          Stats powered by VLR.gg unofficial API.
        </div>
      </div>
    </div>
  );
}