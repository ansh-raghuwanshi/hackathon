import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Building2, Activity, MapPin, CheckCircle, Image as ImageIcon, X } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import StatCard from '../components/ui/StatCard';
import { SkeletonStatCard, SkeletonRow } from '../components/ui/Skeleton';

export default function OrganisationDashboard() {
  const { user } = useAuthStore();
  const [complaints,       setComplaints]       = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [activeTab,        setActiveTab]        = useState('active');
  const [resolveModal,     setResolveModal]     = useState(false);
  const [targetId,         setTargetId]         = useState(null);
  const [resolveImage,     setResolveImage]     = useState(null);
  const [isUploading,      setIsUploading]      = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'Complaints'));
    const unsub = onSnapshot(q, snap => {
      setComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [user]);

  if (user && !user.city) return <Navigate to="/settings" replace />;

  const city = user?.city?.toUpperCase();
  const actionable = complaints.filter(c =>
    c.city?.toUpperCase() === city &&
    (user?.orgCategory ? c.category === user.orgCategory : true) &&
    (c.status === 'Registered' || (c.status === 'Assigned' && c.assigneeId === user?.uid))
  );
  const completed = complaints.filter(c =>
    c.city?.toUpperCase() === city &&
    (user?.orgCategory ? c.category === user.orgCategory : true) &&
    c.status === 'Resolved' && c.assigneeId === user?.uid
  );

  const handleUpdateStatus = async (id, status) => {
    try { await updateDoc(doc(db, 'Complaints', id), { status, updatedAt: serverTimestamp(), assigneeId: user.uid, assigneeName: user.name }); }
    catch (e) { console.error(e); alert('Failed to update status'); }
  };

  const openResolve = (id) => { setTargetId(id); setResolveImage(null); setResolveModal(true); };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolveImage) return alert('Upload a resolution photo.');
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', resolveImage);
      fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      fd.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.secure_url) {
        await updateDoc(doc(db, 'Complaints', targetId), {
          status: 'Resolved', updatedAt: serverTimestamp(),
          resolvedImageUrl: data.secure_url, assigneeId: user.uid, assigneeName: user.name,
        });
        setResolveModal(false); setTargetId(null); setResolveImage(null);
        alert('Case resolved and proof attached!');
      } else throw new Error('Upload failed');
    } catch (e) { console.error(e); alert('Failed to upload proof.'); }
    finally { setIsUploading(false); }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'O';

  return (
    <div className="dashboard-layout animate-fade-in">
      <aside className="sidebar">
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div className="sidebar-avatar" style={{ background: 'linear-gradient(135deg, var(--secondary), #6366f1)' }}>{initials}</div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{user?.name || 'Organisation'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginTop: 4 }}>
            {user?.role}{user?.orgCategory ? ` · ${user.orgCategory}` : ''}
          </div>
        </div>

        <div className="sidebar-section-title">Operations</div>
        <button className={`nav-item ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')} id="tab-active-work">
          <Activity size={16} /> Active Work
          {actionable.length > 0 && <span className="nav-badge">{actionable.length}</span>}
        </button>
        <button className={`nav-item ${activeTab === 'resolved' ? 'active' : ''}`} onClick={() => setActiveTab('resolved')} id="tab-past-resolutions"
          style={activeTab === 'resolved' ? { color: 'var(--success)', background: 'var(--success-bg)' } : { color: 'var(--success)' }}>
          <CheckCircle size={16} /> Past Resolutions
        </button>
      </aside>

      <main className="main-content">
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ marginBottom: 4 }}>Organisation Duty Board</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Manage and resolve civic complaints in your category.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
          {loading ? (
            <><SkeletonStatCard /><SkeletonStatCard /></>
          ) : (
            <>
              <StatCard icon={Activity}     label="Pending Action"   value={actionable.length} accentColor="var(--warning)" />
              <StatCard icon={CheckCircle}  label="Resolved by Me"   value={completed.length}  accentColor="var(--success)" />
            </>
          )}
        </div>

        {activeTab === 'active' ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3>Incoming &amp; Assigned Complaints</h3>
            </div>
            {loading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : actionable.length > 0 ? (
              <div>
                {actionable.map(c => (
                  <div key={c.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <h4 style={{ marginBottom: 4 }}>{c.title}</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                          <MapPin size={11} /> {c.locationText}
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span className="badge badge-priority" data-priority={c.urgency}>{c.urgency}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 'var(--r-full)', border: '1px solid var(--border)' }}>{c.category}</span>
                        </div>
                      </div>
                      <span className="badge badge-status" data-status={c.status}>{c.status}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <Link to={`/complaint/${c.id}`} style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View details →</Link>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {c.status === 'Registered' && (
                          <button onClick={() => handleUpdateStatus(c.id, 'Assigned')} className="btn btn-secondary btn-sm">Accept &amp; Assign</button>
                        )}
                        {c.status === 'Assigned' && c.assigneeId === user?.uid && (
                          <button onClick={() => openResolve(c.id)} className="btn btn-success btn-sm">Mark Resolved</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                <CheckCircle size={40} style={{ color: 'var(--success)', opacity: 0.4, margin: '0 auto 16px' }} />
                <h3 style={{ marginBottom: 8 }}>All clear!</h3>
                <p style={{ color: 'var(--text-muted)' }}>No pending issues requiring your attention.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: 'rgba(52,211,153,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={18} color="var(--success)" />
              <h3 style={{ color: 'var(--success)' }}>Past Resolutions</h3>
            </div>
            {completed.length > 0 ? (
              <div>
                {completed.map(c => (
                  <div key={c.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <h4 style={{ marginBottom: 4 }}>{c.title}</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} /> {c.locationText}
                        </p>
                        {c.resolvedImageUrl && <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 4, fontWeight: 600 }}>✓ Verified Proof Attached</p>}
                      </div>
                      <span className="badge badge-status" data-status={c.status}>{c.status}</span>
                    </div>
                    {c.citizenFeedback && (
                      <div style={{ background: c.isSatisfied ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${c.isSatisfied ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: 'var(--r-md)', padding: '8px 12px', marginBottom: 8, fontSize: '0.875rem' }}>
                        <strong>{c.isSatisfied ? '✓ Satisfied' : '✗ Unsatisfied'}:</strong> "{c.citizenFeedback}"
                      </div>
                    )}
                    <Link to={`/complaint/${c.id}`} style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View thread →</Link>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>No resolutions yet.</p>
            )}
          </div>
        )}
      </main>

      {/* Resolution Modal */}
      {resolveModal && (
        <div className="modal-overlay" onClick={() => setResolveModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ marginBottom: 4 }}>Upload Resolution Proof</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Attach a photo proving the issue was physically resolved on-site.</p>
              </div>
              <button className="modal-close" onClick={() => setResolveModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleResolveSubmit}>
              <div className={`upload-zone ${resolveImage ? 'active' : ''}`} style={{ marginBottom: 20 }}>
                <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  {resolveImage
                    ? <CheckCircle size={32} color="var(--success)" />
                    : <ImageIcon size={32} color="var(--primary)" style={{ opacity: 0.7 }} />}
                  <span style={{ fontWeight: 600, color: resolveImage ? 'var(--success)' : 'var(--text-muted)' }}>
                    {resolveImage ? resolveImage.name : 'Tap to upload proof photo'}
                  </span>
                  <input required type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setResolveImage(e.target.files[0])} />
                </label>
              </div>
              <button type="submit" className="btn btn-success w-full" disabled={!resolveImage || isUploading} style={{ padding: '0.6875rem', fontSize: '0.9375rem' }}>
                {isUploading ? 'Uploading…' : 'Confirm Resolution'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
