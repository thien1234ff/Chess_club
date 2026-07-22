import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { postService } from '../services/postService';
import { clubService } from '../services/clubService';
import { MockDB } from '../services/mockDb';
import { useToast } from '../contexts/ToastContext';
import type { User, Report, Club, ClubMember, ClubMemberRole } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import ImageUploader from '../components/ui/ImageUploader';
import { 
  ShieldAlert, Users, Award, Trophy, 
  Flag, Trash, RefreshCw, Slash,
  Crown, Star, Building, Settings, UserCheck, UserMinus, LayoutDashboard
} from 'lucide-react';
import { db, isFirebaseMode } from '../services/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const isSystemAdmin = currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  // Main Dashboard Mode: 'system' | 'club'
  const [mainMode, setMainMode] = useState<'system' | 'club'>(isSystemAdmin ? 'system' : 'club');

  // System Admin Data
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [systemTab, setSystemTab] = useState<'applications' | 'reports' | 'users'>('applications');

  // Club Management Data
  const [myClubs, setMyClubs] = useState<{ club: Club; userRole: ClubMemberRole }[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [clubMembers, setClubMembers] = useState<{ member: ClubMember; user: User }[]>([]);
  const [clubSubTab, setClubSubTab] = useState<'applications' | 'roster' | 'settings'>('applications');

  // Club Edit Form States
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');

  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Load System Admin Data
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

      // 2. Load Managed Clubs for Current User
      if (currentUser) {
        const allClubs = await clubService.getClubs();
        const managed: { club: Club; userRole: ClubMemberRole }[] = [];

        for (const c of allClubs) {
          const members = await clubService.getMembers(c.id);
          const memberObj = members.find(m => m.user.uid === currentUser.uid);
          
          if (c.creatorId === currentUser.uid) {
            managed.push({ club: c, userRole: 'president' });
          } else if (memberObj && (memberObj.member.role === 'president' || memberObj.member.role === 'vice_president' || memberObj.member.role === 'admin')) {
            managed.push({ club: c, userRole: memberObj.member.role });
          }
        }

        setMyClubs(managed);

        if (managed.length > 0 && (!selectedClubId || !managed.some(m => m.club.id === selectedClubId))) {
          setSelectedClubId(managed[0].club.id);
        }
      }
    } catch (err) {
      console.error(err);
      addToast('Không thể tải nhật ký quản trị.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load active club details & members when selectedClubId changes
  useEffect(() => {
    if (!selectedClubId) return;

    const fetchClubData = async () => {
      const membersList = await clubService.getMembers(selectedClubId);
      setClubMembers(membersList);

      const activeClubObj = myClubs.find(m => m.club.id === selectedClubId)?.club;
      if (activeClubObj) {
        setEditName(activeClubObj.name);
        setEditDescription(activeClubObj.description);
        setEditCity(activeClubObj.location.city);
        setEditLogoUrl(activeClubObj.logoUrl);
        setEditCoverUrl(activeClubObj.coverUrl);
      }
    };

    fetchClubData();
  }, [selectedClubId, myClubs]);

  // System Admin Handlers
  const handleApproveApplication = async (uid: string) => {
    try {
      await userService.approveRoleRequest(uid);
      addToast('Phê duyệt vai trò thành công.', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Phê duyệt hồ sơ thất bại.', 'error');
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
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
      addToast('Đã bỏ qua báo cáo.', 'info');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemovePostContent = async (postId: string, reportId: string) => {
    try {
      await postService.deletePost(postId);
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
      addToast('Đã xóa bài viết được báo cáo.', 'success');
      loadData();
    } catch (err) {
      addToast('Xóa bài viết thất bại.', 'error');
    }
  };

  const handleBanUser = async (uid: string) => {
    if (uid === currentUser?.uid) {
      addToast('Bạn không thể cấm chính mình!', 'error');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn cấm người dùng này?')) return;

    try {
      await userService.updateUser(uid, {
        fullName: '[BANNED USER]',
        bio: 'Tài khoản này đã bị đình chỉ vì vi phạm Điều khoản Dịch vụ ChessHub.',
        role: 'player'
      });
      addToast('Người dùng đã bị cấm.', 'info');
      loadData();
    } catch (err: any) {
      addToast('Cấm người dùng thất bại.', 'error');
    }
  };

  // Club Management Handlers
  const handleApproveClubMember = async (userId: string) => {
    if (!selectedClubId) return;
    try {
      await clubService.approveMember(selectedClubId, userId);
      addToast('Đã phê duyệt thành viên gia nhập CLB!', 'success');
      loadData();
    } catch (err) {
      addToast('Không thể phê duyệt thành viên.', 'error');
    }
  };

  const handleRemoveClubMember = async (userId: string) => {
    if (!selectedClubId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi CLB?')) return;

    try {
      await clubService.leaveClub(selectedClubId, userId);
      addToast('Đã loại thành viên khỏi CLB.', 'info');
      loadData();
    } catch (err) {
      addToast('Thao tác thất bại.', 'error');
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: ClubMemberRole) => {
    if (!selectedClubId) return;
    try {
      await clubService.updateMemberRole(selectedClubId, targetUserId, newRole);
      const roleLabel = newRole === 'president' ? 'Chủ nhiệm' : newRole === 'vice_president' ? 'Phó Chủ nhiệm (PCN)' : 'Thành viên';
      addToast(`Đã cập nhật vai trò thành: ${roleLabel}`, 'success');
      loadData();
    } catch (err) {
      addToast('Không thể cập nhật vai trò.', 'error');
    }
  };

  const handleSaveClubSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClubId) return;

    try {
      await clubService.updateClub(selectedClubId, {
        name: editName,
        description: editDescription,
        logoUrl: editLogoUrl,
        coverUrl: editCoverUrl,
        location: {
          city: editCity,
          type: activeClub?.location.type || 'hybrid'
        }
      });
      addToast('Đã lưu thông tin Cài đặt Câu lạc bộ!', 'success');
      loadData();
    } catch (err) {
      addToast('Lưu thông tin thất bại.', 'error');
    }
  };

  const renderMemberRoleBadge = (role: ClubMemberRole) => {
    if (role === 'president' || role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gold bg-gold/10 border border-gold/30 px-2 py-0.5 rounded-md">
          <Crown size={11} className="text-gold" />
          Chủ nhiệm
        </span>
      );
    }
    if (role === 'vice_president') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
          <Star size={11} className="text-amber-400" />
          Phó Chủ nhiệm (PCN)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-400 bg-neutral-800 border border-darkborder px-2 py-0.5 rounded-md">
        ♟ Thành viên
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const pendingApplications = users.filter(u => (u as any).roleRequest && (u as any).roleRequest.status === 'pending');
  const activeReports = reports.filter(r => r.status === 'pending');

  const activeManagedClubObj = myClubs.find(m => m.club.id === selectedClubId);
  const activeClub = activeManagedClubObj?.club;
  const userRoleInActiveClub = activeManagedClubObj?.userRole || 'president';

  const pendingClubMembers = clubMembers.filter(m => m.member.status === 'pending');
  const approvedClubMembers = clubMembers.filter(m => m.member.status === 'approved');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 text-left bg-charcoal min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-darkborder pb-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-wide flex items-center gap-2">
            <LayoutDashboard className="text-gold" />
            <span>Bảng Điều Khiển Quản Trị</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">
            Trung tâm quản lý hệ thống, phê duyệt danh hiệu &amp; vận hành Câu lạc bộ cờ vua
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} leftIcon={<RefreshCw size={14} />}>
          Đồng bộ Dữ liệu
        </Button>
      </div>

      {/* TOP MULTI-MODE SWITCHER (System Admin vs Club Management) */}
      <div className="flex flex-wrap gap-3 mb-8 bg-darkcard/60 p-2 rounded-2xl border border-darkborder">
        {isSystemAdmin && (
          <button
            onClick={() => setMainMode('system')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
              mainMode === 'system'
                ? 'bg-gold text-charcoal shadow-lg shadow-gold/20'
                : 'text-neutral-400 hover:text-white hover:bg-darkborder/50'
            }`}
          >
            <ShieldAlert size={16} />
            <span>🛡️ Quản trị Hệ thống</span>
          </button>
        )}

        {myClubs.length > 0 && (
          <button
            onClick={() => setMainMode('club')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
              mainMode === 'club'
                ? 'bg-gold text-charcoal shadow-lg shadow-gold/20'
                : 'text-neutral-400 hover:text-white hover:bg-darkborder/50'
            }`}
          >
            <Building size={16} />
            <span>🏰 Quản lý Câu lạc bộ ({myClubs.length})</span>
          </button>
        )}
      </div>

      {/* MODE 1: SYSTEM ADMIN DASHBOARD */}
      {mainMode === 'system' && isSystemAdmin && (
        <div className="space-y-8">
          {/* Global Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Kỳ thủ Hệ thống', value: users.length, icon: <Users size={16} className="text-sky-400" /> },
              { label: 'Đơn chờ Nâng cấp', value: pendingApplications.length, icon: <Award size={16} className="text-gold" /> },
              { label: 'Báo cáo Vi phạm', value: activeReports.length, icon: <Flag size={16} className="text-red-400" /> },
              { label: 'Huấn luyện viên', value: users.filter(u => u.role === 'coach').length, icon: <Trophy size={16} className="text-amber-500" /> }
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

          {/* System Sub Tabs */}
          <div className="flex border-b border-darkborder gap-2">
            <button onClick={() => setSystemTab('applications')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${systemTab === 'applications' ? 'border-gold text-gold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
              Hồ sơ Duyệt Danh hiệu ({pendingApplications.length})
            </button>
            <button onClick={() => setSystemTab('reports')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${systemTab === 'reports' ? 'border-gold text-gold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
              Báo cáo Vi phạm ({activeReports.length})
            </button>
            <button onClick={() => setSystemTab('users')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${systemTab === 'users' ? 'border-gold text-gold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
              Quản lý Người dùng ({users.length})
            </button>
          </div>

          {/* APPLICATIONS PANEL */}
          {systemTab === 'applications' && (
            <Card className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 font-display">Hồ sơ Đăng ký Nâng cấp</h3>
              {pendingApplications.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">Hiện không có hồ sơ nào đang chờ duyệt.</p>
              ) : (
                <div className="space-y-4 divide-y divide-darkborder">
                  {pendingApplications.map((appUser) => {
                    const req = (appUser as any).roleRequest;
                    return (
                      <div key={appUser.uid} className="pt-4 first:pt-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-3 flex-grow">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-base">{req.fullName || appUser.fullName}</span>
                            <Badge variant="gold">Ứng tuyển: {req.role.toUpperCase()}</Badge>
                          </div>
                          
                          {req.role === 'coach' ? (
                            <div className="bg-charcoal/50 p-4 rounded-xl border border-darkborder space-y-3 text-xs max-w-3xl">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-neutral-400">
                                <div>Kinh nghiệm chơi cờ: <span className="text-white font-bold">{req.chessExperienceYears} năm</span></div>
                                <div>Kinh nghiệm dạy: <span className="text-gold font-bold">{req.coachingExperienceYears} năm</span></div>
                                <div>Mức giá: <span className="text-emerald-400 font-bold">{req.hourlyRate?.toLocaleString()} VND/giờ</span></div>
                                <div>FIDE ID: <span className="text-white">{req.fideId || 'Không có'}</span></div>
                                <div>FIDE Rating: <span className="text-white font-bold">{req.fideRating || 'Không có'}</span></div>
                                <div>Hình thức: <span className="text-white capitalize">{req.teachingFormat}</span></div>
                              </div>
                              {req.proofUrl && (
                                <div className="border-t border-darkborder/50 pt-2">
                                  <a href={req.proofUrl} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline font-semibold flex items-center gap-1">
                                    🖼️ Xem tài liệu chứng chỉ / bằng cấp
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-400 italic">" {req.bio} "</p>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <Button variant="gold" size="sm" onClick={() => handleApproveApplication(appUser.uid)}>Duyệt Hồ sơ</Button>
                          <Button variant="outline" size="sm" className="text-red-500" onClick={() => addToast('Từ chối hồ sơ.', 'info')}>Từ chối</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* REPORTS PANEL */}
          {systemTab === 'reports' && (
            <Card className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 font-display">Danh sách Báo cáo Vi phạm</h3>
              {activeReports.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">Tất cả báo cáo đã được xử lý xong.</p>
              ) : (
                <div className="space-y-4 divide-y divide-darkborder">
                  {activeReports.map((rep) => (
                    <div key={rep.id} className="pt-4 first:pt-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">Báo cáo #{rep.id.substring(8, 12)}</span>
                          <Badge variant="danger">{rep.targetType}</Badge>
                        </div>
                        <p className="text-xs text-neutral-300 mt-1 leading-relaxed">Lý do: {rep.reason}</p>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        {rep.targetType === 'post' && (
                          <Button variant="danger" size="sm" onClick={() => handleRemovePostContent(rep.targetId, rep.id)}>
                            <Trash size={12} className="mr-1" /> Xóa bài viết
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleDismissReport(rep.id)}>
                          Bỏ qua
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* USER MANAGEMENT PANEL */}
          {systemTab === 'users' && (
            <Card>
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 font-display">Danh sách Thành viên Hệ thống</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-charcoal text-neutral-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Người dùng</th>
                      <th className="p-3">Vai trò</th>
                      <th className="p-3">Elo</th>
                      <th className="p-3 text-right">Thao tác</th>
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
                              <Slash size={10} className="mr-1" /> Đình chỉ
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
      )}

      {/* MODE 2: CLUB MANAGEMENT DASHBOARD */}
      {mainMode === 'club' && (
        <div className="space-y-8">
          {myClubs.length === 0 ? (
            <Card className="p-8 text-center space-y-4 border border-darkborder">
              <Building size={48} className="mx-auto text-neutral-600" />
              <h3 className="text-lg font-bold text-white">Bạn chưa làm Chủ nhiệm CLB nào</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Hãy tạo Câu lạc bộ cờ vua của riêng bạn để bắt đầu quản lý đơn xin gia nhập, phân công vai trò Phó Chủ nhiệm và vận hành sinh hoạt!
              </p>
            </Card>
          ) : (
            <>
              {/* Club Selector Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-darkcard p-5 rounded-2xl border border-darkborder">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl border border-darkborder overflow-hidden bg-charcoal shrink-0">
                    <img src={activeClub?.logoUrl} alt={activeClub?.name} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gold tracking-widest block">Đang quản lý</span>
                    <h2 className="text-xl font-bold font-display text-white">{activeClub?.name}</h2>
                  </div>
                </div>

                {/* Club Picker Dropdown if user manages multiple clubs */}
                {myClubs.length > 1 && (
                  <div className="w-full sm:w-64">
                    <label className="block text-[10px] uppercase font-semibold text-neutral-400 mb-1">Chọn Câu lạc bộ</label>
                    <select
                      value={selectedClubId}
                      onChange={(e) => setSelectedClubId(e.target.value)}
                      className="w-full bg-charcoal text-white border border-darkborder rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gold"
                    >
                      {myClubs.map(item => (
                        <option key={item.club.id} value={item.club.id}>
                          {item.club.name} ({item.userRole === 'president' ? 'Chủ nhiệm' : 'Phó CN'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Club KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 border border-darkborder bg-darkcard flex items-center gap-3">
                  <div className="p-3 bg-gold/10 text-gold rounded-xl"><Users size={20} /></div>
                  <div>
                    <span className="text-xl font-bold text-white block">{approvedClubMembers.length}</span>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Thành viên chính thức</span>
                  </div>
                </Card>

                <Card className="p-4 border border-darkborder bg-darkcard flex items-center gap-3">
                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl"><UserCheck size={20} /></div>
                  <div>
                    <span className="text-xl font-bold text-amber-400 block">{pendingClubMembers.length}</span>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Đơn chờ duyệt</span>
                  </div>
                </Card>

                <Card className="p-4 border border-darkborder bg-darkcard flex items-center gap-3">
                  <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl"><Crown size={20} /></div>
                  <div>
                    <span className="text-sm font-bold text-white block capitalize">{userRoleInActiveClub === 'president' ? 'Chủ nhiệm 👑' : 'Phó Chủ nhiệm ⭐'}</span>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Vai trò của bạn</span>
                  </div>
                </Card>

                <Card className="p-4 border border-darkborder bg-darkcard flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl"><Building size={20} /></div>
                  <div>
                    <span className="text-sm font-bold text-white block">{activeClub?.location.city}</span>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Khu vực sinh hoạt</span>
                  </div>
                </Card>
              </div>

              {/* Club Sub Tabs */}
              <div className="flex border-b border-darkborder gap-2">
                <button
                  onClick={() => setClubSubTab('applications')}
                  className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${
                    clubSubTab === 'applications' ? 'border-gold text-gold font-bold' : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  📩 Đơn chờ Duyệt ({pendingClubMembers.length})
                </button>
                <button
                  onClick={() => setClubSubTab('roster')}
                  className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${
                    clubSubTab === 'roster' ? 'border-gold text-gold font-bold' : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  🎖️ Thành viên &amp; Vai trò ({approvedClubMembers.length})
                </button>
                <button
                  onClick={() => setClubSubTab('settings')}
                  className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${
                    clubSubTab === 'settings' ? 'border-gold text-gold font-bold' : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  ⚙️ Cài đặt CLB
                </button>
              </div>

              {/* CLUB TAB 1: PENDING APPLICATIONS */}
              {clubSubTab === 'applications' && (
                <Card>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 font-display">
                    Đơn xin gia nhập đang chờ duyệt
                  </h3>
                  {pendingClubMembers.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic py-4">Không có đơn xin gia nhập nào đang chờ duyệt.</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingClubMembers.map(({ user }) => (
                        <div key={user.uid} className="flex justify-between items-center p-4 bg-charcoal/50 border border-darkborder rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-darkborder shrink-0">
                              <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-white block">{user.fullName}</span>
                              <span className="text-[10px] text-neutral-400 block">Elo Classical: {user.ratings.classical} | Khu vực: {user.location.city}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="gold" size="sm" onClick={() => handleApproveClubMember(user.uid)}>
                              Duyệt gia nhập
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-500" onClick={() => handleRemoveClubMember(user.uid)}>
                              Từ chối
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* CLUB TAB 2: ROSTER & ROLE ASSIGNMENT */}
              {clubSubTab === 'roster' && (
                <Card>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 font-display">
                    Danh sách Thành viên &amp; Phân công Vai trò
                  </h3>
                  <div className="divide-y divide-darkborder">
                    {approvedClubMembers.map(({ member, user }) => (
                      <div key={user.uid} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full overflow-hidden bg-darkborder shrink-0">
                            <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{user.fullName}</span>
                              {renderMemberRoleBadge(member.role)}
                            </div>
                            <span className="text-[10px] text-neutral-500 block">@{user.username}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          {/* Role selector dropdown - only President can assign roles */}
                          {userRoleInActiveClub === 'president' && user.uid !== activeClub?.creatorId && (
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateRole(user.uid, e.target.value as ClubMemberRole)}
                              className="bg-charcoal border border-darkborder focus:border-gold rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none cursor-pointer"
                            >
                              <option value="member">♟ Thành viên</option>
                              <option value="vice_president">⭐ Phó Chủ nhiệm (PCN)</option>
                              <option value="president">👑 Chủ nhiệm</option>
                            </select>
                          )}

                          {user.uid !== activeClub?.creatorId && (
                            <Button variant="outline" size="sm" className="text-red-500 text-xs py-1" onClick={() => handleRemoveClubMember(user.uid)}>
                              Xóa khỏi CLB
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* CLUB TAB 3: CLUB SETTINGS FORM */}
              {clubSubTab === 'settings' && (
                <Card>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-6 font-display">
                    Chỉnh sửa Thông tin &amp; Giao diện Câu lạc bộ
                  </h3>
                  <form onSubmit={handleSaveClubSettings} className="space-y-4 max-w-2xl">
                    <Input
                      label="Tên Câu lạc bộ"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                    <Input
                      label="Mô tả Câu lạc bộ"
                      isTextArea
                      rows={4}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      required
                    />
                    <Input
                      label="Thành phố / Tỉnh"
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-darkborder pt-4">
                      <ImageUploader label="Logo CLB (Cloudinary)" value={editLogoUrl} onChange={setEditLogoUrl} />
                      <ImageUploader label="Ảnh bìa CLB (Cloudinary)" value={editCoverUrl} onChange={setEditCoverUrl} />
                    </div>

                    <div className="pt-4 border-t border-darkborder flex justify-end">
                      <Button variant="gold" type="submit">
                        Lưu Cài Đặt CLB
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
