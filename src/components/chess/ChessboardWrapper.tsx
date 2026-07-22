import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Button } from '../ui/Button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw } from 'lucide-react';

export interface ChessboardWrapperProps {
  fen?: string; // FEN state
  pgn?: string; // Optional PGN game file
  onMove?: (newFen: string, movePgn: string) => void; // Triggered on move drop
  playable?: boolean;
  orientation?: 'white' | 'black';
  width?: number;
}

export const ChessboardWrapper: React.FC<ChessboardWrapperProps> = ({
  fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn,
  onMove,
  playable = true,
  orientation = 'white',
  width
}) => {
  const [gameFen, setGameFen] = useState(fen);
  const [boardWidth, setBoardWidth] = useState(width || 480);
  const chessRef = useRef<Chess>(new Chess(fen));

  // PGN Nav states
  const [pgnMoves, setPgnMoves] = useState<string[]>([]);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);

  // Sync FEN changes
  useEffect(() => {
    try {
      chessRef.current = new Chess(fen);
      setGameFen(fen);
    } catch (e) {
      console.error('Invalid FEN loaded:', fen, e);
    }
  }, [fen]);

  // Read and parse PGN moves
  useEffect(() => {
    if (pgn) {
      try {
        const tempChess = new Chess();
        tempChess.loadPgn(pgn);
        const history = tempChess.history();
        setPgnMoves(history);
        setCurrentMoveIdx(history.length - 1);
        
        // Re-load the game in the active ref and set to the end
        chessRef.current = tempChess;
        setGameFen(tempChess.fen());
      } catch (err) {
        console.error('Error loading PGN:', pgn, err);
      }
    }
  }, [pgn]);

  // Adjust board width responsively
  useEffect(() => {
    if (width) return;
    const handleResize = () => {
      const parent = document.getElementById('board-container');
      if (parent) {
        // Clamp width between 280px and 520px depending on screen sizes
        const w = Math.min(520, Math.max(280, parent.offsetWidth));
        setBoardWidth(w);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width]);

  // Handle manual player moves
  const onPieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (!playable) return false;

    try {
      const chess = chessRef.current;
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // auto-promote to Queen for simplicity
      });

      if (move) {
        setGameFen(chess.fen());
        if (onMove) {
          onMove(chess.fen(), move.san);
        }
        return true;
      }
    } catch (e) {
      // Invalid move
    }
    return false;
  };

  // PGN Navigation methods
  const navigateToMove = (index: number) => {
    if (!pgn || index < -1 || index >= pgnMoves.length) return;
    
    const tempChess = new Chess();
    for (let i = 0; i <= index; i++) {
      tempChess.move(pgnMoves[i]);
    }
    
    chessRef.current = tempChess;
    setGameFen(tempChess.fen());
    setCurrentMoveIdx(index);
  };

  return (
    <div id="board-container" className="flex flex-col items-center gap-4 w-full">
      {/* Interactive Board */}
      <div 
        style={{ width: `${boardWidth}px` }} 
        className="rounded-xl overflow-hidden border-2 border-darkborder shadow-2xl bg-[#302e2c]"
      >
        <Chessboard
          options={{
            position: gameFen,
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              return onPieceDrop(sourceSquare, targetSquare || '');
            },
            boardOrientation: orientation,
            allowDragging: playable,
            darkSquareStyle: { backgroundColor: '#b58863' },
            lightSquareStyle: { backgroundColor: '#f0d9b5' }
          }}
        />
      </div>

      {/* PGN Navigation Panel */}
      {pgn && pgnMoves.length > 0 && (
        <div className="flex flex-col items-center gap-2 w-full max-w-md">
          <div className="flex gap-1 justify-center w-full bg-darkcard border border-darkborder rounded-lg p-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigateToMove(-1)}
              disabled={currentMoveIdx === -1}
              aria-label="First move"
            >
              <ChevronsLeft size={16} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigateToMove(currentMoveIdx - 1)}
              disabled={currentMoveIdx === -1}
              aria-label="Previous move"
            >
              <ChevronLeft size={16} />
            </Button>
            
            {/* Status counter */}
            <span className="flex items-center text-xs font-semibold text-neutral-400 px-3 min-w-20 justify-center">
              {currentMoveIdx + 1} / {pgnMoves.length}
            </span>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigateToMove(currentMoveIdx + 1)}
              disabled={currentMoveIdx === pgnMoves.length - 1}
              aria-label="Next move"
            >
              <ChevronRight size={16} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigateToMove(pgnMoves.length - 1)}
              disabled={currentMoveIdx === pgnMoves.length - 1}
              aria-label="Last move"
            >
              <ChevronsRight size={16} />
            </Button>
          </div>
          
          {/* Current position metadata */}
          <div className="text-xs text-neutral-500 italic mt-1">
            Last move: {currentMoveIdx >= 0 ? `${Math.floor(currentMoveIdx / 2) + 1}.${currentMoveIdx % 2 === 0 ? '' : '..'}${pgnMoves[currentMoveIdx]}` : 'Starting position'}
          </div>
        </div>
      )}

      {/* Reset Board Option */}
      {!pgn && playable && gameFen !== fen && (
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs flex items-center gap-1.5"
          onClick={() => {
            chessRef.current = new Chess(fen);
            setGameFen(fen);
          }}
        >
          <RotateCcw size={12} />
          <span>Reset Board</span>
        </Button>
      )}
    </div>
  );
};
export default ChessboardWrapper;
