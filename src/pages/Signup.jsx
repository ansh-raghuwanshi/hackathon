import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { ShieldAlert, Fingerprint } from 'lucide-react';
import './Auth.css';

export default function Signup() {
  const [role, setRole] = useState('Citizen');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    secretCode: '',
    orgCategory: 'Roads'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleOfficialSignup = async (e) => {
    e.preventDefault();
    if (role !== 'Citizen' && formData.secretCode !== '982656') {
      setError('Invalid Secret Code for official role.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      await setDoc(doc(db, 'Users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: formData.name,
        email: formData.email,
        role: role,
        orgCategory: role === 'Organisation' ? formData.orgCategory : null,
        createdAt: serverTimestamp()
      });

      // Force authStore update to bypass onAuthStateChanged race condition
      useAuthStore.getState().setUser({
        uid: userCredential.user.uid,
        name: formData.name,
        email: formData.email,
        role: role,
        orgCategory: role === 'Organisation' ? formData.orgCategory : null
      });

      // Perform a hard refresh to bypass post-auth chunk initialization bugs
      window.location.href = `/dashboard/${role.toLowerCase()}`;
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to complete signup.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if user already exists
      const userDocRef = doc(db, 'Users', result.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: result.user.uid,
          name: result.user.displayName || 'Citizen',
          email: result.user.email,
          role: 'Citizen',
          avatar: result.user.photoURL,
          createdAt: serverTimestamp()
        });
      }
      
      // Force authStore update to sync immediately
      useAuthStore.getState().setUser({
        uid: result.user.uid,
        name: result.user.displayName || 'Citizen',
        email: result.user.email,
        role: 'Citizen',
        avatar: result.user.photoURL
      });
      
      // Perform a hard refresh to bypass post-auth chunk initialization bugs
      window.location.href = '/dashboard/citizen';
    } catch (err) {
      console.error(err);
      setError(err.message || "Google Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-ring">
            <ShieldAlert size={28} color="white" />
          </div>
          <h2>Create Account</h2>
          <p className="text-muted text-sm">Join the SnapFix platform to shape your city.</p>
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        
        <div className="role-selector">
          {['Citizen', 'Organisation', 'NGO', 'Admin'].map(r => (
            <button 
              key={r}
              className={`role-btn ${role === r ? 'active' : ''}`}
              onClick={() => { setRole(r); setError(''); }}
            >
              {r}
            </button>
          ))}
        </div>

        {role === 'Citizen' ? (
          <div className="flex flex-col gap-4 items-center">
             <button onClick={handleGoogleSignup} disabled={loading} className="btn w-full flex items-center justify-center gap-3 transition hover:-translate-y-1" style={{backgroundColor: '#fff', color: '#333', border: '1px solid #ddd', padding: '0.75rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
             </button>
             <p className="text-muted text-xs mt-2 text-center">As a citizen, you only need to link your Google account.</p>
          </div>
        ) : (
          <form onSubmit={handleOfficialSignup} className="auth-form animate-fade-in">
            <div className="form-group mb-3">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="" />
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Official Email</label>
              <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required placeholder="official@city.gov" />
            </div>
            
            <div className="form-group mb-3">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required placeholder="••••••••" />
            </div>

            <div className="form-group mb-3 relative">
              <label className="form-label text-warning flex items-center gap-1"><Fingerprint size={16}/> System Secret Code</label>
              <input type="password" style={{borderColor: 'var(--warning)', borderWidth: '2px'}} className="form-input" value={formData.secretCode} onChange={e => setFormData({...formData, secretCode: e.target.value})} required placeholder="Required for privileged access" />
            </div>

            {role === 'Organisation' && (
              <div className="form-group mb-3 animate-fade-in">
                <label className="form-label">Organisation Specialty Category</label>
                <select className="form-select border-primary" value={formData.orgCategory} onChange={e => setFormData({...formData, orgCategory: e.target.value})}>
                  <option value="Roads">Roads & Transport</option>
                  <option value="Water">Water Supply</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Sanitation">Sanitation</option>
                  <option value="Noise">Noise</option>
                  <option value="Other">Other</option>
                </select>
                <p className="text-xs text-text-muted mt-1">You will only receive complaints belonging to this precise category.</p>
              </div>
            )}
            
            <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
              {loading ? 'Registering...' : `Register as ${role}`}
            </button>
          </form>
        )}
        
        <div className="auth-footer text-center mt-6 pt-4 border-t border-card-border">
          <p className="text-muted text-sm">
            Already have an account? <Link to="/login" className="text-secondary font-bold hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
