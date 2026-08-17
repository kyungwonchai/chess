import { Chess } from './chess.js';
import { ChessEngine } from './engine.js';
import { audio } from './audio.js';
import { PIECE_SVGS, PIECE_VALUES } from './pieces.js';

// Application State
const state = {
  mode: 'ai', // 'ai', 'wifi', 'local'
  game: new Chess(),
  engine: new ChessEngine(),
  worker: null,
  playerColor: 'w', // 'w', 'b', 'spectator'
  boardFlipped: false,
  autoFlip: true,
  aiLevel: 3,
  evalEnabled: true,
  selectedSquare: null,
  legalMovesForSelected: [],
  lastMove: null,
  hintMove: null,
  pendingPromotion: null,
  gameStatus: 'idle', // 'idle', 'playing', 'ended'
  aiThinking: false,
  
  // Clocks
  timeControl: { initial: 600, increment: 0 },
  timers: { w: 600, b: 600 },
  clockInterval: null,
  activeTurn: 'w',

  // WiFi Online state
  ws: null,
  roomId: null,
  playerId: localStorage.getItem('chess_player_id') || Math.random().toString(36).substring(2, 9),
  playerName: localStorage.getItem('chess_player_name') || '플레이어 1',
  opponentName: '상대방',
  serverUrl: window.location.origin
};

localStorage.setItem('chess_player_id', state.playerId);

// DOM Elements
const el = {
  viewLobby: document.getElementById('view-lobby'),
  viewGame: document.getElementById('view-game'),
  btnHomeLogo: document.getElementById('btn-home-logo'),
  headerWifiIp: document.getElementById('header-wifi-ip'),
  btnCopyIp: document.getElementById('btn-copy-ip'),
  btnOpenQr: document.getElementById('btn-open-qr'),
  selectTheme: document.getElementById('select-theme'),
  btnSoundToggle: document.getElementById('btn-sound-toggle'),

  // Lobby
  aiColorPicker: document.getElementById('ai-color-picker'),
  aiLevelPicker: document.getElementById('ai-level-picker'),
  aiTimePicker: document.getElementById('ai-time-picker'),
  btnStartAi: document.getElementById('btn-start-ai'),

  tabCreateRoom: document.getElementById('tab-create-room'),
  tabJoinRoom: document.getElementById('tab-join-room'),
  formCreateRoom: document.getElementById('form-create-room'),
  formJoinRoom: document.getElementById('form-join-room'),
  createPlayerName: document.getElementById('create-player-name'),
  createTimePicker: document.getElementById('create-time-picker'),
  createColorPicker: document.getElementById('create-color-picker'),
  btnCreateOnlineRoom: document.getElementById('btn-create-online-room'),
  joinPlayerName: document.getElementById('join-player-name'),
  inputRoomCode: document.getElementById('input-room-code'),
  btnSubmitJoinRoom: document.getElementById('btn-submit-join-room'),
  btnShowLobbyQr: document.getElementById('btn-show-lobby-qr'),

  toggleAutoFlip: document.getElementById('toggle-auto-flip'),
  localTimePicker: document.getElementById('local-time-picker'),
  btnStartLocal: document.getElementById('btn-start-local'),

  // Arena Board
  chessboard: document.getElementById('chessboard'),
  evalBarWrapper: document.getElementById('eval-bar-wrapper'),
  evalBarFill: document.getElementById('eval-bar-fill'),
  evalScore: document.getElementById('eval-score'),

  opponentName: document.getElementById('opponent-name'),
  opponentTag: document.getElementById('opponent-tag'),
  opponentAvatar: document.getElementById('opponent-avatar'),
  opponentCaptured: document.getElementById('opponent-captured'),
  opponentTimer: document.getElementById('opponent-timer'),
  opponentClockBox: document.getElementById('opponent-clock-box'),

  userName: document.getElementById('user-name'),
  userTag: document.getElementById('user-tag'),
  userAvatar: document.getElementById('user-avatar'),
  userCaptured: document.getElementById('user-captured'),
  userTimer: document.getElementById('user-timer'),
  userClockBox: document.getElementById('user-clock-box'),

  gameStatusBanner: document.getElementById('game-status-banner'),
  gameStatusText: document.getElementById('game-status-text'),

  // Side Tools
  btnAiHint: document.getElementById('btn-ai-hint'),
  btnUndoMove: document.getElementById('btn-undo-move'),
  btnFlipBoard: document.getElementById('btn-flip-board'),
  btnToggleEval: document.getElementById('btn-toggle-eval'),
  engineEvalText: document.getElementById('engine-eval-text'),
  engineHintText: document.getElementById('engine-hint-text'),
  btnOfferDraw: document.getElementById('btn-offer-draw'),
  btnResign: document.getElementById('btn-resign'),
  btnLeaveGame: document.getElementById('btn-leave-game'),

  notationMovesList: document.getElementById('notation-moves-list'),
  btnCopyFen: document.getElementById('btn-copy-fen'),
  btnCopyPgn: document.getElementById('btn-copy-pgn'),

  sideTabOnlineBtn: document.getElementById('side-tab-online-btn'),
  onlineRoomBadge: document.getElementById('online-room-badge'),
  currentRoomId: document.getElementById('current-room-id'),
  btnCopyRoomLink: document.getElementById('btn-copy-room-link'),
  btnShowRoomQr: document.getElementById('btn-show-room-qr'),
  chatMessagesBox: document.getElementById('chat-messages-box'),
  inputChat: document.getElementById('input-chat'),
  btnSendChat: document.getElementById('btn-send-chat'),

  // Modals
  modalPromotion: document.getElementById('modal-promotion'),
  promotionChoices: document.getElementById('promotion-choices'),
  modalQr: document.getElementById('modal-qr'),
  qrCodeImg: document.getElementById('qr-code-img'),
  modalQrUrl: document.getElementById('modal-qr-url'),
  btnModalCopyUrl: document.getElementById('btn-modal-copy-url'),
  btnCloseQrModal: document.getElementById('btn-close-qr-modal'),

  modalGameOver: document.getElementById('modal-game-over'),
  gameoverIcon: document.getElementById('gameover-icon'),
  gameoverTitle: document.getElementById('gameover-title'),
  gameoverReason: document.getElementById('gameover-reason'),
  btnModalRematch: document.getElementById('btn-modal-rematch'),
  btnModalLobby: document.getElementById('btn-modal-lobby'),

  toastContainer: document.getElementById('toast-container')
};

