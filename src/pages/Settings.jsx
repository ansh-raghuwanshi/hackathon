import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Settings as SettingsIcon, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    city: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Pre-fill existing data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        age: user.age || '',
        city: user.city || ''
      });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const userRef = doc(db, 'Users', user.uid);
      const finalCity = formData.city.trim().toUpperCase();
      
      const updateData = {
        name: formData.name,
        city: finalCity
      };
      
      if (user.role === 'Citizen') {
        updateData.age = Number(formData.age);
      }
      
      await updateDoc(userRef, updateData);

      // Update local store immediately
      setUser({
        ...user,
        ...updateData
      });

      setSuccess("Profile updated successfully!");
      
      // If they were stuck in onboarding, release them to dashboard
      setTimeout(() => {
        navigate(`/dashboard/${user.role.toLowerCase()}`);
      }, 1500);

    } catch (err) {
      console.error(err);
      setError("Failed to update profile. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const isComplete = user?.role === 'Citizen' ? (user?.age && user?.city) : user?.city;

  return (
    <div className="container py-8 flex justify-center min-h-[calc(100vh-72px)] items-center animate-fade-in">
      <div className="card w-full max-w-lg shadow-xl border-t-4 border-t-primary">
        
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-primary-light p-3 rounded-xl shadow-sm">
              <SettingsIcon size={28} className="text-primary" />
            </div>
            <div>
              <h2 className="text-2xl">Profile Settings</h2>
              <p className="text-sm text-text-muted">Manage your personal information</p>
            </div>
          </div>
          {isComplete && (
            <button onClick={() => navigate(-1)} className="btn btn-outline p-2 px-3 border-card-border" title="Go Back">
              <ArrowLeft size={18} />
            </button>
          )}
        </div>

        {!isComplete && (
          <div className="bg-warning text-black bg-opacity-20 border border-warning p-3 rounded-lg flex items-center gap-2 mb-6">
            <span className="font-bold">Welcome!</span> Please complete your profile ({user?.role === 'Citizen' ? 'Age & City' : 'City'}) before continuing.
          </div>
        )}

        {error && <div className="auth-error mb-4">{error}</div>}
        {success && <div className="bg-success text-white bg-opacity-90 p-3 rounded-lg mb-4 text-center font-medium shadow-sm">{success}</div>}

        <form onSubmit={handleSave}>
          <div className="form-group mb-4">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              required 
              placeholder="e.g. Jane Doe"
            />
          </div>

          <div className={`grid ${user?.role === 'Citizen' ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-6`}>
            {user?.role === 'Citizen' && (
              <div className="form-group">
                <label className="form-label">Age</label>
                <input 
                  type="number" 
                  min="13" 
                  max="120"
                  className="form-input" 
                  value={formData.age} 
                  onChange={e => setFormData({...formData, age: e.target.value})} 
                  required 
                  placeholder="25"
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{user?.role === 'Citizen' ? 'Primary City' : 'Operational City'}</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.city} 
                onChange={e => setFormData({...formData, city: e.target.value})} 
                required 
                placeholder="e.g. London"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full shadow-md" disabled={loading}>
            <Save size={18} /> {loading ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>

      </div>
    </div>
  );
}
