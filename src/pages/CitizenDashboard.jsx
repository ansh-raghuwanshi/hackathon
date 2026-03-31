import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Plus, Bell, Activity, MapPin, Zap, Droplets, Trash2, Home, Volume2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';

const CATEGORIES = [
  { id: 'Roads', icon: Activity, label: 'Roads' },
  { id: 'Water', icon: Droplets, label: 'Water' },
  { id: 'Electricity', icon: Zap, label: 'Electricity' },
  { id: 'Sanitation', icon: Trash2, label: 'Sanitation' },
  { id: 'Noise', icon: Volume2, label: 'Noise' },
  { id: 'Other', icon: Home, label: 'Other' }
];

const URGENCIES = [
  { id: 'Low', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'High', color: 'bg-red-100 text-red-700 border-red-200' }
];

export default function CitizenDashboard() {
  const { user } = useAuthStore();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeTab, setActiveTab] = useState('complaints'); // complaints | notifications
  const [myComplaints, setMyComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastViewedCount, setLastViewedCount] = useState(0);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Roads',
    urgency: 'Low',
    locationText: '',
    lat: null,
    lng: null
  });
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleDetectLocation = () => {
    setLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData(prev => ({
          ...prev, 
          lat: position.coords.latitude, 
          lng: position.coords.longitude,
          locationText: `${parseFloat(position.coords.latitude).toFixed(4)}, ${parseFloat(position.coords.longitude).toFixed(4)}`
        }));
        setLocating(false);
      }, (error) => {
        alert("Failed to detect location. Please type it manually.");
        setLocating(false);
      });
    } else {
      alert("Geolocation is not supported by your browser.");
      setLocating(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'Complaints'),
      where('creatorId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMyComplaints(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // ONBOARDING GATE
  if (user && (!user.age || !user.city)) {
    return <Navigate to="/settings" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("You must be logged in!");
    
    if (!formData.lat || !formData.lng) {
      return alert("Location coordinates are required. Please use the Auto-Detect button.");
    }
    if (!imageFile) {
      return alert("Please upload an evidence image of the issue.");
    }

    setSubmitting(true);

    try {
      let imageUrl = '';
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('file', imageFile);
        uploadData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
        uploadData.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: uploadData
        });
        const data = await res.json();
        if (data.secure_url) {
          imageUrl = data.secure_url;
        }
      }

      const priorityScore = formData.urgency === 'High' ? 10 : (formData.urgency === 'Medium' ? 5 : 2);
      
      await addDoc(collection(db, 'Complaints'), {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        urgency: formData.urgency,
        locationText: formData.locationText,
        lat: formData.lat,
        lng: formData.lng,
        imageUrl,
        priorityScore,
        creatorId: user.uid,
        creatorName: user.name,
        city: user.city?.toUpperCase(),
        status: 'Registered',
        upvotes: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      setFormData({ title: '', description: '', category: 'Roads', urgency: 'Low', locationText: '', lat: null, lng: null });
      setImageFile(null);
      setShowSubmitModal(false);
      alert('Complaint submitted successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to submit complaint. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  const inProgressCount = myComplaints.filter(c => c.status === 'Assigned').length;
  const resolvedCount = myComplaints.filter(c => c.status === 'Resolved').length;
  
  const notificationCount = myComplaints.filter(c => c.status !== 'Registered').length;
  const unreadCount = Math.max(0, notificationCount - lastViewedCount);

  return (
    <div className="dashboard-layout animate-fade-in">
      <aside className="sidebar">
        <div className="flex flex-col gap-2 mb-6 text-center pt-4">
          <div className="mx-auto bg-primary-light p-3 rounded-full mb-2">
            <User size={32} color="var(--primary)" />
          </div>
          <h4 className="text-lg">{user?.name || 'Citizen'}</h4>
          <span className="badge badge-priority mx-auto" data-priority="Low">{user?.city} • Age {user?.age}</span>
        </div>
        
        <nav className="flex flex-col gap-3 mt-4">
          <button className="btn btn-primary w-full" onClick={() => setShowSubmitModal(true)}>
            <Plus size={18} /> Report Issue
          </button>
          <button 
            className={`btn btn-outline w-full justify-start border mt-4 ${activeTab === 'complaints' ? 'bg-primary-light text-primary border-primary' : 'bg-background hover:bg-card'}`}
            onClick={() => setActiveTab('complaints')}
          >
            <Activity size={18} /> My Complaints
          </button>
          <button 
            className={`btn btn-outline w-full justify-start border ${activeTab === 'notifications' ? 'bg-primary-light text-primary border-primary' : 'bg-background hover:bg-card'}`}
            onClick={() => {
              setActiveTab('notifications');
              setLastViewedCount(notificationCount);
            }}
          >
            <Bell size={18} /> Notifications
            {unreadCount > 0 && (
               <span className="bg-danger text-white text-xs px-2 py-0.5 rounded-full ml-auto shadow-sm">
                 {unreadCount}
               </span>
            )}
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {activeTab === 'complaints' ? (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2>Overview</h2>
            </div>
            
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="card text-center shadow-sm">
                <h3 className="text-primary text-4xl">{myComplaints.length}</h3>
                <p className="text-muted mt-2 font-medium">Total Submissions</p>
              </div>
              <div className="card text-center shadow-sm">
                <h3 className="text-warning text-4xl">{inProgressCount}</h3>
                <p className="text-muted mt-2 font-medium">Active / In Progress</p>
              </div>
              <div className="card text-center shadow-sm">
                <h3 className="text-success text-4xl">{resolvedCount}</h3>
                <p className="text-muted mt-2 font-medium">Resolved Issues</p>
              </div>
            </div>
            
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h3 className="mb-6 pb-4 border-b">Recent Complaints</h3>
              
              {loading ? (
                <p className="text-center text-muted py-8">Loading history...</p>
              ) : myComplaints.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {myComplaints.map(complaint => (
                    <div key={complaint.id} className="flex justify-between items-center p-4 border rounded-lg hover:shadow-sm transition bg-background">
                      <div>
                        <h4 className="font-semibold text-text">{complaint.title}</h4>
                        <p className="text-sm text-text-muted flex items-center gap-1 mt-1"><MapPin size={14}/> {complaint.locationText}</p>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <span className="badge badge-status text-sm flex-shrink-0" data-status={complaint.status}>{complaint.status}</span>
                        <Link to={`/complaint/${complaint.id}`} className="text-primary hover:underline font-medium text-sm">View details &rarr;</Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Activity size={40} className="mx-auto text-muted opacity-50 mb-4" />
                  <p className="text-muted text-lg mb-4">You haven't submitted any complaints yet.</p>
                  <button className="btn btn-primary" onClick={() => setShowSubmitModal(true)}>File Your First Grievance</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2>My Notifications</h2>
            </div>
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h3 className="mb-6 pb-4 border-b flex items-center gap-2"><Bell className="text-primary"/> System Alerts</h3>
              
              {myComplaints.filter(c => c.status !== 'Registered').length > 0 ? (
                <div className="flex flex-col gap-3">
                  {myComplaints.filter(c => c.status !== 'Registered').map(complaint => (
                    <div key={complaint.id + 'alert'} className={`p-4 rounded-lg border-l-4 ${complaint.status === 'Resolved' ? 'border-success bg-green-50/10' : 'border-warning bg-orange-50/10'}`}>
                      <h4 className="font-semibold">{complaint.status === 'Resolved' ? 'Issue Resolved!' : 'Issue Accepted & Assigned'}</h4>
                      <p className="text-sm text-text-muted mt-1">
                        Your reported issue <strong>"{complaint.title}"</strong> is now marked as <strong>{complaint.status}</strong>. 
                        {complaint.status === 'Resolved' && " Please view the thread to provide feedback on the resolution."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Bell size={40} className="mx-auto text-muted opacity-50 mb-4" />
                  <p className="text-muted text-lg">No notifications yet.</p>
                  <p className="text-sm text-text-muted mt-2">You will be alerted when an Organisation accepts or resolves your issues.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Submission Modal */}
      {showSubmitModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(2, 6, 23, 0.7)', backdropFilter: 'blur(8px)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={() => setShowSubmitModal(false)}>
          <div className="auth-card" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="absolute top-4 right-4 text-text-muted hover:text-danger cursor-pointer z-10" onClick={() => setShowSubmitModal(false)}>
              <span className="font-bold text-2xl leading-none">&times;</span>
            </div>
            
            <div className="auth-header">
              <div className="mb-2 bg-primary inline-flex p-3 rounded-full shadow-lg shadow-primary/30">
                <Activity size={28} color="white" />
              </div>
              <h2 className="text-2xl mt-2">Report Issue</h2>
              <p className="text-muted text-sm">Notify authorities of local problems.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="auth-form mt-6">
              <div className="form-group">
                <label className="form-label">Issue Title</label>
                <input required type="text" className="form-input" placeholder="e.g. Deep Pothole on Main St." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea required className="form-textarea" rows="2" placeholder="Describe the severity..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group mb-2">
                  <label className="form-label mb-1">Category</label>
                  <select className="form-select" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="Roads">Roads & Transport</option>
                    <option value="Water">Water Supply</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Sanitation">Sanitation</option>
                    <option value="Noise">Noise</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group mb-2">
                  <label className="form-label mb-1">Urgency</label>
                  <select className="form-select" value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value})}>
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label mb-1 flex justify-between items-center">
                  <span>Location</span>
                  <button type="button" onClick={handleDetectLocation} disabled={locating} className="text-xs text-primary hover:underline font-bold flex items-center gap-1 bg-primary-light px-2 py-0.5 rounded-full">
                    {locating ? 'Detecting...' : <><MapPin size={12}/> Auto-Detect</>}
                  </button>
                </label>
                <input required type="text" className="form-input w-full shadow-sm" placeholder="Address or tap Auto-Detect" value={formData.locationText} onChange={e => setFormData({...formData, locationText: e.target.value})} />
                {formData.lat && <span className="text-xs text-success font-bold mt-1">✓ GPS coordinates locked</span>}
              </div>

              <div className={`form-group p-4 rounded-xl border-2 border-dashed text-center transition ${imageFile ? 'bg-primary-light border-primary' : 'bg-background border-card-border hover:border-primary'}`}>
                <label className="form-label mb-0 cursor-pointer flex flex-col items-center w-full">
                   {imageFile ? <CheckCircle2 size={24} className="text-success mb-1" /> : <ImageIcon size={24} className="text-primary mb-1 opacity-80"/>}
                   <span className={`text-sm ${imageFile ? 'text-success font-bold' : 'text-primary font-medium'}`}>
                     {imageFile ? 'Evidence Attached' : 'Upload Evidence Image'}
                   </span>
                   <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files[0])} />
                </label>
                {imageFile && <p className="text-xs text-text-muted mt-2 truncate w-full">{imageFile.name}</p>}
              </div>
              
              <button type="submit" className="btn btn-primary w-full mt-2" disabled={submitting || !imageFile || !formData.lat}>
                {submitting ? 'Submitting...' : 'Submit Grievance'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
