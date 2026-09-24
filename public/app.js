import { Chess } from './chess.js';
import { ChessEngine } from './engine.js';
import { StockfishEngine } from './stockfish-engine.js';
import { audio } from './audio.js';
import { PIECE_VALUES, setPieceStyle, currentPieceStyle, getPieceSvg } from './pieces.js';

// Application State
const state = {
  mode: 'ai', // 'ai', 'wifi', 'local'
  game: new Chess(),
  engine: new ChessEngine(),
  stockfish: new StockfishEngine(),
  worker: null,
  playerColor: 'w', // 'w', 'b', 'spectator'
  boardFlipped: false,
  autoFlip: localStorage.getItem('chess_auto_flip') === 'true', // Default OFF so board does not flip every move
  is3DView: localStorage.getItem('chess_is_3d') === 'true',
  isRaytrace: localStorage.getItem('chess_is_raytrace') !== 'false', // Default ON for hyper-realism
  isBoardOnly: localStorage.getItem('chess_is_board_only') === 'true', // Phone/Fold Focus Fit Mode
  aiMoveDelay: parseInt(localStorage.getItem('chess_ai_move_delay') || '1000', 10), // ms (Default 1.0s)
  aiLevel: 3,
  evalEnabled: true,
  selectedSquare: null,
  legalMovesForSelected: [],
  lastMove: null,
  hintMove: null,
  pendingPromotion: null,
  gameStatus: 'idle', // 'idle', 'playing', 'ended'
  aiThinking: false,

  // Hint control (0: hidden, 1: max 1, 2: max 2)
  maxHints: parseInt(localStorage.getItem('chess_max_hints') ?? '0', 10),
  hintsUsed: 0,

  // Visual Assist Line Guides
  showAttackLines: localStorage.getItem('chess_show_attack_lines') === 'true',
  showThreatLines: localStorage.getItem('chess_show_threat_lines') === 'true',
  showPreviewLines: localStorage.getItem('chess_show_preview_lines') !== 'false', // Default ON
  hoveredSquare: null,
  
  // Clocks
  timeControl: { initial: 600, increment: 0 },
  timers: { w: 600, b: 600 },
  clockInterval: null,
  activeTurn: 'w',

  // WiFi Online state
  ws: null,
  roomId: null,
  drawOfferPending: false,
  playerId: (() => {
    let pid = localStorage.getItem('chess_player_id');
    if (!pid) {
      pid = 'p_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).slice(-4);
      localStorage.setItem('chess_player_id', pid);
    }
    return pid;
  })(),
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
  btnToggleRaytrace: document.getElementById('btn-toggle-raytrace'),
  btnOpenSettings: document.getElementById('btn-open-settings'),
  btnToggleBoardOnly: document.getElementById('btn-toggle-board-only'),
  btnSideBoardOnly: document.getElementById('btn-side-board-only'),
  boardOnlyTopbar: document.getElementById('board-only-topbar'),
  btnBotLeave: document.getElementById('btn-bot-leave'),
  botStatusPill: document.getElementById('bot-status-pill'),
  btnBotUndo: document.getElementById('btn-bot-undo'),
  btnBotHint: document.getElementById('btn-bot-hint'),
  btnBotFlip: document.getElementById('btn-bot-flip'),
  btnBotExit: document.getElementById('btn-bot-exit'),
  btnToggle3D: document.getElementById('btn-toggle-3d'),
  btnToggleFullscreen: document.getElementById('btn-toggle-fullscreen'),
  btnSoundToggle: document.getElementById('btn-sound-toggle'),

  // Dynamic AI Speed Controls
  aiSpeedControlBox: document.getElementById('ai-speed-control-box'),
  aiSpeedSlider: document.getElementById('ai-speed-slider'),
  aiSpeedBadge: document.getElementById('ai-speed-badge'),
  speedChips: document.querySelectorAll('.speed-chip'),

  // Lobby
  aiColorPicker: document.getElementById('ai-color-picker'),
  aiLevelPicker: document.getElementById('ai-level-picker'),
  aiTimePicker: document.getElementById('ai-time-picker'),
  aiHintPicker: document.getElementById('ai-hint-picker'),
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
  boardLinesOverlay: document.getElementById('board-lines-overlay'),
  svgAttackGroup: document.getElementById('svg-attack-group'),
  svgThreatGroup: document.getElementById('svg-threat-group'),
  svgPreviewGroup: document.getElementById('svg-preview-group'),
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

  // Side Tools & Visual Guide
  btnAiHint: document.getElementById('btn-ai-hint'),
  lblAiHint: document.getElementById('lbl-ai-hint'),
  chkShowAttackLines: document.getElementById('chk-show-attack-lines'),
  chkShowThreatLines: document.getElementById('chk-show-threat-lines'),
  chkShowPreviewLines: document.getElementById('chk-show-preview-lines'),
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

  lobbyRecentGames: document.getElementById('lobby-recent-games'),
  btnLobbyOpenRecords: document.getElementById('btn-lobby-open-records'),

  // Settings Modal
  modalSettings: document.getElementById('modal-settings'),
  btnCloseSettingsModal: document.getElementById('btn-close-settings-modal'),
  settingHintLimit: document.getElementById('setting-hint-limit'),
  settingShowAttack: document.getElementById('setting-show-attack'),
  settingShowThreat: document.getElementById('setting-show-threat'),
  settingShowPreview: document.getElementById('setting-show-preview'),
  settingShowRaytrace: document.getElementById('setting-show-raytrace'),
  settingAiDelay: document.getElementById('setting-ai-delay'),
  btnSaveSettings: document.getElementById('btn-save-settings'),

  // Draw Offer Modal
  modalDrawOffer: document.getElementById('modal-draw-offer'),
  drawOfferDesc: document.getElementById('draw-offer-desc'),
  btnDrawAccept: document.getElementById('btn-draw-accept'),
  btnDrawDecline: document.getElementById('btn-draw-decline'),

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

// ================= 3D & RAYTRACE RENDER HELPERS =================
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

function applyRaytraceState() {
  const isRTX = state.isRaytrace;
  if (el.boardStage) {
    if (isRTX) {
      el.boardStage.classList.add('raytrace-active');
    } else {
      el.boardStage.classList.remove('raytrace-active');
    }
  }
  if (el.btnToggleRaytrace) {
    if (isRTX) {
      el.btnToggleRaytrace.classList.add('active');
      el.btnToggleRaytrace.innerHTML = '<span class="raytrace-icon">✨</span> <span class="raytrace-text">RTX 켜짐</span>';
    } else {
      el.btnToggleRaytrace.classList.remove('active');
      el.btnToggleRaytrace.innerHTML = '<span class="raytrace-icon">💡</span> <span class="raytrace-text">RTX 꺼짐</span>';
    }
  }
  if (el.settingShowRaytrace) {
    el.settingShowRaytrace.checked = isRTX;
  }
  localStorage.setItem('chess_is_raytrace', isRTX);
}

function toggleRaytraceMode() {
  state.isRaytrace = !state.isRaytrace;
  applyRaytraceState();
  showToast(state.isRaytrace ? '✨ 실사 레이트레이스 PBR 렌더링 켜짐' : '💡 표준 렌더링 모드 전환');
}

// ================= DYNAMIC AI SPEED / DELAY CONTROL =================
function updateAiSpeedUi(ms, save = true) {
  state.aiMoveDelay = Math.max(100, Math.min(10000, ms));
  const secStr = (state.aiMoveDelay / 1000).toFixed(1);

  if (el.aiSpeedBadge) {
    el.aiSpeedBadge.innerText = `${secStr}초`;
  }
  if (el.aiSpeedSlider) {
    el.aiSpeedSlider.value = secStr;
  }
  if (el.settingAiDelay) {
    el.settingAiDelay.value = String(state.aiMoveDelay);
  }

  // Update quick preset chips
  const chips = document.querySelectorAll('.speed-chip');
  chips.forEach(chip => {
    const chipSec = parseFloat(chip.dataset.speed);
    if (Math.abs(chipSec - (state.aiMoveDelay / 1000)) < 0.05) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });

  if (save) {
    localStorage.setItem('chess_ai_move_delay', String(state.aiMoveDelay));
  }
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

// ================= BOARD-ONLY (PHONE / FOLD FIT) MODE =================
function toggleBoardOnlyMode(forceState = null) {
  state.isBoardOnly = (forceState !== null) ? forceState : !state.isBoardOnly;
  localStorage.setItem('chess_is_board_only', state.isBoardOnly ? 'true' : 'false');

  if (state.isBoardOnly) {
    document.body.classList.add('board-only-mode');
    if (el.btnToggleBoardOnly) {
      el.btnToggleBoardOnly.classList.add('active');
      el.btnToggleBoardOnly.title = '일반 모드로 복귀 (B키)';
    }
    if (el.btnSideBoardOnly) {
      el.btnSideBoardOnly.classList.add('active');
    }
    showToast('📱 판만 보기(모바일/폴드 맞춤) 켜짐 - 최상단 [되돌리기] 제공');
  } else {
    document.body.classList.remove('board-only-mode');
    if (el.btnToggleBoardOnly) {
      el.btnToggleBoardOnly.classList.remove('active');
      el.btnToggleBoardOnly.title = "폰/폴드 화면 맞춤 '판만 보기' 모드 (최상단 되돌리기 버튼 지원)";
    }
    if (el.btnSideBoardOnly) {
      el.btnSideBoardOnly.classList.remove('active');
    }
    showToast('🗗 일반 화면 모드로 복귀');
  }
  updateBoardOnlyStatus();
  renderBoard();
}

function updateBoardOnlyStatus() {
  if (!el.botStatusPill) return;
  const turn = state.game.turn();
  const isWhite = (turn === 'w');
  const turnText = isWhite ? '⚪ 백 차례' : '⚫ 흑 차례';
  if (state.game.inCheck()) {
    el.botStatusPill.innerText = `⚠️ ${turnText} (체크!)`;
    el.botStatusPill.style.borderColor = '#ef4444';
    el.botStatusPill.style.color = '#f87171';
  } else {
    el.botStatusPill.innerText = turnText;
    el.botStatusPill.style.borderColor = '';
    el.botStatusPill.style.color = '';
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

      // Pointer events for instant touch, click, and hover preview
      sq.addEventListener('pointerdown', (e) => handleSquareClick(e, squareName));
      sq.addEventListener('pointerenter', () => handleSquareHover(squareName));
      sq.addEventListener('pointerleave', () => handleSquareLeave(squareName));
      fragment.appendChild(sq);
    }
  }

  el.chessboard.appendChild(fragment);

  // Render Visual Guide Lines (Attack & Threat Lines)
  renderBoardLines();

  updateCapturedAndMaterial();
  updateStatusBanner();
  updateBoardOnlyStatus();
  renderNotation();
  updateHintUi();
}

// Convert chess square (e.g. 'e4') to percentage coordinates (0-100%) on SVG
function getSquareCenterPercent(sq, isFlipped) {
  const file = sq.charCodeAt(0) - 97; // 0 to 7 (a-h)
  const rank = parseInt(sq[1], 10) - 1; // 0 to 7 (1-8)
  const col = isFlipped ? 7 - file : file;
  const row = isFlipped ? rank : 7 - rank;
  return {
    x: col * 12.5 + 6.25,
    y: row * 12.5 + 6.25
  };
}

// Render dynamic attack lines (my captures) and threat lines (opponent captures)
function renderBoardLines() {
  if (!el.svgAttackGroup || !el.svgThreatGroup) return;

  el.svgAttackGroup.innerHTML = '';
  el.svgThreatGroup.innerHTML = '';

  if (state.gameStatus !== 'playing') return;

  const isFlipped = state.boardFlipped;
  const currentTurn = state.game.turn();
  const playerColor = state.mode === 'ai' || state.mode === 'wifi' ? state.playerColor : currentTurn;

  // 1. Attack Lines: When it is MY turn, show moves where I can capture opponent pieces
  if (state.showAttackLines && currentTurn === playerColor) {
    const legalMoves = state.game.moves({ verbose: true });
    const captureMoves = legalMoves.filter(m => m.captured);

    captureMoves.forEach(m => {
      const pFrom = getSquareCenterPercent(m.from, isFlipped);
      const pTo = getSquareCenterPercent(m.to, isFlipped);

      // Clean Pure Line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', pFrom.x);
      line.setAttribute('y1', pFrom.y);
      line.setAttribute('x2', pTo.x);
      line.setAttribute('y2', pTo.y);
      line.setAttribute('class', 'attack-line');
      line.setAttribute('marker-end', 'url(#arrow-attack)');
      el.svgAttackGroup.appendChild(line);
    });
  }

  // 2. Threat Lines: Show where opponent can capture MY pieces
  if (state.showThreatLines) {
    const oppColor = playerColor === 'w' ? 'b' : 'w';
    let oppCaptures = [];

    if (currentTurn === oppColor) {
      // It's opponent's turn: their direct legal moves
      oppCaptures = state.game.moves({ verbose: true }).filter(m => m.captured);
    } else {
      // It's my turn, but opponent just moved: test hypothetical opponent captures
      try {
        const tempGame = new Chess(state.game.fen());
        const tokens = tempGame.fen().split(' ');
        tokens[1] = oppColor; // switch active turn to opponent
        tokens[3] = '-'; // reset en-passant for mock
        const mockFen = tokens.join(' ');
        tempGame.load(mockFen, { skipValidation: true });
        oppCaptures = tempGame.moves({ verbose: true }).filter(m => m.captured);
      } catch (err) {
        oppCaptures = [];
      }
    }

    oppCaptures.forEach(m => {
      const pFrom = getSquareCenterPercent(m.from, isFlipped);
      const pTo = getSquareCenterPercent(m.to, isFlipped);

      // Clean Pure Threat Line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', pFrom.x);
      line.setAttribute('y1', pFrom.y);
      line.setAttribute('x2', pTo.x);
      line.setAttribute('y2', pTo.y);
      line.setAttribute('class', 'threat-line');
      line.setAttribute('marker-end', 'url(#arrow-threat)');
      el.svgThreatGroup.appendChild(line);
    });
  }
  // 3. Move Preview Dotted Lines: When a piece is selected and player hovers over a destination square
  renderPreviewLines();
}

// Render future 1-move outcome preview in dotted lines when hovering over target squares
function renderPreviewLines() {
  if (!el.svgPreviewGroup) return;
  el.svgPreviewGroup.innerHTML = '';

  if (!state.showPreviewLines || state.gameStatus !== 'playing' || !state.selectedSquare || !state.hoveredSquare) {
    return;
  }

  // Check if hovered square is among legal moves for the selected piece
  const legalMove = state.legalMovesForSelected.find(m => m.to === state.hoveredSquare);
  if (!legalMove) return;

  const isFlipped = state.boardFlipped;
  const playerColor = state.mode === 'ai' || state.mode === 'wifi' ? state.playerColor : state.game.turn();
  const oppColor = playerColor === 'w' ? 'b' : 'w';

  try {
    // Clone board state and simulate placing the piece at the hovered destination
    const simGame = new Chess(state.game.fen());
    const simMove = simGame.move({
      from: state.selectedSquare,
      to: state.hoveredSquare,
      promotion: legalMove.promotion || 'q'
    });

    if (!simMove) return;

    // A. Future Threats (Opponent moves that can capture our pieces after this move)
    const oppFutureMoves = simGame.moves({ verbose: true }).filter(m => m.captured);
    oppFutureMoves.forEach(m => {
      const pFrom = getSquareCenterPercent(m.from, isFlipped);
      const pTo = getSquareCenterPercent(m.to, isFlipped);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', pFrom.x);
      line.setAttribute('y1', pFrom.y);
      line.setAttribute('x2', pTo.x);
      line.setAttribute('y2', pTo.y);
      line.setAttribute('class', 'preview-threat-line');
      line.setAttribute('marker-end', 'url(#arrow-preview-threat)');
      el.svgPreviewGroup.appendChild(line);
    });

    // B. Future Attacks (Our own subsequent capture opportunities opened up)
    const mockTokens = simGame.fen().split(' ');
    mockTokens[1] = playerColor; // Mock turn back to player
    mockTokens[3] = '-';
    const mockFen = mockTokens.join(' ');
    const myFutureSim = new Chess();
    myFutureSim.load(mockFen, { skipValidation: true });

    const myFutureCaptures = myFutureSim.moves({ verbose: true }).filter(m => m.captured);
    myFutureCaptures.forEach(m => {
      const pFrom = getSquareCenterPercent(m.from, isFlipped);
      const pTo = getSquareCenterPercent(m.to, isFlipped);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', pFrom.x);
      line.setAttribute('y1', pFrom.y);
      line.setAttribute('x2', pTo.x);
      line.setAttribute('y2', pTo.y);
      line.setAttribute('class', 'preview-attack-line');
      line.setAttribute('marker-end', 'url(#arrow-preview-attack)');
      el.svgPreviewGroup.appendChild(line);
    });
  } catch (err) {
    console.warn('Preview simulation error:', err);
  }
}

// Handle square pointer hover for instant preview
function handleSquareHover(squareName) {
  if (!state.showPreviewLines || !state.selectedSquare || state.gameStatus !== 'playing') return;
  if (state.hoveredSquare === squareName) return;

  state.hoveredSquare = squareName;
  renderPreviewLines();
}

function handleSquareLeave(squareName) {
  if (state.hoveredSquare === squareName) {
    state.hoveredSquare = null;
    renderPreviewLines();
  }
}

function updateHintUi() {
  if (!el.btnAiHint) return;

  if (state.maxHints <= 0) {
    el.btnAiHint.style.display = 'none';
    return;
  }

  el.btnAiHint.style.display = 'flex';
  const remaining = Math.max(0, state.maxHints - state.hintsUsed);
  if (el.lblAiHint) {
    el.lblAiHint.innerText = `최선수 힌트 (${remaining}/${state.maxHints})`;
  }

  if (remaining <= 0) {
    el.btnAiHint.style.opacity = '0.5';
    el.btnAiHint.style.pointerEvents = 'none';
    el.btnAiHint.title = `최선수 힌트 횟수를 모두 사용했습니다. (최대 ${state.maxHints}회)`;
  } else {
    el.btnAiHint.style.opacity = '1';
    el.btnAiHint.style.pointerEvents = 'auto';
    el.btnAiHint.title = `현재 국면에서 가장 좋은 최선수를 추천받습니다. (남은 횟수: ${remaining}회)`;
  }
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

async function triggerAIMove() {
  if (state.gameStatus !== 'playing') return;

  state.aiThinking = true;
  const isStockfishReady = state.stockfish && state.stockfish.isReady;
  const maxTimeMs = state.aiMoveDelay || 1000;
  const secDisplay = (maxTimeMs / 1000).toFixed(1);

  el.gameStatusText.innerText = isStockfishReady
    ? `🤖 Stockfish가 수를 계산 중입니다... (최대 ${secDisplay}초)`
    : `🤖 AI가 수를 계산 중입니다... (최대 ${secDisplay}초)`;

  // 1. Try World-Class Stockfish Engine with strict zero-overrun time cap
  if (isStockfishReady) {
    try {
      const uciMove = await state.stockfish.getAIMove(state.game.fen(), state.aiLevel, maxTimeMs);
      if (uciMove && state.gameStatus === 'playing') {
        const moveObj = {
          from: uciMove.slice(0, 2),
          to: uciMove.slice(2, 4),
          ...(uciMove.length > 4 ? { promotion: uciMove[4] } : {})
        };
        state.aiThinking = false;
        handleAIMoveResult(moveObj);
        return;
      }
    } catch (e) {
      console.warn('Stockfish move failed, falling back to built-in engine:', e);
    }
  }

  // 2. Fallback to built-in engine (capped at maxTimeMs)
  if (state.worker) {
    state.worker.postMessage({
      type: 'get_ai_move',
      fen: state.game.fen(),
      level: state.aiLevel,
      maxTime: maxTimeMs
    });
  } else {
    setTimeout(() => {
      const aiMove = state.engine.getAIMove(state.game, state.aiLevel, maxTimeMs);
      state.aiThinking = false;
      handleAIMoveResult(aiMove);
    }, Math.min(50, Math.floor(maxTimeMs * 0.2)));
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

  // Use Stockfish for grandmaster-level positional analysis if ready
  if (state.stockfish && state.stockfish.isReady) {
    state.stockfish.analyzePosition(state.game.fen(), (analysis) => {
      applyAnalysisResult(analysis);
    });
    return;
  }

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
  let winnerColor = null; // 'w' | 'b' | 'draw'

  if (reasonType === 'time_out') {
    const winnerName = forcedWinner === 'w' ? '백' : '흑';
    title = '⏱️ 시간 초과!';
    reason = `${winnerName}의 시간승입니다.`;
    isWin = (forcedWinner === state.playerColor);
    winnerColor = forcedWinner;
  } else if (reasonType === 'resign') {
    winnerColor = forcedWinner;
    const winnerName = forcedWinner === 'w' ? '백' : '흑';
    title = '🏳️ 기권';
    reason = `${winnerName} 승리 (기권패)`;
    isWin = (forcedWinner === state.playerColor);
  } else if (state.game.isCheckmate()) {
    winnerColor = state.game.turn() === 'w' ? 'b' : 'w';
    const wName = winnerColor === 'w' ? '백' : '흑';
    title = '🏆 체크메이트!';
    reason = `${wName} 승리입니다.`;
    isWin = (winnerColor === state.playerColor);
  } else if (state.game.isDraw()) {
    winnerColor = 'draw';
    title = '🤝 무승부';
    if (state.game.isStalemate()) reason = '스테일메이트 (더 이상 둘 수가 없습니다)';
    else if (state.game.isThreefoldRepetition()) reason = '3회 동형 반복 무승부';
    else if (state.game.isInsufficientMaterial()) reason = '기물 부족 무승부';
    else reason = '50수 규칙 무승부';
  }

  const totalMoves = state.game.history().length;

  audio.playGameEnd(isWin);

  el.gameoverIcon.innerText = isWin ? '🏆' : (winnerColor === 'draw' ? '🤝' : '⚔️');
  el.gameoverTitle.innerText = title;
  el.gameoverReason.innerText = `${reason}\n총 ${totalMoves}수 만에 종료되었습니다.`;
  el.modalGameOver.classList.add('active');

  // Auto-save AI and local games to server
  if (state.mode === 'ai' || state.mode === 'local') {
    saveLocalGameToServer(winnerColor, reason, totalMoves);
  }
}

async function saveLocalGameToServer(winnerColor, endReason, totalMoves) {
  try {
    const history = state.game.history({ verbose: true });
    if (!history || history.length === 0) return;

    const apiPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';

    let whiteName, blackName;
    if (state.mode === 'ai') {
      whiteName = state.playerColor === 'w' ? (state.playerName || '플레이어') : `AI Lv.${state.aiLevel}`;
      blackName = state.playerColor === 'b' ? (state.playerName || '플레이어') : `AI Lv.${state.aiLevel}`;
    } else {
      whiteName = el.userName.innerText.replace(' (백)', '').replace(' (White)', '') || '플레이어 1';
      blackName = el.opponentName.innerText.replace(' (흑)', '').replace(' (Black)', '') || '플레이어 2';
    }

    let winnerName = '무승부';
    if (winnerColor === 'w') winnerName = whiteName;
    else if (winnerColor === 'b') winnerName = blackName;

    const timeMinutes = state.timeControl?.initial ? Math.round(state.timeControl.initial / 60) : 0;
    const modeTag = state.mode === 'ai' ? `AI Lv.${state.aiLevel}` : '로컬 2인';

    const gameRecord = {
      id: `game_${Date.now()}_${state.mode}`,
      roomId: modeTag,
      playedAt: new Date().toISOString(),
      white: whiteName,
      black: blackName,
      winner: winnerColor || 'draw',
      winnerName,
      endReason: endReason || '대국 종료',
      totalMoves,
      fen: state.game.fen(),
      pgn: state.game.pgn(),
      timeControl: timeMinutes > 0 ? `${timeMinutes}분` : '무제한',
      history: history.map(h => ({
        from: h.from,
        to: h.to,
        piece: h.piece,
        color: h.color,
        san: h.san,
        captured: h.captured || null,
        promotion: h.promotion || null
      }))
    };

    await fetch(`${apiPrefix}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameRecord)
    });
  } catch (err) {
    console.warn('Failed to save local game:', err);
  }
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

    // Dynamically update playerColor and board orientation based on current room state & playerId
    if (state.playerId) {
      if (msg.white && msg.white.id === state.playerId) {
        state.playerColor = 'w';
        state.boardFlipped = false;
      } else if (msg.black && msg.black.id === state.playerId) {
        state.playerColor = 'b';
        state.boardFlipped = true;
      } else {
        state.playerColor = 'spectator';
      }
    }

    const prevStatus = state.gameStatus;
    const prevHistoryLength = (state.moveHistory && state.moveHistory.length) || 0;
    state.gameStatus = msg.status;
    state.game.load(msg.fen);
    state.timeControl = msg.timeControl;
    state.moveHistory = msg.history || [];
    state.activeTurn = state.game.turn();
    state.selectedSquare = null;
    state.legalMovesForSelected = [];
    state.hintMove = null;

    if (el.userAvatar) el.userAvatar.innerText = '👤';
    if (el.opponentAvatar) el.opponentAvatar.innerText = '👤';

    // Auto-close QR modal if opponent joined and game is playing
    if (msg.status === 'playing') {
      if (el.gameStatusText) el.gameStatusText.innerText = '실시간 온라인 대국 진행 중';
      if (el.modalQr && el.modalQr.classList.contains('active')) {
        el.modalQr.classList.remove('active');
        showToast('상대방이 입장하여 대국이 시작되었습니다!');
      }

      // Check if transitioning to playing (Game start or Rematch started)
      if (prevStatus === 'ended' || (el.modalGameOver && el.modalGameOver.classList.contains('active'))) {
        if (el.modalGameOver) el.modalGameOver.classList.remove('active');
        if (el.btnModalRematch) {
          el.btnModalRematch.innerText = '🔄 재대국 요청';
          el.btnModalRematch.disabled = false;
        }
        state.selectedSquare = null;
        state.legalMovesForSelected = [];
        state.lastMove = null;
        showToast(`⚔️ 재대국이 시작되었습니다! (진영: ${state.playerColor === 'w' ? '백(선공)' : '흑(후공)'})`);
        audio.playGameStart();
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
      if (msg.white) el.userTimer.innerText = formatTime(msg.white.timeLeft);
      if (msg.black) el.opponentTimer.innerText = formatTime(msg.black.timeLeft);
    }

    if (msg.history && msg.history.length > 0) {
      const last = msg.history[msg.history.length - 1];
      state.lastMove = last;
      if (msg.status === 'playing' && msg.history.length > prevHistoryLength) {
        if (msg.isCheck) audio.playCheck();
        else if (last.captured) audio.playCapture();
        else if (last.flags?.includes('k') || last.flags?.includes('q')) audio.playCastle();
        else audio.playMove();
      }
    } else {
      state.lastMove = null;
    }

    // Handle Draw Offer: only show modal to opponent (not spectator or offerer)
    if (msg.drawOffer) {
      if (state.playerColor === msg.drawOffer) {
        // I am the one who offered draw
        state.drawOfferPending = true;
        if (el.btnOfferDraw) {
          el.btnOfferDraw.innerText = '⏳ 무승부 응답 대기 중...';
          el.btnOfferDraw.disabled = true;
          el.btnOfferDraw.style.opacity = '0.6';
          el.btnOfferDraw.style.pointerEvents = 'none';
        }
      } else if (state.playerColor === 'w' || state.playerColor === 'b') {
        // I am the opponent receiving the offer
        if (el.modalDrawOffer && !el.modalDrawOffer.classList.contains('active')) {
          if (el.drawOfferDesc) {
            const oppName = msg.drawOffer === 'w' ? (msg.white?.name || '백') : (msg.black?.name || '흑');
            el.drawOfferDesc.innerHTML = `<strong>${oppName}</strong>님이 무승부를 제안했습니다.<br>수락하시겠습니까?`;
          }
          el.modalDrawOffer.classList.add('active');
          audio.playNotify();
        }
      }
    } else {
      // No pending draw offer: reset button and close modal if open
      state.drawOfferPending = false;
      if (el.btnOfferDraw) {
        el.btnOfferDraw.innerText = '🤝 무승부 제안';
        el.btnOfferDraw.disabled = false;
        el.btnOfferDraw.style.opacity = '1';
        el.btnOfferDraw.style.pointerEvents = 'auto';
      }
      if (el.modalDrawOffer && el.modalDrawOffer.classList.contains('active')) {
        el.modalDrawOffer.classList.remove('active');
      }
    }

    if (msg.status === 'ended') {
      if (el.modalDrawOffer) el.modalDrawOffer.classList.remove('active');
      if (prevStatus !== 'ended') {
        const isWin = (msg.winner === state.playerColor);
        audio.playGameEnd(isWin);
        el.gameoverIcon.innerText = isWin ? '🏆' : (msg.winner === 'draw' ? '🤝' : '⚔️');
        el.gameoverTitle.innerText = msg.winner === 'draw' ? '무승부' : `${msg.winner === 'w' ? '백' : '흑'} 승리!`;
        el.gameoverReason.innerText = msg.endReason || '대국이 종료되었습니다.';
        el.modalGameOver.classList.add('active');

        // Reset rematch button text when game just ended
        if (el.btnModalRematch) {
          el.btnModalRematch.innerText = '🔄 재대국 요청';
          el.btnModalRematch.disabled = false;
        }

        // Refresh records cache
        loadLeaderboard();
        loadGameRecords();
      }

      // Handle Rematch Offer indicators
      if (msg.rematchOffer && el.btnModalRematch) {
        const myRequested = (state.playerColor === 'w' && msg.rematchOffer.w) || (state.playerColor === 'b' && msg.rematchOffer.b);
        const oppRequested = (state.playerColor === 'w' && msg.rematchOffer.b) || (state.playerColor === 'b' && msg.rematchOffer.w);

        if (myRequested && !oppRequested) {
          el.btnModalRematch.innerText = '⏳ 상대방 수락 대기 중...';
          el.btnModalRematch.disabled = true;
        } else if (!myRequested && oppRequested) {
          el.btnModalRematch.innerText = '⚡ 상대방이 재대국 요청함! (수락)';
          el.btnModalRematch.disabled = false;
          if (!el.modalGameOver.classList.contains('active')) {
            showToast('⚡ 상대방이 재대국을 요청했습니다! 결과창에서 수락할 수 있습니다.');
            el.modalGameOver.classList.add('active');
          }
        } else if (!myRequested && !oppRequested) {
          el.btnModalRematch.innerText = '🔄 재대국 요청';
          el.btnModalRematch.disabled = false;
        }
      }
    }

    // Immediately render real-time board, material, turn indicators, notation & engine eval
    renderBoard();
    triggerAsyncEvaluation();
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
    // Refresh lobby recent games panel
    loadLobbyRecentGames();
  } else if (viewName === 'game') {
    el.viewLobby.classList.remove('active');
    el.viewGame.classList.add('active');
    renderBoard();
  }
}

async function loadLobbyRecentGames() {
  if (!el.lobbyRecentGames) return;
  try {
    const apiPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';
    const res = await fetch(`${apiPrefix}/api/games`);
    const data = await res.json();
    const games = (data.games || []).slice(0, 6); // Show last 6

    if (games.length === 0) {
      el.lobbyRecentGames.innerHTML = '<div class="room-empty-state">아직 기록이 없습니다. 대국 후 자동으로 저장됩니다.</div>';
      return;
    }

    el.lobbyRecentGames.innerHTML = games.map(g => {
      const dateStr = new Date(g.playedAt).toLocaleString('ko-KR', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const resultEmoji = g.winner === 'w' ? '🏆백' : g.winner === 'b' ? '🏆흑' : '🤝무';
      const roomId = g.roomId || '';
      let modeTag = '🌐';
      if (roomId.startsWith('AI Lv.')) modeTag = '🤖';
      else if (roomId === '로컬 2인') modeTag = '👥';

      return `
        <div class="lobby-recent-item" data-id="${g.id}">
          <span class="lri-mode">${modeTag}</span>
          <span class="lri-vs">${g.white} vs ${g.black}</span>
          <span class="lri-result">${resultEmoji} · ${g.totalMoves}수</span>
          <span class="lri-date">${dateStr}</span>
          <button class="btn-mini lri-replay-btn" data-id="${g.id}">🔍</button>
        </div>
      `;
    }).join('');

    // Bind replay buttons in lobby recent list
    el.lobbyRecentGames.querySelectorAll('.lri-replay-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const gameId = btn.dataset.id;
        try {
          const apiPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';
          const r = await fetch(`${apiPrefix}/api/games/${gameId}`);
          const game = await r.json();
          if (game && game.history) openReplayModal(game);
        } catch (e) {
          showToast('기보를 불러오지 못했습니다.');
        }
      });
    });
  } catch (err) {
    if (el.lobbyRecentGames) el.lobbyRecentGames.innerHTML = '<div class="room-empty-state">기록 불러오기 실패</div>';
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

  // Set maxHints from lobby or global setting
  if (el.aiHintPicker) {
    state.maxHints = parseInt(el.aiHintPicker.value, 10);
  }
  state.hintsUsed = 0;

  el.userName.innerText = '나 (Player)';
  el.userTag.innerText = chosenColor === 'w' ? '백' : '흑';
  el.opponentName.innerText = `스마트 AI`;
  el.opponentTag.innerText = `레벨 ${state.aiLevel}`;
  el.opponentAvatar.innerText = '🤖';
  el.userAvatar.innerText = '👤';
  el.btnOfferDraw.style.display = 'none';

  switchView('game');
  updateHintUi();
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
  state.hintsUsed = 0;

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
  updateHintUi();
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
      el.gamesListContainer.innerHTML = '<div class="empty-table-msg">저장된 기보가 없습니다.<br>대국이 끝나면 자동으로 저장됩니다.</div>';
      return;
    }

    el.gamesListContainer.innerHTML = games.map(g => {
      const dateStr = new Date(g.playedAt).toLocaleString('ko-KR', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const whiteWin = g.winner === 'w' ? 'winner-name' : '';
      const blackWin = g.winner === 'b' ? 'winner-name' : '';

      const resultEmoji = g.winner === 'w' ? '🏆 백 승' :
                          g.winner === 'b' ? '🏆 흑 승' : '🤝 무승부';
      const resultClass = g.winner === 'draw' ? 'result-draw' : 'result-win';

      // Mode tag: Wi-Fi = 4-char room ID, AI = 'AI Lv.X', local = '로컬 2인'
      const roomId = g.roomId || '';
      let modeTag = '🌐 와이파이';
      if (roomId.startsWith('AI Lv.')) modeTag = `🤖 ${roomId}`;
      else if (roomId === '로컬 2인') modeTag = '👥 로컬';
      else if (roomId.length <= 4 && roomId.length > 0) modeTag = `🌐 방:${roomId}`;

      return `
        <div class="game-record-card">
          <div class="game-record-left">
            <div class="game-record-vs">
              <span class="${whiteWin}">⚪ ${g.white}</span> vs <span class="${blackWin}">⚫ ${g.black}</span>
              <span class="game-mode-tag">${modeTag}</span>
            </div>
            <div class="game-record-meta">
              <span class="${resultClass}">${resultEmoji}</span>
              <span class="moves-count">⚡ <strong>${g.totalMoves}수</strong></span>
              · ${g.endReason}
              · ⏱️ ${g.timeControl}
              · 📅 ${dateStr}
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
        const pieceKey = `${p.color}${p.type.toUpperCase()}`;
        const pieceSvg = getPieceSvg(pieceKey);
        if (pieceSvg) {
          const pieceEl = document.createElement('div');
          pieceEl.className = 'chess-piece-container';
          pieceEl.innerHTML = pieceSvg;
          sq.appendChild(pieceEl);
        }
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
    localStorage.setItem('chess_theme', e.target.value);
    showToast(`체스판 테마가 변경되었습니다: ${e.target.options[e.target.selectedIndex].text}`);
  });

  el.btnToggle3D.addEventListener('click', () => {
    toggle3DView();
  });

  if (el.btnToggleBoardOnly) {
    el.btnToggleBoardOnly.addEventListener('click', () => {
      toggleBoardOnlyMode();
    });
  }

  if (el.btnSideBoardOnly) {
    el.btnSideBoardOnly.addEventListener('click', () => {
      toggleBoardOnlyMode();
    });
  }

  if (el.btnBotExit) {
    el.btnBotExit.addEventListener('click', () => {
      toggleBoardOnlyMode(false);
    });
  }

  if (el.btnBotLeave) {
    el.btnBotLeave.addEventListener('click', () => {
      if (el.btnLeaveGame) el.btnLeaveGame.click();
    });
  }

  if (el.btnBotUndo) {
    el.btnBotUndo.addEventListener('click', () => {
      if (el.btnUndoMove) el.btnUndoMove.click();
    });
  }

  if (el.btnBotHint) {
    el.btnBotHint.addEventListener('click', () => {
      if (el.btnAiHint) el.btnAiHint.click();
    });
  }

  if (el.btnBotFlip) {
    el.btnBotFlip.addEventListener('click', () => {
      if (el.btnFlipBoard) el.btnFlipBoard.click();
    });
  }

  if (el.btnToggleFullscreen) {
    el.btnToggleFullscreen.addEventListener('click', () => {
      toggleFullscreen();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    } else if (e.key === 'b' || e.key === 'B') {
      toggleBoardOnlyMode();
    } else if (e.key === 'z' || e.key === 'Z' || (e.ctrlKey && e.key === 'z')) {
      if (el.btnUndoMove) el.btnUndoMove.click();
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

  // AI Hint with limit checking (max 2, default 0)
  el.btnAiHint.addEventListener('click', async () => {
    if (state.maxHints <= 0) {
      showToast('최선수 힌트 기능이 비활성화되어 있습니다.');
      return;
    }
    if (state.hintsUsed >= state.maxHints) {
      showToast(`최선수 힌트 횟수를 모두 소진했습니다. (최대 ${state.maxHints}회)`);
      return;
    }

    state.hintsUsed++;
    updateHintUi();

    if (state.stockfish && state.stockfish.isReady) {
      el.engineHintText.innerText = '💡 최강 Stockfish가 최선수를 찾는 중...';
      const uciMove = await state.stockfish.getAIMove(state.game.fen(), 5, 1000);
      if (uciMove) {
        const from = uciMove.slice(0, 2);
        const to = uciMove.slice(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
        const moveObj = state.game.moves({ verbose: true }).find(m =>
          m.from === from && m.to === to && (!promotion || m.promotion === promotion)
        );
        if (moveObj) {
          state.hintMove = moveObj;
          el.engineHintText.innerText = `💡 추천 최선수(Stockfish): ${moveObj.san} (${moveObj.from} ➔ ${moveObj.to}) [남은 횟수: ${state.maxHints - state.hintsUsed}회]`;
          renderBoard();
          audio.playNotify();
          return;
        }
      }
    }

    const analysis = state.engine.analyzePosition(state.game);
    if (analysis.bestMove) {
      state.hintMove = analysis.bestMove;
      el.engineHintText.innerText = `💡 추천 최선수: ${analysis.bestMove.san} (${analysis.bestMove.from} ➔ ${analysis.bestMove.to}) [남은 횟수: ${state.maxHints - state.hintsUsed}회]`;
      renderBoard();
      audio.playNotify();
    }
  });

  // Dynamic Visual Line Guides (Attack & Threat)
  if (el.chkShowAttackLines) {
    el.chkShowAttackLines.checked = state.showAttackLines;
    el.chkShowAttackLines.addEventListener('change', (e) => {
      state.showAttackLines = e.target.checked;
      localStorage.setItem('chess_show_attack_lines', state.showAttackLines);
      if (el.settingShowAttack) el.settingShowAttack.checked = state.showAttackLines;
      renderBoardLines();
      showToast(state.showAttackLines ? '⚔️ 공격 가능선 표시 켜짐' : '⚔️ 공격선 표시 꺼짐');
    });
  }

  if (el.chkShowThreatLines) {
    el.chkShowThreatLines.checked = state.showThreatLines;
    el.chkShowThreatLines.addEventListener('change', (e) => {
      state.showThreatLines = e.target.checked;
      localStorage.setItem('chess_show_threat_lines', state.showThreatLines);
      if (el.settingShowThreat) el.settingShowThreat.checked = state.showThreatLines;
      renderBoardLines();
      showToast(state.showThreatLines ? '🛡️ 상대 위협선 표시 켜짐' : '🛡️ 위협선 표시 꺼짐');
    });
  }

  if (el.chkShowPreviewLines) {
    el.chkShowPreviewLines.checked = state.showPreviewLines;
    el.chkShowPreviewLines.addEventListener('change', (e) => {
      state.showPreviewLines = e.target.checked;
      localStorage.setItem('chess_show_preview_lines', state.showPreviewLines);
      if (el.settingShowPreview) el.settingShowPreview.checked = state.showPreviewLines;
      renderPreviewLines();
      showToast(state.showPreviewLines ? '🔮 착수 미리보기 (미래 수 점선) 켜짐' : '🔮 착수 미리보기 꺼짐');
    });
  }

  if (el.btnToggleRaytrace) {
    el.btnToggleRaytrace.addEventListener('click', () => {
      toggleRaytraceMode();
    });
  }

  // Dynamic AI Speed Slider & Preset Chips
  if (el.aiSpeedSlider) {
    el.aiSpeedSlider.addEventListener('input', (e) => {
      const ms = Math.round(parseFloat(e.target.value) * 1000);
      updateAiSpeedUi(ms, true);
    });
  }

  if (el.speedChips) {
    el.speedChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const ms = Math.round(parseFloat(chip.dataset.speed) * 1000);
        updateAiSpeedUi(ms, true);
        showToast(`⚡ AI 응수 시간이 ${(ms / 1000).toFixed(1)}초로 변경되었습니다.`);
      });
    });
  }

  // Settings Modal Controls
  if (el.btnOpenSettings) {
    el.btnOpenSettings.addEventListener('click', () => {
      if (el.modalSettings) {
        if (el.settingHintLimit) el.settingHintLimit.value = String(state.maxHints);
        if (el.settingShowAttack) el.settingShowAttack.checked = state.showAttackLines;
        if (el.settingShowThreat) el.settingShowThreat.checked = state.showThreatLines;
        if (el.settingShowPreview) el.settingShowPreview.checked = state.showPreviewLines;
        if (el.settingShowRaytrace) el.settingShowRaytrace.checked = state.isRaytrace;
        if (el.settingAiDelay) el.settingAiDelay.value = String(state.aiMoveDelay);
        el.modalSettings.classList.add('active');
      }
    });
  }

  if (el.btnCloseSettingsModal) {
    el.btnCloseSettingsModal.addEventListener('click', () => {
      if (el.modalSettings) el.modalSettings.classList.remove('active');
    });
  }

  if (el.btnSaveSettings) {
    el.btnSaveSettings.addEventListener('click', () => {
      if (el.settingHintLimit) {
        const val = parseInt(el.settingHintLimit.value, 10);
        state.maxHints = val;
        localStorage.setItem('chess_max_hints', String(val));
        if (el.aiHintPicker) el.aiHintPicker.value = String(val);
      }
      if (el.settingShowAttack) {
        state.showAttackLines = el.settingShowAttack.checked;
        localStorage.setItem('chess_show_attack_lines', String(state.showAttackLines));
        if (el.chkShowAttackLines) el.chkShowAttackLines.checked = state.showAttackLines;
      }
      if (el.settingShowThreat) {
        state.showThreatLines = el.settingShowThreat.checked;
        localStorage.setItem('chess_show_threat_lines', String(state.showThreatLines));
        if (el.chkShowThreatLines) el.chkShowThreatLines.checked = state.showThreatLines;
      }
      if (el.settingShowPreview) {
        state.showPreviewLines = el.settingShowPreview.checked;
        localStorage.setItem('chess_show_preview_lines', String(state.showPreviewLines));
        if (el.chkShowPreviewLines) el.chkShowPreviewLines.checked = state.showPreviewLines;
      }
      if (el.settingShowRaytrace) {
        state.isRaytrace = el.settingShowRaytrace.checked;
        applyRaytraceState();
      }
      if (el.settingAiDelay) {
        const ms = parseInt(el.settingAiDelay.value, 10);
        updateAiSpeedUi(ms, true);
      }

      if (el.modalSettings) el.modalSettings.classList.remove('active');
      updateHintUi();
      renderBoardLines();
      showToast('게임 환경 설정이 저장되었습니다.');
    });
  }

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
    if (state.drawOfferPending) {
      showToast('이미 상대방의 무승부 응답을 기다리는 중입니다.');
      return;
    }
    if (state.mode === 'wifi' && state.ws) {
      state.ws.send(JSON.stringify({ type: 'offer_draw' }));
      state.drawOfferPending = true;
      el.btnOfferDraw.innerText = '⏳ 무승부 응답 대기 중...';
      el.btnOfferDraw.disabled = true;
      el.btnOfferDraw.style.opacity = '0.6';
      el.btnOfferDraw.style.pointerEvents = 'none';
      showToast('상대방에게 무승부를 제안했습니다.');
    }
  });

  if (el.btnDrawAccept) {
    el.btnDrawAccept.addEventListener('click', () => {
      if (el.modalDrawOffer) el.modalDrawOffer.classList.remove('active');
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'respond_draw', accept: true }));
      }
    });
  }

  if (el.btnDrawDecline) {
    el.btnDrawDecline.addEventListener('click', () => {
      if (el.modalDrawOffer) el.modalDrawOffer.classList.remove('active');
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'respond_draw', accept: false }));
      }
      showToast('무승부 제안을 거절했습니다.');
    });
  }

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
    if (state.mode === 'wifi' && state.ws) {
      state.ws.send(JSON.stringify({ type: 'request_rematch' }));
      el.btnModalRematch.innerText = '⏳ 상대방 수락 대기 중...';
      el.btnModalRematch.disabled = true;
      showToast('재대국을 요청했습니다. 상대방 수락을 기다립니다.');
    } else if (state.mode === 'ai') {
      el.modalGameOver.classList.remove('active');
      startAiGame();
    } else {
      el.modalGameOver.classList.remove('active');
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
  
  const savedTheme = localStorage.getItem('chess_theme') || 'theme-lava';
  document.body.className = savedTheme;
  if (el.selectTheme) {
    el.selectTheme.value = savedTheme;
  }

  if (el.selectPieceStyle) {
    el.selectPieceStyle.value = currentPieceStyle;
  }
  if (el.aiHintPicker) {
    el.aiHintPicker.value = String(state.maxHints);
  }
  if (el.settingHintLimit) {
    el.settingHintLimit.value = String(state.maxHints);
  }
  if (el.chkShowAttackLines) {
    el.chkShowAttackLines.checked = state.showAttackLines;
  }
  if (el.chkShowThreatLines) {
    el.chkShowThreatLines.checked = state.showThreatLines;
  }
  if (el.chkShowPreviewLines) {
    el.chkShowPreviewLines.checked = state.showPreviewLines;
  }
  if (el.settingShowAttack) {
    el.settingShowAttack.checked = state.showAttackLines;
  }
  if (el.settingShowThreat) {
    el.settingShowThreat.checked = state.showThreatLines;
  }
  if (el.settingShowRaytrace) {
    el.settingShowRaytrace.checked = state.isRaytrace;
  }
  if (el.settingAiDelay) {
    el.settingAiDelay.value = String(state.aiMoveDelay);
  }

  apply3DViewState();
  applyRaytraceState();
  if (state.isBoardOnly) {
    document.body.classList.add('board-only-mode');
    if (el.btnToggleBoardOnly) el.btnToggleBoardOnly.classList.add('active');
    if (el.btnSideBoardOnly) el.btnSideBoardOnly.classList.add('active');
  }
  updateAiSpeedUi(state.aiMoveDelay, false);
  updateHintUi();
  updateBoardOnlyStatus();

  if (el.toggleAutoFlip) {
    el.toggleAutoFlip.checked = state.autoFlip;
    el.toggleAutoFlip.addEventListener('change', (e) => {
      state.autoFlip = e.target.checked;
      localStorage.setItem('chess_auto_flip', state.autoFlip ? 'true' : 'false');
      showToast(state.autoFlip ? '턴마다 판 180° 자동 회전 켜짐' : '판 자동 회전 꺼짐 (고정)');
    });
  }

  setupEventListeners();
  renderBoard();

  // Load lobby recent games on startup
  loadLobbyRecentGames();

  // Bind lobby "전체 보기" button
  if (el.btnLobbyOpenRecords) {
    el.btnLobbyOpenRecords.addEventListener('click', () => {
      if (el.modalRecords) {
        el.modalRecords.classList.add('active');
        loadLeaderboard();
        loadGameRecords();
      }
    });
  }

  // Connect WebSocket early to listen for lobby updates and live rooms
  connectWebSocket(() => {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'list_rooms' }));
    }
  });
}

window.addEventListener('DOMContentLoaded', init);
