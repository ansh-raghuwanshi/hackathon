import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShieldCheck, Activity, AlertTriangle, CheckCircle, BarChart3, MapPin, Layers, Flame, Clock } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import StatCard from '../components/ui/StatCard';
import { SkeletonStatCard, SkeletonRow } from '../components/ui/Skeleton';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('overview');

  useEffect(() => {
    const q = query(collection(db, 'Complaints'));
    const unsub = onSnapshot(q, snap => {
      setComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (user && !user.city) window.location.href = '/settings';
  }, [user]);

  if (user && !user.city) return null;

  const cityComplaints = complaints.filter(c => c.city?.toUpperCase() === user?.city?.toUpperCase());
  const total      = cityComplaints.length;
  const open       = cityComplaints.filter(c => ['Registered', 'Assigned'].includes(c.status)).length;
  const resolved   = cityComplaints.filter(c => c.status === 'Resolved').length;
  const escalated  = cityComplaints.filter(c => c.status === 'Escalated');
  const highPrio   = cityComplaints.filter(c => c.urgency === 'High');
  const initials   = user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'A';

  // Overdue: pending (not Resolved) for more than 10 days
  const OVERDUE_MS = 10 * 24 * 60 * 60 * 1000;
  const overdue    = cityComplaints.filter(c => {
    const isPending = c.status !== 'Resolved';
    const createdMs = c.createdAt?.toMillis ? c.createdAt.toMillis() : (c.createdAt || 0);
    return isPending && (Date.now() - createdMs) > OVERDUE_MS;
  });

  const handleAdminAction = async (id, type) => {
    try {
      const ref = doc(db, 'Complaints', id);
      if (type === 'reassign') {
        await updateDoc(ref, { status: 'Assigned', resolvedImageUrl: null, citizenFeedback: null, isSatisfied: null, updatedAt: serverTimestamp() });
      } else if (type === 'overrule') {
        await updateDoc(ref, { status: 'Resolved', updatedAt: serverTimestamp() });
      }
    } catch (e) { console.error(e); alert('Admin action failed.'); }
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div className="sidebar-avatar" style={{ background: 'linear-gradient(135deg, var(--danger), #ef4444)' }}>{initials}</div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{user?.name || 'Admin'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, background: 'var(--danger-bg)', color: 'var(--danger)', padding: '2px 10px', borderRadius: 'var(--r-full)', display: 'inline-block', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.6875rem' }}>
            Platform Monitor
          </div>
        </div>

        <div className="sidebar-section-title">Dashboard</div>
        <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} id="tab-admin-overview">
          <BarChart3 size={16} /> Regional Overview
        </button>
        <button className={`nav-item ${activeTab === 'escalations' ? 'active' : ''}`}
          onClick={() => setActiveTab('escalations')} id="tab-escalations"
          style={activeTab === 'escalations' ? { color: 'var(--danger)', background: 'var(--danger-bg)' } : { color: 'var(--danger)' }}>
          <AlertTriangle size={16} /> Escalation Audit
          {escalated.length > 0 && <span className="nav-badge">{escalated.length}</span>}
        </button>
        <button className={`nav-item ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')} id="tab-all-complaints">
          <Layers size={16} /> All Complaints
        </button>
        <button
          className={`nav-item ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveTab('overdue')} id="tab-overdue"
          style={activeTab !== 'overdue' ? { color: '#f97316' } : { color: '#f97316', background: 'rgba(249,115,22,0.1)' }}
        >
          <Flame size={16} /> Overdue
          {overdue.length > 0 && <span className="nav-badge" style={{ background: '#f97316' }}>{overdue.length}</span>}
        </button>

        <div className="sidebar-section-title" style={{ marginTop: 8 }}>Tools</div>
        <Link to="/map" className="nav-item" id="admin-heatmap-link">
          <MapPin size={16} /> Interactive Heatmap
        </Link>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ marginBottom: 4 }}>
            {user?.city ? `${user.city} Region` : 'Global'} Admin Console
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            Real-time oversight of all civic complaints in your jurisdiction.
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {loading ? (
            <><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /></>
          ) : (
            <>
              <StatCard icon={Activity}      label="Total Cases"         value={total}            accentColor="var(--primary)" />
              <StatCard icon={BarChart3}     label="Open / Assigned"     value={open}             accentColor="var(--warning)" />
              <StatCard icon={CheckCircle}   label="Verified Solutions"  value={resolved}         accentColor="var(--success)" />
              <StatCard icon={AlertTriangle} label="Active Escalations"  value={escalated.length} danger />
            </>
          )}
        </div>

        {/* Overdue alert banner */}
        {!loading && overdue.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.35)',
            borderLeft: '4px solid #f97316',
            borderRadius: 'var(--r-md)',
            padding: '12px 18px',
            marginBottom: 24,
            animation: 'pulse-overdue 2.5s ease-in-out infinite',
          }}>
            <Flame size={18} color="#f97316" />
            <div>
              <span style={{ fontWeight: 700, color: '#f97316', fontSize: '0.9375rem' }}>
                {overdue.length} complaint{overdue.length !== 1 ? 's' : ''} overdue
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: 8 }}>
                — pending resolution for more than 10 days.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('overdue')}
              style={{ marginLeft: 'auto', padding: '4px 14px', borderRadius: 'var(--r-full)', background: '#f97316', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Review
            </button>
          </div>
        )}

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={16} color="var(--warning)" />
                <h3>High Priority Queue</h3>
              </div>
              {loading ? (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : highPrio.length > 0 ? (
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {highPrio.map(c => (
                    <div key={c.id} style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 150ms' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 2 }}>{c.title}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Score: {c.priorityScore}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="badge badge-status" data-status={c.status}>{c.status}</span>
                        <Link to={`/complaint/${c.id}`} style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View</Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <CheckCircle size={32} style={{ color: 'var(--success)', opacity: 0.5, margin: '0 auto 12px' }} />
                  <p style={{ color: 'var(--text-muted)' }}>No high priority alerts right now.</p>
                </div>
              )}
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12 }}>
              <div style={{ width: 64, height: 64, borderRadius: 'var(--r-xl)', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <ShieldCheck size={32} color="var(--primary)" />
              </div>
              <h3>System Health: Optimal</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.6, maxWidth: 260 }}>
                All regional routing, analytics pipelines, and escalation channels are functioning correctly.
              </p>
            </div>
          </div>
        )}

        {/* ── Escalations Tab ── */}
        {activeTab === 'escalations' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: 'rgba(248,113,113,0.2)' }}>
            <div style={{ background: 'var(--danger)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color="white" />
              <h3 style={{ color: '#fff' }}>Escalation Audit Queue</h3>
            </div>
            {loading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : escalated.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {escalated.map(c => (
                  <div key={c.id} style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <h4 style={{ marginBottom: 4 }}>{c.title}</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} /> {c.locationText}
                        </p>
                      </div>
                      <Link to={`/complaint/${c.id}`} className="btn btn-outline btn-sm">Review Thread</Link>
                    </div>
                    <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(248,113,113,0.2)', borderLeft: '3px solid var(--danger)', borderRadius: 'var(--r-md)', padding: '10px 14px', marginBottom: 14 }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--danger)', marginBottom: 4 }}>Citizen Statement</div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{c.citizenFeedback}"</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button onClick={() => handleAdminAction(c.id, 'overrule')} className="btn btn-success">
                        <CheckCircle size={15} /> Overrule → Mark Resolved
                      </button>
                      <button onClick={() => handleAdminAction(c.id, 'reassign')} className="btn btn-danger">
                        <AlertTriangle size={15} /> Reject Proof / Re-Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                <CheckCircle size={40} style={{ color: 'var(--success)', opacity: 0.4, margin: '0 auto 16px' }} />
                <h3 style={{ marginBottom: 8 }}>No active escalations</h3>
                <p style={{ color: 'var(--text-muted)' }}>No citizens are disputing official resolutions right now.</p>
              </div>
            )}
          </div>
        )}

        {/* ── All Complaints Tab ── */}
        {activeTab === 'all' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Regional Master Database</h3>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{cityComplaints.length} records</span>
            </div>
            {loading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : cityComplaints.length > 0 ? (
              <div style={{ maxHeight: 560, overflowY: 'auto' }}>
                {[...cityComplaints].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(c => {
                  const createdMs = c.createdAt?.toMillis ? c.createdAt.toMillis() : (c.createdAt || 0);
                  const isRowOverdue = c.status !== 'Resolved' && (Date.now() - createdMs) > OVERDUE_MS;
                  const daysOld = Math.floor((Date.now() - createdMs) / (24 * 60 * 60 * 1000));
                  return (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid var(--border)', transition: 'background 150ms', background: isRowOverdue ? 'rgba(249,115,22,0.05)' : '', borderLeft: isRowOverdue ? '3px solid #f97316': '3px solid transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = isRowOverdue ? 'rgba(249,115,22,0.10)' : 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = isRowOverdue ? 'rgba(249,115,22,0.05)' : ''}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isRowOverdue && <Flame size={13} color="#f97316" />}
                          {c.title}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', gap: 10 }}>
                          <span>{c.category}</span><span>·</span><span>{c.city}</span><span>·</span>
                          <span>{isRowOverdue ? <span style={{ color: '#f97316', fontWeight: 600 }}>{daysOld}d overdue</span> : new Date(createdMs).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span className="badge badge-status" data-status={c.status}>{c.status}</span>
                        <Link to={`/complaint/${c.id}`} style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View →</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>No complaints in your region yet.</p>
            )}
          </div>
        )}

        {/* ── Overdue Tab ── */}
        {activeTab === 'overdue' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: 'rgba(249,115,22,0.3)' }}>
            <div style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Flame size={18} color="white" />
              <h3 style={{ color: '#fff' }}>Overdue Complaints — Requires Attention</h3>
            </div>
            {loading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : overdue.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {overdue.map(c => {
                  const createdMs = c.createdAt?.toMillis ? c.createdAt.toMillis() : (c.createdAt || 0);
                  const daysOld   = Math.floor((Date.now() - createdMs) / (24 * 60 * 60 * 1000));
                  return (
                    <div key={c.id} style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 150ms' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Flame size={14} color="#f97316" />
                          {c.title}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{c.locationText}</span>
                          <span>·</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#f97316', fontWeight: 600 }}>
                            <Clock size={11} />{daysOld} day{daysOld !== 1 ? 's' : ''} pending
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="badge badge-status" data-status={c.status}>{c.status}</span>
                        <Link to={`/complaint/${c.id}`} className="btn btn-sm" style={{ background: '#f97316', color: '#fff', border: 'none' }}>Review →</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                <CheckCircle size={40} style={{ color: 'var(--success)', opacity: 0.4, margin: '0 auto 16px' }} />
                <h3 style={{ marginBottom: 8 }}>No overdue complaints</h3>
                <p style={{ color: 'var(--text-muted)' }}>All issues in your region are within the 10-day response window.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
