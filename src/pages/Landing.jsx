import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Activity, Users, MapPin, ArrowRight, TrendingUp, Zap, CheckCircle } from 'lucide-react';
import './Landing.css';

const STATS = [
  { value: '12,400+', label: 'Complaints Filed',  icon: Activity,     color: 'var(--primary)'   },
  { value: '9,850+',  label: 'Issues Resolved',   icon: CheckCircle,  color: 'var(--success)'   },
  { value: '145',     label: 'Active NGO Partners',icon: Users,        color: 'var(--secondary)' },
  { value: '24',      label: 'Cities Connected',  icon: MapPin,       color: 'var(--accent)'    },
];

const FEATURES = [
  {
    Icon: Activity, color: 'var(--primary)', bg: 'var(--primary-light)',
    title: 'Real-Time Community Feed',
    desc: 'Browse local civic issues in a live social feed. Upvote, follow, and subscribe to priority complaints affecting your city.'
  },
  {
    Icon: MapPin, color: '#f87171', bg: 'rgba(248,113,113,0.1)',
    title: 'Grievance Heatmap',
    desc: 'Visualize complaint density across the city on an interactive map. Identify hotspots and allocate resources with precision.'
  },
  {
    Icon: Users, color: 'var(--secondary)', bg: 'rgba(129,140,248,0.1)',
    title: 'NGO Case Adoption',
    desc: 'Verified NGOs can seamlessly adopt unresolved civic issues alongside government officials to accelerate resolution.'
  },
  {
    Icon: Zap, color: 'var(--accent)', bg: 'rgba(251,191,36,0.1)',
    title: 'Smart Priority Engine',
    desc: 'Algorithms rank issues by upvote density, urgency level, and time pending — so the most critical problems always surface first.'
  },
];

export default function Landing() {
  return (
    <div className="landing">
      {/* ── Hero ────────────────────────────── */}
      <section className="hero-section">
        {/* Background orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <div className="container hero-inner">
          <div className="hero-content animate-fade-in">
            <div className="hero-tag">
              <TrendingUp size={13} />
              Smart City Initiative · Built for Real Impact
            </div>

            <h1 className="hero-title">
              Snap it.
              <span className="gradient-text"> Fix it.</span>
            </h1>

            <p className="hero-subtitle">
              SnapFix connects citizens directly with city officers, certified NGOs, and local
              government — snap a photo, file your issue, and watch it get fixed in real-time.
            </p>

            <div className="hero-ctas">
              <Link to="/signup" className="btn btn-primary btn-xl" id="hero-cta-primary">
                Report an Issue <ArrowRight size={18} />
              </Link>
              <Link to="/feed" className="btn btn-outline btn-xl" id="hero-cta-secondary">
                View Public Feed
              </Link>
            </div>

            <div className="hero-trust">
              <div className="trust-avatars">
                {['A','B','C','D'].map((l,i) => (
                  <div key={l} className="trust-avatar" style={{ background: ['#14b8a6','#818cf8','#fbbf24','#f87171'][i], zIndex: 4-i }}>
                    {l}
                  </div>
                ))}
              </div>
              <p className="trust-text">Join <strong>2,400+</strong> active citizens reporting issues</p>
            </div>
          </div>

          <div className="hero-visual animate-float">
            <div className="hero-image-wrapper">
              <img src="/hero_image.png" alt="SnapFix Platform Preview" className="hero-img" />
              <div className="floating-chip chip-top">
                <CheckCircle size={16} color="var(--success)" />
                <span>Issue Resolved!</span>
              </div>
              <div className="floating-chip chip-bottom">
                <MapPin size={16} color="var(--primary)" />
                <span>Live Heatmap Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────── */}
      <section className="stats-section">
        <div className="container stagger">
          {STATS.map(({ value, label, icon: Icon, color }) => (
            <div className="stat-item animate-fade-in" key={label}>
              <div className="stat-icon-ring" style={{ background: `${color}18`, color }}>
                <Icon size={22} />
              </div>
              <div className="stat-number" style={{ color }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────── */}
      <section className="features-section">
        <div className="container">
          <div className="section-header animate-fade-in">
            <div className="section-tag">Platform Features</div>
            <h2>Built for Transparency &amp; Speed</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: '1.0625rem' }}>
              Every feature is purpose-built to reduce friction between citizens and government.
            </p>
          </div>

          <div className="features-grid stagger">
            {FEATURES.map(({ Icon, color, bg, title, desc }) => (
              <div className="feature-card animate-fade-in card-hover" key={title}>
                <div className="feature-icon-wrap" style={{ background: bg, color }}>
                  <Icon size={24} />
                </div>
                <h3>{title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────── */}
      <section className="cta-section">
        <div className="cta-orb" />
        <div className="container cta-inner animate-fade-in">
          <div>
            <h2 style={{ color: '#fff' }}>Ready to make your city better?</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>
              Join thousands of citizens already driving real change in their communities.
            </p>
          </div>
          <Link to="/signup" className="btn btn-xl" style={{ background: '#fff', color: 'var(--primary)', fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────── */}
      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <Shield size={20} color="var(--primary)" />
            <span>SnapFix</span>
          </div>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.8125rem' }}>
            © 2026 SnapFix Initiative. Snap it. Fix it.
          </p>
        </div>
      </footer>
    </div>
  );
}
