import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { postService } from '../services/postService';
import { useToast } from '../contexts/ToastContext';
import { Link } from 'react-router-dom';
import type { Post, Comment } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import ChessboardWrapper from '../components/chess/ChessboardWrapper';
import { 
  Heart, MessageSquare, Trash2, Send, 
  MapPin, PlusCircle, AlertCircle, PlayCircle 
} from 'lucide-react';

export const Community: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [posts, setPosts] = useState<Post[]>([]);
  const [feedType, setFeedType] = useState<'latest' | 'popular' | 'following'>('latest');
  const [isLoading, setIsLoading] = useState(true);

  // New Post Editor States
  const [postType, setPostType] = useState<'text' | 'chess' | 'puzzle'>('text');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [fen, setFen] = useState('');
  const [pgn, setPgn] = useState('');
  const [puzzleSolution, setPuzzleSolution] = useState('');
  const [puzzleHint, setPuzzleHint] = useState('');
  
  // Interactive UI States
  const [isPublisherOpen, setIsPublisherOpen] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [newCommentText, setNewCommentText] = useState('');
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  const loadFeed = async () => {
    setIsLoading(true);
    try {
      const feed = await postService.getPosts(feedType, currentUser?.uid);
      setPosts(feed);

      // Check liked states for current user
      if (currentUser) {
        const likedStates: Record<string, boolean> = {};
        for (const post of feed) {
          const hasLiked = await postService.hasLiked(post.id, currentUser.uid);
          likedStates[post.id] = hasLiked;
        }
        setLikedPosts(likedStates);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load community feed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [feedType, currentUser]);

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      addToast('Please login to create a post.', 'warning');
      return;
    }

    if (!content.trim()) {
      addToast('Post content cannot be empty.', 'error');
      return;
    }

    try {
      const extra: any = {};
      if (imageUrl) extra.imageUrl = imageUrl;
      
      if (postType === 'chess') {
        if (fen) extra.fen = fen;
        if (pgn) extra.pgn = pgn;
      } else if (postType === 'puzzle') {
        if (!fen || !puzzleSolution) {
          addToast('FEN position and solution are required for puzzles.', 'error');
          return;
        }
        extra.fen = fen;
        extra.puzzleData = {
          solution: puzzleSolution.split(',').map(m => m.trim()),
          hint: puzzleHint
        };
      }

      await postService.createPost(currentUser.uid, postType, content, extra);
      addToast('Post published successfully!', 'success');
      
      // Reset publisher
      setContent('');
      setImageUrl('');
      setFen('');
      setPgn('');
      setPuzzleSolution('');
      setPuzzleHint('');
      setIsPublisherOpen(false);
      
      // Reload feed
      loadFeed();
    } catch (err: any) {
      addToast(err.message || 'Failed to publish post.', 'error');
    }
  };

  const handleLikeToggle = async (postId: string) => {
    if (!currentUser) {
      addToast('Please login to engage with posts.', 'warning');
      return;
    }

    const currentlyLiked = likedPosts[postId];
    try {
      if (currentlyLiked) {
        await postService.unlikePost(postId, currentUser.uid);
        setLikedPosts(prev => ({ ...prev, [postId]: false }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likesCount: Math.max(0, p.likesCount - 1) } : p));
      } else {
        await postService.likePost(postId, currentUser.uid);
        setLikedPosts(prev => ({ ...prev, [postId]: true }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p));
        // Force update likes count
        loadFeed();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleComments = async (postId: string) => {
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
      return;
    }

    try {
      const list = await postService.getComments(postId);
      setCommentsMap(prev => ({ ...prev, [postId]: list }));
      setActiveCommentPostId(postId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!currentUser) {
      addToast('Please login to post a comment.', 'warning');
      return;
    }
    if (!newCommentText.trim()) return;

    try {
      const comment = await postService.createComment(postId, currentUser.uid, newCommentText);
      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment]
      }));
      setNewCommentText('');
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
      addToast('Comment added.', 'success');
    } catch (err) {
      addToast('Failed to post comment.', 'error');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await postService.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      addToast('Post deleted.', 'info');
    } catch (err) {
      addToast('Failed to delete post.', 'error');
    }
  };

  const canDelete = (post: Post) => {
    if (!currentUser) return false;
    return currentUser.uid === post.authorId || currentUser.role === 'admin' || currentUser.role === 'moderator';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 text-left bg-charcoal min-h-screen">
      {/* Community Headers */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-wide">Community Feed</h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Discuss chess variations, tactics, and openings</p>
        </div>
        {currentUser && (
          <Button 
            variant="gold" 
            onClick={() => setIsPublisherOpen(!isPublisherOpen)}
            leftIcon={<PlusCircle size={16} />}
          >
            {isPublisherOpen ? 'Close Editor' : 'Write Post'}
          </Button>
        )}
      </div>

      {/* Editor Publisher card */}
      {isPublisherOpen && currentUser && (
        <Card className="p-6 border border-darkborder mb-8 bg-darkcard">
          <form onSubmit={handlePublishPost} className="space-y-4">
            {/* Post Format choices */}
            <div className="flex gap-2 border-b border-darkborder pb-3">
              {[
                { id: 'text', label: 'Standard Text' },
                { id: 'chess', label: 'Chess Board' },
                { id: 'puzzle', label: 'Tactical Puzzle' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPostType(opt.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    postType === opt.id 
                      ? 'bg-gold text-charcoal' 
                      : 'bg-charcoal text-neutral-400 hover:text-white border border-darkborder'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Input
              label="Post Body"
              isTextArea
              rows={4}
              placeholder="What are you analyzing today? Share thoughts, openings, or chess tips..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />

            <Input
              label="Media Image URL (Optional)"
              type="text"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />

            {/* Chess related boards metadata input */}
            {(postType === 'chess' || postType === 'puzzle') && (
              <div className="border border-darkborder/50 bg-charcoal p-4 rounded-xl space-y-3">
                <Input
                  label="FEN Position String"
                  type="text"
                  placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                  value={fen}
                  onChange={(e) => setFen(e.target.value)}
                  helperText="Load custom chess arrangement."
                />
                
                {/* Live board preview */}
                {fen && (
                  <div className="flex flex-col items-center py-2 bg-darkcard/50 border border-darkborder rounded-lg max-w-xs mx-auto">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-2">Live Board Preview</span>
                    <ChessboardWrapper fen={fen} playable={false} width={200} />
                  </div>
                )}

                {postType === 'chess' && (
                  <Input
                    label="PGN Game Moves (Optional)"
                    isTextArea
                    rows={2}
                    placeholder="1. e4 e5 2. Nf3 Nc6..."
                    value={pgn}
                    onChange={(e) => setPgn(e.target.value)}
                  />
                )}

                {postType === 'puzzle' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Solution (comma separated SAN moves)"
                      type="text"
                      placeholder="Qxf7, Qxf7#"
                      value={puzzleSolution}
                      onChange={(e) => setPuzzleSolution(e.target.value)}
                    />
                    <Input
                      label="Hint"
                      type="text"
                      placeholder="Look for the mating queen diagonal"
                      value={puzzleHint}
                      onChange={(e) => setPuzzleHint(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setIsPublisherOpen(false)}>
                Cancel
              </Button>
              <Button variant="gold" type="submit">
                Publish Post
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Feed Filters */}
      <div className="flex border-b border-darkborder mb-6 gap-2">
        {[
          { id: 'latest', label: 'Latest Feed' },
          { id: 'popular', label: 'Popular' },
          ...(currentUser ? [{ id: 'following', label: 'Following' }] : [])
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => setFeedType(opt.id as any)}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              feedType === opt.id 
                ? 'border-gold text-gold font-bold' 
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Feed Post Render list */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-neutral-500 text-sm">
          No posts available inside this feed. Follow more chess players or write a post!
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map(post => (
            <Card key={post.id} className="p-6 border border-darkborder">
              {/* Header profile details */}
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-darkborder overflow-hidden flex items-center justify-center shrink-0">
                    {post.authorAvatar ? (
                      <img src={post.authorAvatar} alt={post.authorName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-neutral-400">♟</span>
                    )}
                  </div>
                  <div>
                    <Link to={`/profile/${post.authorId}`} className="font-bold text-sm text-white hover:underline block">
                      {post.authorName}
                    </Link>
                    <span className="text-[10px] text-neutral-500 block">{new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={post.type === 'puzzle' ? 'gold' : post.type === 'chess' ? 'info' : 'default'}>
                    {post.type}
                  </Badge>
                  {canDelete(post) && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-neutral-500 hover:text-red-500 p-1.5 rounded hover:bg-darkhover transition-colors cursor-pointer"
                      title="Delete Post"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Body content */}
              <div className="space-y-4">
                <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                {post.imageUrl && (
                  <div className="rounded-xl overflow-hidden max-h-80 border border-darkborder bg-black">
                    <img src={post.imageUrl} alt="attached media" className="w-full h-full object-cover opacity-90" />
                  </div>
                )}

                {/* Render interactive board */}
                {post.type === 'chess' && post.fen && (
                  <div className="flex flex-col items-center bg-charcoal border border-darkborder/50 p-4 rounded-xl max-w-lg mx-auto">
                    <ChessboardWrapper fen={post.fen} pgn={post.pgn} playable={false} />
                  </div>
                )}

                {post.type === 'puzzle' && post.fen && (
                  <div className="flex flex-col items-center bg-charcoal border border-darkborder/50 p-4 rounded-xl max-w-lg mx-auto gap-3 text-center">
                    <div className="flex items-center gap-2 text-gold text-xs font-bold uppercase tracking-wider">
                      <PlayCircle size={14} />
                      <span>Interactive Tactical Puzzle</span>
                    </div>
                    
                    {/* Render Chessboard allowing playability if puzzle solution is present */}
                    <ChessboardWrapper
                      fen={post.fen}
                      playable={true}
                      onMove={(newFen, moveSan) => {
                        const sol = post.puzzleData?.solution || [];
                        if (sol.length > 0 && (moveSan.toLowerCase() === sol[0].toLowerCase() || moveSan.includes(sol[0]))) {
                          addToast('Correct move! 🎉 Spot on chess tactic.', 'success');
                        } else {
                          addToast('Not the best move. Try again!', 'warning');
                        }
                      }}
                    />
                    
                    {post.puzzleData?.hint && (
                      <details className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-400">
                        <summary className="font-semibold select-none">Need a Hint?</summary>
                        <p className="mt-2 pl-4 italic text-neutral-400">{post.puzzleData.hint}</p>
                      </details>
                    )}
                  </div>
                )}
              </div>

              {/* Engagement Controls */}
              <div className="flex items-center gap-6 border-t border-darkborder/50 pt-4 mt-6 text-xs text-neutral-400">
                <button
                  onClick={() => handleLikeToggle(post.id)}
                  className={`flex items-center gap-1.5 font-bold cursor-pointer transition-colors ${
                    likedPosts[post.id] ? 'text-red-500' : 'hover:text-red-500'
                  }`}
                >
                  <Heart size={16} fill={likedPosts[post.id] ? 'currentColor' : 'none'} />
                  <span>{post.likesCount} Likes</span>
                </button>

                <button
                  onClick={() => handleToggleComments(post.id)}
                  className="flex items-center gap-1.5 hover:text-white font-bold cursor-pointer transition-colors"
                >
                  <MessageSquare size={16} />
                  <span>{post.commentsCount} Comments</span>
                </button>
              </div>

              {/* Comments Panel Expansion */}
              {activeCommentPostId === post.id && (
                <div className="border-t border-darkborder/50 pt-4 mt-4 space-y-4">
                  {/* Comments list */}
                  <div className="space-y-3">
                    {(commentsMap[post.id] || []).map(comment => (
                      <div key={comment.id} className="flex gap-3 bg-charcoal/50 p-3 rounded-lg border border-darkborder/30 text-xs">
                        <div className="h-7 w-7 rounded-full bg-darkborder overflow-hidden">
                          <img src={comment.authorAvatar} alt="commenter" className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-white">{comment.authorName}</span>
                            <span className="text-[10px] text-neutral-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-neutral-300 leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    {(commentsMap[post.id] || []).length === 0 && (
                      <p className="text-xs text-neutral-500 italic pl-4">No comments on this post yet. Be the first!</p>
                    )}
                  </div>

                  {/* Add comment Form */}
                  {currentUser ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="bg-charcoal border border-darkborder focus:border-gold rounded-lg px-3 py-2 text-xs text-ivory placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-gold flex-grow"
                      />
                      <Button variant="gold" size="sm" onClick={() => handleAddComment(post.id)}>
                        <Send size={12} />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 italic text-center">Please login to write a comment.</p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default Community;
