// Chess Engine: Positional Evaluation, Minimax with Alpha-Beta, Quiescence Search & Move Ordering

const PIECE_VALS = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

// Piece Square Tables (From White's perspective, flipped for Black)
const PST = {
  p: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
  ],
  q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  k_mg: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
  ],
  k_eg: [
    [-50,-40,-30,-20,-20,-30,-40,-50],
    [-30,-20,-10,  0,  0,-10,-20,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-30,  0,  0,  0,  0,-30,-30],
    [-50,-30,-30,-30,-30,-30,-30,-50]
  ]
};

export class ChessEngine {
  constructor() {
    this.tt = new Map(); // Simple Transposition Table
    this.startTime = 0;
    this.timeLimit = 3000;
    this.nodeCount = 0;
    this.timeUp = false;
  }

  checkTime() {
    this.nodeCount++;
    if ((this.nodeCount & 255) === 0) {
      if (Date.now() - this.startTime >= this.timeLimit) {
        this.timeUp = true;
      }
    }
    return this.timeUp;
  }

  evaluateBoard(game) {
    if (game.isCheckmate()) {
      return game.turn() === 'w' ? -100000 : 100000;
    }
    if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition()) {
      return 0;
    }

    let score = 0;
    const board = game.board();
    let totalPieces = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        totalPieces++;
        const val = PIECE_VALS[piece.type] || 0;
        let posVal = 0;

        if (piece.type === 'k') {
          // Endgame vs Middle game King positioning
          const isEndgame = totalPieces < 14;
          const table = isEndgame ? PST.k_eg : PST.k_mg;
          posVal = piece.color === 'w' ? table[r][c] : table[7 - r][c];
        } else if (PST[piece.type]) {
          const table = PST[piece.type];
          posVal = piece.color === 'w' ? table[r][c] : table[7 - r][c];
        }

        const totalVal = val + posVal;
        score += piece.color === 'w' ? totalVal : -totalVal;
      }
    }

    // In-check penalty/bonus
    if (game.inCheck()) {
      score += game.turn() === 'w' ? -50 : 50;
    }

    return score;
  }

  orderMoves(game, moves) {
    return moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Prioritize captures with MVV-LVA
      if (a.captured) {
        scoreA += (PIECE_VALS[a.captured] * 10) - PIECE_VALS[a.piece];
      }
      if (b.captured) {
        scoreB += (PIECE_VALS[b.captured] * 10) - PIECE_VALS[b.piece];
      }

      // Prioritize promotions
      if (a.promotion) scoreA += 800;
      if (b.promotion) scoreB += 800;

      return scoreB - scoreA;
    });
  }

  quiescenceSearch(game, alpha, beta, isMaximizing, depth = 0) {
    if (this.checkTime()) return this.evaluateBoard(game);

    const standPat = this.evaluateBoard(game);

    if (depth >= 4) return standPat;

    if (isMaximizing) {
      if (standPat >= beta) return beta;
      if (alpha < standPat) alpha = standPat;

      const moves = this.orderMoves(game, game.moves({ verbose: true })).filter(m => m.captured || m.promotion);
      for (const move of moves) {
        if (this.timeUp) break;
        game.move(move);
        const score = this.quiescenceSearch(game, alpha, beta, false, depth + 1);
        game.undo();

        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      }
      return alpha;
    } else {
      if (standPat <= alpha) return alpha;
      if (beta > standPat) beta = standPat;

      const moves = this.orderMoves(game, game.moves({ verbose: true })).filter(m => m.captured || m.promotion);
      for (const move of moves) {
        if (this.timeUp) break;
        game.move(move);
        const score = this.quiescenceSearch(game, alpha, beta, true, depth + 1);
        game.undo();

        if (score <= alpha) return alpha;
        if (score < beta) beta = score;
      }
      return beta;
    }
  }

  minimax(game, depth, alpha, beta, isMaximizing) {
    if (this.checkTime()) {
      return { score: this.evaluateBoard(game), bestMove: null };
    }

    if (depth === 0 || game.isGameOver()) {
      return { score: this.quiescenceSearch(game, alpha, beta, isMaximizing) };
    }

    const moves = this.orderMoves(game, game.moves({ verbose: true }));
    if (moves.length === 0) {
      return { score: this.evaluateBoard(game) };
    }

    let bestMove = moves[0];

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of moves) {
        if (this.timeUp) break;
        game.move(move);
        const { score } = this.minimax(game, depth - 1, alpha, beta, false);
        game.undo();

        if (!this.timeUp && score > maxScore) {
          maxScore = score;
          bestMove = move;
        }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break; // Beta cut-off
      }
      return { score: maxScore, bestMove };
    } else {
      let minScore = Infinity;
      for (const move of moves) {
        if (this.timeUp) break;
        game.move(move);
        const { score } = this.minimax(game, depth - 1, alpha, beta, true);
        game.undo();

        if (!this.timeUp && score < minScore) {
          minScore = score;
          bestMove = move;
        }
        beta = Math.min(beta, score);
        if (beta <= alpha) break; // Alpha cut-off
      }
      return { score: minScore, bestMove };
    }
  }

  // Find best move according to AI difficulty level (1 to 5) with max 3s limit
  getAIMove(game, level = 3, maxTimeMs = 3000) {
    const isMaximizing = game.turn() === 'w';
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return null;

    this.startTime = Date.now();
    this.timeLimit = maxTimeMs;
    this.nodeCount = 0;
    this.timeUp = false;

    // Level 1: Beginner (Depth 1 + 35% random blunder)
    if (level === 1) {
      if (Math.random() < 0.35) {
        return moves[Math.floor(Math.random() * moves.length)];
      }
      const result = this.minimax(game, 1, -Infinity, Infinity, isMaximizing);
      return result.bestMove || moves[0];
    }

    // Level 2: Casual (Depth 2 + 15% slight randomness)
    if (level === 2) {
      if (Math.random() < 0.15) {
        const sorted = this.orderMoves(game, [...moves]);
        return sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];
      }
      const result = this.minimax(game, 2, -Infinity, Infinity, isMaximizing);
      return result.bestMove || moves[0];
    }

    // Level 3, 4, 5: Iterative Deepening with strict maxTime limit (Default: 7000ms)
    const targetDepth = level === 3 ? 3 : (level === 4 ? 4 : 5);
    let bestMoveSoFar = moves[0];

    for (let d = 1; d <= targetDepth; d++) {
      const result = this.minimax(game, d, -Infinity, Infinity, isMaximizing);

      if (this.timeUp) {
        break; // Stop immediately and use the previous complete iteration's best move
      }

      if (result && result.bestMove) {
        bestMoveSoFar = result.bestMove;
      }

      // If already spent more than 75% of time limit, skip next depth as it takes 20~30x more time
      if (Date.now() - this.startTime >= maxTimeMs * 0.75) {
        break;
      }
    }

    return bestMoveSoFar;
  }

  // Position evaluation for UI Evaluation Bar (capped at 2s)
  analyzePosition(game, maxTimeMs = 2000) {
    const isMaximizing = game.turn() === 'w';
    this.startTime = Date.now();
    this.timeLimit = maxTimeMs;
    this.nodeCount = 0;
    this.timeUp = false;

    const result = this.minimax(game, 3, -Infinity, Infinity, isMaximizing);
    const scoreInPawns = (result.score / 100).toFixed(1);
    return {
      rawScore: result.score,
      scoreFormatted: (result.score > 0 ? `+${scoreInPawns}` : `${scoreInPawns}`),
      bestMove: result.bestMove
    };
  }
}
