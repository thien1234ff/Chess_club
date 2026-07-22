import type { Ratings } from '../types';

export interface AIAnalysisResult {
  evaluation: string; // e.g. "+1.2" or "Mate in 2"
  bestMove: string; // e.g. "e2e4"
  explanation: string;
  suggestedPlan: string;
}

export interface AITrainingRecommendation {
  focusAreas: string[];
  recommendedOpening: string;
  explanation: string;
}

class AIService {
  // 1. Analyze Chess Position (FEN)
  async analyzePosition(fen: string): Promise<AIAnalysisResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simple heuristic-based realistic responses depending on the FEN structure
    if (fen.includes('r1bqkb1r')) {
      return {
        evaluation: "+1.8",
        bestMove: "Qxf7# (Scholar's Checkmate)",
        explanation: "Black failed to defend the weak f7 pawn square. The queen is supported by the light-squared bishop on c4, delivering an immediate checkmate.",
        suggestedPlan: "In future games, black should defend the f7 square with Nh6, Qe7, or g6 before development."
      };
    }

    return {
      evaluation: "0.0 (Equal Position)",
      bestMove: "Nf3 (Development)",
      explanation: "The position is symmetrical. White has slightly more center control, but Black is ready to castle and equalize the tempo.",
      suggestedPlan: "Focus on developing minor pieces, securing king safety, and contesting control of the central d4 and e4 squares."
    };
  }

  // 2. Personalized Chess Coach Chat
  async askChessCoach(
    question: string,
    _history: { role: 'user' | 'assistant'; content: string }[],
    fen?: string
  ): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1200));

    const q = question.toLowerCase();
    
    if (q.includes('opening') || q.includes('how to start')) {
      return "An excellent opening focuses on three core principles: 1) Control the center with your pawns (typically e4 or d4 for White), 2) Develop your minor pieces (knights and bishops) to active squares, and 3) Castle early to secure your King. Avoid moving the same piece multiple times or bringing your Queen out too early!";
    }

    if (q.includes('blunder') || q.includes('mistake')) {
      return "Blunders often happen when we look only at our own plans and ignore our opponent's active threats. Before making any move, ask yourself: 'What is my opponent's threat? If I make this move, what squares or pieces are left undefended?' This simple checklist will cut down your blunders significantly.";
    }

    if (fen) {
      return `Looking at the position (FEN: ${fen.substring(0, 15)}...), I notice that the piece coordination is key. You should look for tactical motifs such as pins or double attacks. If you are playing White, try to occupy open files with your Rooks and push your center pawns to gain space.`;
    }

    return "Hello! I am your ChessHub AI Coach. I can help analyze your games, suggest training strategies, or explain positional concepts. What chess topic or opening structure would you like to explore today?";
  }

  // 3. Training Recommendation Engine
  async getRecommendations(ratings: Ratings, _gamesPlayed: number): Promise<AITrainingRecommendation> {
    await new Promise(resolve => setTimeout(resolve, 800));

    if (ratings.rapid < 1000) {
      return {
        focusAreas: ['Basic Checkmate Patterns (King + Queen, King + Rook)', 'Tactical motifs (Porks and Pins)', 'Opening Principles'],
        recommendedOpening: 'Italian Game (e4 e5, Nf3 Nc6, Bc4)',
        explanation: 'At your current level, games are mostly decided by direct piece hangers and simple tactical checks. Practicing Mate in 1 and basic opening safety will yield the fastest rating climb.'
      };
    }

    if (ratings.rapid < 1500) {
      return {
        focusAreas: ['Endgame Fundamentals (King + Pawn endgames)', 'Middlegame Pawn Structures', 'Tactical calculation depth'],
        recommendedOpening: 'Caro-Kann Defense for Black / Queens Gambit for White',
        explanation: 'You have solid board safety. Now, focus on transition play: learning when to trade pieces, identifying weak squares in your opponent’s camp, and converting winning endgames.'
      };
    }

    return {
      focusAreas: ['Advanced positional profiling', 'Opening preparation with engines', 'Minor piece trade logic'],
      recommendedOpening: 'Sicilian Defense (Najdorf or Classical) for Black',
      explanation: 'To push beyond 1500, deep opening preparation and active positional defense are essential. Study master games in structures that you frequently play.'
    };
  }
}

export const aiService = new AIService();