// ================= WORKER INITIALIZATION =================
function initWorker() {
  try {
    state.worker = new Worker('ai-worker.js', { type: 'module' });
    state.worker.onmessage = (e) => {
      const { type, move, analysis } = e.data;
      if (type === 'ai_move_result') {
        state.aiThinking = false;
        if (move && state.gameStatus === 'playing') {
          handleAIMoveResult(move);
        }
      } else if (type === 'analyze_result') {
        if (analysis) {
          applyAnalysisResult(analysis);
        }
      }
    };
  } catch (err) {
    console.warn('Web Worker fallback to direct execution:', err);
    state.worker = null;
  }
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = msg;
  el.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function formatTime(seconds) {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

async function initNetworkInfo() {
  try {
    const res = await fetch('/api/info');
    const data = await res.json();
    if (data.primaryUrl) {
      el.headerWifiIp.innerText = data.primaryUrl.replace(/^http:\/\//, '');
      state.serverUrl = data.primaryUrl;
    }
  } catch (err) {
    el.headerWifiIp.innerText = window.location.host;
  }
}

// ================= ULTRA-FAST BOARD RENDERING =================
function renderBoard(fullRebuild = false) {
  const board = state.game.board();
  const isFlipped = state.boardFlipped;

  const inCheck = state.game.inCheck();
  let checkedKingPos = null;
  if (inCheck) {
    const turn = state.game.turn();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === turn) {
          checkedKingPos = `${String.fromCharCode(97 + c)}${8 - r}`;
        }
      }
    }
  }

  // Fast map of legal destination squares
  const legalMap = new Set(state.legalMovesForSelected.map(m => m.to));

  el.chessboard.innerHTML = '';
  const fragment = document.createDocumentFragment();

  for (let rIdx = 0; rIdx < 8; rIdx++) {
    for (let cIdx = 0; cIdx < 8; cIdx++) {
      const r = isFlipped ? 7 - rIdx : rIdx;
      const c = isFlipped ? 7 - cIdx : cIdx;

      const file = String.fromCharCode(97 + c);
      const rank = 8 - r;
      const squareName = `${file}${rank}`;
      const isLight = (r + c) % 2 === 0;

      const sq = document.createElement('div');
      sq.className = `square ${isLight ? 'light' : 'dark'}`;
      sq.dataset.square = squareName;

      // Coordinate Labels
      if (cIdx === 0) {
        const rankLabel = document.createElement('span');
        rankLabel.className = 'square-coord rank';
        rankLabel.innerText = rank;
        sq.appendChild(rankLabel);
      }
      if (rIdx === 7) {
        const fileLabel = document.createElement('span');
        fileLabel.className = 'square-coord file';
        fileLabel.innerText = file;
        sq.appendChild(fileLabel);
      }

      // Check highlight
      if (checkedKingPos === squareName) {
        sq.classList.add('in-check');
      }

      // Last move highlight
      if (state.lastMove && (state.lastMove.from === squareName || state.lastMove.to === squareName)) {
        sq.classList.add('last-move');
      }

      // Selected square highlight
      if (state.selectedSquare === squareName) {
        sq.classList.add('selected');
      }

      // Hint highlight
      if (state.hintMove && (state.hintMove.from === squareName || state.hintMove.to === squareName)) {
        sq.classList.add('hint-to');
      }

      // Legal move indicators
      if (legalMap.has(squareName)) {
        const pieceOnSquare = board[r][c];
        const indicator = document.createElement('div');
        indicator.className = pieceOnSquare ? 'legal-capture-ring' : 'legal-dot';
        sq.appendChild(indicator);
      }

      // Render Piece
      const piece = board[r][c];
      if (piece) {
        const pieceKey = `${piece.color}${piece.type.toUpperCase()}`;
        const pieceSvg = PIECE_SVGS[pieceKey];
        if (pieceSvg) {
          const pieceContainer = document.createElement('div');
          pieceContainer.style.width = '100%';
          pieceContainer.style.height = '100%';
          pieceContainer.style.display = 'flex';
          pieceContainer.style.alignItems = 'center';
          pieceContainer.style.justifyContent = 'center';
          pieceContainer.innerHTML = pieceSvg;
          sq.appendChild(pieceContainer);
        }
      }

      // Pointer event for instant touch & mouse response
      sq.addEventListener('pointerdown', (e) => handleSquareClick(e, squareName));
      fragment.appendChild(sq);
    }
  }

  el.chessboard.appendChild(fragment);

  updateCapturedAndMaterial();
  updateStatusBanner();
  renderNotation();
}

