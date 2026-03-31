import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ShieldAlert, User, LogOut, Map, Activity, Moon, Sun, Settings as SettingsIcon } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const dashboardLink = user ? `/dashboard/${user.role.toLowerCase()}` : '/login';

  return (
    <nav className="navbar">
      <div className="navbar-brand-section">
        <Link to="/" className="navbar-brand">
          <div className="logo-icon-wrapper">
            <ShieldAlert size={26} color="white" />
          </div>
          <span className="navbar-logo-text">CivicSync</span>
        </Link>
      </div>
      
      <div className="navbar-links">
        <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} color="var(--warning)" />}
        </button>

        <div className="nav-divider"></div>
        
        {user ? (
          <>
            <Link to="/feed" className="nav-link"><Activity size={18} /> Public Feed</Link>
            <Link to="/map" className="nav-link"><Map size={18} /> Heatmap</Link>
            <div className="navbar-user">
              <Link to="/settings" className="btn-icon" aria-label="Settings">
                 <SettingsIcon size={20} />
              </Link>
              <Link to={dashboardLink} className="btn btn-primary nav-dashboard-btn">
                <User size={16} /> My Dashboard
              </Link>
              <button onClick={handleLogout} className="btn-icon logout-btn" aria-label="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="navbar-auth">
            <Link to="/login" className="btn btn-outline nav-login-btn">Login</Link>
            <Link to="/signup" className="btn btn-primary nav-signup-btn">Get Started</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
