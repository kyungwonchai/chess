// Web Worker for Non-blocking Chess AI & Background Position Evaluation
import { Chess } from './chess.js';
import { ChessEngine } from './engine.js';

const engine = new ChessEngine();

self.onmessage = function(e) {
  const { type, fen, level, id } = e.data;

  if (type === 'get_ai_move') {
    const game = new Chess(fen);
    const aiMove = engine.getAIMove(game, level || 3);
    self.postMessage({
      type: 'ai_move_result',
      move: aiMove,
      id
    });
  } 
  else if (type === 'analyze') {
    const game = new Chess(fen);
    const analysis = engine.analyzePosition(game);
    self.postMessage({
      type: 'analyze_result',
      analysis,
      id
    });
  }
};
