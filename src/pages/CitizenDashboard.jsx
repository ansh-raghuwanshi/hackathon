import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Plus, Bell, Activity, MapPin, Zap, Droplets, Trash2, Home, Volume2, Image as ImageIcon, CheckCircle2, X, Camera } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import StatCard from '../components/ui/StatCard';
import { SkeletonStatCard, SkeletonRow } from '../components/ui/Skeleton';

const CATEGORIES = [
  { id: 'Roads', icon: Activity }, { id: 'Water', icon: Droplets },
  { id: 'Electricity', icon: Zap }, { id: 'Sanitation', icon: Trash2 },
  { id: 'Noise', icon: Volume2 }, { id: 'Other', icon: Home },
];

export default function CitizenDashboard() {
  const { user } = useAuthStore();
  const [showModal,    setShowModal]    = useState(false);
  const [activeTab,    setActiveTab]    = useState('overview');
  const [myComplaints, setMyComplaints] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [lastViewed,   setLastViewed]   = useState(0);
  const [locating,     setLocating]     = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [imageFile,    setImageFile]    = useState(null);
  const [showCamera,   setShowCamera]   = useState(false);
  const [camError,     setCamError]     = useState('');
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [form, setForm] = useState({
    title: '', description: '', category: 'Roads', urgency: 'Low', locationText: '', lat: null, lng: null,
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'Complaints'), where('creatorId', '==', user.uid));
    const unsub = onSnapshot(q, snap => {
      setMyComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [user]);

  // Auto-detect location every time the modal opens
  useEffect(() => {
    if (showModal) {
      setForm(p => ({ ...p, lat: null, lng: null, locationText: '' }));
      handleDetectLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  if (user && (!user.age || !user.city)) return <Navigate to="/settings" replace />;

  const handleDetectLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setForm(p => ({ ...p, lat, lng, locationText: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
        // Reverse geocode with Nominatim (free, no API key needed)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          // Build a concise human-readable label
          const parts = [
            addr.road || addr.pedestrian || addr.footway,
            addr.neighbourhood || addr.suburb || addr.village,
            addr.city || addr.town || addr.county,
          ].filter(Boolean);
          const label = parts.length ? parts.join(', ') : data.display_name?.split(',').slice(0,3).join(',');
          setForm(p => ({ ...p, locationText: label || `${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
        } catch {
          // Geocoding failed — keep raw coordinates
        }
        setLocating(false);
      },
      err => {
        console.error('Geolocation error:', err);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openCamera = async () => {
    setCamError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      setShowCamera(true);
      // Wait for video element to mount then attach stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error('Camera error:', err);
      setCamError('Camera access denied or not available. Please allow camera permission.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `snapfix-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setImageFile(file);
      }
      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.lat || !form.lng) return alert('GPS coordinates required. Use Auto-Detect.');
    if (!imageFile)             return alert('Please attach an evidence photo.');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', imageFile);
      fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      fd.append('cloud_name',    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();

      const score = form.urgency === 'High' ? 10 : form.urgency === 'Medium' ? 5 : 2;
      await addDoc(collection(db, 'Complaints'), {
        ...form, imageUrl: data.secure_url || '', priorityScore: score,
        creatorId: user.uid, creatorName: user.name,
        city: user.city?.toUpperCase(), status: 'Registered',
        upvotes: 0, commentCount: 0,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setForm({ title: '', description: '', category: 'Roads', urgency: 'Low', locationText: '', lat: null, lng: null });
      setImageFile(null); setShowModal(false);
      alert('Complaint submitted!');
    } catch (err) { console.error(err); alert('Submission failed.'); }
    finally { setSubmitting(false); }
  };

  const inProgress   = myComplaints.filter(c => c.status === 'Assigned').length;
  const resolved     = myComplaints.filter(c => c.status === 'Resolved').length;
  const notifCount   = myComplaints.filter(c => c.status !== 'Registered').length;
  const unreadCount  = Math.max(0, notifCount - lastViewed);
  const initials     = user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?';

  return (
    <div className="dashboard-layout animate-fade-in">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div className="sidebar-avatar">{initials}</div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{user?.name || 'Citizen'}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {user?.city} · Age {user?.age}
          </div>
        </div>

        <div className="sidebar-section-title">Actions</div>
        <button className="btn btn-primary w-full" onClick={() => setShowModal(true)} id="report-issue-btn" style={{ marginBottom: 8, borderRadius: 'var(--r-md)', justifyContent: 'flex-start', gap: 8 }}>
          <Plus size={16} /> Report Issue
        </button>

        <div className="sidebar-section-title" style={{ marginTop: 8 }}>Navigation</div>
        <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} id="tab-overview">
          <Activity size={16} /> My Complaints
        </button>
        <button
          className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => { setActiveTab('notifications'); setLastViewed(notifCount); }}
          id="tab-notifications"
        >
          <Bell size={16} /> Notifications
          {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
        </button>
      </aside>

      {/* Main */}
      <main className="main-content">
        {activeTab === 'overview' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <div>
                <h2 style={{ marginBottom: 4 }}>My Overview</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Track all your submitted grievances.</p>
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-4" style={{ marginBottom: 32 }}>
              {loading ? (
                <><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /></>
              ) : (
                <div className="grid grid-cols-3 gap-4" style={{ gridColumn: '1/-1' }}>
                  <StatCard icon={Activity} label="Total Submissions" value={myComplaints.length} accentColor="var(--primary)" />
                  <StatCard icon={Zap}      label="In Progress"       value={inProgress}          accentColor="var(--warning)" />
                  <StatCard icon={CheckCircle2} label="Resolved"      value={resolved}            accentColor="var(--success)" />
                </div>
              )}
            </div>

            {/* Recent complaints */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Recent Complaints</h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{myComplaints.length} total</span>
              </div>

              {loading ? (
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : myComplaints.length > 0 ? (
                <div>
                  {myComplaints.map((c, i) => (
                    <div key={c.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '16px 24px',
                      borderBottom: i < myComplaints.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background 150ms',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 4 }}>{c.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          <MapPin size={12} /> {c.locationText}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <span className="badge badge-status" data-status={c.status}>{c.status}</span>
                        <Link to={`/complaint/${c.id}`} style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                          View →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                  <Activity size={40} style={{ color: 'var(--primary)', opacity: 0.3, margin: '0 auto 16px' }} />
                  <h3 style={{ marginBottom: 8, fontWeight: 600 }}>No complaints yet</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: 20 }}>
                    Start by filing your first issue.
                  </p>
                  <button className="btn btn-primary" onClick={() => setShowModal(true)}>Report First Issue</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: 24 }}>Notifications</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={18} color="var(--primary)" /> System Alerts
                </h3>
              </div>
              {myComplaints.filter(c => c.status !== 'Registered').length > 0 ? (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {myComplaints.filter(c => c.status !== 'Registered').map(c => (
                    <div key={c.id + 'alert'} style={{
                      padding: 16, borderRadius: 'var(--r-md)',
                      background: c.status === 'Resolved' ? 'var(--success-bg)' : 'rgba(251,191,36,0.07)',
                      border: `1px solid ${c.status === 'Resolved' ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)'}`,
                      borderLeft: `3px solid ${c.status === 'Resolved' ? 'var(--success)' : 'var(--warning)'}`,
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        {c.status === 'Resolved' ? '✓ Issue Resolved' : '⚡ Issue Accepted & Assigned'}
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Your report "<strong style={{ color: 'var(--text)' }}>{c.title}</strong>" is now marked as <strong style={{ color: 'var(--text)' }}>{c.status}</strong>.
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                  <Bell size={40} style={{ color: 'var(--primary)', opacity: 0.3, margin: '0 auto 16px' }} />
                  <h3 style={{ marginBottom: 8 }}>No notifications yet</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
                    You'll be notified when an organisation accepts or resolves your issues.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Report Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ marginBottom: 4 }}>Report an Issue</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>File a civic grievance with your local authority.</p>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="form-group">
                <label className="form-label">Issue Title</label>
                <input required type="text" className="form-input" placeholder="e.g. Deep pothole on Main St."
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={2} placeholder="Describe the severity…"
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Urgency</label>
                  <select className="form-select" value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {/* Location — auto-detected, read-only */}
              <div className="form-group">
                <label className="form-label">Location</label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  borderRadius: 'var(--r-md)',
                  border: `1.5px solid ${form.lat ? 'var(--primary)' : 'var(--border)'}`,
                  background: form.lat ? 'var(--primary-light)' : 'var(--surface-2)',
                  minHeight: 44,
                  transition: 'all 300ms',
                }}>
                  {locating ? (
                    <>
                      <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0, animation: 'pulse-overdue 1s ease-in-out infinite' }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Detecting your location…</span>
                    </>
                  ) : form.lat ? (
                    <>
                      <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text)', fontWeight: 600, flex: 1 }}>{form.locationText}</span>
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        title="Retry"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'inherit', flexShrink: 0 }}
                      >
                        ↻ Retry
                      </button>
                    </>
                  ) : (
                    <>
                      <MapPin size={16} color="var(--text-subtle)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', flex: 1 }}>Location not detected</span>
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'inherit', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <MapPin size={13} /> Detect
                      </button>
                    </>
                  )}
                </div>
                {form.lat && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: 3, display: 'block' }}>
                    ✓ GPS locked — {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                  </span>
                )}
              </div>

              {/* Upload / Camera zone */}
              <div style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Evidence Photo</label>

                {/* Live camera viewfinder */}
                {showCamera && (
                  <div style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden', background: '#000', marginBottom: 0 }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 12 }}>
                      <button
                        type="button"
                        onClick={capturePhoto}
                        style={{
                          padding: '8px 24px', borderRadius: 'var(--r-full)',
                          background: 'var(--primary)', color: '#fff', border: 'none',
                          fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                          fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        }}
                      >
                        📸 Capture
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        style={{
                          padding: '8px 16px', borderRadius: 'var(--r-full)',
                          background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
                          fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!showCamera && (
                  imageFile ? (
                    /* Preview + remove */
                    <div style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '2px solid var(--primary)', background: 'var(--surface-2)' }}>
                      <img
                        src={URL.createObjectURL(imageFile)}
                        alt="preview"
                        style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }}
                      />
                      <button
                        type="button"
                        onClick={() => setImageFile(null)}
                        style={{
                          position: 'absolute', top: 8, right: 8,
                          background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 'var(--r-full)',
                          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: '#fff',
                        }}
                      >
                        <X size={14} />
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--surface-2)' }}>
                        <CheckCircle2 size={14} color="var(--success)" />
                        <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>{imageFile.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {/* Upload from gallery */}
                      <label style={{
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        border: '2px dashed var(--border)', borderRadius: 'var(--r-lg)',
                        padding: '20px 12px', background: 'var(--surface-2)',
                        transition: 'all 200ms',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
                      >
                        <ImageIcon size={26} color="var(--primary)" style={{ opacity: 0.8 }} />
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Upload Photo</span>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files[0])} />
                      </label>

                      {/* Take photo with live camera */}
                      <button
                        type="button"
                        onClick={openCamera}
                        style={{
                          cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                          border: '2px dashed var(--border)', borderRadius: 'var(--r-lg)',
                          padding: '20px 12px', background: 'var(--surface-2)',
                          transition: 'all 200ms', fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--secondary)'; e.currentTarget.style.background = 'rgba(129,140,248,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
                      >
                        <Camera size={26} color="var(--secondary)" style={{ opacity: 0.8 }} />
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Take Photo</span>
                      </button>
                    </div>
                  )
                )}

                {camError && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: 6 }}>{camError}</p>
                )}
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={submitting || locating || !imageFile || !form.lat}
                style={{ padding: '0.6875rem', fontSize: '0.9375rem' }}>
                {submitting ? 'Submitting…' : locating ? 'Waiting for location…' : 'Submit Grievance'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
