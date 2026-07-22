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
import { db, isFirebaseMode } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
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
    const fetchPuzzles = async () => {
      setIsLoading(true);
      try {
        let list: Puzzle[] = [];
        if (isFirebaseMode && db) {
          const snapshot = await getDocs(collection(db, 'puzzles'));
          list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Puzzle));
        } else {
          list = MockDB.getCollection<Puzzle>('PUZZLES');
        }
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
        addToast('Giải đúng! Đã hoàn thành thế cờ 🎉', 'success');
      } else {
        setPuzzleStep(nextStep);
        addToast('Nước đi đúng! Tiếp tục nào...', 'success');
      }
    } else {
      setIsFailed(true);
      setStreak(0);
      setPuzzleRating(prev => Math.max(800, prev - 10));
      addToast('Nước đi sai. Thử đặt lại bàn!', 'error');
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
      title: 'Luật cờ & Chiến thuật cơ bản',
      description: 'Nắm vững ký hiệu tọa độ cờ vua, giá trị quân cờ, các mẫu chiếu bít và hướng dẫn khai cuộc đơn giản.',
      lessonsCount: 6,
      progress: 100,
      difficulty: 'Cơ bản',
      completed: true
    },
    {
      id: 'course_2',
      title: 'Cấu trúc Tốt & Đấu pháp Vị trí',
      description: 'Giới thiệu kiểm soát trung tâm, cột mở, điểm yếu hàng sau và kế hoạch đổi quân nhữ.',
      lessonsCount: 8,
      progress: 50,
      difficulty: 'Trung cấp',
      completed: false
    },
    {
      id: 'course_3',
      title: 'Hệ thống Khai cuộc Nâng cao',
      description: 'Hiểu lý thuyết Phòng thủ Sicily, chi tiết Gambit Hậu và các biến thể Caro-Kann.',
      lessonsCount: 10,
      progress: 0,
      difficulty: 'Nâng cao',
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
          ← Quay lại danh sách Thế cờ
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 font-display">Kiểm tra Chiến thuật</h3>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl text-center border bg-charcoal/50 border-darkborder">
                  {isSolved ? (
                    <div className="space-y-2">
                      <span className="text-emerald-400 font-bold block text-sm">Thành công!</span>
                      <p className="text-xs text-neutral-400">Bạn đã nhận ra mẫu chiến thuật. Điểm số +15.</p>
                      <Button variant="gold" size="sm" onClick={() => navigate('/learn?tab=puzzles')}>
                        Bài tiếp theo
                      </Button>
                    </div>
                  ) : isFailed ? (
                    <div className="space-y-3">
                      <span className="text-red-400 font-bold block text-sm">Nước đi Sai</span>
                      <p className="text-xs text-neutral-400">Đó chưa phải nước tốt nhất trong thế cờ này.</p>
                      <Button variant="outline" size="sm" onClick={handleResetPuzzle} leftIcon={<RotateCcw size={12} />}>
                        Đặt lại bàn
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-amber-400 font-bold block text-sm">Lượt bạn đi</span>
                      <p className="text-xs text-neutral-400">Tìm nước tiếp tục thắng lợi trên bàn (Trắng đi).</p>
                    </div>
                  )}
                </div>

                {/* Hint Area */}
                {!isSolved && (
                  <div className="border-t border-darkborder/50 pt-4">
                    {showHint ? (
                      <div className="p-3 bg-neutral-900 border border-darkborder rounded-lg text-xs italic text-neutral-400 leading-relaxed">
                        Gợi ý: {activePuzzle.solution[0]?.substring(0, 2) === 'q' ? 'Một nước Hậu mạnh mẽ' : 'Kiểm tra tọa độ Vua đối phương!'}
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowHint(true)}>
                        Xem gợi ý
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
        <h1 className="text-2xl font-bold font-display text-white tracking-wide">Học viện Cờ vua &amp; Thế cờ</h1>
        <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Giải thế cờ tương tác và hoàn thành các khóa học</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-darkborder mb-8 gap-2">
        <button onClick={() => setSearchParams({ tab: 'courses' })} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${activeTab === 'courses' ? 'border-gold text-gold font-bold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
          Khóa học Học tập
        </button>
        <button onClick={() => setSearchParams({ tab: 'puzzles' })} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${activeTab === 'puzzles' ? 'border-gold text-gold font-bold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
          Thế cờ Chiến thuật
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
                    <span className="text-[10px] text-neutral-500 font-bold uppercase">{course.lessonsCount} bài học</span>
                  </div>
                  <h3 className="font-bold text-white text-base font-display line-clamp-1 mb-2">{course.title}</h3>
                  <p className="text-xs text-neutral-400 line-clamp-3 mb-6">{course.description}</p>
                </div>
                
                {/* Progress bar */}
                <div className="space-y-2 border-t border-darkborder/50 pt-4 mt-auto">
                  <div className="flex justify-between text-[10px] text-neutral-500 font-bold uppercase">
                    <span>Tiến độ</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="h-2 bg-darkborder rounded-full overflow-hidden">
                    <div style={{ width: `${course.progress}%` }} className="bg-gold h-full" />
                  </div>
                </div>

                <Button variant="secondary" className="w-full text-xs font-semibold mt-6" onClick={() => addToast('Module khóa học đang phát triển.', 'info')}>
                  Bắt đầu Học
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
              <h3 className="text-xs font-bold uppercase text-neutral-500 mb-4">Hồ sơ Thế cờ</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-3xl font-extrabold text-gold block font-display">{puzzleRating}</span>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Elo Thế cờ của bạn</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-darkborder/50 pt-4">
                  <div>
                    <span className="text-base font-bold text-white block">{solvedCount}</span>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Đã giải</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-amber-500 block flex justify-center items-center gap-0.5">
                      <Zap size={12} className="fill-current" />
                      <span>{streak}</span>
                    </span>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Chuỗi</span>
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
                    <span className="text-[10px] text-neutral-600 block mt-0.5">Giải: {puzzle.solves} / {puzzle.attempts}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSearchParams({ puzzleId: puzzle.id })}>
                    Giải
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
