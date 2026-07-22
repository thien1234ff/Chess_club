import { 
  doc, updateDoc, getDoc, collection, 
  query, where, getDocs, limit, setDoc, deleteDoc
} from 'firebase/firestore';
import { db, isFirebaseMode } from './firebase';
import { MockDB } from './mockDb';
import type { User, UserRole, Coach } from '../types';
import { notificationService } from './notificationService';

class UserService {
  // Get User Profile
  async getUser(uid: string): Promise<User | null> {
    if (isFirebaseMode && db) {
      const docRef = doc(db, 'users', uid);
      const snapshot = await getDoc(docRef);
      return snapshot.exists() ? (snapshot.data() as User) : null;
    } else {
      const users = MockDB.getCollection<User>('USERS');
      return users.find(u => u.uid === uid) || null;
    }
  }

  // Get all users (supporting searches/rankings)
  async getUsers(filters?: { city?: string; limit?: number; role?: string }): Promise<User[]> {
    if (isFirebaseMode && db) {
      const constraints = [];
      if (filters?.role) {
        constraints.push(where('role', '==', filters.role));
      }
      if (filters?.city) {
        constraints.push(where('location.city', '==', filters.city));
      }
      
      const q = query(
        collection(db, 'users'), 
        ...constraints,
        limit(filters?.limit || 100)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as User);
    } else {
      let users = MockDB.getCollection<User>('USERS');
      if (filters?.role) {
        users = users.filter(u => u.role === filters.role);
      }
      if (filters?.city) {
        users = users.filter(u => u.location.city.toLowerCase() === filters.city!.toLowerCase());
      }
      return users.slice(0, filters?.limit || 100);
    }
  }