// Instant square selection & move handler
function handleSquareClick(e, square) {
  if (state.gameStatus !== 'playing' || state.aiThinking) return;

  const currentTurn = state.game.turn();
  if (state.mode === 'ai' && currentTurn !== state.playerColor) return;
  if (state.mode === 'wifi' && (state.playerColor !== currentTurn || state.playerColor === 'spectator')) return;

  const piece = state.game.get(square);

  // If a piece is already selected and we tap a legal target
  if (state.selectedSquare) {
    const move = state.legalMovesForSelected.find(m => m.to === square);
    if (move) {
      // Check for pawn promotion
      const isPromotion = (move.piece === 'p' && (move.to[1] === '8' || move.to[1] === '1'));
      if (isPromotion) {
        promptPromotion(state.selectedSquare, square, move.color);
        return;
      }
      executeMove({ from: state.selectedSquare, to: square });
      state.selectedSquare = null;
      state.legalMovesForSelected = [];
      renderBoard();
      return;
    }
  }

  // Select piece of current player
  if (piece && piece.color === currentTurn) {
    state.selectedSquare = square;
    state.legalMovesForSelected = state.game.moves({ square, verbose: true });
    state.hintMove = null;
    renderBoard();
  } else {
    state.selectedSquare = null;
    state.legalMovesForSelected = [];
    renderBoard();
  }
}

function promptPromotion(from, to, color) {
  state.pendingPromotion = { from, to };
  el.promotionChoices.innerHTML = '';

  const promoTypes = ['q', 'r', 'b', 'n'];
  promoTypes.forEach(type => {
    const btn = document.createElement('div');
    btn.className = 'promo-choice-btn';
    btn.innerHTML = PIECE_SVGS[`${color}${type.toUpperCase()}`];
    btn.onclick = () => {
      el.modalPromotion.classList.remove('active');
      executeMove({ from, to, promotion: type });
      state.selectedSquare = null;
      state.legalMovesForSelected = [];
      state.pendingPromotion = null;
      renderBoard();
    };
    el.promotionChoices.appendChild(btn);
  });

  el.modalPromotion.classList.add('active');
}

// Execute move locally or send to server
function executeMove(moveObj) {
  if (state.mode === 'wifi') {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'make_move',
        from: moveObj.from,
        to: moveObj.to,
        promotion: moveObj.promotion || 'q'
      }));
    }
    return;
  }

  // Local / AI Game
  try {
    const move = state.game.move(moveObj);
    if (!move) return;

    state.lastMove = move;

    // Sound effect
    if (state.game.inCheck()) {
      audio.playCheck();
    } else if (move.captured) {
      audio.playCapture();
    } else if (move.flags.includes('k') || move.flags.includes('q')) {
      audio.playCastle();
    } else {
      audio.playMove();
    }

    state.activeTurn = state.game.turn();

    if (state.mode === 'local' && state.autoFlip) {
      state.boardFlipped = (state.activeTurn === 'b');
    }

    renderBoard();
    triggerAsyncEvaluation();

    if (state.game.isGameOver()) {
      handleGameOver();
      return;
    }

    // Trigger AI move
    if (state.mode === 'ai' && state.activeTurn !== state.playerColor) {
      triggerAIMove();
    }
  } catch (e) {
    console.error('Invalid move:', e);
  }
}

function triggerAIMove() {
  if (state.gameStatus !== 'playing') return;

  state.aiThinking = true;
  el.gameStatusText.innerText = '🤖 AI가 수를 계산 중입니다...';

  if (state.worker) {
    state.worker.postMessage({
      type: 'get_ai_move',
      fen: state.game.fen(),
      level: state.aiLevel
    });
  } else {
    // Non-worker fallback
    setTimeout(() => {
      const aiMove = state.engine.getAIMove(state.game, state.aiLevel);
      handleAIMoveResult(aiMove);
    }, 100);
  }
}

