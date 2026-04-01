import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Settings as SettingsIcon, Save, ArrowLeft, User, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ name: '', age: '', city: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (user) setForm({ name: user.name || '', age: user.age || '', city: user.city || '' });
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const finalCity = form.city.trim().toUpperCase();
      const update = { name: form.name, city: finalCity };
      if (user.role === 'Citizen') update.age = Number(form.age);
      await updateDoc(doc(db, 'Users', user.uid), update);
      // Update local state first, then navigate — avoids redirect-guard race
      setUser({ ...user, ...update });
      window.location.href = `/dashboard/${user.role.toLowerCase()}`;
    } catch (err) {
      console.error(err);
      setError('Failed to save profile. Please try again.');
    } finally { setLoading(false); }
  };

  // Derive completeness from live form values so the guard doesn't re-trigger after save
  const isComplete = user?.role === 'Citizen'
    ? (form.age && form.city.trim())
    : form.city.trim();
  const initials   = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 480, animation: 'fadeSlideUp 0.4s var(--ease-smooth) both' }}>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-4)',
          position: 'relative',
        }}>
          {/* Top bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />

          <div style={{ padding: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Avatar preview */}
                <div style={{
                  width: 52, height: 52,
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  borderRadius: 'var(--r-full)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '1.125rem', color: '#fff',
                  boxShadow: '0 4px 16px var(--primary-glow)',
                  flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div>
                  <h2 style={{ marginBottom: 2 }}>Profile Settings</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {user?.role} · {user?.email}
                  </p>
                </div>
              </div>
              {isComplete && (
                <button onClick={() => navigate(-1)} className="btn btn-outline btn-sm" title="Go Back">
                  <ArrowLeft size={16} /> Back
                </button>
              )}
            </div>

            {/* Onboarding banner */}
            {!isComplete && (
              <div style={{
                background: 'var(--warning-bg)',
                border: '1px solid rgba(251,191,36,0.25)',
                borderLeft: '3px solid var(--warning)',
                borderRadius: 'var(--r-md)',
                padding: '12px 16px',
                marginBottom: 24,
                display: 'flex', alignItems: 'flex-start', gap: 10,
                fontSize: '0.875rem',
              }}>
                <AlertTriangle size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong style={{ color: 'var(--warning)' }}>Profile incomplete</strong>
                  <p style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                    Please fill in {user?.role === 'Citizen' ? 'your age and city' : 'your operational city'} to access your dashboard.
                  </p>
                </div>
              </div>
            )}

            {/* Alerts */}
            {error && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--r-md)', marginBottom: 20, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}
            {success && (
              <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(52,211,153,0.2)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--r-md)', marginBottom: 20, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={15} style={{ flexShrink: 0 }} /> {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label" htmlFor="settings-name">
                  <User size={11} style={{ display: 'inline', marginRight: 4 }} /> Full Name
                </label>
                <input id="settings-name" type="text" className="form-input"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  required placeholder="e.g. Priya Sharma" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: user?.role === 'Citizen' ? '1fr 1fr' : '1fr', gap: 12 }}>
                {user?.role === 'Citizen' && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="settings-age">Age</label>
                    <input id="settings-age" type="number" min="13" max="120" className="form-input"
                      value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
                      required placeholder="25" />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="settings-city">
                    <MapPin size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {user?.role === 'Citizen' ? 'Primary City' : 'Operational City'}
                  </label>
                  <input id="settings-city" type="text" className="form-input"
                    value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                    required placeholder="e.g. Indore" />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={loading}
                style={{ padding: '0.6875rem', fontSize: '0.9375rem', marginTop: 8 }}>
                {loading ? 'Saving…' : <><Save size={16} /> Save Profile</>}
              </button>
            </form>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>
          Your data is encrypted and stored securely in Firestore.
        </p>
      </div>
    </div>
  );
}
