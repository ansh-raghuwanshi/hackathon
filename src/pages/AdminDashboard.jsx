import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Activity, AlertTriangle, CheckCircle, BarChart3, Users, MapPin } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview | escalations | all

  useEffect(() => {
    // Show all complaints for Admin view
    const q = query(collection(db, 'Complaints'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComplaints(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAdminAction = async (complaintId, actionType) => {
    try {
      const docRef = doc(db, 'Complaints', complaintId);
      if (actionType === 'reassign') {
        await updateDoc(docRef, {
          status: 'Assigned',
          resolvedImageUrl: null,
          citizenFeedback: null,
          isSatisfied: null,
          updatedAt: serverTimestamp()
        });
        alert("Case forcefully re-assigned to Organisation. Proof wiped.");
      } else if (actionType === 'overrule') {
        await updateDoc(docRef, {
          status: 'Resolved',
          updatedAt: serverTimestamp()
        });
        alert("Citizen escalation overruled. Case marked Resolved permanently.");
      }
    } catch(e) {
      console.error(e);
      alert("Failed to execute admin action");
    }
  };

  // ONBOARDING GATE
  if (user && !user.city) {
    return <Navigate to="/settings" replace />;
  }

  const cityComplaints = complaints.filter(c => c.city?.toUpperCase() === user?.city?.toUpperCase());

  const total = cityComplaints.length;
  const open = cityComplaints.filter(c => c.status === 'Registered' || c.status === 'Assigned').length;
  const resolved = cityComplaints.filter(c => c.status === 'Resolved').length;
  const escalatedComplaints = cityComplaints.filter(c => c.status === 'Escalated');
  const highPriority = cityComplaints.filter(c => c.urgency === 'High');

  return (
    <div className="dashboard-layout animate-fade-in">
      <aside className="sidebar">
        <div className="flex flex-col gap-2 mb-6 text-center pt-4">
          <div className="mx-auto bg-red-light p-3 rounded-full mb-2">
            <User size={32} color="var(--danger)" />
          </div>
          <h4 className="text-lg">{user?.name || 'Official Admin'}</h4>
          <span className="badge mx-auto bg-text text-white">Platform Monitor</span>
        </div>
        
        <nav className="flex flex-col gap-3 mt-4">
          <button 
            className={`btn w-full justify-start ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline border bg-background hover:bg-card'}`}
            onClick={() => setActiveTab('overview')}
          >
            <BarChart3 size={18} /> Regional Overview
          </button>
          <button 
            className={`btn w-full justify-start mt-2 ${activeTab === 'escalations' ? 'bg-danger text-white border-danger shadow-sm' : 'btn-outline border bg-background hover:bg-card text-danger border-danger/30 hover:border-danger'}`}
            onClick={() => setActiveTab('escalations')}
          >
            <AlertTriangle size={18} /> Escalation Audit
            {cityComplaints.filter(c => c.status === 'Escalated').length > 0 && (
               <span className="bg-white text-danger px-2 py-0.5 rounded-full text-xs ml-auto">
                 {cityComplaints.filter(c => c.status === 'Escalated').length}
               </span>
            )}
          </button>
          <button 
            className={`btn w-full justify-start mt-2 ${activeTab === 'all' ? 'btn-primary' : 'btn-outline border bg-background hover:bg-card'}`}
            onClick={() => setActiveTab('all')}
          >
            <Activity size={18} /> All Complaints
          </button>
          <Link to="/map" className="btn btn-outline border w-full justify-start mt-4">
            <MapPin size={18} /> Interactive Heatmap
          </Link>
        </nav>
      </aside>

      <main className="main-content">
        <h2 className="mb-6">{user?.city ? `${user.city} Region` : 'Global'} Admin Desktop</h2>
        
        {/* KPI Widgets */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="card text-center shadow-sm">
            <h3 className="text-primary text-4xl">{total}</h3>
            <p className="text-muted mt-2 font-medium">Total Cases</p>
          </div>
          <div className="card text-center shadow-sm">
            <h3 className="text-warning text-4xl">{open}</h3>
            <p className="text-muted mt-2 font-medium">Open / Assigned</p>
          </div>
          <div className="card text-center shadow-sm">
            <h3 className="text-success text-4xl">{resolved}</h3>
            <p className="text-muted mt-2 font-medium">Verified Solutions</p>
          </div>
          <div className="card text-center shadow-sm border border-danger/20">
            <h3 className="text-danger text-4xl">{escalatedComplaints.length}</h3>
            <p className="text-muted mt-2 font-medium">Escalated Disputes</p>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* High Priority Alerts Widget */}
            <div className="bg-card rounded-xl border p-6 shadow-sm col-span-2 lg:col-span-1">
              <h3 className="mb-6 pb-2 border-b flex items-center gap-2"><Activity className="text-warning"/> High Priority Queue</h3>
              {loading ? (
                <p className="text-muted text-center py-4">Loading data...</p>
              ) : highPriority.length > 0 ? (
                <div className="flex flex-col gap-3 border-l-4 border-warning pl-4 max-h-[400px] overflow-y-auto pr-2">
                  {highPriority.map(c => (
                    <div key={c.id} className="p-4 bg-orange-50/20 rounded-lg mb-2 border border-warning/20">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-text">{c.title}</h4>
                        <span className="badge badge-status" data-status={c.status}>{c.status}</span>
                      </div>
                      <div className="flex justify-between mt-2 items-center">
                        <p className="text-sm text-text-muted">Priority Score: {c.priorityScore}</p>
                        <Link to={`/complaint/${c.id}`} className="text-primary text-sm font-medium hover:underline">View</Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle size={32} className="mx-auto text-success/50 mb-2"/>
                  <p className="text-muted">No high priority alerts currently active.</p>
                </div>
              )}
            </div>
            
            <div className="bg-card rounded-xl border p-6 shadow-sm text-center flex flex-col items-center justify-center">
               <BarChart3 size={48} className="text-primary/30 mb-4"/>
               <h3 className="mb-2">System Health is Optimal</h3>
               <p className="text-muted">All regional routing, analytics rendering, and escalation channels are functioning gracefully. Navigate tabs to audit specific operational lanes.</p>
            </div>
          </div>
        )}

        {activeTab === 'escalations' && (
          <div className="bg-card rounded-xl border border-danger/30 p-6 shadow-lg overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-danger"></div>
            <h3 className="flex items-center gap-2 mb-6 pb-4 border-b text-danger">
              <AlertTriangle size={24} /> Official Escalation Audit Queue
            </h3>
            
            {loading ? (
              <p className="text-muted text-center py-4">Loading data...</p>
            ) : escalatedComplaints.length > 0 ? (
              <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2">
                {escalatedComplaints.map(c => (
                  <div key={c.id} className="border border-danger/30 p-5 rounded-xl bg-red-50/20 flex flex-col gap-4 relative shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg">{c.title}</h4>
                        <p className="text-sm text-text-muted mt-1"><MapPin size={12} className="inline mr-1"/>{c.locationText}</p>
                      </div>
                      <Link to={`/complaint/${c.id}`} className="btn btn-outline text-sm shadow-sm py-1">Review Master Thread</Link>
                    </div>
                    
                    <div className="bg-background rounded-lg p-3 border-l-4 border-danger">
                       <span className="text-xs font-bold text-danger uppercase tracking-wider mb-1 block">Citizen Complaint Statement:</span>
                       <p className="text-sm text-text-muted italic">"{c.citizenFeedback}"</p>
                    </div>

                    <div className="flex gap-3 mt-2 grid grid-cols-2">
                       <button onClick={() => handleAdminAction(c.id, 'overrule')} className="btn btn-outline py-2 text-success border-success hover:bg-success hover:text-white shadow-sm flex justify-center w-full">Overrule / Set Resolved</button>
                       <button onClick={() => handleAdminAction(c.id, 'reassign')} className="btn bg-danger text-white hover:opacity-90 shadow-sm flex justify-center w-full">Reject Proof / Re-Assign</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                 <CheckCircle size={48} className="mx-auto text-success/50 mb-4"/>
                 <h3 className="text-lg text-text">No active escalations!</h3>
                 <p className="text-muted mt-2">The region is fully compliant. No citizens are currently disputing official resolutions.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <h3 className="mb-6 pb-4 border-b flex items-center gap-2"><MapPin size={24} className="text-primary"/> Regional Master Database</h3>
            
            {loading ? (
              <p className="text-muted text-center py-4">Loading entire platform database...</p>
            ) : cityComplaints.length > 0 ? (
              <div className="flex flex-col gap-3">
                {cityComplaints.sort((a,b) => b.createdAt - a.createdAt).map(c => (
                  <div key={c.id} className="flex justify-between items-center p-4 border rounded-xl hover:shadow-md transition bg-background">
                    <div>
                      <h4 className="font-medium text-text">{c.title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-text-muted">{c.category}</p>
                        <p className="text-xs text-text-muted border-l pl-3 ml-1">{new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-center">
                      <span className="badge badge-status text-xs shadow-sm" data-status={c.status}>{c.status}</span>
                      <Link to={`/complaint/${c.id}`} className="text-primary hover:underline font-medium text-sm">View details &rarr;</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-12">No requests exist in your region yet.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