function handleAIMoveResult(aiMove) {
  if (!aiMove || state.gameStatus !== 'playing') return;

  const move = state.game.move(aiMove);
  state.lastMove = move;

  if (state.game.inCheck()) {
    audio.playCheck();
  } else if (move.captured) {
    audio.playCapture();
  } else if (move.flags.includes('k') || move.flags.includes('q')) {
    audio.playCastle();
  } else {
    audio.playMove();
  }

  state.activeTurn = state.game.turn();
  renderBoard();
  triggerAsyncEvaluation();

  if (state.game.isGameOver()) {
    handleGameOver();
  }
}

// ================= NON-BLOCKING ASYNC EVALUATION =================
function triggerAsyncEvaluation() {
  if (!state.evalEnabled || state.gameStatus !== 'playing') return;

  if (state.worker) {
    state.worker.postMessage({
      type: 'analyze',
      fen: state.game.fen()
    });
  } else {
    setTimeout(() => {
      const analysis = state.engine.analyzePosition(state.game);
      applyAnalysisResult(analysis);
    }, 50);
  }
}

function applyAnalysisResult(analysis) {
  const score = analysis.rawScore;
  const scoreInPawns = (score / 100).toFixed(1);

  el.engineEvalText.innerText = `${score > 0 ? '+' : ''}${scoreInPawns} (${score > 50 ? '백 우세' : score < -50 ? '흑 우세' : '균형'})`;

  const clamped = Math.max(-1000, Math.min(1000, score));
  const winProb = 1 / (1 + Math.pow(10, -clamped / 400));
  const percent = Math.round(winProb * 100);

  el.evalBarFill.style.height = `${percent}%`;
  el.evalScore.innerText = `${score > 0 ? '+' : ''}${scoreInPawns}`;
}

// ================= MATERIAL & CAPTURED =================
function updateCapturedAndMaterial() {
  const history = state.game.history({ verbose: true });
  const captured = { w: [], b: [] };
  let whiteMaterial = 0;
  let blackMaterial = 0;

  history.forEach(m => {
    if (m.captured) {
      if (m.color === 'w') {
        captured.w.push(m.captured);
        whiteMaterial += PIECE_VALUES[m.captured];
      } else {
        captured.b.push(m.captured);
        blackMaterial += PIECE_VALUES[m.captured];
      }
    }
  });

  const diff = whiteMaterial - blackMaterial;

  const isUserWhite = state.playerColor === 'w' || (state.mode === 'local' && !state.boardFlipped);
  const userCapturedList = isUserWhite ? captured.w : captured.b;
  const oppCapturedList = isUserWhite ? captured.b : captured.w;
  const userDiff = isUserWhite ? diff : -diff;
  const oppDiff = -userDiff;

  renderCapturedPieces(el.userCaptured, userCapturedList, isUserWhite ? 'b' : 'w', userDiff);
  renderCapturedPieces(el.opponentCaptured, oppCapturedList, isUserWhite ? 'w' : 'b', oppDiff);
}

function renderCapturedPieces(container, list, pieceColor, advantage) {
  container.innerHTML = '';
  const counts = {};
  list.forEach(p => { counts[p] = (counts[p] || 0) + 1; });

  const order = ['p', 'n', 'b', 'r', 'q'];
  order.forEach(p => {
    if (counts[p]) {
      for (let i = 0; i < counts[p]; i++) {
        const svg = PIECE_SVGS[`${pieceColor}${p.toUpperCase()}`];
        const span = document.createElement('span');
        span.className = 'captured-icon';
        span.innerHTML = svg;
        container.appendChild(span);
      }
    }
  });

  if (advantage > 0) {
    const diffBadge = document.createElement('span');
    diffBadge.className = 'material-diff';
    diffBadge.innerText = `+${advantage}`;
    container.appendChild(diffBadge);
  }
}

function updateStatusBanner() {
  const currentTurn = state.game.turn();
  const turnName = currentTurn === 'w' ? '백 (White)' : '흑 (Black)';

  if (state.game.inCheck()) {
    el.gameStatusText.innerText = `⚠️ ${turnName} 체크(Check)!`;
    el.gameStatusBanner.style.borderColor = 'var(--accent-red)';
  } else if (!state.aiThinking) {
    el.gameStatusText.innerText = `${turnName} 차례입니다.`;
    el.gameStatusBanner.style.borderColor = 'var(--border-color)';
  }

  const isUserWhite = state.playerColor === 'w' || (state.mode === 'local' && !state.boardFlipped);
  if (currentTurn === (isUserWhite ? 'w' : 'b')) {
    el.userClockBox.classList.add('active-turn');
    el.opponentClockBox.classList.remove('active-turn');
  } else {
    el.opponentClockBox.classList.add('active-turn');
    el.userClockBox.classList.remove('active-turn');
  }
}

