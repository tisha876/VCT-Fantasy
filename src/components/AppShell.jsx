// src/components/AppShell.jsx
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useApp } from '../context/AppContext';
import { PlayerAvatarCircle } from './UI';

const NAV_ITEMS = [
  { to: '/',         label: 'Dashboard',    icon: HomeIcon },
  { to: '/live',     label: 'Live',         icon: LiveIcon },
  { to: '/team',     label: 'My Team',      icon: TeamIcon },
  { to: '/leagues',  label: 'Leagues',      icon: LeaguesIcon },
  { to: '/players',  label: 'Player Scout', icon: SearchIcon },
  { to: '/profile',  label: 'Profile',      icon: ProfileIcon },
];

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/live': 'Live Matches',
  '/team': 'My Team',
  '/leagues': 'Leagues',
  '/players': 'Player Scout',
  '/profile': 'Profile',
  '/scoring': 'Scoring Rules',
};

export default function AppShell({ children }) {
  const { user, userProfile, currentGameweek, notifications } = useApp();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? 'VCT Fantasy';
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">VCT <span>Fantasy</span></div>
        <nav className="sidebar-nav">
          <div className="nav-section">Main</div>
          {NAV_ITEMS.slice(0, 3).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon />{label}
            </NavLink>
          ))}
          <div className="nav-section">Compete</div>
          {NAV_ITEMS.slice(3).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon />{label}
            </NavLink>
          ))}
          <div className="nav-section">Admin</div>
          <NavLink to="/scoring" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <RulesIcon />Scoring Rules
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-row">
            <PlayerAvatarCircle
              name={userProfile?.teamName ?? user?.displayName ?? '?'}
              photoUrl={user?.photoURL}
              size={34}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userProfile?.teamName ?? user?.displayName ?? 'Guest'}
              </div>
              <div className="user-pts">{(userProfile?.totalPoints ?? 0).toLocaleString()} pts</div>
            </div>
            <button
              onClick={() => signOut(auth)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
              title="Sign out"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-area">
        <header className="topbar">
          <h1 className="topbar-title">{title}</h1>
          <div className="topbar-right">
            {currentGameweek && (
              <NavLink to="/live" className="topbar-pill" style={{ textDecoration: 'none' }}>
                {currentGameweek.status === 'active' && <span className="live-pip" style={{ marginRight: 5 }} />}
                {currentGameweek.name ?? 'Gameweek'}
              </NavLink>
            )}
            <NavLink to="/profile" className="notif-btn">
              <BellIcon />
              {unread > 0 && <span className="notif-dot" />}
            </NavLink>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
          >
            <Icon />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function HomeIcon()    { return <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function LiveIcon()    { return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function TeamIcon()    { return <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>; }
function LeaguesIcon() { return <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function SearchIcon()  { return <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function ProfileIcon() { return <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>; }
function BellIcon()    { return <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function LogoutIcon()  { return <svg viewBox="0 0 24 24" style={{width:14,height:14}} strokeWidth={1.8} stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function RulesIcon()   { return <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
