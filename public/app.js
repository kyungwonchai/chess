import { Chess } from './chess.js';
import { ChessEngine } from './engine.js';
import { audio } from './audio.js';
import { PIECE_VALUES, setPieceStyle, currentPieceStyle, getPieceSvg } from './pieces.js';

// Application State
const state = {
  mode: 'ai', // 'ai', 'wifi', 'local'
  game: new Chess(),
  engine: new ChessEngine(),
  worker: null,
  playerColor: 'w', // 'w', 'b', 'spectator'
  boardFlipped: false,
  autoFlip: true,
  is3DView: localStorage.getItem('chess_is_3d') === 'true',
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
  serverUrl: window.location.origin,
  moveHistory: []
};

// Unlock Audio on first user interaction anywhere
window.addEventListener('pointerdown', () => {
  audio.init();
}, { once: false });
window.addEventListener('keydown', () => {
  audio.init();
}, { once: false });

// DOM Elements
const el = {
  viewLobby: document.getElementById('view-lobby'),
  viewGame: document.getElementById('view-game'),
  btnHomeLogo: document.getElementById('btn-home-logo'),
  headerWifiIp: document.getElementById('header-wifi-ip'),
  btnCopyIp: document.getElementById('btn-copy-ip'),
  btnOpenQr: document.getElementById('btn-open-qr'),
  selectPieceStyle: document.getElementById('select-piece-style'),
  selectTheme: document.getElementById('select-theme'),
  btnToggle3D: document.getElementById('btn-toggle-3d'),
  btnToggleFullscreen: document.getElementById('btn-toggle-fullscreen'),
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
  boardStage: document.querySelector('.board-stage'),
  chessboardWrapper: document.getElementById('chessboard-wrapper'),
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

  // Notation
  notationMovesList: document.getElementById('notation-moves-list'),
  btnCopyFen: document.getElementById('btn-copy-fen'),
  btnCopyPgn: document.getElementById('btn-copy-pgn'),

  // Online Room & Chat
  onlineRoomBadge: document.getElementById('online-room-badge'),
  currentRoomId: document.getElementById('current-room-id'),
  btnCopyRoomLink: document.getElementById('btn-copy-room-link'),
  btnShowRoomQr: document.getElementById('btn-show-room-qr'),
  chatMessagesBox: document.getElementById('chat-messages-box'),
  inputChat: document.getElementById('input-chat'),
  btnSendChat: document.getElementById('btn-send-chat'),
  sideTabOnlineBtn: document.getElementById('side-tab-online-btn'),

  // Modals
  modalPromotion: document.getElementById('modal-promotion'),
  promotionChoices: document.getElementById('promotion-choices'),

  modalQr: document.getElementById('modal-qr'),
  btnCloseQrModal: document.getElementById('btn-close-qr-modal'),
  qrCodeImg: document.getElementById('qr-code-img'),
  modalQrUrl: document.getElementById('modal-qr-url'),
  btnModalCopyUrl: document.getElementById('btn-modal-copy-url'),

  modalGameOver: document.getElementById('modal-game-over'),
  gameoverIcon: document.getElementById('gameover-icon'),
  gameoverTitle: document.getElementById('gameover-title'),
  gameoverReason: document.getElementById('gameover-reason'),
  btnModalRematch: document.getElementById('btn-modal-rematch'),
  btnModalLobby: document.getElementById('btn-modal-lobby'),

  // Live Room Topbar
  onlineRoomTopbar: document.getElementById('online-room-topbar'),
  topRoomId: document.getElementById('top-room-id'),
  btnTopCopyLink: document.getElementById('btn-top-copy-link'),
  btnTopShowQr: document.getElementById('btn-top-show-qr'),

  // Lobby Open Rooms
  lobbyRoomsBox: document.getElementById('lobby-rooms-box'),
  lobbyRoomsList: document.getElementById('lobby-rooms-list'),
  btnRefreshRooms: document.getElementById('btn-refresh-rooms'),

  // QR Modal Room Code Badge
  modalRoomCodeBadge: document.getElementById('modal-room-code-badge'),
  modalBigRoomCode: document.getElementById('modal-big-room-code'),

  // Records & Leaderboard Modal
  btnOpenRecords: document.getElementById('btn-open-records'),
  modalRecords: document.getElementById('modal-records'),
  btnCloseRecordsModal: document.getElementById('btn-close-records-modal'),
  tabBtnLeaderboard: document.getElementById('tab-btn-leaderboard'),
  tabBtnGames: document.getElementById('tab-btn-games'),
  rtabLeaderboard: document.getElementById('rtab-leaderboard'),
  rtabGames: document.getElementById('rtab-games'),
  leaderboardTbody: document.getElementById('leaderboard-tbody'),
  gamesListContainer: document.getElementById('games-list-container'),

  // Replay Modal
  modalReplay: document.getElementById('modal-replay'),
  btnCloseReplayModal: document.getElementById('btn-close-replay-modal'),
  replayChessboard: document.getElementById('replay-chessboard'),
  replayTitle: document.getElementById('replay-title'),
  replayPlayersInfo: document.getElementById('replay-players-info'),
  replayStepCounter: document.getElementById('replay-step-counter'),
  replayCurrentMoveDesc: document.getElementById('replay-current-move-desc'),
  btnReplayStart: document.getElementById('btn-replay-start'),
  btnReplayPrev: document.getElementById('btn-replay-prev'),
  btnReplayNext: document.getElementById('btn-replay-next'),
  btnReplayEnd: document.getElementById('btn-replay-end'),
  btnReplayCopyPgn: document.getElementById('btn-replay-copy-pgn'),

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
  if (el.toastContainer) {
    el.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }
}