function renderNotation() {
  const history = state.game.history({ verbose: true });
  el.notationMovesList.innerHTML = '';

  for (let i = 0; i < history.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const whiteMove = history[i]?.san || '';
    const blackMove = history[i + 1]?.san || '';

    const row = document.createElement('div');
    row.className = 'notation-row';
    row.innerHTML = `
      <span style="color: var(--text-dim);">${moveNum}.</span>
      <span class="move-cell">${whiteMove}</span>
      <span class="move-cell">${blackMove}</span>
    `;
    el.notationMovesList.appendChild(row);
  }
  el.notationMovesList.scrollTop = el.notationMovesList.scrollHeight;
}

// ================= CLOCKS =================
function startLocalClocks() {
  if (state.timeControl.initial <= 0) {
    el.userTimer.innerText = '∞';
    el.opponentTimer.innerText = '∞';
    return;
  }

  state.timers.w = state.timeControl.initial;
  state.timers.b = state.timeControl.initial;

  if (state.clockInterval) clearInterval(state.clockInterval);

  state.clockInterval = setInterval(() => {
    if (state.gameStatus !== 'playing') return;

    const turn = state.game.turn();
    state.timers[turn] = Math.max(0, state.timers[turn] - 1);

    const isUserWhite = state.playerColor === 'w' || (state.mode === 'local' && !state.boardFlipped);
    el.userTimer.innerText = formatTime(state.timers[isUserWhite ? 'w' : 'b']);
    el.opponentTimer.innerText = formatTime(state.timers[isUserWhite ? 'b' : 'w']);

    if (state.timers[turn] <= 0) {
      clearInterval(state.clockInterval);
      handleGameOver('time_out', turn === 'w' ? 'b' : 'w');
    }
  }, 1000);
}

// ================= GAME OVER =================
function handleGameOver(reasonType = null, forcedWinner = null) {
  state.gameStatus = 'ended';
  state.aiThinking = false;
  if (state.clockInterval) clearInterval(state.clockInterval);

  let title = '대국 종료';
  let reason = '';
  let isWin = false;

  if (reasonType === 'time_out') {
    const winnerName = forcedWinner === 'w' ? '백' : '흑';
    title = '⏱️ 시간 초과!';
    reason = `${winnerName}의 시간승입니다.`;
    isWin = (forcedWinner === state.playerColor);
  } else if (state.game.isCheckmate()) {
    const winnerColor = state.game.turn() === 'w' ? '흑' : '백';
    title = '🏆 체크메이트!';
    reason = `${winnerColor} 승리입니다.`;
    isWin = (state.game.turn() !== state.playerColor);
  } else if (state.game.isDraw()) {
    title = '🤝 무승부';
    if (state.game.isStalemate()) reason = '스테일메이트 (더 이상 둘 수가 없습니다)';
    else if (state.game.isThreefoldRepetition()) reason = '3회 동형 반복 무승부';
    else if (state.game.isInsufficientMaterial()) reason = '기물 부족 무승부';
    else reason = '50수 규칙 무승부';
  }

  audio.playGameEnd(isWin);

  el.gameoverIcon.innerText = isWin ? '🏆' : (state.game.isDraw() ? '🤝' : '⚔️');
  el.gameoverTitle.innerText = title;
  el.gameoverReason.innerText = reason;
  el.modalGameOver.classList.add('active');
}

