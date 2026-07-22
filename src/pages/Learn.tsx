import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MockDB } from '../services/mockDb';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import ChessboardWrapper from '../components/chess/ChessboardWrapper';
import { 
  BookOpen, Award, CheckCircle, Zap, Star, 
  RotateCcw, Compass, ArrowRight, Play, Eye
} from 'lucide-react';

interface Puzzle {
  id: string;
  title: string;
  fen: string;
  solution: string[];
  rating: number;
  category: string;
  attempts: number;
  solves: number;
}

export const Learn: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Puzzle Solver States
  const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null);
  const [puzzleStep, setPuzzleStep] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [boardResetKey, setBoardResetKey] = useState(0); // force rerender on fail

  // Stats States
  const [solvedCount, setSolvedCount] = useState(0);
  const [puzzleRating, setPuzzleRating] = useState(1200);
  const [streak, setStreak] = useState(0);

  const activeTab = searchParams.get('tab') || 'courses';
  const puzzleId = searchParams.get('puzzleId') || null;

  useEffect(() => {
    const fetchPuzzles = () => {
      setIsLoading(true);
      try {
        const list = MockDB.getCollection<Puzzle>('PUZZLES');
        setPuzzles(list);

        if (puzzleId) {
          const match = list.find(p => p.id === puzzleId) || null;
          setActivePuzzle(match);
          setPuzzleStep(0);
          setIsSolved(false);
          setIsFailed(false);
          setShowHint(false);
        } else {
          setActivePuzzle(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPuzzles();
  }, [puzzleId, activeTab]);

  const handlePuzzleMove = (newFen: string, moveSan: string) => {
    if (!activePuzzle || isSolved) return;

    const solution = activePuzzle.solution;
    const expectedMove = solution[puzzleStep];

    // Compare move to solution (case-insensitive checks, allowing direct matches or parts)
    const isCorrect = 
      moveSan.toLowerCase() === expectedMove.toLowerCase() || 
      expectedMove.toLowerCase().includes(moveSan.toLowerCase()) ||
      moveSan.toLowerCase().includes(expectedMove.toLowerCase());

    if (isCorrect) {
      const nextStep = puzzleStep + 1;
      if (nextStep >= solution.length) {
        // Solved!
        setIsSolved(true);
        setSolvedCount(prev => prev + 1);
        setStreak(prev => prev + 1);
        setPuzzleRating(prev => prev + 15);
        addToast('Correct! Puzzle Solved 🎉', 'success');
      } else {
        setPuzzleStep(nextStep);
        addToast('Correct move! Keep going...', 'success');
      }
    } else {
      // Failed move
      setIsFailed(true);
      setStreak(0);
      setPuzzleRating(prev => Math.max(800, prev - 10));
      addToast('Wrong move. Try resetting the board!', 'error');
    }
  };

  const handleResetPuzzle = () => {
    setPuzzleStep(0);
    setIsSolved(false);
    setIsFailed(false);
    setShowHint(false);
    setBoardResetKey(prev => prev + 1); // trigger reload FEN
  };

  const courses = [
    {
      id: 'course_1',
      title: 'Chess Rules & Basic Tactics',
      description: 'Master the chess coordinate notations, piece values, checkmate patterns, and simple opening guidelines.',
      lessonsCount: 6,
      progress: 100,
      difficulty: 'Beginner',
      completed: true
    },
    {
      id: 'course_2',
      title: 'Pawn Structure & Positional Play',
      description: 'Introduction to center control, open files, back rank weaknesses, and planning minor piece trades.',
      lessonsCount: 8,
      progress: 50,
      difficulty: 'Intermediate',
      completed: false
    },
    {
      id: 'course_3',
      title: 'Advanced Opening Repertoires',
      description: 'Understanding Sicilian Defense theory, Queens Gambit details, and Caro-Kann lines.',
      lessonsCount: 10,
      progress: 0,
      difficulty: 'Advanced',
      completed: false
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // INDIVIDUAL PUZZLE GAME VIEW
  if (activePuzzle) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 text-left bg-charcoal min-h-screen">
        <Button variant="outline" size="sm" onClick={() => navigate('/learn?tab=puzzles')} className="mb-6">
          ← Back to Puzzles Feed
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Board Area */}
          <div className="lg:col-span-2 flex flex-col items-center">
            <Card className="p-6 w-full flex flex-col items-center gap-4 bg-darkcard">
              <div className="flex justify-between items-center w-full border-b border-darkborder/50 pb-3 mb-2">
                <h2 className="text-lg font-bold font-display text-white">{activePuzzle.title}</h2>
                <Badge variant="gold">Rating: {activePuzzle.rating}</Badge>
              </div>

              {/* Dynamic Chess Board */}
              <ChessboardWrapper
                key={`${activePuzzle.id}_${boardResetKey}`}
                fen={activePuzzle.fen}
                playable={!isSolved && !isFailed}
                onMove={handlePuzzleMove}
              />
            </Card>
          </div>

          {/* Details & Controls Area */}
          <div className="lg:col-span-1">
            <Card className="p-6 border border-darkborder space-y-6 bg-darkcard h-full">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 font-display">Tactic Checker</h3>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl text-center border bg-charcoal/50 border-darkborder">
                  {isSolved ? (
                    <div className="space-y-2">
                      <span className="text-emerald-400 font-bold block text-sm">Success!</span>
                      <p className="text-xs text-neutral-400">Tactical pattern successfully recognized. Ratings +15 points.</p>
                      <Button variant="gold" size="sm" onClick={() => navigate('/learn?tab=puzzles')}>
                        Next Exercise
                      </Button>
                    </div>
                  ) : isFailed ? (
                    <div className="space-y-3">
                      <span className="text-red-400 font-bold block text-sm">Incorrect Move</span>
                      <p className="text-xs text-neutral-400">That was not the best move in this position.</p>
                      <Button variant="outline" size="sm" onClick={handleResetPuzzle} leftIcon={<RotateCcw size={12} />}>
                        Retry Board
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-amber-400 font-bold block text-sm">Your Turn to Move</span>
                      <p className="text-xs text-neutral-400">Find the winning continuation on the board (White to move).</p>
                    </div>
                  )}
                </div>

                {/* Hint Area */}
                {!isSolved && (
                  <div className="border-t border-darkborder/50 pt-4">
                    {showHint ? (
                      <div className="p-3 bg-neutral-900 border border-darkborder rounded-lg text-xs italic text-neutral-400 leading-relaxed">
                        Hint: {activePuzzle.solution[0]?.substring(0, 2) === 'q' ? 'A powerful Queen movement' : 'Check the opponent King coordinates!'}
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowHint(true)}>
                        Show Hint
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // LEARN HOME VIEW
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 text-left bg-charcoal min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-white tracking-wide">Chess Academy & Puzzles</h1>
        <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Solve interactive tactics and complete training courses</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-darkborder mb-8 gap-2">
        <button onClick={() => setSearchParams({ tab: 'courses' })} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${activeTab === 'courses' ? 'border-gold text-gold font-bold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
          Study Courses
        </button>
        <button onClick={() => setSearchParams({ tab: 'puzzles' })} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${activeTab === 'puzzles' ? 'border-gold text-gold font-bold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
          Tactical Puzzles
        </button>
      </div>

      {/* STUDY COURSES */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {courses.map(course => (
            <Card key={course.id} hoverable bordered className="flex flex-col h-full">
              <div className="p-6 flex flex-col justify-between flex-grow">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <Badge variant={course.difficulty === 'Beginner' ? 'success' : course.difficulty === 'Intermediate' ? 'warning' : 'danger'}>
                      {course.difficulty}
                    </Badge>
                    <span className="text-[10px] text-neutral-500 font-bold uppercase">{course.lessonsCount} lessons</span>
                  </div>
                  <h3 className="font-bold text-white text-base font-display line-clamp-1 mb-2">{course.title}</h3>
                  <p className="text-xs text-neutral-400 line-clamp-3 mb-6">{course.description}</p>
                </div>
                
                {/* Progress bar */}
                <div className="space-y-2 border-t border-darkborder/50 pt-4 mt-auto">
                  <div className="flex justify-between text-[10px] text-neutral-500 font-bold uppercase">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="h-2 bg-darkborder rounded-full overflow-hidden">
                    <div style={{ width: `${course.progress}%` }} className="bg-gold h-full" />
                  </div>
                </div>

                <Button variant="secondary" className="w-full text-xs font-semibold mt-6" onClick={() => addToast('Course module in development.', 'info')}>
                  Start Learning
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TACTICAL PUZZLES */}
      {activeTab === 'puzzles' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left stats card */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-5 text-center">
              <h3 className="text-xs font-bold uppercase text-neutral-500 mb-4">Puzzle Profile</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-3xl font-extrabold text-gold block font-display">{puzzleRating}</span>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Your Puzzle Elo</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-darkborder/50 pt-4">
                  <div>
                    <span className="text-base font-bold text-white block">{solvedCount}</span>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Solved</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-amber-500 block flex justify-center items-center gap-0.5">
                      <Zap size={12} className="fill-current" />
                      <span>{streak}</span>
                    </span>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Streak</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Puzzles catalog list */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {puzzles.map(puzzle => (
                <Card key={puzzle.id} hoverable className="p-5 border border-darkborder flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-white font-display">{puzzle.title}</h4>
                    <span className="text-[10px] text-neutral-500 mt-1 block uppercase tracking-wider font-semibold">
                      ⭐ Rating: {puzzle.rating} | {puzzle.category.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-neutral-600 block mt-0.5">Solves: {puzzle.solves} / {puzzle.attempts}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSearchParams({ puzzleId: puzzle.id })}>
                    Solve
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Learn;
