import { 
  doc, updateDoc, getDoc, collection, 
  query, where, getDocs, limit 
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
      await this.createOrUpdateCoachProfile(uid, {
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
    if (!user) throw new Error('User not found.');
    
    // Check if there is a pending request
    const request = (user as any).roleRequest;
    if (!request) throw new Error('No pending role request found.');

    const approvedRole = request.role;

    await this.updateUser(uid, {
      role: approvedRole,
      // Remove request block or set approved
      roleRequest: undefined as any
    });

    if (approvedRole === 'coach') {
      await this.verifyCoachProfile(uid);
    }

    // Notify user of approval
    await notificationService.createNotification({
      recipientId: uid,
      senderId: 'admin_user',
      senderName: 'ChessHub Admin',
      senderAvatar: '',
      type: 'system',
      targetId: uid,
      title: 'Role Approved 🎉',
      message: `Your request to become a ${approvedRole.replace('_', ' ')} has been approved!`
    });
  }

  // Internal Coach setup
  private async createOrUpdateCoachProfile(uid: string, coachData: Omit<Coach, 'uid'>): Promise<void> {
    if (isFirebaseMode && db) {
      // In live Firebase, set inside coaches collection
      // await setDoc(doc(db, 'coaches', uid), { uid, ...coachData });
    } else {
      const coaches = MockDB.getCollection<Coach>('COACHES');
      const idx = coaches.findIndex(c => c.uid === uid);
      if (idx !== -1) {
        coaches[idx] = { uid, ...coachData, verified: coaches[idx].verified };
      } else {
        coaches.push({ uid, ...coachData });
      }
      MockDB.saveCollection('COACHES', coaches);
    }
  }

  private async verifyCoachProfile(uid: string): Promise<void> {
    if (isFirebaseMode && db) {
      // updateDoc(doc(db, 'coaches', uid), { verified: true });
    } else {
      const coaches = MockDB.getCollection<Coach>('COACHES');
      const idx = coaches.findIndex(c => c.uid === uid);
      if (idx !== -1) {
        coaches[idx].verified = true;
        MockDB.saveCollection('COACHES', coaches);
      }
    }
  }

  // Follow Actions
  async followUser(followerId: string, followingId: string): Promise<void> {
    if (isFirebaseMode && db) {
      // In firebase we'd add document to follows collection
    } else {
      const follows = MockDB.getCollection<any>('FOLLOWS');
      const followId = `${followerId}_${followingId}`;
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
            title: 'New Follower',
            message: `${follower.fullName} is now following you.`
          });
        }
      }
    }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    if (isFirebaseMode && db) {
      // In firebase we'd delete follow document
    } else {
      const follows = MockDB.getCollection<any>('FOLLOWS');
      const followId = `${followerId}_${followingId}`;
      const filtered = follows.filter(f => f.id !== followId);
      MockDB.saveCollection('FOLLOWS', filtered);
    }
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    if (isFirebaseMode && db) {
      // query firestore follows where followerId and followingId
      return false;
    } else {
      const follows = MockDB.getCollection<any>('FOLLOWS');
      return follows.some(f => f.followerId === followerId && f.followingId === followingId);
    }
  }

  async getFollowersCount(uid: string): Promise<number> {
    if (isFirebaseMode && db) {
      return 0;
    } else {
      const follows = MockDB.getCollection<any>('FOLLOWS');
      return follows.filter(f => f.followingId === uid).length;
    }
  }

  async getFollowingCount(uid: string): Promise<number> {
    if (isFirebaseMode && db) {
      return 0;
    } else {
      const follows = MockDB.getCollection<any>('FOLLOWS');
      return follows.filter(f => f.followerId === uid).length;
    }
  }
}

export const userService = new UserService();
