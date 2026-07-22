import { 
  collection, query, where, getDocs, 
  addDoc, doc, updateDoc, orderBy 
} from 'firebase/firestore';
import { db, isFirebaseMode } from './firebase';
import { MockDB } from './mockDb';
import type { Booking, BookingStatus, PaymentMethod } from '../types';
import { notificationService } from './notificationService';
import { userService } from './userService';

class BookingService {
  // Get all bookings for a user
  async getBookings(userId: string, roleType: 'student' | 'coach'): Promise<Booking[]> {
    if (isFirebaseMode && db) {
      const q = query(
        collection(db, 'bookings'),
        where(roleType === 'student' ? 'studentId' : 'coachId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
    } else {
      const bookings = MockDB.getCollection<Booking>('BOOKINGS');
      return bookings
        .filter(b => roleType === 'student' ? b.studentId === userId : b.coachId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  // Get booked slots for a specific coach on a specific date
  async getCoachBookedSlots(coachId: string, date: string): Promise<string[]> {
    if (isFirebaseMode && db) {
      const q = query(
        collection(db, 'bookings'),
        where('coachId', '==', coachId),
        where('date', '==', date),
        where('status', 'in', ['pending', 'confirmed'])
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => (d.data() as Booking).timeSlot);
    } else {
      const bookings = MockDB.getCollection<Booking>('BOOKINGS');
      return bookings
        .filter(b => b.coachId === coachId && b.date === date && (b.status === 'pending' || b.status === 'confirmed'))
        .map(b => b.timeSlot);
    }
  }

  // Create booking with double-booking checks
  async createBooking(params: {
    studentId: string;
    coachId: string;
    date: string;
    timeSlot: string;
    durationHours: number;
    hourlyRate: number;
    paymentMethod: PaymentMethod;
  }): Promise<Booking> {
    const { studentId, coachId, date, timeSlot, durationHours, hourlyRate, paymentMethod } = params;

    // Check if slot is already booked
    const bookedSlots = await this.getCoachBookedSlots(coachId, date);
    if (bookedSlots.includes(timeSlot)) {
      throw new Error('This time slot is already booked. Please choose another time.');
    }

    const student = await userService.getUser(studentId);
    if (!student) throw new Error('Student profile not found.');

    const newBooking: Omit<Booking, 'id'> = {
      studentId,
      coachId,
      date,
      timeSlot,
      durationHours,
      totalPrice: durationHours * hourlyRate,
      status: 'pending',
      paymentStatus: paymentMethod === 'cash' ? 'unpaid' : 'paid',
      paymentMethod,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseMode && db) {
      const docRef = await addDoc(collection(db, 'bookings'), newBooking);
      
      // Notify coach
      await notificationService.createNotification({
        recipientId: coachId,
        senderId: studentId,
        senderName: student.fullName,
        senderAvatar: student.avatarUrl,
        type: 'booking',
        targetId: docRef.id,
        title: 'New Booking Request',
        message: `${student.fullName} booked a lesson at ${timeSlot} on ${date}.`
      });

      return { id: docRef.id, ...newBooking };
    } else {
      const bookings = MockDB.getCollection<Booking>('BOOKINGS');
      const id = `booking_${Date.now()}`;
      const booking = { id, ...newBooking };
      bookings.push(booking);
      MockDB.saveCollection('BOOKINGS', bookings);

      // Notify coach
      await notificationService.createNotification({
        recipientId: coachId,
        senderId: studentId,
        senderName: student.fullName,
        senderAvatar: student.avatarUrl,
        type: 'booking',
        targetId: id,
        title: 'New Booking Request',
        message: `${student.fullName} booked a lesson at ${timeSlot} on ${date}.`
      });

      return booking;
    }
  }

  // Update status (e.g. approve, complete, or cancel)
  async updateBookingStatus(
    bookingId: string, 
    status: BookingStatus, 
    cancellationReason?: string
  ): Promise<void> {
    if (isFirebaseMode && db) {
      const docRef = doc(db, 'bookings', bookingId);
      const updateData: Partial<Booking> = { status };
      if (cancellationReason) updateData.cancellationReason = cancellationReason;
      await updateDoc(docRef, updateData);
    } else {
      const bookings = MockDB.getCollection<Booking>('BOOKINGS');
      const idx = bookings.findIndex(b => b.id === bookingId);
      if (idx !== -1) {
        const oldBooking = bookings[idx];
        bookings[idx] = { ...oldBooking, status, cancellationReason };
        MockDB.saveCollection('BOOKINGS', bookings);

        const coach = await userService.getUser(oldBooking.coachId);
        
        if (status === 'confirmed') {
          await notificationService.createNotification({
            recipientId: oldBooking.studentId,
            senderId: oldBooking.coachId,
            senderName: coach?.fullName || 'Your Coach',
            senderAvatar: coach?.avatarUrl || '',
            type: 'booking',
            targetId: bookingId,
            title: 'Booking Confirmed!',
            message: `Your lesson request on ${oldBooking.date} at ${oldBooking.timeSlot} has been accepted.`
          });
        } else if (status === 'cancelled') {
          await notificationService.createNotification({
            recipientId: oldBooking.studentId,
            senderId: oldBooking.coachId,
            senderName: coach?.fullName || 'Your Coach',
            senderAvatar: coach?.avatarUrl || '',
            type: 'booking',
            targetId: bookingId,
            title: 'Booking Cancelled',
            message: `Lesson on ${oldBooking.date} was cancelled. Reason: ${cancellationReason || 'No reason specified'}.`
          });
        }
      }
    }
  }
}

export const bookingService = new BookingService();
