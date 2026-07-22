import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { postService } from '../services/postService';
import { MockDB } from '../services/mockDb';
import { useToast } from '../contexts/ToastContext';
import type { User, Report, Post } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { 
  ShieldAlert, Users, Award, Trophy, 
  Flag, CheckCircle, Trash, RefreshCw, Slash
} from 'lucide-react';
import { db, isFirebaseMode } from '../services/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Admin Sub-tab
  const [activeTab, setActiveTab] = useState<'applications' | 'reports' | 'users'>('applications');

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const listUsers = await userService.getUsers();
      setUsers(listUsers);

      let listReports: Report[] = [];
      if (isFirebaseMode && db) {
        const snapshot = await getDocs(collection(db, 'reports'));
        listReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
      } else {
        listReports = MockDB.getCollection<Report>('REPORTS');
      }
      setReports(listReports);
    } catch (err) {
      console.error(err);
      addToast('Failed to load admin logs.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleApproveApplication = async (uid: string) => {
    try {
      await userService.approveRoleRequest(uid);
      addToast('Role status approved successfully.', 'success');
      loadAdminData();
    } catch (err: any) {
      addToast(err.message || 'Failed to approve application.', 'error');
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      if (isFirebaseMode && db) {
        await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
        addToast('Report dismissed.', 'info');
        loadAdminData();
      } else {
        const allReports = MockDB.getCollection<Report>('REPORTS');
        const idx = allReports.findIndex(r => r.id === reportId);
        if (idx !== -1) {
          allReports[idx].status = 'resolved';
          MockDB.saveCollection('REPORTS', allReports);
          addToast('Report dismissed.', 'info');
          loadAdminData();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemovePostContent = async (postId: string, reportId: string) => {
    try {
      await postService.deletePost(postId);
      
      // Update report status
      if (isFirebaseMode && db) {
        await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
      } else {
        const allReports = MockDB.getCollection<Report>('REPORTS');
        const idx = allReports.findIndex(r => r.id === reportId);
        if (idx !== -1) {
          allReports[idx].status = 'resolved';
          MockDB.saveCollection('REPORTS', allReports);
        }
      }
      
      addToast('Reported post deleted permanently.', 'success');
      loadAdminData();
    } catch (err) {
      addToast('Failed to delete post.', 'error');
    }
  };

  const handleBanUser = async (uid: string) => {
    if (uid === currentUser?.uid) {
      addToast('You cannot ban yourself!', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to ban this user? This will disable their login access.')) return;

    try {
      await userService.updateUser(uid, {
        fullName: '[BANNED USER]',
        bio: 'This account has been suspended for violating ChessHub Terms of Service.',
        role: 'player'
      });
      addToast('User has been banned.', 'info');
      loadAdminData();
    } catch (err) {
      addToast('Failed to ban user.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Filter lists
  const pendingApplications = users.filter(u => (u as any).roleRequest && (u as any).roleRequest.status === 'pending');
  const activeReports = reports.filter(r => r.status === 'pending');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 text-left bg-charcoal min-h-screen">
      <div className="flex justify-between items-center mb-8 border-b border-darkborder pb-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-wide">Admin Dashboard</h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Moderation logs, verification approvals, and statistics</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAdminData} leftIcon={<RefreshCw size={14} />}>
          Sync Logs
        </Button>
      </div>

      {/* Global Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Players', value: users.length, icon: <Users size={16} className="text-sky-400" /> },
          { label: 'Pending Upgrades', value: pendingApplications.length, icon: <Award size={16} className="text-gold" /> },
          { label: 'Active Reports', value: activeReports.length, icon: <Flag size={16} className="text-red-400" /> },
          { label: 'Verified Coaches', value: users.filter(u => u.role === 'coach').length, icon: <Trophy size={16} className="text-amber-500" /> }
        ].map(stat => (
          <Card key={stat.label} className="p-4 flex items-center gap-4 border border-darkborder bg-darkcard">
            <div className="p-3 rounded-lg bg-charcoal shrink-0">{stat.icon}</div>
            <div>
              <span className="text-2xl font-bold font-display text-white block">{stat.value}</span>
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mt-0.5 block">{stat.label}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Dashboard Sub Tabs */}
      <div className="flex border-b border-darkborder mb-8 gap-2">
        <button onClick={() => setActiveTab('applications')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${activeTab === 'applications' ? 'border-gold text-gold font-bold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
          Pending Role Applications ({pendingApplications.length})
        </button>
        <button onClick={() => setActiveTab('reports')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${activeTab === 'reports' ? 'border-gold text-gold font-bold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
          Moderation Reports ({activeReports.length})
        </button>
        <button onClick={() => setActiveTab('users')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${activeTab === 'users' ? 'border-gold text-gold font-bold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
          User Management ({users.length})
        </button>
      </div>

      {/* APPLICATIONS PANEL */}
      {activeTab === 'applications' && (
        <Card className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 font-display">Upgrade Applications</h3>
          {pendingApplications.length === 0 ? (
            <p className="text-xs text-neutral-500 italic">No pending applications at this time.</p>
          ) : (
            <div className="space-y-4 divide-y divide-darkborder">
              {pendingApplications.map((appUser) => {
                const req = (appUser as any).roleRequest;
                return (
                  <div key={appUser.uid} className="pt-4 first:pt-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{appUser.fullName}</span>
                        <Badge variant="gold">Requests: {req.role.toUpperCase()}</Badge>
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed italic pr-6">" {appUser.bio} "</p>
                      <div className="text-[10px] text-neutral-500 space-x-4">
                        <span>Experience: {req.experienceYears} Years</span>
                        <span>Hourly Rates: {req.hourlyRate.toLocaleString()} VND</span>
                        <span>Applied: {new Date(req.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button variant="gold" size="sm" onClick={() => handleApproveApplication(appUser.uid)}>Approve</Button>
                      <Button variant="outline" size="sm" className="text-red-500" onClick={() => addToast('Upgrade declined.', 'info')}>Decline</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* MODERATION REPORTS PANEL */}
      {activeTab === 'reports' && (
        <Card className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 font-display">Active Moderation Tickets</h3>
          {activeReports.length === 0 ? (
            <p className="text-xs text-neutral-500 italic">All moderation tickets are resolved.</p>
          ) : (
            <div className="space-y-4 divide-y divide-darkborder">
              {activeReports.map((rep) => (
                <div key={rep.id} className="pt-4 first:pt-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">Report Ticket #{rep.id.substring(8, 12)}</span>
                      <Badge variant="danger">{rep.targetType}</Badge>
                    </div>
                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed">Reason: {rep.reason}</p>
                    <span className="text-[9px] text-neutral-500 mt-2 block">Ticket Date: {new Date(rep.createdAt).toLocaleString()}</span>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {rep.targetType === 'post' && (
                      <Button variant="danger" size="sm" onClick={() => handleRemovePostContent(rep.targetId, rep.id)}>
                        <Trash size={12} className="mr-1" /> Remove Post
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleDismissReport(rep.id)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* USER MANAGEMENT PANEL */}
      {activeTab === 'users' && (
        <Card>
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 font-display">ChessHub User Roster</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-charcoal text-neutral-400 uppercase font-semibold">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Elo</th>
                  <th className="p-3 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-darkborder">
                {users.map(u => (
                  <tr key={u.uid} className="hover:bg-darkhover">
                    <td className="p-3">
                      <div>
                        <span className="font-bold text-white text-sm block">{u.fullName}</span>
                        <span className="text-[9px] text-neutral-500">@{u.username}</span>
                      </div>
                    </td>
                    <td className="p-3 font-semibold uppercase text-neutral-300">{u.role}</td>
                    <td className="p-3 text-gold font-bold font-display">{u.ratings.classical}</td>
                    <td className="p-3 text-right">
                      {u.uid !== currentUser?.uid && u.fullName !== '[BANNED USER]' ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-500 border-red-500/20 hover:bg-red-500/10 text-xs py-1"
                          onClick={() => handleBanUser(u.uid)}
                        >
                          <Slash size={10} className="mr-1" /> Suspend
                        </Button>
                      ) : (
                        <span className="text-neutral-600 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
export default AdminDashboard;
