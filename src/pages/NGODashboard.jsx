import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HeartPulse, Activity, MapPin, ShieldCheck, CheckCircle, Image as ImageIcon, X } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import StatCard from '../components/ui/StatCard';
import { SkeletonStatCard, SkeletonRow } from '../components/ui/Skeleton';

export default function NGODashboard() {
  const { user } = useAuthStore();
  const [complaints,   setComplaints]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState('orphan');
  const [resolveModal, setResolveModal] = useState(false);
  const [targetId,     setTargetId]     = useState(null);
  const [resolveImage, setResolveImage] = useState(null);
  const [isUploading,  setIsUploading]  = useState(false);

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

  const city = user?.city?.toUpperCase();
  const adoptable  = complaints.filter(c => c.city?.toUpperCase() === city && c.status === 'Registered');
  const myAdopted  = complaints.filter(c => c.city?.toUpperCase() === city && c.status === 'Assigned' && c.ngoId === user?.uid);
  const myCompleted= complaints.filter(c => c.city?.toUpperCase() === city && c.status === 'Resolved' && c.ngoId === user?.uid);
  const initials   = user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'N';

  const handleAdopt = async (id) => {
    try { await updateDoc(doc(db, 'Complaints', id), { status: 'Assigned', updatedAt: serverTimestamp(), ngoId: user.uid, ngoName: user.name }); }
    catch (e) { console.error(e); alert('Adoption failed.'); }
  };

  const openResolve = (id) => { setTargetId(id); setResolveImage(null); setResolveModal(true); };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolveImage) return alert('Please upload resolution proof.');
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', resolveImage);
      fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      fd.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.secure_url) {
        await updateDoc(doc(db, 'Complaints', targetId), { status: 'Resolved', updatedAt: serverTimestamp(), resolvedImageUrl: data.secure_url });
        setResolveModal(false); setTargetId(null); setResolveImage(null);
        alert('Case resolved and evidence attached!');
      } else throw new Error('Upload failed');
    } catch (e) { console.error(e); alert('Resolution upload failed.'); }
    finally { setIsUploading(false); }
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      <aside className="sidebar">
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div className="sidebar-avatar" style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>{initials}</div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{user?.name || 'NGO Partner'}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--success)', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Verified NGO Access
          </div>
        </div>

        <div className="sidebar-section-title">Missions</div>
        <button className={`nav-item ${activeTab === 'orphan' ? 'active' : ''}`} onClick={() => setActiveTab('orphan')} id="tab-orphan">
          <Activity size={16} /> Orphan Center
          {adoptable.length > 0 && <span className="nav-badge">{adoptable.length}</span>}
        </button>
        <button className={`nav-item ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')} id="tab-active-missions"
          style={{ color: myAdopted.length > 0 ? 'var(--warning)' : undefined }}>
          <ShieldCheck size={16} /> Active Missions
          {myAdopted.length > 0 && <span className="nav-badge" style={{ background: 'var(--warning)' }}>{myAdopted.length}</span>}
        </button>
        <button className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')} id="tab-impact"
          style={{ color: 'var(--success)' }}>
          <CheckCircle size={16} /> Verified Impact
        </button>
      </aside>

      <main className="main-content">
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ marginBottom: 4 }}>{user?.city} City — NGO Command Sector</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Your mission board for civic impact.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {loading ? (
            <><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /></>
          ) : (
            <>
              <StatCard icon={Activity}    label="Orphan Complaints" value={adoptable.length}   accentColor="var(--primary)" />
              <StatCard icon={ShieldCheck} label="Active Missions"   value={myAdopted.length}   accentColor="var(--warning)" />
              <StatCard icon={CheckCircle} label="Historic Impact"   value={myCompleted.length} accentColor="var(--success)" />
            </>
          )}
        </div>

        {/* Orphan Tab */}
        {activeTab === 'orphan' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color="var(--primary)" />
              <h3>Available for Adoption</h3>
            </div>
            {loading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : adoptable.length > 0 ? (
              <div>
                {adoptable.map(c => (
                  <div key={c.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <h4 style={{ marginBottom: 4 }}>{c.title}</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} /> {c.locationText}
                        </p>
                      </div>
                      <span className="badge badge-status" data-status={c.status}>{c.status}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <Link to={`/complaint/${c.id}`} style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View details</Link>
                      <button onClick={() => handleAdopt(c.id)} className="btn btn-primary btn-sm">
                        <HeartPulse size={14} /> Adopt Case
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                <ShieldCheck size={40} style={{ color: 'var(--success)', opacity: 0.4, margin: '0 auto 16px' }} />
                <h3 style={{ marginBottom: 8 }}>Region is stable</h3>
                <p style={{ color: 'var(--text-muted)' }}>No cases currently need adoption. Check back later.</p>
              </div>
            )}
          </div>
        )}

        {/* Active Missions */}
        {activeTab === 'active' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: 'rgba(251,191,36,0.2)' }}>
            <div style={{ background: 'var(--warning-bg)', padding: '20px 24px', borderBottom: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={16} color="var(--warning)" />
              <h3 style={{ color: 'var(--warning)' }}>Active Missions</h3>
            </div>
            {myAdopted.length > 0 ? (
              <div>
                {myAdopted.map(c => (
                  <div key={c.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <h4 style={{ marginBottom: 4 }}>{c.title}</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} /> {c.locationText}
                        </p>
                      </div>
                      <span className="badge badge-status" data-status={c.status}>{c.status}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <Link to={`/complaint/${c.id}`} style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View details</Link>
                      <button onClick={() => openResolve(c.id)} className="btn btn-success btn-sm">Submit Verified Proof</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                <HeartPulse size={40} style={{ opacity: 0.3, margin: '0 auto 16px', color: 'var(--text-muted)' }} />
                <h3 style={{ marginBottom: 8 }}>No active missions</h3>
                <p style={{ color: 'var(--text-muted)' }}>Adopt a case from the Orphan Center to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* Impact History */}
        {activeTab === 'history' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: 'rgba(52,211,153,0.2)' }}>
            <div style={{ background: 'var(--success-bg)', padding: '20px 24px', borderBottom: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16} color="var(--success)" />
              <h3 style={{ color: 'var(--success)' }}>Verified Impact History</h3>
            </div>
            {myCompleted.length > 0 ? (
              <div>
                {myCompleted.map(c => (
                  <div key={c.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <h4 style={{ marginBottom: 4 }}>{c.title}</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} /> {c.locationText}
                        </p>
                        {c.resolvedImageUrl && <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 4, fontWeight: 600 }}>✓ Verified Proof</p>}
                      </div>
                      <span className="badge badge-status" data-status={c.status}>{c.status}</span>
                    </div>
                    {c.citizenFeedback && (
                      <div style={{ background: c.isSatisfied ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${c.isSatisfied ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'}`, borderRadius: 'var(--r-md)', padding: '8px 12px', marginBottom: 8, fontSize: '0.8125rem' }}>
                        <span style={{ fontWeight: 700 }}>{c.isSatisfied ? '✓ Satisfied' : '✗ Unsatisfied'}</span>: "{c.citizenFeedback}"
                      </div>
                    )}
                    <Link to={`/complaint/${c.id}`} style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View thread →</Link>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                <CheckCircle size={40} style={{ color: 'var(--success)', opacity: 0.3, margin: '0 auto 16px' }} />
                <h3 style={{ marginBottom: 8 }}>No impact yet</h3>
                <p style={{ color: 'var(--text-muted)' }}>Adopt and resolve cases to build your impact history.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {resolveModal && (
        <div className="modal-overlay" onClick={() => setResolveModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ marginBottom: 4 }}>Upload Resolution Proof</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Legally attach photographic evidence of your team's work to close this case.</p>
              </div>
              <button className="modal-close" onClick={() => setResolveModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleResolveSubmit}>
              <div className={`upload-zone ${resolveImage ? 'active' : ''}`} style={{ marginBottom: 20 }}>
                <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  {resolveImage ? <CheckCircle size={32} color="var(--success)" /> : <ImageIcon size={32} color="var(--primary)" style={{ opacity: 0.7 }} />}
                  <span style={{ fontWeight: 600, color: resolveImage ? 'var(--success)' : 'var(--text-muted)' }}>
                    {resolveImage ? resolveImage.name : 'Tap to upload proof photo'}
                  </span>
                  <input required type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setResolveImage(e.target.files[0])} />
                </label>
              </div>
              <button type="submit" className="btn btn-success w-full" disabled={!resolveImage || isUploading} style={{ padding: '0.6875rem', fontSize: '0.9375rem' }}>
                {isUploading ? 'Securing Audit Trail…' : 'Confirm Verified Resolution'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
