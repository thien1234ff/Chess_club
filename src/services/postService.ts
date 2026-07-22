import { 
  collection, query, where, getDocs, addDoc, 
  deleteDoc, doc, updateDoc, orderBy, limit, increment
} from 'firebase/firestore';
import { db, isFirebaseMode } from './firebase';
import { MockDB } from './mockDb';
import type { Post, Comment } from '../types';
import { notificationService } from './notificationService';
import { userService } from './userService';

class PostService {
  // Get community posts
  async getPosts(filter: 'latest' | 'popular' | 'following' = 'latest', currentUserId?: string): Promise<Post[]> {
    if (isFirebaseMode && db) {
      let q;
      const colRef = collection(db, 'posts');
      
      if (filter === 'popular') {
        q = query(colRef, orderBy('likesCount', 'desc'), limit(50));
      } else {
        // Default to latest
        q = query(colRef, orderBy('createdAt', 'desc'), limit(50));
      }
      
      const snapshot = await getDocs(q);
      let posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post));
      
      if (filter === 'following' && currentUserId) {
        // Filter in-memory for following to avoid complex index matching
        // In large apps, we would use a composite join index
      }
      
      return posts;
    } else {
      let posts = MockDB.getCollection<Post>('POSTS');
      
      if (filter === 'popular') {
        posts = [...posts].sort((a, b) => b.likesCount - a.likesCount);
      } else if (filter === 'following' && currentUserId) {
        // Get followed list
        const follows = MockDB.getCollection<any>('FOLLOWS');
        const followedIds = follows
          .filter(f => f.followerId === currentUserId)
          .map(f => f.followingId);
        
        posts = posts.filter(p => p.authorId === currentUserId || followedIds.includes(p.authorId));
        posts = [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else {
        // Latest
        posts = [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      
      return posts;
    }
  }

  // Create post
  async createPost(
    authorId: string, 
    type: 'text' | 'image' | 'chess' | 'puzzle', 
    content: string, 
    extra?: { imageUrl?: string; fen?: string; pgn?: string; puzzleData?: any }
  ): Promise<Post> {
    const author = await userService.getUser(authorId);
    if (!author) throw new Error('Author not found.');

    const newPost: Omit<Post, 'id'> = {
      authorId,
      authorName: author.fullName,
      authorAvatar: author.avatarUrl,
      type,
      content,
      imageUrl: extra?.imageUrl,
      fen: extra?.fen,
      pgn: extra?.pgn,
      puzzleData: extra?.puzzleData,
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseMode && db) {
      const docRef = await addDoc(collection(db, 'posts'), newPost);
      return { id: docRef.id, ...newPost };
    } else {
      const posts = MockDB.getCollection<Post>('POSTS');
      const id = `post_${Date.now()}`;
      const post = { id, ...newPost };
      posts.push(post);
      MockDB.saveCollection('POSTS', posts);
      return post;
    }
  }

  // Delete post
  async deletePost(postId: string): Promise<void> {
    if (isFirebaseMode && db) {
      await deleteDoc(doc(db, 'posts', postId));
    } else {
      const posts = MockDB.getCollection<Post>('POSTS');
      const filtered = posts.filter(p => p.id !== postId);
      MockDB.saveCollection('POSTS', filtered);
      
      // Delete associated comments
      const comments = MockDB.getCollection<Comment>('COMMENTS');
      const commentFiltered = comments.filter(c => c.postId !== postId);
      MockDB.saveCollection('COMMENTS', commentFiltered);
    }
  }

  // Like post
  async likePost(postId: string, userId: string): Promise<void> {
    if (isFirebaseMode && db) {
      // In firestore, increment post count and add to likes collection
      // For this MVP, we update likesCount directly and record the like event
    } else {
      const likes = MockDB.getCollection<any>('LIKES');
      const likeId = `${postId}_${userId}`;
      
      if (!likes.some(l => l.id === likeId)) {
        likes.push({ id: likeId, postId, userId, createdAt: new Date().toISOString() });
        MockDB.saveCollection('LIKES', likes);

        // Increment count
        const posts = MockDB.getCollection<Post>('POSTS');
        const idx = posts.findIndex(p => p.id === postId);
        if (idx !== -1) {
          posts[idx].likesCount += 1;
          MockDB.saveCollection('POSTS', posts);

          // Send notification to author
          const postAuthorId = posts[idx].authorId;
          if (postAuthorId !== userId) {
            const liker = await userService.getUser(userId);
            if (liker) {
              await notificationService.createNotification({
                recipientId: postAuthorId,
                senderId: userId,
                senderName: liker.fullName,
                senderAvatar: liker.avatarUrl,
                type: 'like',
                targetId: postId,
                title: 'Post Liked',
                message: `${liker.fullName} liked your post: "${posts[idx].content.substring(0, 30)}..."`
              });
            }
          }
        }
      }
    }
  }

  // Unlike post
  async unlikePost(postId: string, userId: string): Promise<void> {
    if (isFirebaseMode && db) {
      // Decrement count
    } else {
      const likes = MockDB.getCollection<any>('LIKES');
      const likeId = `${postId}_${userId}`;
      const filtered = likes.filter(l => l.id !== likeId);
      
      if (likes.length !== filtered.length) {
        MockDB.saveCollection('LIKES', filtered);
        
        const posts = MockDB.getCollection<Post>('POSTS');
        const idx = posts.findIndex(p => p.id === postId);
        if (idx !== -1) {
          posts[idx].likesCount = Math.max(0, posts[idx].likesCount - 1);
          MockDB.saveCollection('POSTS', posts);
        }
      }
    }
  }

  // Check if liked
  async hasLiked(postId: string, userId: string): Promise<boolean> {
    if (isFirebaseMode && db) {
      return false;
    } else {
      const likes = MockDB.getCollection<any>('LIKES');
      return likes.some(l => l.postId === postId && l.userId === userId);
    }
  }

  // Get comments
  async getComments(postId: string): Promise<Comment[]> {
    if (isFirebaseMode && db) {
      const q = query(
        collection(db, 'comments'),
        where('postId', '==', postId),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
    } else {
      const comments = MockDB.getCollection<Comment>('COMMENTS');
      return comments
        .filter(c => c.postId === postId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
  }

  // Create comment
  async createComment(postId: string, authorId: string, content: string): Promise<Comment> {
    const author = await userService.getUser(authorId);
    if (!author) throw new Error('Author not found.');

    const newComment: Omit<Comment, 'id'> = {
      postId,
      authorId,
      authorName: author.fullName,
      authorAvatar: author.avatarUrl,
      content,
      likesCount: 0,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseMode && db) {
      const docRef = await addDoc(collection(db, 'comments'), newComment);
      await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
      return { id: docRef.id, ...newComment };
    } else {
      const comments = MockDB.getCollection<Comment>('COMMENTS');
      const id = `comment_${Date.now()}`;
      const comment = { id, ...newComment };
      comments.push(comment);
      MockDB.saveCollection('COMMENTS', comments);

      // Increment count on post
      const posts = MockDB.getCollection<Post>('POSTS');
      const idx = posts.findIndex(p => p.id === postId);
      if (idx !== -1) {
        posts[idx].commentsCount += 1;
        MockDB.saveCollection('POSTS', posts);

        // Send notification to author
        const postAuthorId = posts[idx].authorId;
        if (postAuthorId !== authorId) {
          await notificationService.createNotification({
            recipientId: postAuthorId,
            senderId: authorId,
            senderName: author.fullName,
            senderAvatar: author.avatarUrl,
            type: 'comment',
            targetId: postId,
            title: 'New Comment',
            message: `${author.fullName} commented: "${content.substring(0, 30)}..."`
          });
        }
      }
      return comment;
    }
  }

  // Delete comment
  async deleteComment(commentId: string, postId: string): Promise<void> {
    if (isFirebaseMode && db) {
      await deleteDoc(doc(db, 'comments', commentId));
      await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(-1) });
    } else {
      const comments = MockDB.getCollection<Comment>('COMMENTS');
      const filtered = comments.filter(c => c.id !== commentId);
      MockDB.saveCollection('COMMENTS', filtered);

      // Decrement count on post
      const posts = MockDB.getCollection<Post>('POSTS');
      const idx = posts.findIndex(p => p.id === postId);
      if (idx !== -1) {
        posts[idx].commentsCount = Math.max(0, posts[idx].commentsCount - 1);
        MockDB.saveCollection('POSTS', posts);
      }
    }
  }
}

export const postService = new PostService();
