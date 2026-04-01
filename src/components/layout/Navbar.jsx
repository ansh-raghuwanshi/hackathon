import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ShieldCheck, LogOut, Map, Activity, Moon, Sun, Settings as SettingsIcon, LayoutDashboard } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [theme, setTheme]       = useState(localStorage.getItem('theme') || 'dark');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleTheme  = () => setTheme(p => p === 'light' ? 'dark' : 'light');
  const handleLogout = async () => { await logout(); navigate('/login'); };
  const dashboardLink = user ? `/dashboard/${user.role.toLowerCase()}` : '/login';

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const isActive = (href) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      {/* Brand */}
      <Link to="/" className="navbar-brand">
        <div className="logo-mark">
          <ShieldCheck size={18} strokeWidth={2.5} color="white" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span className="navbar-logo-text">SnapFix</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-subtle)', letterSpacing: '0.06em', fontWeight: 500, textTransform: 'uppercase' }}>Snap it. Fix it.</span>
        </div>
      </Link>

      {/* Centre links */}
      {user && (
        <div className="nav-links-center">
          <Link to="/feed" className={`nav-link ${isActive('/feed') ? 'nav-link-active' : ''}`}>
            <Activity size={15} />
            Feed
          </Link>
          <Link to="/map" className={`nav-link ${isActive('/map') ? 'nav-link-active' : ''}`}>
            <Map size={15} />
            Heatmap
          </Link>
          <Link to={dashboardLink} className={`nav-link ${isActive('/dashboard') ? 'nav-link-active' : ''}`}>
            <LayoutDashboard size={15} />
            Dashboard
          </Link>
        </div>
      )}

      {/* Right side */}
      <div className="nav-right">
        {/* Theme toggle */}
        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
          {theme === 'light'
            ? <Moon  size={16} />
            : <Sun   size={16} style={{ color: 'var(--accent)' }} />}
        </button>

        {user ? (
          <>
            <Link to="/settings" className="icon-btn" aria-label="Settings" title="Settings">
              <SettingsIcon size={16} />
            </Link>

            {/* Avatar */}
            <div className="nav-avatar" title={user.name}>
              {initials}
            </div>

            <button className="icon-btn icon-btn-danger" onClick={handleLogout} aria-label="Logout" title="Logout">
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <div className="nav-auth">
            <Link to="/login"  className="btn btn-ghost btn-sm">Login</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
