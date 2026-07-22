import { 
  collection, query, where, getDocs, addDoc, 
  doc, getDoc, updateDoc, setDoc, deleteDoc, increment 
} from 'firebase/firestore';
import { db, isFirebaseMode } from './firebase';
import { MockDB } from './mockDb';
import type { Club, ClubMember, User, ClubType, ClubSocialLinks, ClubMemberRole } from '../types';
import { userService } from './userService';
import { notificationService } from './notificationService';

class ClubService {
  // Discover clubs
  async getClubs(city?: string, includePending: boolean = false): Promise<Club[]> {
    if (isFirebaseMode && db) {
      const constraints = [];
      if (city) {
        constraints.push(where('location.city', '==', city));
      }
      const q = query(collection(db, 'clubs'), ...constraints);
      const snapshot = await getDocs(q);
      let list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Club));
      if (!includePending) {
        list = list.filter(c => !c.status || c.status === 'approved');
      }
      return list;
    } else {
      let clubs = MockDB.getCollection<Club>('CLUBS');
      if (city) {
        clubs = clubs.filter(c => c.location.city.toLowerCase() === city.toLowerCase());
      }
      if (!includePending) {
        clubs = clubs.filter(c => !c.status || c.status === 'approved');
      }
      return clubs;
    }
  }

  // Get club by ID
  async getClub(id: string): Promise<Club | null> {
    if (isFirebaseMode && db) {
      const snapshot = await getDoc(doc(db, 'clubs', id));
      return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Club) : null;
    } else {
      const clubs = MockDB.getCollection<Club>('CLUBS');
      return clubs.find(c => c.id === id) || null;
    }
  }

  // Update club details
  async updateClub(id: string, updates: Partial<Club>): Promise<void> {
    if (isFirebaseMode && db) {
      await updateDoc(doc(db, 'clubs', id), updates);
    } else {
      const clubs = MockDB.getCollection<Club>('CLUBS');
      const idx = clubs.findIndex(c => c.id === id);
      if (idx !== -1) {
        clubs[idx] = { ...clubs[idx], ...updates };
        MockDB.saveCollection('CLUBS', clubs);
      }
    }
  }

  // Create chess club
  async createClub(params: {
    creatorId: string;
    name: string;
    description: string;
    logoUrl: string;
    coverUrl: string;
    city: string;
    type: ClubType;
    socialLinks: ClubSocialLinks;
  }): Promise<Club> {
    const { creatorId, name, description, logoUrl, coverUrl, city, type, socialLinks } = params;

    const newClub: Omit<Club, 'id'> = {
      name,
      description,
      logoUrl: logoUrl || 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=150',
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800',
      location: { city, type },
      foundedAt: new Date().getFullYear().toString(),
      creatorId,
      membersCount: 1,
      socialLinks,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (isFirebaseMode && db) {
      const docRef = await addDoc(collection(db, 'clubs'), newClub);
      // Create admin member record
      return { id: docRef.id, ...newClub };
    } else {
      const clubs = MockDB.getCollection<Club>('CLUBS');
      const id = `club_${Date.now()}`;
      const club = { id, ...newClub };
      clubs.push(club);
      MockDB.saveCollection('CLUBS', clubs);

      // Add creator as approved President member
      const members = MockDB.getCollection<ClubMember>('CLUB_MEMBERS');
      members.push({
        id: `${id}_${creatorId}`,
        clubId: id,
        userId: creatorId,
        role: 'president',
        status: 'approved',
        joinedAt: new Date().toISOString()
      });
      MockDB.saveCollection('CLUB_MEMBERS', members);

      return club;
    }
  }

  // Join club (puts user in pending status until approved by club owner)
  async joinClub(clubId: string, userId: string): Promise<ClubMember> {
    const user = await userService.getUser(userId);
    if (!user) throw new Error('Không tìm thấy thông tin kỳ thủ.');

    const club = await this.getClub(clubId);
    if (!club) throw new Error('Không tìm thấy câu lạc bộ.');

    const memberId = `${clubId}_${userId}`;
    const newMember: ClubMember = {
      id: memberId,
      clubId,
      userId,
      role: 'member',
      status: 'pending',
      joinedAt: new Date().toISOString()
    };

    if (isFirebaseMode && db) {
      await setDoc(doc(db, 'clubMembers', memberId), newMember);
    } else {
      const members = MockDB.getCollection<ClubMember>('CLUB_MEMBERS');
      
      // Check if already in club
      if (members.some(m => m.clubId === clubId && m.userId === userId)) {
        throw new Error('Bạn đã nộp đơn hoặc đã gia nhập câu lạc bộ này.');
      }

      members.push(newMember);
      MockDB.saveCollection('CLUB_MEMBERS', members);
    }

    // Notify Club Creator
    await notificationService.createNotification({
      recipientId: club.creatorId,
      senderId: userId,
      senderName: user.fullName,
      senderAvatar: user.avatarUrl,
      type: 'club_invite',
      targetId: clubId,
      title: 'Đơn xin gia nhập CLB 📩',
      message: `${user.fullName} đã gửi đơn xin gia nhập câu lạc bộ ${club.name} của bạn.`
    });

    return newMember;
  }

  // Approve member join request
  async approveMember(clubId: string, userId: string): Promise<void> {
    const club = await this.getClub(clubId);
    if (!club) throw new Error('Không tìm thấy câu lạc bộ.');
    const memberId = `${clubId}_${userId}`;

    if (isFirebaseMode && db) {
      await updateDoc(doc(db, 'clubMembers', memberId), { status: 'approved' });
      await updateDoc(doc(db, 'clubs', clubId), { membersCount: increment(1) });
    } else {
      const members = MockDB.getCollection<ClubMember>('CLUB_MEMBERS');
      const idx = members.findIndex(m => m.clubId === clubId && m.userId === userId);
      if (idx !== -1) {
        members[idx].status = 'approved';
        MockDB.saveCollection('CLUB_MEMBERS', members);

        // Increment club members count
        const clubs = MockDB.getCollection<Club>('CLUBS');
        const cIdx = clubs.findIndex(c => c.id === clubId);
        if (cIdx !== -1) {
          clubs[cIdx].membersCount += 1;
          MockDB.saveCollection('CLUBS', clubs);
        }
      }
    }

    // Notify member
    await notificationService.createNotification({
      recipientId: userId,
      senderId: club.creatorId,
      senderName: club.name,
      senderAvatar: club.logoUrl,
      type: 'system',
      targetId: clubId,
      title: 'Đã Duyệt Gia Nhập CLB ♟️',
      message: `Yêu cầu gia nhập câu lạc bộ ${club.name} của bạn đã được Ban Quản Trị phê duyệt!`
    });
  }

  // Leave club / Reject member
  async leaveClub(clubId: string, userId: string): Promise<void> {
    const memberId = `${clubId}_${userId}`;
    if (isFirebaseMode && db) {
      await deleteDoc(doc(db, 'clubMembers', memberId));
    } else {
      const members = MockDB.getCollection<ClubMember>('CLUB_MEMBERS');
      const member = members.find(m => m.clubId === clubId && m.userId === userId);
      
      if (member) {
        const filtered = members.filter(m => !(m.clubId === clubId && m.userId === userId));
        MockDB.saveCollection('CLUB_MEMBERS', filtered);

        // Decrement count if they were approved members
        if (member.status === 'approved') {
          const clubs = MockDB.getCollection<Club>('CLUBS');
          const cIdx = clubs.findIndex(c => c.id === clubId);
          if (cIdx !== -1) {
            clubs[cIdx].membersCount = Math.max(1, clubs[cIdx].membersCount - 1);
            MockDB.saveCollection('CLUBS', clubs);
          }
        }
      }
    }
  }

  // Get active roster list
  async getMembers(clubId: string): Promise<{ member: ClubMember; user: User }[]> {
    if (isFirebaseMode && db) {
      const q = query(collection(db, 'clubMembers'), where('clubId', '==', clubId));
      const snap = await getDocs(q);
      const result: { member: ClubMember; user: User }[] = [];

      for (const d of snap.docs) {
        const member = d.data() as ClubMember;
        const user = await userService.getUser(member.userId);
        if (user) {
          result.push({ member, user });
        }
      }

      return result;
    } else {
      const members = MockDB.getCollection<ClubMember>('CLUB_MEMBERS').filter(m => m.clubId === clubId);
      const result: { member: ClubMember; user: User }[] = [];

      for (const member of members) {
        const user = await userService.getUser(member.userId);
        if (user) {
          result.push({ member, user });
        }
      }

      return result;
    }
  }

  // Check user join state
  async checkMemberStatus(clubId: string, userId: string): Promise<ClubMember['status'] | 'not_joined'> {
    if (isFirebaseMode && db) {
      const memberId = `${clubId}_${userId}`;
      const snap = await getDoc(doc(db, 'clubMembers', memberId));
      return snap.exists() ? (snap.data() as ClubMember).status : 'not_joined';
    } else {
      const members = MockDB.getCollection<ClubMember>('CLUB_MEMBERS');
      const member = members.find(m => m.clubId === clubId && m.userId === userId);
      return member ? member.status : 'not_joined';
    }
  }

  // Update member role (e.g. President, Vice President, Member)
  async updateMemberRole(clubId: string, userId: string, newRole: ClubMemberRole): Promise<void> {
    const club = await this.getClub(clubId);
    if (!club) throw new Error('Club not found.');

    if (isFirebaseMode && db) {
      // update role in firestore
    } else {
      const members = MockDB.getCollection<ClubMember>('CLUB_MEMBERS');
      const idx = members.findIndex(m => m.clubId === clubId && m.userId === userId);
      if (idx !== -1) {
        members[idx].role = newRole;
        MockDB.saveCollection('CLUB_MEMBERS', members);

        const roleLabel = newRole === 'president' ? 'Chủ nhiệm' : newRole === 'vice_president' ? 'Phó Chủ nhiệm (PCN)' : 'Thành viên';

        // Notify member of role assignment
        await notificationService.createNotification({
          recipientId: userId,
          senderId: club.creatorId,
          senderName: club.name,
          senderAvatar: club.logoUrl,
          type: 'system',
          targetId: clubId,
          title: 'Cập nhật vai trò CLB 🎖️',
          message: `Vai trò của bạn tại ${club.name} đã được thay đổi thành: ${roleLabel}.`
        });
      }
    }
  }

  // Approve club creation by System Admin
  async approveClub(clubId: string): Promise<void> {
    const club = await this.getClub(clubId);
    if (!club) throw new Error('Club not found.');

    if (isFirebaseMode && db) {
      await updateDoc(doc(db, 'clubs', clubId), { status: 'approved' });
    } else {
      const clubs = MockDB.getCollection<Club>('CLUBS');
      const idx = clubs.findIndex(c => c.id === clubId);
      if (idx !== -1) {
        clubs[idx].status = 'approved';
        MockDB.saveCollection('CLUBS', clubs);
      }
    }

    // Notify creator
    await notificationService.createNotification({
      recipientId: club.creatorId,
      senderId: 'admin',
      senderName: 'Ban Quản Trị ChessHub',
      senderAvatar: club.logoUrl,
      type: 'system',
      targetId: clubId,
      title: 'CLB đã được Phê Duyệt 🏰',
      message: `Chúc mừng! Đơn thành lập Câu lạc bộ "${club.name}" của bạn đã được Admin phê duyệt.`
    });
  }

  // Reject club creation by System Admin
  async rejectClub(clubId: string): Promise<void> {
    const club = await this.getClub(clubId);
    if (!club) throw new Error('Club not found.');

    if (isFirebaseMode && db) {
      await updateDoc(doc(db, 'clubs', clubId), { status: 'rejected' });
    } else {
      const clubs = MockDB.getCollection<Club>('CLUBS');
      const idx = clubs.findIndex(c => c.id === clubId);
      if (idx !== -1) {
        clubs[idx].status = 'rejected';
        MockDB.saveCollection('CLUBS', clubs);
      }
    }

    // Notify creator
    await notificationService.createNotification({
      recipientId: club.creatorId,
      senderId: 'admin',
      senderName: 'Ban Quản Trị ChessHub',
      senderAvatar: club.logoUrl,
      type: 'system',
      targetId: clubId,
      title: 'Đơn thành lập CLB bị từ chối ⚠️',
      message: `Rất tiếc, đơn thành lập Câu lạc bộ "${club.name}" của bạn chưa đạt yêu cầu thành lập.`
    });
  }
}

export const clubService = new ClubService();
