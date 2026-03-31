import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Activity, Users, MapPin, ArrowRight } from 'lucide-react';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing">
      {/* Hero Section */}
      <section className="hero container">
        <div className="hero-content">
          <div className="badge hero-badge">Smart City Initiative</div>
          <h1 className="hero-title">
            Empowering Citizens.<br />
            <span className="text-primary">Transforming Communities.</span>
          </h1>
          <p className="hero-subtitle">
            A real-time civic grievance platform connecting you directly with city officers and certified NGOs to track, resolve, and monitor local issues.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary btn-lg">
              Report an Issue <ArrowRight size={18} />
            </Link>
            <Link to="/feed" className="btn btn-outline btn-lg">
              View Public Complaints
            </Link>
          </div>
        </div>
        <div className="hero-image-wrapper">
          <img src="/hero_image.png" alt="Civic Platform Dashboard Demo" className="hero-image" />
          <div className="hero-floating-card top-right">
            <Activity size={20} color="var(--success)" />
            <span>24/7 Issue Tracking</span>
          </div>
          <div className="hero-floating-card bottom-left">
            <MapPin size={20} color="var(--primary)" />
            <span>Live Heatmap Data</span>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats bg-white">
        <div className="container stats-grid">
          <div className="stat-card">
            <h3>12,400+</h3>
            <p className="text-muted">Total Complaints</p>
          </div>
          <div className="stat-card">
            <h3>9,850+</h3>
            <p className="text-muted">Resolved Issues</p>
          </div>
          <div className="stat-card">
            <h3>145</h3>
            <p className="text-muted">Active NGOs</p>
          </div>
          <div className="stat-card">
            <h3>24</h3>
            <p className="text-muted">Cities Covered</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features container">
        <div className="section-header text-center">
          <h2>Platform Features</h2>
          <p className="text-muted">Built for transparency, accountability, and speed.</p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon bg-primary-light">
              <Activity size={24} color="var(--primary)" />
            </div>
            <h3>Public Feed</h3>
            <p className="text-muted">Browse local issues like a social feed. Upvote and subscribe to stay informed on priority complaints.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon bg-teal-light">
              <Users size={24} color="var(--secondary)" />
            </div>
            <h3>NGO Adoption</h3>
            <p className="text-muted">Certified NGOs can seamlessly adopt and resolve civic issues alongside government officials.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon bg-orange-light">
              <Shield size={24} color="var(--accent)" />
            </div>
            <h3>Priority System</h3>
            <p className="text-muted">Smart algorithms prioritize tasks based on upvote density, user urgency, and time pending.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon bg-red-light">
              <MapPin size={24} color="var(--danger)" />
            </div>
            <h3>Heatmap Analytics</h3>
            <p className="text-muted">Visualize grievance hotspots across the city map to allocate resources where they're needed most.</p>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="footer">
        <div className="container footer-content justify-between items-center flex">
          <div className="navbar-brand">
            <Shield size={24} color="var(--primary)" />
            <span className="navbar-logo-text">CivicSync</span>
          </div>
          <p className="text-muted text-sm">© 2026 CivicSync Initiative. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