function formatTime(seconds) {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

async function initNetworkInfo() {
  const isLocalHost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  if (isLocalHost) {
    try {
      const res = await fetch('/api/info');
      const data = await res.json();
      if (data.primaryUrl) {
        el.headerWifiIp.innerText = data.primaryUrl.replace(/^http:\/\//, '');
        state.serverUrl = `${data.primaryUrl}/chess`;
      }
    } catch (err) {
      el.headerWifiIp.innerText = window.location.host;
    }
  } else {
    el.headerWifiIp.innerText = window.location.host;
    const pathPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';
    state.serverUrl = `${window.location.origin}${pathPrefix}`;
  }
}

// ================= 3D VIEW TOGGLE HELPER =================
function apply3DViewState() {
  const is3D = state.is3DView;
  if (el.boardStage) {
    if (is3D) {
      el.boardStage.classList.add('perspective-3d-active');
    } else {
      el.boardStage.classList.remove('perspective-3d-active');
    }
  }
  if (el.btnToggle3D) {
    if (is3D) {
      el.btnToggle3D.classList.add('active');
      el.btnToggle3D.innerHTML = '<span class="view-3d-icon">🧊</span> <span class="view-3d-text">3D 켜짐</span>';
    } else {
      el.btnToggle3D.classList.remove('active');
      el.btnToggle3D.innerHTML = '<span class="view-3d-icon">📐</span> <span class="view-3d-text">2D 평면</span>';
    }
  }
  localStorage.setItem('chess_is_3d', is3D);
}

function toggle3DView() {
  state.is3DView = !state.is3DView;
  apply3DViewState();
  showToast(state.is3DView ? '✨ 3D 입체 원근 모드 켜짐' : '📐 2D 평면 모드 켜짐');
}

// ================= FULLSCREEN MONITOR SUPPORT =================
function toggleFullscreen() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().then(() => {
        showToast('🖥️ 모니터 전체화면 모드 시작');
      }).catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().then(() => {
        showToast('🗗 창 모드로 복귀');
      }).catch(err => {
        console.warn('Exit fullscreen failed:', err);
      });
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

function updateFullscreenUI() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  if (isFs) {
    document.body.classList.add('fullscreen-mode');
    if (el.btnToggleFullscreen) {
      el.btnToggleFullscreen.classList.add('active');
      el.btnToggleFullscreen.innerHTML = '<span class="fs-icon">🗗</span> <span class="fs-text">창모드</span>';
      el.btnToggleFullscreen.title = '창 모드로 복귀 (F키 또는 Esc)';
    }
  } else {
    document.body.classList.remove('fullscreen-mode');
    if (el.btnToggleFullscreen) {
      el.btnToggleFullscreen.classList.remove('active');
      el.btnToggleFullscreen.innerHTML = '<span class="fs-icon">🖥️</span> <span class="fs-text">전체화면</span>';
      el.btnToggleFullscreen.title = '모니터 전체화면 켜기 (F키 또는 F11)';
    }
  }
}

document.addEventListener('fullscreenchange', updateFullscreenUI);
document.addEventListener('webkitfullscreenchange', updateFullscreenUI);

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
        const pieceSvg = getPieceSvg(pieceKey);
        if (pieceSvg) {
          const pieceContainer = document.createElement('div');
          pieceContainer.className = 'chess-piece-container';
          if (state.selectedSquare === squareName) {
            pieceContainer.classList.add('piece-elevated');
          }
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
    btn.innerHTML = getPieceSvg(`${color}${type.toUpperCase()}`);
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
const PIECE_NAMES = {
  p: '폰',
  n: '나이트',
  b: '비숍',
  r: '룩',
  q: '퀸',
  k: '킹'
};

function updateCapturedAndMaterial() {
  const history = (state.mode === 'wifi' && state.moveHistory && state.moveHistory.length > 0)
    ? state.moveHistory
    : state.game.history({ verbose: true });

  const capturedByWhite = []; // Black pieces captured by White in order
  const capturedByBlack = []; // White pieces captured by Black in order
  let whiteMaterial = 0;
  let blackMaterial = 0;

  history.forEach((m, idx) => {
    if (m.captured) {
      const val = PIECE_VALUES[m.captured] || 0;
      const moveNum = Math.floor(idx / 2) + 1;
      const item = {
        piece: m.captured,
        value: val,
        san: m.san,
        moveNum: moveNum,
        capturedBy: m.color, // 'w' or 'b'
        pieceColor: m.color === 'w' ? 'b' : 'w' // Captured piece's color (Black piece if White captured, White if Black captured)
      };

      if (m.color === 'w') {
        capturedByWhite.push(item);
        whiteMaterial += val;
      } else {
        capturedByBlack.push(item);
        blackMaterial += val;
      }
    }
  });

  const isUserWhite = (state.playerColor === 'w') ||
                      (state.playerColor === 'spectator') ||
                      (state.mode === 'local' && !state.boardFlipped);

  // User bar (bottom) displays opponent pieces that user captured
  // Opponent bar (top) displays user pieces that opponent captured (내가 먹힌 것)
  const userCapturedList = isUserWhite ? capturedByWhite : capturedByBlack;
  const oppCapturedList = isUserWhite ? capturedByBlack : capturedByWhite;

  const userTotalScore = isUserWhite ? whiteMaterial : blackMaterial;
  const oppTotalScore = isUserWhite ? blackMaterial : whiteMaterial;

  const userAdvantage = userTotalScore - oppTotalScore;
  const oppAdvantage = oppTotalScore - userTotalScore;

  renderCapturedPieces(el.userCaptured, userCapturedList, userTotalScore, userAdvantage > 0 ? userAdvantage : 0, '내 획득');
  renderCapturedPieces(el.opponentCaptured, oppCapturedList, oppTotalScore, oppAdvantage > 0 ? oppAdvantage : 0, '상대 획득(내 손실)');
}

function renderCapturedPieces(container, list, totalScore, advantage, label) {
  if (!container) return;
  container.innerHTML = '';

  if (!list || list.length === 0) {
    return;
  }

  const seqWrapper = document.createElement('div');
  seqWrapper.className = 'captured-sequence';

  list.forEach((item, index) => {
    const isLatest = (index === list.length - 1);
    const pieceKey = `${item.pieceColor}${item.piece.toUpperCase()}`;
    const svg = getPieceSvg(pieceKey);
    const name = PIECE_NAMES[item.piece] || item.piece;

    const chip = document.createElement('span');
    chip.className = `captured-piece-chip${isLatest ? ' is-latest' : ''}`;
    chip.title = `${index + 1}번째 획득: ${name} (+${item.value}점) [${item.moveNum}수: ${item.san || ''}]`;

    chip.innerHTML = `
      <span class="piece-svg-wrapper">${svg}</span>
      <span class="piece-pts">${item.value}</span>
    `;

    seqWrapper.appendChild(chip);
  });

  container.appendChild(seqWrapper);

  // Material score badges
  const scoreGroup = document.createElement('div');
  scoreGroup.className = 'captured-score-group';

  if (totalScore > 0) {
    const totalBadge = document.createElement('span');
    totalBadge.className = 'material-total-badge';
    totalBadge.title = `${label} 총점: ${totalScore}점`;
    totalBadge.innerText = `${totalScore}점`;
    scoreGroup.appendChild(totalBadge);
  }

  if (advantage > 0) {
    const advBadge = document.createElement('span');
    advBadge.className = 'material-advantage-badge';
    advBadge.title = `기물 우세: 상대보다 +${advantage}점 앞섬`;
    advBadge.innerText = `+${advantage}`;
    scoreGroup.appendChild(advBadge);
  }

  container.appendChild(scoreGroup);
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
  const pathPrefix = window.location.pathname.startsWith('/chess') ? '/chess/' : '/';
  const wsUrl = `${wsProtocol}//${window.location.host}${pathPrefix}`;

  if (state.ws) {
    if (state.ws.readyState === WebSocket.OPEN) {
      if (onOpenCallback) onOpenCallback();
      return;
    }
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
    showToast('온라인 서버 연결에 실패했습니다.');
  };
}

function activateSideTab(tabId) {
  document.querySelectorAll('.side-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  document.querySelectorAll('.side-tab-content').forEach(c => {
    c.classList.toggle('active', c.id === tabId);
  });
}

function handleServerMessage(msg) {
  const { type } = msg;

  if (type === 'room_created') {
    state.mode = 'wifi';
    state.aiThinking = false;
    state.moveHistory = [];
    state.roomId = msg.roomId;
    state.playerColor = msg.yourRole;
    state.boardFlipped = (msg.yourRole === 'b');
    if (el.currentRoomId) el.currentRoomId.innerText = msg.roomId;
    if (el.topRoomId) el.topRoomId.innerText = msg.roomId;
    if (el.onlineRoomTopbar) el.onlineRoomTopbar.style.display = 'flex';
    if (el.btnOfferDraw) el.btnOfferDraw.style.display = 'block';
    if (el.userAvatar) el.userAvatar.innerText = '👤';
    if (el.opponentAvatar) el.opponentAvatar.innerText = '👤';
    if (el.gameStatusText) el.gameStatusText.innerText = '상대방 접속 대기 중...';

    activateSideTab('tab-online');
    switchView('game');
    showToast(`방 [${msg.roomId}]이 생성되었습니다! 상대방 대기 중`);

    const roomUrl = `${state.serverUrl}/?room=${msg.roomId}`;
    showQrModal(roomUrl, msg.roomId);
  }

  else if (type === 'room_joined') {
    state.mode = 'wifi';
    state.aiThinking = false;
    state.moveHistory = [];
    state.roomId = msg.roomId;
    state.playerColor = msg.yourRole;
    state.boardFlipped = (msg.yourRole === 'b');
    if (el.currentRoomId) el.currentRoomId.innerText = msg.roomId;
    if (el.topRoomId) el.topRoomId.innerText = msg.roomId;
    if (el.onlineRoomTopbar) el.onlineRoomTopbar.style.display = 'flex';
    if (el.btnOfferDraw) el.btnOfferDraw.style.display = 'block';
    if (el.userAvatar) el.userAvatar.innerText = '👤';
    if (el.opponentAvatar) el.opponentAvatar.innerText = '👤';
    if (el.gameStatusText) el.gameStatusText.innerText = '실시간 온라인 대국';

    activateSideTab('tab-online');
    switchView('game');
    showToast(`방 [${msg.roomId}]에 입장했습니다. (내 진영: ${msg.yourRole === 'w' ? '백' : msg.yourRole === 'b' ? '흑' : '관전'})`);
  }

  else if (type === 'room_list') {
    renderLobbyRooms(msg.rooms || []);
  }

  else if (type === 'room_state') {
    state.mode = 'wifi';
    state.aiThinking = false;
    state.gameStatus = msg.status;
    state.game.load(msg.fen);
    state.timeControl = msg.timeControl;
    if (msg.history) {
      state.moveHistory = msg.history;
    }
    if (el.userAvatar) el.userAvatar.innerText = '👤';
    if (el.opponentAvatar) el.opponentAvatar.innerText = '👤';

    // Auto-close QR modal if opponent joined and game is playing
    if (msg.status === 'playing') {
      if (el.gameStatusText) el.gameStatusText.innerText = '실시간 온라인 대국 진행 중';
      if (el.modalQr && el.modalQr.classList.contains('active')) {
        el.modalQr.classList.remove('active');
        showToast('상대방이 입장하여 대국이 시작되었습니다!');
      }
    } else if (msg.status === 'waiting') {
      if (el.gameStatusText) el.gameStatusText.innerText = '상대방 접속 대기 중...';
    }

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

      // Refresh records cache
      loadLeaderboard();
      loadGameRecords();
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
    if (el.onlineRoomTopbar) el.onlineRoomTopbar.style.display = 'none';
    state.gameStatus = 'idle';
    state.aiThinking = false;
    if (state.clockInterval) clearInterval(state.clockInterval);
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'list_rooms' }));
    }
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
  state.moveHistory = [];
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
  state.moveHistory = [];
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

