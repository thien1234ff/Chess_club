import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services/userService';
import type { User } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { MapPin, ShieldCheck } from 'lucide-react';

export const Rankings: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [ratingFormat, setRatingFormat] = useState<'rapid' | 'blitz' | 'classical' | 'puzzle'>('classical');
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const list = await userService.getUsers();
        setUsers(list);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  // Filter & Sort computation
  const sortedLeaderboard = users
    .filter(u => {
      if (cityFilter && u.location.city.toLowerCase() !== cityFilter.toLowerCase()) return false;
      return true;
    })
    .sort((a, b) => {
      const ratingA = a.ratings[ratingFormat] || 1200;
      const ratingB = b.ratings[ratingFormat] || 1200;
      return ratingB - ratingA;
    });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 text-left bg-charcoal min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-white tracking-wide">ChessHub Elo Leaderboard</h1>
        <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Live ratings of players, coaches, and masters across Vietnam</p>
      </div>

      {/* Leaderboard control filters */}
      <Card className="p-5 mb-8 border border-darkborder flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {[
            { id: 'classical', label: 'Classical' },
            { id: 'rapid', label: 'Rapid' },
            { id: 'blitz', label: 'Blitz' },
            { id: 'puzzle', label: 'Puzzles' }
          ].map(fmt => (
            <button
              key={fmt.id}
              onClick={() => setRatingFormat(fmt.id as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                ratingFormat === fmt.id
                  ? 'bg-gold text-charcoal'
                  : 'bg-charcoal text-neutral-400 hover:text-white border border-darkborder'
              }`}
            >
              {fmt.label}
            </button>
          ))}
        </div>

        <div className="w-full md:w-48">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full bg-charcoal text-ivory border border-darkborder rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gold"
          >
            <option value="">Tất cả khu vực</option>
            <option value="Hanoi">Hà Nội</option>
            <option value="Ho Chi Minh City">TP. Hồ Chí Minh</option>
            <option value="Da Nang">Đà Nẵng</option>
            <option value="Can Tho">Cần Thơ</option>
            <option value="Hue">Huế</option>
          </select>
        </div>
      </Card>

      {/* Leaderboard Table list */}
      <Card className="overflow-hidden border border-darkborder p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-charcoal/80 text-neutral-400 uppercase font-semibold border-b border-darkborder">
              <tr>
                <th className="p-4 text-center w-16">Rank</th>
                <th className="p-4">Player</th>
                <th className="p-4">Location</th>
                <th className="p-4 text-center">FIDE Title</th>
                <th className="p-4 text-center">Games</th>
                <th className="p-4 text-right pr-6">Elo Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-darkborder">
              {sortedLeaderboard.map((user, idx) => {
                const rank = idx + 1;
                const hasFide = Boolean(user.fideId);

                return (
                  <tr
                    key={user.uid}
                    className={`hover:bg-darkhover transition-colors ${
                      hasFide ? 'border-l-2 border-red-600/60' : ''
                    }`}
                  >
                    <td className="p-4 text-center text-sm font-semibold">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar with FIDE ring if verified */}
                        <div
                          className={`h-8 w-8 rounded-full overflow-hidden shrink-0 ${
                            hasFide
                              ? 'ring-2 ring-red-500/70 ring-offset-1 ring-offset-charcoal'
                              : 'bg-darkborder'
                          }`}
                        >
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-neutral-500 flex items-center justify-center h-full">♟</span>
                          )}
                        </div>
                        <div>
                          <Link
                            to={`/profile/${user.uid}`}
                            className={`font-bold hover:underline text-sm block leading-none ${
                              hasFide ? 'text-red-400 hover:text-red-300' : 'text-white'
                            }`}
                          >
                            {user.fullName}
                          </Link>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span
                              className={`text-[10px] block ${
                                hasFide ? 'text-red-500/80 font-semibold' : 'text-neutral-500'
                              }`}
                            >
                              @{user.username}
                            </span>
                            {hasFide && (
                              <span
                                title={`FIDE ID: ${user.fideId}`}
                                className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-900/30 border border-red-800/50 px-1 py-0.5 rounded"
                              >
                                <ShieldCheck size={8} />
                                FIDE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-neutral-300">
                      <span className="flex items-center gap-1"><MapPin size={12} className="text-neutral-500" /> {user.location.city}</span>
                    </td>
                    <td className="p-4 text-center">
                      {user.title ? <Badge variant="gold">{user.title}</Badge> : '-'}
                    </td>
                    <td className="p-4 text-center text-neutral-400 font-semibold">{user.stats.gamesPlayed}</td>
                    <td className="p-4 text-right pr-6">
                      {hasFide ? (
                        <div className="inline-flex flex-col items-end gap-0.5">
                          <span className="text-sm font-bold font-display text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]">
                            {user.ratings[ratingFormat] || 1200}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-red-600/70 flex items-center gap-0.5">
                            <ShieldCheck size={8} />
                            FIDE Rated
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold font-display text-gold">
                          {user.ratings[ratingFormat] || 1200}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {sortedLeaderboard.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-neutral-500 italic text-sm">No rankings match this criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
export default Rankings;
