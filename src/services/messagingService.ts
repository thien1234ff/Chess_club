import { 
  collection, query, where, getDocs, 
  doc, orderBy, getDoc 
} from 'firebase/firestore';
import { db, isFirebaseMode } from './firebase';
import { MockDB } from './mockDb';
import type { Conversation, Message, User } from '../types';
import { userService } from './userService';

class MessagingService {
  // Get all active user chats
  async getConversations(userId: string): Promise<{ conversation: Conversation; counterpart: User }[]> {
    if (isFirebaseMode && db) {
      return [];
    } else {
      const conversations = MockDB.getCollection<Conversation>('CONVERSATIONS');
      const filtered = conversations.filter(c => c.participants.includes(userId));
      const results: { conversation: Conversation; counterpart: User }[] = [];

      for (const conversation of filtered) {
        const otherId = conversation.participants.find(p => p !== userId);
        if (otherId) {
          const counterpart = await userService.getUser(otherId);
          if (counterpart) {
            results.push({ conversation, counterpart });
          }
        }
      }

      // Sort by last message timestamp
      return results.sort((a, b) => {
        const timeA = a.conversation.lastMessage ? new Date(a.conversation.lastMessage.sentAt).getTime() : 0;
        const timeB = b.conversation.lastMessage ? new Date(b.conversation.lastMessage.sentAt).getTime() : 0;
        return timeB - timeA;
      });
    }
  }

  // Get conversation by ID
  async getConversation(id: string): Promise<Conversation | null> {
    if (isFirebaseMode && db) {
      const snap = await getDoc(doc(db, 'conversations', id));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as Conversation) : null;
    } else {
      const conversations = MockDB.getCollection<Conversation>('CONVERSATIONS');
      return conversations.find(c => c.id === id) || null;
    }
  }

  // Retrieve message list
  async getMessages(conversationId: string): Promise<Message[]> {
    if (isFirebaseMode && db) {
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
    } else {
      const messages = MockDB.getCollection<Message>('MESSAGES');
      return messages
        .filter(m => m.conversationId === conversationId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
  }

  // Start a new chat channel
  async createConversation(senderId: string, recipientId: string): Promise<Conversation> {
    const participants = [senderId, recipientId].sort();

    if (isFirebaseMode && db) {
      // Create conversation
      return {} as Conversation;
    } else {
      const conversations = MockDB.getCollection<Conversation>('CONVERSATIONS');
      
      // Check if conversation already exists
      const existing = conversations.find(c => 
        c.participants.length === 2 && 
        c.participants.includes(senderId) && 
        c.participants.includes(recipientId)
      );

      if (existing) return existing;

      const newConv: Conversation = {
        id: `conv_${Date.now()}`,
        participants,
        unreadCounts: {
          [senderId]: 0,
          [recipientId]: 0
        }
      };

      conversations.push(newConv);
      MockDB.saveCollection('CONVERSATIONS', conversations);
      return newConv;
    }
  }

  // Send message
  async sendMessage(params: {
    conversationId: string;
    senderId: string;
    text: string;
    type?: 'text' | 'chess';
    fen?: string;
  }): Promise<Message> {
    const { conversationId, senderId, text, type = 'text', fen } = params;

    const sender = await userService.getUser(senderId);
    if (!sender) throw new Error('Sender not found.');

    const newMsg: Omit<Message, 'id'> = {
      conversationId,
      senderId,
      senderName: sender.fullName,
      text,
      type,
      fen,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseMode && db) {
      // In firebase we'd add the message doc and update conversation lastMessage
      return {} as Message;
    } else {
      const messages = MockDB.getCollection<Message>('MESSAGES');
      const id = `msg_${Date.now()}`;
      const msg = { id, ...newMsg };
      messages.push(msg);
      MockDB.saveCollection('MESSAGES', messages);

      // Update conversation's last message and increment unread for other participants
      const conversations = MockDB.getCollection<Conversation>('CONVERSATIONS');
      const idx = conversations.findIndex(c => c.id === conversationId);
      if (idx !== -1) {
        const conv = conversations[idx];
        const otherId = conv.participants.find(p => p !== senderId);

        conv.lastMessage = {
          text: type === 'chess' ? '♟️ Shared a chess position' : text,
          senderId,
          sentAt: newMsg.createdAt
        };

        if (otherId) {
          conv.unreadCounts[otherId] = (conv.unreadCounts[otherId] || 0) + 1;
        }

        conversations[idx] = conv;
        MockDB.saveCollection('CONVERSATIONS', conversations);
      }

      return msg;
    }
  }

  // Reset unread count for conversation
  async clearUnreadCount(conversationId: string, userId: string): Promise<void> {
    if (isFirebaseMode && db) {
      // reset
    } else {
      const conversations = MockDB.getCollection<Conversation>('CONVERSATIONS');
      const idx = conversations.findIndex(c => c.id === conversationId);
      if (idx !== -1) {
        const conv = conversations[idx];
        conv.unreadCounts[userId] = 0;
        conversations[idx] = conv;
        MockDB.saveCollection('CONVERSATIONS', conversations);
      }
    }
  }
}

export const messagingService = new MessagingService();