async function showQrModal(customUrl = null, roomCode = null) {
  const targetUrl = customUrl || state.serverUrl;
  el.modalQrUrl.value = targetUrl;

  const code = roomCode || state.roomId;
  if (code && el.modalRoomCodeBadge && el.modalBigRoomCode) {
    el.modalBigRoomCode.innerText = code;
    el.modalRoomCodeBadge.style.display = 'block';
  } else if (el.modalRoomCodeBadge) {
    el.modalRoomCodeBadge.style.display = 'none';
  }

  try {
    const apiPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';
    const res = await fetch(`${apiPrefix}/api/qr?url=${encodeURIComponent(targetUrl)}`);
    const data = await res.json();
    if (data.qrCode) {
      el.qrCodeImg.src = data.qrCode;
      el.modalQr.classList.add('active');
    }
  } catch (err) {
    showToast('QR 코드 생성 실패');
  }
}

function renderLobbyRooms(rooms) {
  if (!el.lobbyRoomsList) return;
  const waitingRooms = rooms.filter(r => r.status === 'waiting' || r.players < 2);
  if (waitingRooms.length === 0) {
    el.lobbyRoomsList.innerHTML = '<div class="room-empty-state">현재 대기 중인 방이 없습니다.<br>새 방을 개설하거나 코드를 입력하세요.</div>';
    return;
  }

  el.lobbyRoomsList.innerHTML = waitingRooms.map(r => `
    <div class="room-card-item">
      <div class="room-card-info">
        <span class="room-card-code">방 [${r.id}]</span>
        <span class="room-card-sub">👤 ${r.host} (${r.players}/2명 대기중) · ⏱️ ${Math.round((r.timeControl?.initial || 600) / 60)}분</span>
      </div>
      <button class="btn-join-room-fast" data-room="${r.id}">즉시 참가</button>
    </div>
  `).join('');

  el.lobbyRoomsList.querySelectorAll('.btn-join-room-fast').forEach(btn => {
    btn.addEventListener('click', () => {
      const rid = btn.dataset.room;
      el.inputRoomCode.value = rid;
      joinOnlineRoom(rid);
    });
  });
}