// ================= WEBSOCKET ONLINE SYSTEM =================
function connectWebSocket(onOpenCallback) {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}`;

  if (state.ws) {
    state.ws.close();
  }

  state.ws = new WebSocket(wsUrl);

  state.ws.onopen = () => {
    if (onOpenCallback) onOpenCallback();
  };

  state.ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleServerMessage(msg);
  };

  state.ws.onerror = (err) => {
    console.error('WS error:', err);
    showToast('와이파이 서버 연결에 실패했습니다.');
  };
}

function handleServerMessage(msg) {
  const { type } = msg;

  if (type === 'room_created' || type === 'room_joined') {
    state.roomId = msg.roomId;
    state.playerColor = msg.yourRole;
    state.boardFlipped = (msg.yourRole === 'b');
    el.currentRoomId.innerText = msg.roomId;
    el.btnOfferDraw.style.display = 'block';

    switchView('game');
    showToast(`방 [${msg.roomId}]에 입장했습니다. (내 진영: ${msg.yourRole === 'w' ? '백' : msg.yourRole === 'b' ? '흑' : '관전'})`);
  }

  else if (type === 'room_state') {
    state.gameStatus = msg.status;
    state.game.load(msg.fen);
    state.timeControl = msg.timeControl;

    if (state.playerColor === 'w') {
      el.userName.innerText = msg.white?.name || '나 (백)';
      el.userTag.innerText = '백';
      el.opponentName.innerText = msg.black?.name || '상대방 대기 중...';
      el.opponentTag.innerText = '흑';
      if (msg.white) el.userTimer.innerText = formatTime(msg.white.timeLeft);
      if (msg.black) el.opponentTimer.innerText = formatTime(msg.black.timeLeft);
    } else if (state.playerColor === 'b') {
      el.userName.innerText = msg.black?.name || '나 (흑)';
      el.userTag.innerText = '흑';
      el.opponentName.innerText = msg.white?.name || '상대방 대기 중...';
      el.opponentTag.innerText = '백';
      if (msg.black) el.userTimer.innerText = formatTime(msg.black.timeLeft);
      if (msg.white) el.opponentTimer.innerText = formatTime(msg.white.timeLeft);
    } else {
      el.userName.innerText = msg.white?.name || '백';
      el.opponentName.innerText = msg.black?.name || '흑';
    }

    if (msg.history && msg.history.length > 0) {
      const last = msg.history[msg.history.length - 1];
      state.lastMove = last;
      if (msg.status === 'playing') {
        if (msg.isCheck) audio.playCheck();
        else if (last.captured) audio.playCapture();
        else if (last.flags?.includes('k') || last.flags?.includes('q')) audio.playCastle();
        else audio.playMove();
      }
    }

    renderBoard();

    if (msg.drawOffer && msg.drawOffer !== state.playerColor) {
      if (confirm('상대방이 무승부를 제안했습니다. 수락하시겠습니까?')) {
        state.ws.send(JSON.stringify({ type: 'respond_draw', accept: true }));
      } else {
        state.ws.send(JSON.stringify({ type: 'respond_draw', accept: false }));
      }
    }

    if (msg.status === 'ended') {
      const isWin = (msg.winner === state.playerColor);
      audio.playGameEnd(isWin);
      el.gameoverIcon.innerText = isWin ? '🏆' : (msg.winner === 'draw' ? '🤝' : '⚔️');
      el.gameoverTitle.innerText = msg.winner === 'draw' ? '무승부' : `${msg.winner === 'w' ? '백' : '흑'} 승리!`;
      el.gameoverReason.innerText = msg.endReason || '대국이 종료되었습니다.';
      el.modalGameOver.classList.add('active');
    }
  }

  else if (type === 'clock_tick') {
    const isUserWhite = state.playerColor === 'w';
    el.userTimer.innerText = formatTime(isUserWhite ? msg.whiteTime : msg.blackTime);
    el.opponentTimer.innerText = formatTime(isUserWhite ? msg.blackTime : msg.whiteTime);

    if (isUserWhite ? msg.whiteTime < 30 : msg.blackTime < 30) {
      el.userClockBox.classList.add('low-time');
    } else {
      el.userClockBox.classList.remove('low-time');
    }
  }

  else if (type === 'chat_broadcast') {
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg';
    if (msg.emoji) {
      msgEl.innerHTML = `<span class="sender">${msg.sender}:</span> <span style="font-size: 1.3rem;">${msg.emoji}</span>`;
    } else {
      msgEl.innerHTML = `<span class="sender">${msg.sender}:</span> <span>${msg.text}</span>`;
    }
    el.chatMessagesBox.appendChild(msgEl);
    el.chatMessagesBox.scrollTop = el.chatMessagesBox.scrollHeight;
    audio.playNotify();
  }

  else if (type === 'error') {
    showToast(msg.message || '오류가 발생했습니다.');
  }
}

// ================= VIEW SWITCHER =================
function switchView(viewName) {
  if (viewName === 'lobby') {
    el.viewLobby.classList.add('active');
    el.viewGame.classList.remove('active');
    el.modalGameOver.classList.remove('active');
    state.gameStatus = 'idle';
    state.aiThinking = false;
    if (state.clockInterval) clearInterval(state.clockInterval);
  } else if (viewName === 'game') {
    el.viewLobby.classList.remove('active');
    el.viewGame.classList.add('active');
    renderBoard();
  }
}

// ================= START MODES =================
function startAiGame() {
  state.mode = 'ai';
  state.game = new Chess();
  state.lastMove = null;
  state.hintMove = null;
  state.selectedSquare = null;
  state.legalMovesForSelected = [];
  state.gameStatus = 'playing';
  state.aiThinking = false;

  const activeColorBtn = el.aiColorPicker.querySelector('.btn-segment.active');
  let chosenColor = activeColorBtn ? activeColorBtn.dataset.color : 'w';
  if (chosenColor === 'random') chosenColor = Math.random() < 0.5 ? 'w' : 'b';

  state.playerColor = chosenColor;
  state.boardFlipped = (chosenColor === 'b');
  state.aiLevel = parseInt(el.aiLevelPicker.value, 10);

  const timeMinutes = parseInt(el.aiTimePicker.value, 10);
  state.timeControl = { initial: timeMinutes * 60, increment: 0 };

  el.userName.innerText = '나 (Player)';
  el.userTag.innerText = chosenColor === 'w' ? '백' : '흑';
  el.opponentName.innerText = `스마트 AI`;
  el.opponentTag.innerText = `레벨 ${state.aiLevel}`;
  el.opponentAvatar.innerText = '🤖';
  el.userAvatar.innerText = '👤';
  el.btnOfferDraw.style.display = 'none';

  switchView('game');
  startLocalClocks();
  triggerAsyncEvaluation();

  if (chosenColor === 'b') {
    setTimeout(triggerAIMove, 400);
  }
}

function startLocalGame() {
  state.mode = 'local';
  state.game = new Chess();
  state.lastMove = null;
  state.hintMove = null;
  state.selectedSquare = null;
  state.legalMovesForSelected = [];
  state.playerColor = 'w';
  state.boardFlipped = false;
  state.autoFlip = el.toggleAutoFlip.checked;
  state.gameStatus = 'playing';
  state.aiThinking = false;

  const timeMinutes = parseInt(el.localTimePicker.value, 10);
  state.timeControl = { initial: timeMinutes * 60, increment: 0 };

  el.userName.innerText = '플레이어 1 (백)';
  el.userTag.innerText = '백';
  el.opponentName.innerText = '플레이어 2 (흑)';
  el.opponentTag.innerText = '흑';
  el.opponentAvatar.innerText = '👥';
  el.userAvatar.innerText = '👥';
  el.btnOfferDraw.style.display = 'none';

  switchView('game');
  startLocalClocks();
  triggerAsyncEvaluation();
}

async function showQrModal(customUrl = null) {
  const targetUrl = customUrl || state.serverUrl;
  el.modalQrUrl.value = targetUrl;

  try {
    const res = await fetch(`/api/qr?url=${encodeURIComponent(targetUrl)}`);
    const data = await res.json();
    if (data.qrCode) {
      el.qrCodeImg.src = data.qrCode;
      el.modalQr.classList.add('active');
    }
  } catch (err) {
    showToast('QR 코드 생성 실패');
  }
}

// ================= EVENT LISTENERS =================
function setupEventListeners() {
  el.btnHomeLogo.addEventListener('click', () => switchView('lobby'));

  el.btnCopyIp.addEventListener('click', () => {
    navigator.clipboard.writeText(state.serverUrl).then(() => showToast('접속 주소가 복사되었습니다.'));
  });
  el.btnOpenQr.addEventListener('click', () => showQrModal());
  el.btnShowLobbyQr.addEventListener('click', () => showQrModal());

  el.selectTheme.addEventListener('change', (e) => {
    document.body.className = e.target.value;
  });

  el.btnSoundToggle.addEventListener('click', () => {
    audio.enabled = !audio.enabled;
    el.btnSoundToggle.innerText = audio.enabled ? '🔊' : '🔇';
    showToast(audio.enabled ? '효과음 켜짐' : '효과음 음소거');
  });

  [el.aiColorPicker, el.createColorPicker].forEach(group => {
    if (!group) return;
    group.querySelectorAll('.btn-segment').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.btn-segment').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  el.tabCreateRoom.addEventListener('click', () => {
    el.tabCreateRoom.classList.add('active');
    el.tabJoinRoom.classList.remove('active');
    el.formCreateRoom.classList.add('active');
    el.formJoinRoom.classList.remove('active');
  });
  el.tabJoinRoom.addEventListener('click', () => {
    el.tabJoinRoom.classList.add('active');
    el.tabCreateRoom.classList.remove('active');
    el.formJoinRoom.classList.add('active');
    el.formCreateRoom.classList.remove('active');
  });

  el.btnStartAi.addEventListener('click', startAiGame);
  el.btnStartLocal.addEventListener('click', startLocalGame);

  el.btnCreateOnlineRoom.addEventListener('click', () => {
    const playerName = el.createPlayerName.value.trim() || '플레이어 1';
    localStorage.setItem('chess_player_name', playerName);
    const timeMinutes = el.createTimePicker.value;
    const colorBtn = el.createColorPicker.querySelector('.btn-segment.active');
    const preferredColor = colorBtn ? colorBtn.dataset.color : 'random';

    connectWebSocket(() => {
      state.ws.send(JSON.stringify({
        type: 'create_room',
        playerName,
        playerId: state.playerId,
        timeMinutes,
        preferredColor
      }));
    });
  });

  el.btnSubmitJoinRoom.addEventListener('click', () => {
    const playerName = el.joinPlayerName.value.trim() || '게스트';
    const roomCode = el.inputRoomCode.value.trim().toUpperCase();
    if (!roomCode) {
      showToast('방 코드를 입력해주세요.');
      return;
    }
    localStorage.setItem('chess_player_name', playerName);

    connectWebSocket(() => {
      state.ws.send(JSON.stringify({
        type: 'join_room',
        roomId: roomCode,
        playerName,
        playerId: state.playerId
      }));
    });
  });

  // AI Hint
  el.btnAiHint.addEventListener('click', () => {
    const analysis = state.engine.analyzePosition(state.game);
    if (analysis.bestMove) {
      state.hintMove = analysis.bestMove;
      el.engineHintText.innerText = `💡 추천 최선수: ${analysis.bestMove.san} (${analysis.bestMove.from} ➔ ${analysis.bestMove.to})`;
      renderBoard();
      audio.playNotify();
    }
  });

  // Undo Move
  el.btnUndoMove.addEventListener('click', () => {
    if (state.mode === 'ai') {
      state.game.undo();
      state.game.undo();
      state.lastMove = null;
      state.hintMove = null;
      renderBoard();
      triggerAsyncEvaluation();
      showToast('수를 1수 물렸습니다.');
    } else if (state.mode === 'local') {
      state.game.undo();
      state.activeTurn = state.game.turn();
      if (state.autoFlip) state.boardFlipped = (state.activeTurn === 'b');
      state.lastMove = null;
      renderBoard();
      triggerAsyncEvaluation();
      showToast('수를 물렸습니다.');
    } else {
      showToast('온라인 대국에서는 수를 물릴 수 없습니다.');
    }
  });

  el.btnFlipBoard.addEventListener('click', () => {
    state.boardFlipped = !state.boardFlipped;
    renderBoard();
  });

  el.btnToggleEval.addEventListener('click', () => {
    state.evalEnabled = !state.evalEnabled;
    el.evalBarWrapper.style.display = state.evalEnabled ? 'flex' : 'none';
    showToast(state.evalEnabled ? '형세 분석 바 활성화' : '형세 분석 바 숨김');
    if (state.evalEnabled) triggerAsyncEvaluation();
  });

  el.btnResign.addEventListener('click', () => {
    if (confirm('정말로 기권하시겠습니까?')) {
      if (state.mode === 'wifi' && state.ws) {
        state.ws.send(JSON.stringify({ type: 'resign' }));
      } else {
        handleGameOver('resign', state.playerColor === 'w' ? 'b' : 'w');
      }
    }
  });

  el.btnOfferDraw.addEventListener('click', () => {
    if (state.mode === 'wifi' && state.ws) {
      state.ws.send(JSON.stringify({ type: 'offer_draw' }));
      showToast('상대방에게 무승부를 제안했습니다.');
    }
  });

  el.btnLeaveGame.addEventListener('click', () => {
    if (confirm('현재 대국을 나가고 로비로 이동하시겠습니까?')) {
      if (state.ws) state.ws.close();
      switchView('lobby');
    }
  });

  document.querySelectorAll('.side-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.side-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.side-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  el.btnCopyFen.addEventListener('click', () => {
    navigator.clipboard.writeText(state.game.fen()).then(() => showToast('FEN 복사 완료!'));
  });
  el.btnCopyPgn.addEventListener('click', () => {
    navigator.clipboard.writeText(state.game.pgn()).then(() => showToast('PGN 복사 완료!'));
  });

  el.btnSendChat.addEventListener('click', () => {
    const text = el.inputChat.value.trim();
    if (!text) return;
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'chat_message', text }));
      el.inputChat.value = '';
    }
  });
  el.inputChat.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el.btnSendChat.click();
  });

  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.dataset.emoji;
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'chat_message', emoji }));
      }
    });
  });

  el.btnCopyRoomLink.addEventListener('click', () => {
    const roomUrl = `${state.serverUrl}/?room=${state.roomId}`;
    navigator.clipboard.writeText(roomUrl).then(() => showToast('방 초대 링크가 복사되었습니다!'));
  });
  el.btnShowRoomQr.addEventListener('click', () => {
    const roomUrl = `${state.serverUrl}/?room=${state.roomId}`;
    showQrModal(roomUrl);
  });

  el.btnCloseQrModal.addEventListener('click', () => el.modalQr.classList.remove('active'));
  el.btnModalCopyUrl.addEventListener('click', () => {
    navigator.clipboard.writeText(el.modalQrUrl.value).then(() => showToast('주소가 복사되었습니다!'));
  });

  el.btnModalRematch.addEventListener('click', () => {
    el.modalGameOver.classList.remove('active');
    if (state.mode === 'wifi' && state.ws) {
      state.ws.send(JSON.stringify({ type: 'request_rematch' }));
      showToast('재대국을 요청했습니다.');
    } else if (state.mode === 'ai') {
      startAiGame();
    } else {
      startLocalGame();
    }
  });

  el.btnModalLobby.addEventListener('click', () => {
    el.modalGameOver.classList.remove('active');
    switchView('lobby');
  });

  const urlParams = new URLSearchParams(window.location.search);
  const queryRoom = urlParams.get('room');
  if (queryRoom) {
    el.inputRoomCode.value = queryRoom;
    el.tabJoinRoom.click();
    showToast(`방 [${queryRoom}] 초대 링크를 확인했습니다.`);
  }
}

async function init() {
  initWorker();
  await initNetworkInfo();
  setupEventListeners();
  renderBoard();
}

window.addEventListener('DOMContentLoaded', init);