  // Update User Profile
  async updateUser(uid: string, patch: Partial<User>): Promise<void> {
    if (isFirebaseMode && db) {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, patch);
    } else {
      const users = MockDB.getCollection<User>('USERS');
      const idx = users.findIndex(u => u.uid === uid);
      if (idx !== -1) {
        const updatedUser = { ...users[idx], ...patch };
        users[idx] = updatedUser;
        MockDB.saveCollection('USERS', users);
        
        // If current user session is edited, sync it
        const curr = MockDB.getCurrentUser();
        if (curr && curr.uid === uid) {
          MockDB.setCurrentUser(updatedUser);
        }
      }
    }
  }

  // Submit request for verified roles (coach, club_admin, tournament_organizer)
  async submitRoleRequest(
    uid: string, 
    requestedRole: UserRole, 
    details: {
      fullName: string;
      fideId?: string;
      fideRating?: number;
      chesscomUsername?: string;
      chesscomElo?: number;
      chessExperienceYears: number;
      coachingExperienceYears: number;
      specializations: string[];
      teachingFormat: 'online' | 'offline' | 'both';
      hourlyRate: number;
      bio: string;
      proofUrl?: string;
    }
  ): Promise<void> {
    const patch = {
      // Store metadata indicating pending approval
      roleRequest: {
        role: requestedRole,
        status: 'pending' as const,
        submittedAt: new Date().toISOString(),
        fullName: details.fullName,
        fideId: details.fideId,
        fideRating: details.fideRating,
        chesscomUsername: details.chesscomUsername,
        chesscomElo: details.chesscomElo,
        chessExperienceYears: details.chessExperienceYears,
        coachingExperienceYears: details.coachingExperienceYears,
        specializations: details.specializations,
        teachingFormat: details.teachingFormat,
        hourlyRate: details.hourlyRate,
        bio: details.bio,
        proofUrl: details.proofUrl
      }
    };
    
    await this.updateUser(uid, patch);

    // If coach request, prepare coach profile in pending state
    if (requestedRole === 'coach') {
      await this.saveCoachProfile(uid, {
        verified: false,
        experienceYears: details.coachingExperienceYears,
        hourlyRate: details.hourlyRate,
        teachingMethodology: details.bio,
        specializations: details.specializations.length > 0 ? details.specializations : ['Beginner'],
        languages: ['Vietnamese'],
        rating: 5.0,
        reviewsCount: 0,
        studentsCount: 0,
        availability: [
          { dayOfWeek: 1, slots: ['09:00', '14:00', '19:00'] },
          { dayOfWeek: 3, slots: ['09:00', '14:00', '19:00'] },
          { dayOfWeek: 5, slots: ['09:00', '14:00', '19:00'] }
        ]
      });
    }

    // Submit Report/Alert for admin moderation
    if (isFirebaseMode && db) {
      // For this MVP, we can write a simple report document
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'reports'), {
        reporterId: uid,
        targetType: 'user',
        targetId: uid,
        reason: `Yêu cầu phê duyệt vai trò: ${requestedRole.toUpperCase()} cho kì thủ ${details.fullName}.`,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    } else {
      const reports = MockDB.getCollection<any>('REPORTS');
      reports.push({
        id: `request_${Date.now()}`,
        reporterId: uid,
        targetType: 'user',
        targetId: uid,
        reason: `Yêu cầu phê duyệt vai trò: ${requestedRole.toUpperCase()} cho kì thủ ${details.fullName}.`,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      MockDB.saveCollection('REPORTS', reports);
    }
  }

  // Admin approves role request
  async approveRoleRequest(uid: string): Promise<void> {
    const user = await this.getUser(uid);
    if (!user) throw new Error('Không tìm thấy người dùng.');
    
    // Check if there is a pending request
    const request = (user as any).roleRequest;
    if (!request) throw new Error('Không tìm thấy đơn ứng tuyển nào.');

    const approvedRole = request.role;

    // 1. Update user role
    await this.updateUser(uid, {
      role: approvedRole,
      roleRequest: undefined as any
    });

    // 2. If approved as coach, create/verify coach profile in COACHES collection
    if (approvedRole === 'coach') {
      await this.saveCoachProfile(uid, {
        verified: true,
        experienceYears: request.coachingExperienceYears || 2,
        hourlyRate: request.hourlyRate || 200000,
        teachingMethodology: request.bio || 'Phương pháp giảng dạy tương tác, bám sát trình độ học viên.',
        specializations: request.specializations?.length ? request.specializations : ['Khai cuộc', 'Chiến thuật', 'Tàn cuộc'],
        languages: ['Tiếng Việt'],
        rating: 5.0,
        reviewsCount: 1,
        studentsCount: 0,
        availability: [
          { dayOfWeek: 1, slots: ['09:00', '14:00', '19:00'] },
          { dayOfWeek: 3, slots: ['09:00', '14:00', '19:00'] },
          { dayOfWeek: 5, slots: ['09:00', '14:00', '19:00'] }
        ]
      });
    }

    // 3. Notify user of approval
    await notificationService.createNotification({
      recipientId: uid,
      senderId: 'admin',
      senderName: 'Ban Quản Trị ChessHub',
      senderAvatar: '',
      type: 'system',
      targetId: uid,
      title: 'Đã Phê Duyệt Hồ Sơ HLV 🎉',
      message: `Chúc mừng! Hồ sơ ứng tuyển Huấn luyện viên cờ vua của bạn đã được Admin phê duyệt.`
    });
  }

  // Save or update Coach profile in database
  async saveCoachProfile(uid: string, coachData: Omit<Coach, 'uid'>): Promise<void> {
    const fullData: Coach = { uid, ...coachData };
    if (isFirebaseMode && db) {
      await setDoc(doc(db, 'coaches', uid), fullData);
    } else {
      const coaches = MockDB.getCollection<Coach>('COACHES');
      const idx = coaches.findIndex(c => c.uid === uid);
      if (idx !== -1) {
        coaches[idx] = fullData;
      } else {
        coaches.push(fullData);
      }
      MockDB.saveCollection('COACHES', coaches);
    }
  }

  // Follow Actions
  async followUser(followerId: string, followingId: string): Promise<void> {
    const followId = `${followerId}_${followingId}`;
    if (isFirebaseMode && db) {
      await setDoc(doc(db, 'follows', followId), {
        id: followId,
        followerId,
        followingId,
        createdAt: new Date().toISOString()
      });

      const follower = await this.getUser(followerId);
      if (follower) {
        await notificationService.createNotification({
          recipientId: followingId,
          senderId: followerId,
          senderName: follower.fullName,
          senderAvatar: follower.avatarUrl,
          type: 'follow',
          targetId: followerId,
          title: 'Người theo dõi mới',
          message: `${follower.fullName} đã bắt đầu theo dõi bạn.`
        });
      }
    } else {
      const follows = MockDB.getCollection<any>('FOLLOWS');
      if (!follows.some(f => f.id === followId)) {
        follows.push({
          id: followId,
          followerId,
          followingId,
          createdAt: new Date().toISOString()
        });
        MockDB.saveCollection('FOLLOWS', follows);

        const follower = await this.getUser(followerId);
        if (follower) {
          await notificationService.createNotification({
            recipientId: followingId,
            senderId: followerId,
            senderName: follower.fullName,
            senderAvatar: follower.avatarUrl,
            type: 'follow',
            targetId: followerId,
            title: 'Người theo dõi mới',
            message: `${follower.fullName} đã bắt đầu theo dõi bạn.`
          });
        }
      }
    }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const followId = `${followerId}_${followingId}`;
    if (isFirebaseMode && db) {
      await deleteDoc(doc(db, 'follows', followId));
    } else {
      const follows = MockDB.getCollection<any>('FOLLOWS');
      const filtered = follows.filter(f => f.id !== followId);
      MockDB.saveCollection('FOLLOWS', filtered);
    }
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const followId = `${followerId}_${followingId}`;
    if (isFirebaseMode && db) {
      const snap = await getDoc(doc(db, 'follows', followId));
      return snap.exists();
    } else {
      const follows = MockDB.getCollection<any>('FOLLOWS');
      return follows.some(f => f.followerId === followerId && f.followingId === followingId);
    }
  }

  async getFollowersCount(uid: string): Promise<number> {
    if (isFirebaseMode && db) {
      const q = query(collection(db, 'follows'), where('followingId', '==', uid));
      const snap = await getDocs(q);
      return snap.size;
    } else {
      const follows = MockDB.getCollection<any>('FOLLOWS');
      return follows.filter(f => f.followingId === uid).length;
    }
  }

  async getFollowingCount(uid: string): Promise<number> {
    if (isFirebaseMode && db) {
      const q = query(collection(db, 'follows'), where('followerId', '==', uid));
      const snap = await getDocs(q);
      return snap.size;
    } else {
      const follows = MockDB.getCollection<any>('FOLLOWS');
      return follows.filter(f => f.followerId === uid).length;
    }
  }
}

export const userService = new UserService();