function joinOnlineRoom(roomCode) {
  const playerName = el.joinPlayerName.value.trim() || '게스트';
  const code = (roomCode || el.inputRoomCode.value).trim().toUpperCase();
  if (!code) {
    showToast('방 코드를 입력해주세요.');
    return;
  }
  localStorage.setItem('chess_player_name', playerName);

  const sendJoin = () => {
    state.ws.send(JSON.stringify({
      type: 'join_room',
      roomId: code,
      playerName,
      playerId: state.playerId
    }));
  };

  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    sendJoin();
  } else {
    connectWebSocket(sendJoin);
  }
}

async function loadLeaderboard() {
  if (!el.leaderboardTbody) return;
  el.leaderboardTbody.innerHTML = '<tr><td colspan="5" class="empty-table-msg">랭킹 불러오는 중...</td></tr>';
  try {
    const apiPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';
    const res = await fetch(`${apiPrefix}/api/leaderboard`);
    const data = await res.json();
    const list = data.leaderboard || [];

    if (list.length === 0) {
      el.leaderboardTbody.innerHTML = '<tr><td colspan="5" class="empty-table-msg">아직 저장된 대국 기록이 없습니다.<br>와이파이 대국을 완료하면 승률이 자동 집계됩니다.</td></tr>';
      return;
    }

    el.leaderboardTbody.innerHTML = list.map((p, idx) => {
      const rank = idx + 1;
      const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
      const streakHtml = (p.recent || []).map(r => {
        const cls = r === 'W' ? 'streak-w' : r === 'D' ? 'streak-d' : 'streak-l';
        return `<span class="streak-dot ${cls}">${r}</span>`;
      }).join('');

      return `
        <tr>
          <td><span class="rank-badge ${rankClass}">${rank}</span></td>
          <td><strong>${p.name}</strong></td>
          <td style="text-align:center;">${p.wins}승 ${p.draws}무 ${p.losses}패 (${p.games}전)</td>
          <td style="text-align:center;"><span class="player-winrate-badge">${p.winRate}%</span></td>
          <td style="text-align:center;"><div class="recent-streak">${streakHtml || '-'}</div></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    el.leaderboardTbody.innerHTML = '<tr><td colspan="5" class="empty-table-msg">전적 불러오기 실패</td></tr>';
  }
}

async function loadGameRecords() {
  if (!el.gamesListContainer) return;
  el.gamesListContainer.innerHTML = '<div class="empty-table-msg">기보 목록을 불러오는 중...</div>';
  try {
    const apiPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';
    const res = await fetch(`${apiPrefix}/api/games`);
    const data = await res.json();
    const games = data.games || [];

    if (games.length === 0) {
      el.gamesListContainer.innerHTML = '<div class="empty-table-msg">저장된 기보가 없습니다.<br>와이파이 대국이 끝나면 자동으로 기보가 저장됩니다.</div>';
      return;
    }

    el.gamesListContainer.innerHTML = games.map(g => {
      const dateStr = new Date(g.playedAt).toLocaleString('ko-KR', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const whiteWin = g.winner === 'w' ? 'winner-name' : '';
      const blackWin = g.winner === 'b' ? 'winner-name' : '';
      const resultText = g.winner === 'w' ? `🏆 백(${g.white}) 승` :
                         g.winner === 'b' ? `🏆 흑(${g.black}) 승` : '🤝 무승부';

      return `
        <div class="game-record-card">
          <div class="game-record-left">
            <div class="game-record-vs">
              <span class="${whiteWin}">⚪ ${g.white}</span> vs <span class="${blackWin}">⚫ ${g.black}</span>
            </div>
            <div class="game-record-meta">
              <strong>${resultText}</strong> (${g.endReason}) · ${g.totalMoves}수 · ⏱️ ${g.timeControl} · 📅 ${dateStr}
            </div>
          </div>
          <div class="game-record-actions">
            <button class="btn-header-chip btn-copy-game-pgn" data-id="${g.id}">📋 PGN</button>
            <button class="btn-join-room-fast btn-replay-game" data-id="${g.id}">🔍 다시보기</button>
          </div>
        </div>
      `;
    }).join('');

    el.gamesListContainer.querySelectorAll('.btn-copy-game-pgn').forEach(btn => {
      btn.addEventListener('click', () => {
        const game = games.find(x => x.id === btn.dataset.id);
        if (game && game.pgn) {
          navigator.clipboard.writeText(game.pgn).then(() => showToast('PGN 기보가 복사되었습니다!'));
        }
      });
    });

    el.gamesListContainer.querySelectorAll('.btn-replay-game').forEach(btn => {
      btn.addEventListener('click', () => {
        const game = games.find(x => x.id === btn.dataset.id);
        if (game) openReplayModal(game);
      });
    });
  } catch (err) {
    el.gamesListContainer.innerHTML = '<div class="empty-table-msg">기보 목록 불러오기 실패</div>';
  }
}

let replayState = {
  game: null,
  moves: [],
  currentStep: 0,
  pgn: ''
};

function openReplayModal(gameRecord) {
  replayState.game = new Chess();
  replayState.moves = gameRecord.history || [];
  replayState.currentStep = 0;
  replayState.pgn = gameRecord.pgn || '';

  if (el.replayTitle) el.replayTitle.innerText = `대국 복기 [${gameRecord.roomId || 'LAN'}]`;
  if (el.replayPlayersInfo) el.replayPlayersInfo.innerText = `⚪ ${gameRecord.white} vs ⚫ ${gameRecord.black} (${gameRecord.winnerName} 승)`;

  renderReplayBoard();
  if (el.modalReplay) el.modalReplay.classList.add('active');
}

function renderReplayBoard() {
  if (!el.replayChessboard) return;
  const board = replayState.game.board();
  el.replayChessboard.innerHTML = '';
  const fragment = document.createDocumentFragment();

  for (let rIdx = 0; rIdx < 8; rIdx++) {
    for (let cIdx = 0; cIdx < 8; cIdx++) {
      const file = String.fromCharCode(97 + cIdx);
      const rank = 8 - rIdx;
      const squareName = `${file}${rank}`;
      const isLight = (rIdx + cIdx) % 2 === 0;

      const sq = document.createElement('div');
      sq.className = `square ${isLight ? 'light' : 'dark'}`;
      sq.dataset.square = squareName;

      const p = board[rIdx][cIdx];
      if (p) {
        const pieceEl = document.createElement('div');
        pieceEl.className = 'chess-piece';
        pieceEl.innerHTML = getPieceSvg(p.type, p.color);
        sq.appendChild(pieceEl);
      }

      fragment.appendChild(sq);
    }
  }
  el.replayChessboard.appendChild(fragment);

  if (el.replayStepCounter) {
    el.replayStepCounter.innerText = `${replayState.currentStep} / ${replayState.moves.length}`;
  }
  if (el.replayCurrentMoveDesc) {
    if (replayState.currentStep === 0) {
      el.replayCurrentMoveDesc.innerText = '대국 시작 상태';
    } else {
      const lastM = replayState.moves[replayState.currentStep - 1];
      el.replayCurrentMoveDesc.innerText = `${replayState.currentStep}수: ${lastM.color === 'w' ? '백' : '흑'} ${lastM.san || (lastM.from + '-' + lastM.to)}`;
    }
  }
}

function setReplayStep(targetStep) {
  targetStep = Math.max(0, Math.min(targetStep, replayState.moves.length));
  replayState.currentStep = targetStep;

  replayState.game = new Chess();
  for (let i = 0; i < targetStep; i++) {
    const m = replayState.moves[i];
    try {
      replayState.game.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
    } catch (e) {
      if (m.san) {
        try { replayState.game.move(m.san); } catch (err) {}
      }
    }
  }
  renderReplayBoard();
}

// ================= EVENT LISTENERS =================
function setupEventListeners() {
  el.btnHomeLogo.addEventListener('click', () => switchView('lobby'));

  el.btnCopyIp.addEventListener('click', () => {
    navigator.clipboard.writeText(state.serverUrl).then(() => showToast('접속 주소가 복사되었습니다.'));
  });
  el.btnOpenQr.addEventListener('click', () => showQrModal());
  el.btnShowLobbyQr.addEventListener('click', () => showQrModal());

  el.selectPieceStyle.addEventListener('change', (e) => {
    setPieceStyle(e.target.value);
    renderBoard();
    updateCapturedAndMaterial();
    showToast(`체스말 스타일이 변경되었습니다: ${e.target.options[e.target.selectedIndex].text}`);
  });

  el.selectTheme.addEventListener('change', (e) => {
    document.body.className = e.target.value;
  });

  el.btnToggle3D.addEventListener('click', () => {
    toggle3DView();
  });

  if (el.btnToggleFullscreen) {
    el.btnToggleFullscreen.addEventListener('click', () => {
      toggleFullscreen();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    }
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
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'list_rooms' }));
    }
  });

  if (el.btnRefreshRooms) {
    el.btnRefreshRooms.addEventListener('click', () => {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'list_rooms' }));
        showToast('대기방 목록을 갱신했습니다.');
      } else {
        connectWebSocket(() => {
          state.ws.send(JSON.stringify({ type: 'list_rooms' }));
        });
      }
    });
  }

  el.btnStartAi.addEventListener('click', startAiGame);
  el.btnStartLocal.addEventListener('click', startLocalGame);

  el.btnCreateOnlineRoom.addEventListener('click', () => {
    const playerName = el.createPlayerName.value.trim() || '플레이어 1';
    localStorage.setItem('chess_player_name', playerName);
    const timeMinutes = el.createTimePicker.value;
    const colorBtn = el.createColorPicker.querySelector('.btn-segment.active');
    const preferredColor = colorBtn ? colorBtn.dataset.color : 'random';

    const sendCreate = () => {
      state.ws.send(JSON.stringify({
        type: 'create_room',
        playerName,
        playerId: state.playerId,
        timeMinutes,
        preferredColor
      }));
    };

    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      sendCreate();
    } else {
      connectWebSocket(sendCreate);
    }
  });

  el.btnSubmitJoinRoom.addEventListener('click', () => {
    joinOnlineRoom();
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
    showQrModal(roomUrl, state.roomId);
  });

  if (el.btnTopCopyLink) {
    el.btnTopCopyLink.addEventListener('click', () => {
      const roomUrl = `${state.serverUrl}/?room=${state.roomId}`;
      navigator.clipboard.writeText(roomUrl).then(() => showToast('방 초대 링크가 복사되었습니다!'));
    });
  }
  if (el.btnTopShowQr) {
    el.btnTopShowQr.addEventListener('click', () => {
      const roomUrl = `${state.serverUrl}/?room=${state.roomId}`;
      showQrModal(roomUrl, state.roomId);
    });
  }

  el.btnCloseQrModal.addEventListener('click', () => el.modalQr.classList.remove('active'));
  el.btnModalCopyUrl.addEventListener('click', () => {
    navigator.clipboard.writeText(el.modalQrUrl.value).then(() => showToast('주소가 복사되었습니다!'));
  });

  // Records & Leaderboard Modal Listeners
  if (el.btnOpenRecords) {
    el.btnOpenRecords.addEventListener('click', () => {
      el.modalRecords.classList.add('active');
      loadLeaderboard();
      loadGameRecords();
    });
  }
  if (el.btnCloseRecordsModal) {
    el.btnCloseRecordsModal.addEventListener('click', () => {
      el.modalRecords.classList.remove('active');
    });
  }
  if (el.tabBtnLeaderboard) {
    el.tabBtnLeaderboard.addEventListener('click', () => {
      el.tabBtnLeaderboard.classList.add('active');
      el.tabBtnGames.classList.remove('active');
      el.rtabLeaderboard.classList.add('active');
      el.rtabGames.classList.remove('active');
      loadLeaderboard();
    });
  }
  if (el.tabBtnGames) {
    el.tabBtnGames.addEventListener('click', () => {
      el.tabBtnGames.classList.add('active');
      el.tabBtnLeaderboard.classList.remove('active');
      el.rtabGames.classList.add('active');
      el.rtabLeaderboard.classList.remove('active');
      loadGameRecords();
    });
  }

  // Replay Modal Listeners
  if (el.btnCloseReplayModal) {
    el.btnCloseReplayModal.addEventListener('click', () => {
      el.modalReplay.classList.remove('active');
    });
  }
  if (el.btnReplayStart) el.btnReplayStart.addEventListener('click', () => setReplayStep(0));
  if (el.btnReplayPrev) el.btnReplayPrev.addEventListener('click', () => setReplayStep(replayState.currentStep - 1));
  if (el.btnReplayNext) el.btnReplayNext.addEventListener('click', () => setReplayStep(replayState.currentStep + 1));
  if (el.btnReplayEnd) el.btnReplayEnd.addEventListener('click', () => setReplayStep(replayState.moves.length));
  if (el.btnReplayCopyPgn) {
    el.btnReplayCopyPgn.addEventListener('click', () => {
      if (replayState.pgn) {
        navigator.clipboard.writeText(replayState.pgn).then(() => showToast('PGN 기보가 복사되었습니다!'));
      }
    });
  }

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
  
  if (el.selectPieceStyle) {
    el.selectPieceStyle.value = currentPieceStyle;
  }
  apply3DViewState();

  setupEventListeners();
  renderBoard();

  // Connect WebSocket early to listen for lobby updates and live rooms
  connectWebSocket(() => {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'list_rooms' }));
    }
  });
}

window.addEventListener('DOMContentLoaded', init);
