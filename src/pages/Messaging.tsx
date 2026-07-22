import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { messagingService } from '../services/messagingService';
import type { Conversation, Message, User } from '../types';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import ChessboardWrapper from '../components/chess/ChessboardWrapper';
import { Send, MessageSquare, Share2, Info } from 'lucide-react';

export const Messaging: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Conversations Lists
  const [convos, setConvos] = useState<{ conversation: Conversation; counterpart: User }[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Messaging Inputs
  const [inputText, setInputText] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareFen, setShareFen] = useState('');
  const [shareText, setShareText] = useState('Check out this interesting chess position!');

  const loadConversations = async () => {
    if (!currentUser) return;
    try {
      const list = await messagingService.getConversations(currentUser.uid);
      setConvos(list);
      
      // Auto select first conversation if none active
      if (list.length > 0 && !activeConvoId) {
        setActiveConvoId(list[0].conversation.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [currentUser]);

  // Load message logs when active conversation changes
  useEffect(() => {
    if (activeConvoId && currentUser) {
      const loadMessagesLog = async () => {
        const list = await messagingService.getMessages(activeConvoId);
        setMessages(list);
        await messagingService.clearUnreadCount(activeConvoId, currentUser.uid);
      };
      loadMessagesLog();
      
      // Setup polling every 5 seconds for messages sync in mock mode
      const interval = setInterval(loadMessagesLog, 5000);
      return () => clearInterval(interval);
    }
  }, [activeConvoId, currentUser]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeConvoId || !inputText.trim()) return;

    try {
      await messagingService.sendMessage({
        conversationId: activeConvoId,
        senderId: currentUser.uid,
        text: inputText
      });
      setInputText('');
      
      // Reload message threads
      const list = await messagingService.getMessages(activeConvoId);
      setMessages(list);
      loadConversations();
    } catch (err) {
      addToast('Failed to send message.', 'error');
    }
  };

  const handleShareChessPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeConvoId || !shareFen) return;

    try {
      await messagingService.sendMessage({
        conversationId: activeConvoId,
        senderId: currentUser.uid,
        text: shareText,
        type: 'chess',
        fen: shareFen
      });

      setIsShareModalOpen(false);
      setShareFen('');
      setShareText('Check out this interesting chess position!');
      
      // Reload
      const list = await messagingService.getMessages(activeConvoId);
      setMessages(list);
      loadConversations();
      addToast('Chess position shared in chat.', 'success');
    } catch (err) {
      addToast('Failed to share position.', 'error');
    }
  };

  const activeCounterpart = convos.find(c => c.conversation.id === activeConvoId)?.counterpart;

  if (!currentUser) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center">
        <Info size={36} className="text-neutral-500" />
        <p className="text-sm text-neutral-400">Please log in to access direct messages.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 text-left bg-charcoal min-h-[85vh]">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-darkcard border border-darkborder rounded-2xl overflow-hidden h-[75vh]">
        {/* Left Column: Conversations List */}
        <div className="md:col-span-4 border-r border-darkborder flex flex-col h-full bg-darkcard">
          <div className="p-4 border-b border-darkborder">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <MessageSquare size={16} className="text-gold" />
              <span>Direct Chats</span>
            </h3>
          </div>

          <div className="flex-grow overflow-y-auto divide-y divide-darkborder/50">
            {convos.map(({ conversation, counterpart }) => {
              const isActive = conversation.id === activeConvoId;
              const unreads = conversation.unreadCounts[currentUser.uid] || 0;

              return (
                <button
                  key={conversation.id}
                  onClick={() => setActiveConvoId(conversation.id)}
                  className={`w-full p-4 flex gap-3 items-center text-left hover:bg-darkhover transition-colors cursor-pointer ${
                    isActive ? 'bg-darkhover' : ''
                  }`}
                >
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-darkborder shrink-0">
                    <img src={counterpart.avatarUrl} alt={counterpart.fullName} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-bold text-sm text-white truncate">{counterpart.fullName}</h4>
                      {conversation.lastMessage && (
                        <span className="text-[9px] text-neutral-500 shrink-0">
                          {new Date(conversation.lastMessage.sentAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 truncate pr-6">
                      {conversation.lastMessage ? conversation.lastMessage.text : 'Start chatting...'}
                    </p>
                  </div>
                  {unreads > 0 && (
                    <span className="bg-gold text-charcoal font-bold text-[9px] h-4 w-4 rounded-full flex items-center justify-center shrink-0">
                      {unreads}
                    </span>
                  )}
                </button>
              );
            })}

            {convos.length === 0 && (
              <div className="text-center py-12 text-neutral-500 text-xs italic">No active conversations found.</div>
            )}
          </div>
        </div>

        {/* Right Column: Chat Thread Logs */}
        <div className="md:col-span-8 flex flex-col h-full bg-charcoal/20">
          {activeConvoId && activeCounterpart ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-darkcard border-b border-darkborder flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full overflow-hidden bg-darkborder shrink-0">
                    <img src={activeCounterpart.avatarUrl} alt={activeCounterpart.fullName} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{activeCounterpart.fullName}</h4>
                    <span className="text-[10px] text-neutral-500 flex items-center gap-1">📍 {activeCounterpart.location.city}</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs font-semibold flex items-center gap-1.5"
                  onClick={() => setIsShareModalOpen(true)}
                >
                  <Share2 size={12} />
                  <span>Share Board</span>
                </Button>
              </div>

              {/* Chat Messages scroll area */}
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.uid;
                  return (
                    <div 
                      key={msg.id}
                      className={`flex flex-col max-w-[70%] ${
                        isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <div 
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          isMe 
                            ? 'bg-gold text-charcoal rounded-tr-none' 
                            : 'bg-darkcard border border-darkborder text-ivory rounded-tl-none'
                        }`}
                      >
                        <p>{msg.text}</p>

                        {/* Interactive Board inside chat bubble if type = chess */}
                        {msg.type === 'chess' && msg.fen && (
                          <div className="mt-3 p-2 bg-charcoal border border-darkborder rounded-xl">
                            <ChessboardWrapper fen={msg.fen} playable={false} width={200} />
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-neutral-500 mt-1 uppercase tracking-wider">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input text message bar */}
              <form onSubmit={handleSendMessage} className="p-4 bg-darkcard border-t border-darkborder flex gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="bg-charcoal border border-darkborder focus:border-gold rounded-lg px-3 py-2 text-xs text-ivory placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-gold flex-grow"
                />
                <Button variant="gold" size="sm" type="submit">
                  <Send size={14} />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-grow text-center text-neutral-500 gap-3">
              <MessageSquare size={36} />
              <p className="text-sm">Select a conversation thread on the left side to start chatting.</p>
            </div>
          )}
        </div>
      </div>

      {/* Share Chess Position Modal */}
      <Modal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        title="Share Chess Position Setup"
      >
        <form onSubmit={handleShareChessPosition} className="space-y-4 text-left">
          <Input
            label="FEN Position String"
            type="text"
            placeholder="r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4"
            value={shareFen}
            onChange={(e) => setShareFen(e.target.value)}
            required
          />

          {shareFen && (
            <div className="flex flex-col items-center py-2 bg-charcoal/50 border border-darkborder rounded-lg max-w-xs mx-auto">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-2">Position Preview</span>
              <ChessboardWrapper fen={shareFen} playable={false} width={180} />
            </div>
          )}

          <Input
            label="Optional Description Message"
            type="text"
            value={shareText}
            onChange={(e) => setShareText(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-darkborder">
            <Button variant="outline" type="button" onClick={() => setIsShareModalOpen(false)}>Cancel</Button>
            <Button variant="gold" type="submit">Share to Chat</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default Messaging;
