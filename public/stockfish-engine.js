// Stockfish WebAssembly / JS Engine Integration for Chess Master
// Provides World-Class Grandmaster level AI (Elo 3200+) with accurate UCI time control

export class StockfishEngine {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.isWasm = false;
    this.pendingMoveResolve = null;
    this.analysisCallback = null;
    this.init();
  }

  init() {
    try {
      const wasmSupported = typeof WebAssembly === 'object' && 
                            typeof WebAssembly.validate === 'function' &&
                            WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
      
      this.isWasm = wasmSupported;
      const workerUrl = wasmSupported ? 'stockfish.wasm.js' : 'stockfish.js';
      
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : '';
        this.handleMessage(line);
      };

      this.worker.onerror = (err) => {
        console.warn('Stockfish Worker Error:', err);
      };

      // Initialize UCI
      this.send('uci');
      this.send('isready');
      console.log(`[Chess] Stockfish Engine initialized (${wasmSupported ? 'WebAssembly' : 'JavaScript Fallback'})`);
    } catch (err) {
      console.warn('Failed to initialize Stockfish Worker:', err);
      this.worker = null;
    }
  }

  send(cmd) {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  handleMessage(line) {
    if (line === 'readyok' || line === 'uciok') {
      this.isReady = true;
    }

    // Real-time evaluation parse: "info depth 10 score cp 45 time 300 nodes ..."
    if (line.startsWith('info ') && line.includes('score ')) {
      this.parseEvaluation(line);
    }

    // Best move parse: "bestmove e2e4 ponder e7e5" or "bestmove (none)"
    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const uciMove = parts[1];
      if (this.pendingMoveResolve) {
        const resolve = this.pendingMoveResolve;
        this.pendingMoveResolve = null;
        resolve(uciMove && uciMove !== '(none)' ? uciMove : null);
      }
    }
  }

  parseEvaluation(line) {
    if (!this.analysisCallback) return;

    const cpMatch = line.match(/score cp (-?\d+)/);
    const mateMatch = line.match(/score mate (-?\d+)/);

    let rawScore = null;
    if (cpMatch) {
      rawScore = parseInt(cpMatch[1], 10);
    } else if (mateMatch) {
      const mateIn = parseInt(mateMatch[1], 10);
      rawScore = mateIn > 0 ? 100000 - mateIn * 1000 : -100000 - mateIn * 1000;
    }

    if (rawScore !== null) {
      const scoreInPawns = (rawScore / 100).toFixed(1);
      this.analysisCallback({
        rawScore,
        scoreFormatted: rawScore > 0 ? `+${scoreInPawns}` : `${scoreInPawns}`
      });
    }
  }

  // Request best move with strict time cap (Default: 3000ms)
  getAIMove(fen, level = 3, maxTimeMs = 3000) {
    return new Promise((resolve) => {
      if (!this.worker || !this.isReady) {
        resolve(null);
        return;
      }

      this.pendingMoveResolve = resolve;

      // Stockfish UCI Skill Level mapping (0 ~ 20)
      // Level 1: Beginner (~800 Elo)
      // Level 2: Casual (~1200 Elo)
      // Level 3: Intermediate (~1600 Elo)
      // Level 4: Advanced (~2200 Elo)
      // Level 5: World-Class Grandmaster (3200+ Elo)
      const skillMap = { 1: 0, 2: 4, 3: 10, 4: 15, 5: 20 };
      const skill = skillMap[level] !== undefined ? skillMap[level] : 20;

      this.send(`setoption name Skill Level value ${skill}`);
      this.send(`position fen ${fen}`);

      if (level === 1) {
        // Fast shallow depth for level 1
        this.send('go depth 2');
      } else {
        // Strict time control for levels 2 ~ 5
        this.send(`go movetime ${maxTimeMs}`);
      }

      // Safety fallback timer if engine takes longer than maxTimeMs + 500ms
      setTimeout(() => {
        if (this.pendingMoveResolve === resolve) {
          this.send('stop');
        }
      }, maxTimeMs + 500);
    });
  }

  // Position evaluation for Evaluation Bar
  analyzePosition(fen, callback) {
    if (!this.worker || !this.isReady) return;
    this.analysisCallback = callback;
    this.send(`position fen ${fen}`);
    this.send(`go depth 12`);

    // Auto-stop evaluation search after 800ms
    setTimeout(() => {
      this.send('stop');
    }, 800);
  }
}
