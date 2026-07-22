import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Bell, MessageSquare, User as UserIcon, LogOut, ShieldAlert, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';
import { messagingService } from '../../services/messagingService';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch unread notification and message counts
  useEffect(() => {
    if (currentUser) {
      const fetchCounts = async () => {
        const notifCount = await notificationService.getUnreadCount(currentUser.uid);
        setUnreadNotifs(notifCount);
        
        const convos = await messagingService.getConversations(currentUser.uid);
        const msgCount = convos.reduce((acc, c) => acc + (c.conversation.unreadCounts[currentUser.uid] || 0), 0);
        setUnreadMsgs(msgCount);
      };

      fetchCounts();
      // Set up periodic sync (every 10 seconds)
      const interval = setInterval(fetchCounts, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Community', path: '/community' },
    { label: 'Coaches', path: '/coaches' },
    { label: 'Tournaments', path: '/tournaments' },
    { label: 'Clubs', path: '/clubs' },
    { label: 'Learn', path: '/learn' },
    { label: 'Rankings', path: '/rankings' }
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-darkcard border-b border-darkborder sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-wider text-ivory">
              <span className="text-gold text-2xl">♟</span>
              <span>ChessHub</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`text-sm font-semibold tracking-wide transition-colors ${
                    isActive(link.path) 
                      ? 'text-gold' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Search, Notifications, Profiles (Desktop) */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Global Search */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-charcoal border border-darkborder focus:border-gold rounded-lg px-3 py-1.5 pl-8 text-xs text-ivory placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-gold w-48 transition-all"
              />
              <span className="absolute left-2.5 top-2 text-neutral-500 text-xs">🔍</span>
            </form>

            {currentUser ? (
              <>
                {/* DM Bell */}
                <Link to="/messages" className="relative p-1.5 text-neutral-400 hover:text-white transition-colors" aria-label="Messages">
                  <MessageSquare size={18} />
                  {unreadMsgs > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-gold text-charcoal font-bold text-[9px] h-4 w-4 rounded-full flex items-center justify-center border border-darkcard">
                      {unreadMsgs}
                    </span>
                  )}
                </Link>

                {/* Notifications Bell */}
                <Link to={`/profile/${currentUser.uid}?tab=notifications`} className="relative p-1.5 text-neutral-400 hover:text-white transition-colors" aria-label="Notifications">
                  <Bell size={18} />
                  {unreadNotifs > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-gold text-charcoal font-bold text-[9px] h-4 w-4 rounded-full flex items-center justify-center border border-darkcard">
                      {unreadNotifs}
                    </span>
                  )}
                </Link>

                {/* Admin Status Icon */}
                {(currentUser.role === 'admin' || currentUser.role === 'moderator') && (
                  <Link to="/admin" className="p-1.5 text-amber-500 hover:text-amber-400 transition-colors" title="Admin Dashboard">
                    <ShieldAlert size={18} />
                  </Link>
                )}

                {/* Profile Link */}
                <Link 
                  to={`/profile/${currentUser.uid}`}
                  className="flex items-center gap-2 hover:opacity-85 transition-opacity"
                >
                  <div className="h-8 w-8 rounded-full bg-darkborder border border-neutral-700 overflow-hidden flex items-center justify-center">
                    {currentUser.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon size={16} className="text-neutral-400" />
                    )}
                  </div>
                  <span className="text-sm font-bold text-neutral-300 hidden xl:block">
                    {currentUser.fullName.split(' ')[0]}
                  </span>
                </Link>

                {/* Sign Out Button */}
                <button
                  onClick={() => logout()}
                  className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/auth">
                  <Button variant="ghost" size="sm">Log In</Button>
                </Link>
                <Link to="/auth?register=true">
                  <Button variant="gold" size="sm">Register</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Burger Menu Button (Mobile) */}
          <div className="flex lg:hidden items-center gap-4">
            {currentUser && (
              <Link to="/messages" className="relative p-1.5 text-neutral-400" aria-label="Messages">
                <MessageSquare size={18} />
                {unreadMsgs > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gold text-charcoal font-bold text-[9px] h-4 w-4 rounded-full flex items-center justify-center">
                    {unreadMsgs}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-neutral-400 hover:text-white p-1 rounded-lg focus:outline-none"
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="lg:hidden bg-darkcard border-t border-darkborder px-2 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-2 rounded-lg text-base font-semibold ${
                isActive(link.path)
                  ? 'bg-gold/15 text-gold'
                  : 'text-neutral-300 hover:bg-darkhover hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          
          <hr className="border-darkborder my-2" />
          
          {currentUser ? (
            <div className="space-y-1 px-3">
              <div className="flex items-center gap-3 py-2">
                <div className="h-10 w-10 rounded-full bg-darkborder border border-neutral-700 overflow-hidden flex items-center justify-center">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon size={18} className="text-neutral-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ivory">{currentUser.fullName}</h4>
                  <span className="text-xs text-neutral-500">@{currentUser.username}</span>
                </div>
              </div>
              <Link 
                to={`/profile/${currentUser.uid}`}
                onClick={() => setIsOpen(false)}
                className="block py-2 text-neutral-400 hover:text-white text-sm"
              >
                My Profile
              </Link>
              {(currentUser.role === 'admin' || currentUser.role === 'moderator') && (
                <Link 
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className="block py-2 text-amber-400 hover:text-amber-300 text-sm font-semibold"
                >
                  Admin Center
                </Link>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full text-left py-2 text-red-500 hover:text-red-400 text-sm font-semibold cursor-pointer"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-2">
              <Link to="/auth" onClick={() => setIsOpen(false)}>
                <Button variant="outline" className="w-full">Log In</Button>
              </Link>
              <Link to="/auth?register=true" onClick={() => setIsOpen(false)}>
                <Button variant="gold" className="w-full">Register</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
export default Navbar;
