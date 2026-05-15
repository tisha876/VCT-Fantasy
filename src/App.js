// src/App.js
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext';
import AppShell from './AppShell';
import Dashboard    from './Dashboard';
import LiveMatches  from './LiveMatches';
import MyTeam       from './MyTeam';
import Leagues      from './Leagues';
import PlayerScout  from './PlayerScout';
import Profile      from './Profile';
import ScoringRules from './ScoringRules';
import Login        from './Login';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, authLoading } = useApp();
  if (authLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user, authLoading } = useApp();

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: 4, color: 'var(--red)' }}>VCT <span style={{ color: 'var(--text)' }}>Fantasy</span></div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="/"         element={<Dashboard />} />
                <Route path="/live"     element={<LiveMatches />} />
                <Route path="/team"     element={<MyTeam />} />
                <Route path="/leagues"  element={<Leagues />} />
                <Route path="/players"  element={<PlayerScout />} />
                <Route path="/profile"  element={<Profile />} />
                <Route path="/scoring"  element={<ScoringRules />} />
                <Route path="*"         element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </HashRouter>
  );
}