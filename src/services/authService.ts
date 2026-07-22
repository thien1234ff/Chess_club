import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseMode } from './firebase';
import { MockDB } from './mockDb';
import type { User, UserRole } from '../types';
import * as seeder from '../utils/seeder';

export type AuthStateCallback = (user: User | null) => void;

class AuthService {
  private authStateListeners: AuthStateCallback[] = [];

  private triggerListeners(user: User | null) {
    this.authStateListeners.forEach(listener => listener(user));
  }

  // Register listener for auth state change
  onAuthStateChange(callback: AuthStateCallback): () => void {
    if (isFirebaseMode && auth) {
      return auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          const profile = await this.getUserProfile(firebaseUser.uid);
          callback(profile);
        } else {
          callback(null);
        }
      });
    } else {
      this.authStateListeners.push(callback);
      callback(MockDB.getCurrentUser());
      
      // Return unsubscribe function for mock mode
      return () => {
        this.authStateListeners = this.authStateListeners.filter(l => l !== callback);
      };
    }
  }

  // Get user profile from Firestore or MockDB
  async getUserProfile(uid: string): Promise<User | null> {
    if (isFirebaseMode && db) {
      const userDoc = await getDoc(doc(db, 'users', uid));
      return userDoc.exists() ? (userDoc.data() as User) : null;
    } else {
      const users = MockDB.getCollection<User>('USERS');
      return users.find(u => u.uid === uid) || null;
    }
  }

  // Email and Password Login
  async login(email: string, password: string): Promise<User> {
    if (isFirebaseMode && auth) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const profile = await this.getUserProfile(credential.user.uid);
      if (!profile) throw new Error('User profile not found in database.');
      return profile;
    } else {
      const users = MockDB.getCollection<User>('USERS');
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) throw new Error('Invalid email or password.');
      // Simulating simple password validation (for demo purposes)
      if (password.length < 6) throw new Error('Password must be at least 6 characters.');
      
      MockDB.setCurrentUser(user);
      this.triggerListeners(user);
      return user;
    }
  }

  // Email and Password Registration
  async register(email: string, username: string, fullName: string): Promise<User> {
    const defaultRole: UserRole = 'player'; // Role self-selection is explicitly blocked here!
    
    const newUserProfile = (uid: string): User => ({
      uid,
      email,
      username: username.toLowerCase().replace(/\s+/g, '_'),
      fullName,
      bio: `Hello! I'm ${fullName}, a new ChessHub player.`,
      avatarUrl: '',
      coverUrl: '',
      role: defaultRole,
      title: '',
      ratings: { rapid: 1200, blitz: 1200, classical: 1200, puzzle: 1200 },
      stats: { gamesPlayed: 0, wins: 0, draws: 0, losses: 0 },
      location: { city: 'Hanoi', country: 'VN' },
      joinedAt: new Date().toISOString()
    });

    if (isFirebaseMode && auth && db) {
      // In live mode, we create in Firebase Auth. 
      // Note: password is passed separately on the front-end call.
      // This is a service interface so we accept credentials in registration parameters, 
      // but let's make password part of the register call argument:
      throw new Error('Please call registerWithPassword for complete email signup.');
    } else {
      const users = MockDB.getCollection<User>('USERS');
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('Email is already registered.');
      }
      if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        throw new Error('Username is already taken.');
      }

      const uid = `user_${Date.now()}`;
      const user = newUserProfile(uid);
      users.push(user);
      MockDB.saveCollection('USERS', users);
      MockDB.setCurrentUser(user);
      this.triggerListeners(user);
      return user;
    }
  }

  async registerWithPassword(email: string, password: string, username: string, fullName: string): Promise<User> {
    const defaultRole: UserRole = 'player';
    
    if (isFirebaseMode && auth && db) {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = {
        uid: credential.user.uid,
        email,
        username: username.toLowerCase().replace(/\s+/g, '_'),
        fullName,
        bio: `Hello! I'm ${fullName}, a new ChessHub player.`,
        avatarUrl: '',
        coverUrl: '',
        role: defaultRole,
        title: '' as const,
        ratings: { rapid: 1200, blitz: 1200, classical: 1200, puzzle: 1200 },
        stats: { gamesPlayed: 0, wins: 0, draws: 0, losses: 0 },
        location: { city: 'Hanoi', country: 'VN' },
        joinedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', credential.user.uid), user);
      return user;
    } else {
      return this.register(email, username, fullName);
    }
  }

  // Google Authentication
  async loginWithGoogle(): Promise<User> {
    if (isFirebaseMode && auth && db) {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const uid = credential.user.uid;
      
      let profile = await this.getUserProfile(uid);
      if (!profile) {
        // Create profile on Google signup
        profile = {
          uid,
          email: credential.user.email || '',
          username: `user_${uid.substring(0, 8)}`,
          fullName: credential.user.displayName || 'Google Chess Player',
          bio: 'Welcome to ChessHub!',
          avatarUrl: credential.user.photoURL || '',
          coverUrl: '',
          role: 'player',
          title: '',
          ratings: { rapid: 1200, blitz: 1200, classical: 1200, puzzle: 1200 },
          stats: { gamesPlayed: 0, wins: 0, draws: 0, losses: 0 },
          location: { city: 'Hanoi', country: 'VN' },
          joinedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', uid), profile);
      }
      return profile;
    } else {
      // Simulate Google Login by using Lê Quang Liêm or a random player
      const users = MockDB.getCollection<User>('USERS');
      // Let's create or retrieve a mock google user
      let gUser = users.find(u => u.uid === 'google_mock_user');
      if (!gUser) {
        gUser = {
          uid: 'google_mock_user',
          email: 'google.player@gmail.com',
          username: 'google_player',
          fullName: 'Nguyễn Văn Hùng',
          bio: 'Logged in via Google Mock Authentication.',
          avatarUrl: seeder.DEFAULT_AVATARS[1],
          coverUrl: seeder.DEFAULT_COVERS[0],
          role: 'player',
          title: '',
          ratings: { rapid: 1350, blitz: 1300, classical: 1400, puzzle: 1500 },
          stats: { gamesPlayed: 24, wins: 12, draws: 4, losses: 8 },
          location: { city: 'Hanoi', country: 'VN' },
          joinedAt: new Date().toISOString()
        };
        users.push(gUser);
        MockDB.saveCollection('USERS', users);
      }
      
      MockDB.setCurrentUser(gUser);
      this.triggerListeners(gUser);
      return gUser;
    }
  }

  // Logout Session
  async logout(): Promise<void> {
    if (isFirebaseMode && auth) {
      await signOut(auth);
      this.triggerListeners(null);
    } else {
      MockDB.setCurrentUser(null);
      this.triggerListeners(null);
    }
  }

  // Get Current Authenticated User (Sync)
  getCurrentUserSync(): User | null {
    if (isFirebaseMode && auth) {
      // Note: Firestore data requires an async call, 
      // but in React we usually hold this user profile in AuthContext state
      return null;
    } else {
      return MockDB.getCurrentUser();
    }
  }
}

export const authService = new AuthService();
