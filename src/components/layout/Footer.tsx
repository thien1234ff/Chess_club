import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-darkcard border-t border-darkborder mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
          {/* Logo and Brand details */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-wider text-ivory mb-4">
              <span className="text-gold text-2xl">♟</span>
              <span>ChessHub</span>
            </Link>
            <p className="text-sm text-neutral-400 max-w-sm mb-4">
              Learn Chess. Find Players. Find Coaches. Join Clubs. Compete in Swiss Tournaments. Share Knowledge. Build Your Chess Journey in Vietnam and beyond.
            </p>
            <div className="text-xs text-neutral-500 font-medium">
              A premium, comprehensive chess social and competitive ecosystem.
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-4 font-display">Ecosystem</h4>
            <div className="flex flex-col gap-2">
              <Link to="/community" className="text-sm text-neutral-400 hover:text-white transition-colors">Community Feed</Link>
              <Link to="/coaches" className="text-sm text-neutral-400 hover:text-white transition-colors">Coach Finder</Link>
              <Link to="/tournaments" className="text-sm text-neutral-400 hover:text-white transition-colors">Tournaments</Link>
              <Link to="/clubs" className="text-sm text-neutral-400 hover:text-white transition-colors">Clubs Hub</Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-4 font-display">Resources</h4>
            <div className="flex flex-col gap-2">
              <Link to="/learn" className="text-sm text-neutral-400 hover:text-white transition-colors">Chess Lessons</Link>
              <Link to="/learn?tab=puzzles" className="text-sm text-neutral-400 hover:text-white transition-colors">Tactical Puzzles</Link>
              <Link to="/rankings" className="text-sm text-neutral-400 hover:text-white transition-colors">Elo Leaderboard</Link>
              <a href="https://fide.com" target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-400 hover:text-white transition-colors">FIDE Official Website</a>
            </div>
          </div>
        </div>

        <hr className="border-darkborder mb-6" />

        {/* copyright section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div>
            &copy; {currentYear} ChessHub Vietnam. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/" className="hover:text-white transition-colors">FIDE Guidelines</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
