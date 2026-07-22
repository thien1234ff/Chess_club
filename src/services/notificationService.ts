import { 
  collection, query, where, getDocs, 
  addDoc, updateDoc, doc, orderBy, writeBatch 
} from 'firebase/firestore';
import { db, isFirebaseMode } from './firebase';
import { MockDB } from './mockDb';
import type { Notification } from '../types';

class NotificationService {
  // Retrieve notification list
  async getNotifications(recipientId: string): Promise<Notification[]> {
    if (isFirebaseMode && db) {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', recipientId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
    } else {
      const notifications = MockDB.getCollection<Notification>('NOTIFICATIONS');
      return notifications
        .filter(n => n.recipientId === recipientId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  // Create platform notification
  async createNotification(data: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Promise<string> {
    const newNotif = {
      ...data,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseMode && db) {
      const docRef = await addDoc(collection(db, 'notifications'), newNotif);
      return docRef.id;
    } else {
      const notifications = MockDB.getCollection<Notification>('NOTIFICATIONS');
      const id = `notif_${Date.now()}`;
      notifications.push({ id, ...newNotif });
      MockDB.saveCollection('NOTIFICATIONS', notifications);
      return id;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    if (isFirebaseMode && db) {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { isRead: true });
    } else {
      const notifications = MockDB.getCollection<Notification>('NOTIFICATIONS');
      const idx = notifications.findIndex(n => n.id === notificationId);
      if (idx !== -1) {
        notifications[idx].isRead = true;
        MockDB.saveCollection('NOTIFICATIONS', notifications);
      }
    }
  }

  // Mark all notifications as read
  async markAllAsRead(recipientId: string): Promise<void> {
    if (isFirebaseMode && db) {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', recipientId),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.update(d.ref, { isRead: true });
      });
      await batch.commit();
    } else {
      const notifications = MockDB.getCollection<Notification>('NOTIFICATIONS');
      const updated = notifications.map(n => {
        if (n.recipientId === recipientId) {
          return { ...n, isRead: true };
        }
        return n;
      });
      MockDB.saveCollection('NOTIFICATIONS', updated);
    }
  }

  // Get count of unread notifications
  async getUnreadCount(recipientId: string): Promise<number> {
    if (isFirebaseMode && db) {
      // In firebase we fetch unread count (e.g. through metadata counters or querying)
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', recipientId),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } else {
      const notifications = MockDB.getCollection<Notification>('NOTIFICATIONS');
      return notifications.filter(n => n.recipientId === recipientId && !n.isRead).length;
    }
  }
}

export const notificationService = new NotificationService();
