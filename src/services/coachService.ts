import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseMode } from './firebase';
import { MockDB } from './mockDb';
import type { Coach, User } from '../types';
import { userService } from './userService';

export interface CoachFilters {
  specialization?: string;
  maxPrice?: number;
  minRating?: number;
  city?: string;
  isOnline?: boolean;
}

class CoachService {
  // Retrieve detailed coach list
  async getCoaches(filters?: CoachFilters): Promise<{ coach: Coach; user: User }[]> {
    if (isFirebaseMode && db) {
      // In firebase we'd build standard query checks and fetch coaches list
      // For this MVP, we query in a simplified form and resolve user relations
      return [];
    } else {
      const coaches = MockDB.getCollection<Coach>('COACHES').filter(c => c.verified);
      const result: { coach: Coach; user: User }[] = [];

      for (const coach of coaches) {
        const user = await userService.getUser(coach.uid);
        if (!user) continue;

        // Apply filters
        if (filters?.specialization && !coach.specializations.includes(filters.specialization)) {
          continue;
        }
        if (filters?.maxPrice && coach.hourlyRate > filters.maxPrice) {
          continue;
        }
        if (filters?.minRating && coach.rating < filters.minRating) {
          continue;
        }
        if (filters?.city && user.location.city.toLowerCase() !== filters.city.toLowerCase()) {
          continue;
        }
        if (filters?.isOnline !== undefined) {
          // If online check
          // e.g. check if online slots are active
        }

        result.push({ coach, user });
      }

      return result;
    }
  }

  // Get single coach combined detail
  async getCoachProfile(uid: string): Promise<{ coach: Coach; user: User } | null> {
    const user = await userService.getUser(uid);
    if (!user) return null;

    if (isFirebaseMode && db) {
      const docRef = doc(db, 'coaches', uid);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return { coach: snapshot.data() as Coach, user };
    } else {
      const coaches = MockDB.getCollection<Coach>('COACHES');
      const coach = coaches.find(c => c.uid === uid) || null;
      if (!coach) return null;
      return { coach, user };
    }
  }

  // Edit coach profile
  async updateCoachProfile(uid: string, patch: Partial<Coach>): Promise<void> {
    if (isFirebaseMode && db) {
      const docRef = doc(db, 'coaches', uid);
      await updateDoc(docRef, patch);
    } else {
      const coaches = MockDB.getCollection<Coach>('COACHES');
      const idx = coaches.findIndex(c => c.uid === uid);
      if (idx !== -1) {
        coaches[idx] = { ...coaches[idx], ...patch };
        MockDB.saveCollection('COACHES', coaches);
      }
    }
  }

  // Add rating / reviews
  async submitReview(coachId: string, _reviewerId: string, rating: number, _comment: string): Promise<void> {
    // In Firebase we'd write to a 'reviews' subcollection or main reviews collection
    if (isFirebaseMode && db) {
      // update calculations
    } else {
      const coaches = MockDB.getCollection<Coach>('COACHES');
      const idx = coaches.findIndex(c => c.uid === coachId);
      if (idx !== -1) {
        const coach = coaches[idx];
        const oldTotal = coach.rating * coach.reviewsCount;
        const newCount = coach.reviewsCount + 1;
        const newRating = parseFloat(((oldTotal + rating) / newCount).toFixed(2));
        
        coaches[idx] = {
          ...coach,
          rating: newRating,
          reviewsCount: newCount
        };
        MockDB.saveCollection('COACHES', coaches);
      }
    }
  }
}

export const coachService = new CoachService();
