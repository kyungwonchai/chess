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
  aiModel: localStorage.getItem('chess_ai_model') || 'minimax', // 'minimax' (Casual AI) or 'stockfish' (Stockfish 16)
  aiLevel: parseInt(localStorage.getItem('chess_ai_level') || '1', 10), // Default 1 for beginner-friendly start
  evalEnabled: true,
  selectedSquare: null,
  legalMovesForSelected: [],
  lastMove: null,
  hintMove: null,
  pendingPromotion: null,
  gameStatus: 'idle', // 'idle', 'playing', 'ended'
  aiThinking: false,

  // Hint control (-1: unlimited, 0: hidden, 1+: max N)
  maxHints: (() => {
    const v2 = localStorage.getItem('chess_max_hints_v2');
    if (v2 !== null) return parseInt(v2, 10);
    const old = localStorage.getItem('chess_max_hints');
    if (old !== null && old !== '0') return parseInt(old, 10);
    return -1; // Default to Unlimited (-1)
  })(),
  hintsUsed: 0,
  undosUsed: 0,
  gameStartTime: null,
  priorElapsedSeconds: 0,
  analyticsCache: null,
  selectedAnalyticsProfile: 'all',
  hintModel: localStorage.getItem('chess_hint_model') || 'stockfish', // Default: Stockfish 16 (젤리피쉬 최상모델)
  hintLevel: parseInt(localStorage.getItem('chess_hint_level') || '5', 10), // Default: Level 5 (최상위)
  hintAutoTts: localStorage.getItem('chess_hint_auto_tts') === 'true', // Voice read aloud toggle
  hintTacticalData: null,
  lastHintTtsText: null,

  // Visual Assist Line Guides & AI Animation
  showAttackLines: localStorage.getItem('chess_show_attack_lines') === 'true',
  showThreatLines: localStorage.getItem('chess_show_threat_lines') === 'true',
  showPreviewLines: localStorage.getItem('chess_show_preview_lines') !== 'false', // Default ON
  showLastMoveTrail: localStorage.getItem('chess_show_last_move_trail') !== 'false', // Default ON: Visible trail arrow
  aiMoveAnim: localStorage.getItem('chess_ai_move_anim') !== 'false', // Default ON: Slow smooth sliding animation
  isAnimating: false,
  clientIp: null,
  cachedSessionToResume: null,
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
  selectIntegratedTheme: document.getElementById('select-integrated-theme'),
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
  aiPlayerName: document.getElementById('ai-player-name'),
  aiModelPicker: document.getElementById('ai-model-picker'),
  aiColorPicker: document.getElementById('ai-color-picker'),
  aiLevelPicker: document.getElementById('ai-level-picker'),
  aiTimePicker: document.getElementById('ai-time-picker'),
  aiHintPicker: document.getElementById('ai-hint-picker'),
  btnStartAi: document.getElementById('btn-start-ai'),

  // Dynamic In-Game AI Model & Level Switcher
  sideAiModelBox: document.getElementById('ai-side-model-box'),
  sideAiModelPicker: document.getElementById('side-ai-model-picker'),
  sideAiLevelPicker: document.getElementById('side-ai-level-picker'),
  sideAiModelTag: document.getElementById('side-ai-model-tag'),

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
  svgLastMoveGroup: document.getElementById('svg-lastmove-group'),
  svgAttackGroup: document.getElementById('svg-attack-group'),
  svgThreatGroup: document.getElementById('svg-threat-group'),
  svgPreviewGroup: document.getElementById('svg-preview-group'),
  svgHintGroup: document.getElementById('svg-hint-group'),
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
  hintModelPicker: document.getElementById('hint-model-picker'),
  hintLevelPicker: document.getElementById('hint-level-picker'),
  hintResultCard: document.getElementById('hint-result-card'),
  hintMoveTag: document.getElementById('hint-move-tag'),
  hintTacticalBadge: document.getElementById('hint-tactical-badge'),
  hintDepthBadge: document.getElementById('hint-depth-badge'),
  hintExplanationText: document.getElementById('hint-explanation-text'),
  btnHintTts: document.getElementById('btn-hint-tts'),
  btnClockHint: document.getElementById('btn-clock-hint'),
  clockHintCount: document.getElementById('clock-hint-count'),
  btnOpponentClockHint: document.getElementById('btn-opponent-clock-hint'),
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
  gameoverAnalyticsBox: document.getElementById('gameover-analytics-box'),
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

  // Records, Leaderboard & AI Analytics Modal
  btnOpenRecords: document.getElementById('btn-open-records'),
  modalRecords: document.getElementById('modal-records'),
  btnCloseRecordsModal: document.getElementById('btn-close-records-modal'),
  tabBtnAnalytics: document.getElementById('tab-btn-analytics'),
  tabBtnLeaderboard: document.getElementById('tab-btn-leaderboard'),
  tabBtnGames: document.getElementById('tab-btn-games'),
  rtabAnalytics: document.getElementById('rtab-analytics'),
  rtabLeaderboard: document.getElementById('rtab-leaderboard'),
  rtabGames: document.getElementById('rtab-games'),
  modalAnalyticsTabs: document.getElementById('modal-analytics-tabs'),
  modalAnalyticsBody: document.getElementById('modal-analytics-body'),
  leaderboardTbody: document.getElementById('leaderboard-tbody'),
  gamesListContainer: document.getElementById('games-list-container'),

  // Lobby AI Analytics Dashboard
  lobbyAnalyticsSection: document.getElementById('lobby-analytics-section'),
  lobbyAnalyticsIpBadge: document.getElementById('lobby-analytics-ip-badge'),
  btnRefreshAnalytics: document.getElementById('btn-refresh-analytics'),
  btnOpenFullAnalytics: document.getElementById('btn-open-full-analytics'),
  lobbyAnalyticsTabs: document.getElementById('lobby-analytics-tabs'),
  lobbyAnalyticsBody: document.getElementById('lobby-analytics-body'),

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
  settingHintModel: document.getElementById('setting-hint-model'),
  settingHintLevel: document.getElementById('setting-hint-level'),
  settingHintTts: document.getElementById('setting-hint-tts'),
  settingAiModel: document.getElementById('setting-ai-model'),
  settingAiMoveAnim: document.getElementById('setting-ai-move-anim'),
  settingLastMoveTrail: document.getElementById('setting-last-move-trail'),
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

  // Resume Modal & Lobby Banner (Per-IP Session Persistence)
  modalResume: document.getElementById('modal-resume'),
  btnCloseResumeModal: document.getElementById('btn-close-resume-modal'),
  btnResumeGame: document.getElementById('btn-resume-game'),
  btnDiscardResume: document.getElementById('btn-discard-resume'),
  resumeGameInfo: document.getElementById('resume-game-info'),
  resumeIpTag: document.getElementById('resume-ip-tag'),
  lobbyResumeBanner: document.getElementById('lobby-resume-banner'),
  lobbyResumeTitle: document.getElementById('lobby-resume-title'),
  lobbyResumeDesc: document.getElementById('lobby-resume-desc'),
  btnLobbyResume: document.getElementById('btn-lobby-resume'),
  btnLobbyDiscard: document.getElementById('btn-lobby-discard'),

  // Best Move Tactical Explanation Popup Modal
  modalHintPopup: document.getElementById('modal-hint-popup'),
  btnCloseHintModal: document.getElementById('btn-close-hint-modal'),
  btnConfirmHintModal: document.getElementById('btn-confirm-hint-modal'),
  btnPopupHintTts: document.getElementById('btn-popup-hint-tts'),
  hintPopupEngineTag: document.getElementById('hint-popup-engine-tag'),
  hintPopupPieceIcon: document.getElementById('hint-popup-piece-icon'),
  hintPopupPieceTitle: document.getElementById('hint-popup-piece-title'),
  hintPopupMoveCoords: document.getElementById('hint-popup-move-coords'),
  hintPopupTacticalBadge: document.getElementById('hint-popup-tactical-badge'),
  hintPopupEvalScore: document.getElementById('hint-popup-eval-score'),
  hintPopupExplanation: document.getElementById('hint-popup-explanation'),

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
  // Raytracing completely disabled for eye comfort & clean performance
  state.isRaytrace = false;
  if (el.boardStage) {
    el.boardStage.classList.remove('raytrace-active');
  }
  localStorage.removeItem('chess_is_raytrace');
}

function toggleRaytraceMode() {
  applyRaytraceState();
}

// Curated Eye-Friendly Integrated Themes (Board + Pieces All-in-One)
const THEME_PRESETS = {
  'emerald-classic': { theme: 'theme-emerald', piece: 'classic', label: '🌿 클래식 에메랄드' },
  'mocha-mocha':     { theme: 'theme-mocha', piece: 'mocha', label: '☕ 카페 모카 & 초콜릿' },
  'wood-wood':       { theme: 'theme-wood', piece: 'wood', label: '🪵 클래식 내추럴 우드' },
  'slate-slate':     { theme: 'theme-slate', piece: 'slate', label: '⬛ 모던 다크 슬레이트' },
  'forest-forest':   { theme: 'theme-forest', piece: 'forest', label: '🍃 세이지 민트 & 포레스트' },
  'ocean-classic':   { theme: 'theme-ocean', piece: 'classic', label: '🌊 토너먼트 오션 블루' },
  'amber-amber':     { theme: 'theme-amber', piece: 'amber', label: '🍂 가을 앰버 & 웜 오크' },
  'marble-slate':    { theme: 'theme-marble', piece: 'slate', label: '🏛️ 카라라 대리석 & 네로' },
  'wine-wine':       { theme: 'theme-wine', piece: 'wine', label: '🍷 보르도 와인 & 메이플' },
  'nordic-nordic':   { theme: 'theme-nordic', piece: 'nordic', label: '❄️ 노르딕 프로스트 & 스틸' },
  'gold-gold':       { theme: 'theme-gold', piece: 'gold', label: '👑 로열 골드 & 흑단목' },
  'pearl-korean':    { theme: 'theme-pearl', piece: 'korean-pearl', label: '🎴 전통 자개 & 흑칠' }
};

function applyThemePreset(presetKey, notify = true) {
  const preset = THEME_PRESETS[presetKey] || THEME_PRESETS['emerald-classic'];
  applyTheme(preset.theme, false);
  setPieceStyle(preset.piece);
  if (el.selectIntegratedTheme) el.selectIntegratedTheme.value = presetKey;
  if (el.selectPieceStyle) el.selectPieceStyle.value = preset.piece;
  if (el.selectTheme) el.selectTheme.value = preset.theme;
  renderBoard();
  updateCapturedAndMaterial();
  localStorage.setItem('chess_integrated_preset', presetKey);
  if (notify) {
    showToast(`${preset.label} 테마가 적용되었습니다.`);
  }
}

// Safely apply board theme without clearing other body classes (e.g. in-game, board-only-mode)
function applyTheme(themeName, syncPreset = true) {
  const currentClasses = Array.from(document.body.classList).filter(c => !c.startsWith('theme-'));
  document.body.className = [...currentClasses, themeName].join(' ');
  localStorage.setItem('chess_theme', themeName);
  if (el.selectTheme && el.selectTheme.value !== themeName) {
    el.selectTheme.value = themeName;
  }
  if (syncPreset && el.selectIntegratedTheme) {
    for (const [key, p] of Object.entries(THEME_PRESETS)) {
      if (p.theme === themeName && p.piece === currentPieceStyle) {
        el.selectIntegratedTheme.value = key;
        break;
      }
    }
  }
}

// Enable smooth horizontal drag and swipe on header for mobile & folded screens
function setupHeaderDragScroll() {
  const header = document.querySelector('.app-header');
  if (!header) return;

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.closest('select') || e.target.closest('button')) {
      return;
    }
    isDown = true;
    header.classList.add('dragging');
    startX = e.pageX - header.offsetLeft;
    scrollLeft = header.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (isDown) {
      isDown = false;
      header.classList.remove('dragging');
    }
  });

  header.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const x = e.pageX - header.offsetLeft;
    const walk = (x - startX) * 1.5;
    header.scrollLeft = scrollLeft - walk;
  });
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

      // Last move highlight (distinctive previous vs current position)
      if (state.lastMove) {
        if (state.lastMove.from === squareName) {
          sq.classList.add('last-move', 'last-move-from');
        }
        if (state.lastMove.to === squareName) {
          sq.classList.add('last-move', 'last-move-to');
        }
      }

      // Selected square highlight
      if (state.selectedSquare === squareName) {
        sq.classList.add('selected');
      }

      // Hint highlight
      if (state.hintMove) {
        if (state.hintMove.from === squareName) {
          sq.classList.add('hint-from');
        }
        if (state.hintMove.to === squareName) {
          sq.classList.add('hint-to');
          if (state.hintTacticalData) {
            if (state.hintTacticalData.type === 'attack') sq.classList.add('hint-target-attack');
            else if (state.hintTacticalData.type === 'defense') sq.classList.add('hint-target-defense');
            else sq.classList.add('hint-target-strategy');
          }
        }
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
  if (el.svgHintGroup) el.svgHintGroup.innerHTML = '';
  if (el.svgLastMoveGroup) el.svgLastMoveGroup.innerHTML = '';
  if (!el.svgAttackGroup || !el.svgThreatGroup) return;

  el.svgAttackGroup.innerHTML = '';
  el.svgThreatGroup.innerHTML = '';

  if (state.gameStatus !== 'playing') return;

  const isFlipped = state.boardFlipped;
  const currentTurn = state.game.turn();
  const playerColor = state.mode === 'ai' || state.mode === 'wifi' ? state.playerColor : currentTurn;

  // 0-A. Last Move Trail Arrow (Vibrant Cyan Directional Path Arrow)
  if (el.svgLastMoveGroup && state.showLastMoveTrail && state.lastMove) {
    const pFrom = getSquareCenterPercent(state.lastMove.from, isFlipped);
    const pTo = getSquareCenterPercent(state.lastMove.to, isFlipped);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', pFrom.x);
    line.setAttribute('y1', pFrom.y);
    line.setAttribute('x2', pTo.x);
    line.setAttribute('y2', pTo.y);
    line.setAttribute('class', 'last-move-trail-line');
    line.setAttribute('marker-end', 'url(#arrow-last-move)');
    el.svgLastMoveGroup.appendChild(line);
  }

  // 0-B. Best Move Hint Line (Stockfish Gold / Amber Arrow)
  if (el.svgHintGroup && state.hintMove) {
    const pFrom = getSquareCenterPercent(state.hintMove.from, isFlipped);
    const pTo = getSquareCenterPercent(state.hintMove.to, isFlipped);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', pFrom.x);
    line.setAttribute('y1', pFrom.y);
    line.setAttribute('x2', pTo.x);
    line.setAttribute('y2', pTo.y);
    line.setAttribute('class', 'hint-line');
    line.setAttribute('marker-end', 'url(#arrow-hint)');
    el.svgHintGroup.appendChild(line);
  }

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

  if (state.maxHints === 0) {
    el.btnAiHint.style.display = 'none';
    if (el.btnBotHint) el.btnBotHint.style.display = 'none';
    return;
  }

  el.btnAiHint.style.display = 'flex';
  if (el.btnBotHint) el.btnBotHint.style.display = 'inline-flex';

  const isUnlimited = state.maxHints < 0;
  if (isUnlimited) {
    if (el.lblAiHint) {
      el.lblAiHint.innerText = '최선수 힌트 (무제한 ♾️)';
    }
    el.btnAiHint.style.opacity = '1';
    el.btnAiHint.style.pointerEvents = 'auto';
    el.btnAiHint.title = '세계 최강 Stockfish 16의 최선수 힌트를 무제한으로 사용합니다.';
    if (el.btnBotHint) {
      el.btnBotHint.style.opacity = '1';
      el.btnBotHint.style.pointerEvents = 'auto';
      el.btnBotHint.title = '최선수 힌트 (무제한 ♾️)';
    }
  } else {
    const remaining = Math.max(0, state.maxHints - state.hintsUsed);
    if (el.lblAiHint) {
      el.lblAiHint.innerText = `최선수 힌트 (${remaining}/${state.maxHints})`;
    }

    if (remaining <= 0) {
      el.btnAiHint.style.opacity = '0.5';
      el.btnAiHint.style.pointerEvents = 'none';
      el.btnAiHint.title = `최선수 힌트 횟수를 모두 사용했습니다. (최대 ${state.maxHints}회)`;
      if (el.btnBotHint) {
        el.btnBotHint.style.opacity = '0.5';
        el.btnBotHint.style.pointerEvents = 'none';
      }
    } else {
      el.btnAiHint.style.opacity = '1';
      el.btnAiHint.style.pointerEvents = 'auto';
      el.btnAiHint.title = `현재 국면에서 가장 좋은 최선수를 추천받습니다. (남은 횟수: ${remaining}회)`;
      if (el.btnBotHint) {
        el.btnBotHint.style.opacity = '1';
        el.btnBotHint.style.pointerEvents = 'auto';
      }
    }
  }

  // Update Clock-adjacent Best Move buttons
  if (el.btnClockHint) {
    if (state.maxHints === 0) {
      el.btnClockHint.style.display = 'none';
    } else {
      el.btnClockHint.style.display = 'inline-flex';
      if (isUnlimited) {
        if (el.clockHintCount) el.clockHintCount.style.display = 'none';
        el.btnClockHint.style.opacity = '1';
        el.btnClockHint.style.pointerEvents = 'auto';
        el.btnClockHint.title = '세계 최강 Stockfish 16 최선수 힌트 (무제한 ♾️)';
      } else {
        const remaining = Math.max(0, state.maxHints - state.hintsUsed);
        if (el.clockHintCount) {
          el.clockHintCount.style.display = 'inline-block';
          el.clockHintCount.innerText = String(remaining);
        }
        if (remaining <= 0) {
          el.btnClockHint.style.opacity = '0.5';
          el.btnClockHint.style.pointerEvents = 'none';
          el.btnClockHint.title = `최선수 힌트 횟수를 모두 소진했습니다. (${state.maxHints}회)`;
        } else {
          el.btnClockHint.style.opacity = '1';
          el.btnClockHint.style.pointerEvents = 'auto';
          el.btnClockHint.title = `최선수 힌트 보기 (남은 횟수: ${remaining}회)`;
        }
      }
    }
  }

  if (el.btnOpponentClockHint) {
    if (state.maxHints === 0 || state.mode !== 'local') {
      el.btnOpponentClockHint.style.display = 'none';
    } else {
      el.btnOpponentClockHint.style.display = 'inline-flex';
    }
  }
}

// Instant square selection & move handler
function handleSquareClick(e, square) {
  if (state.gameStatus !== 'playing' || state.aiThinking || state.isAnimating) return;

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
    clearHintUi();
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
    clearHintUi();
    return;
  }

  // Local / AI Game
  try {
    const move = state.game.move(moveObj);
    if (!move) return;

    state.lastMove = move;
    clearHintUi();

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
    saveActiveSessionState();

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

  const useStockfish = (state.aiModel === 'stockfish') && isStockfishReady;

  el.gameStatusText.innerText = useStockfish
    ? `🚀 Stockfish 16이 수를 계산 중입니다... (최대 ${secDisplay}초)`
    : `🧸 캐주얼 AI가 수를 계산 중입니다... (레벨 ${state.aiLevel})`;

  // 1. Stockfish Model if explicitly chosen
  if (useStockfish) {
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
      console.warn('Stockfish move failed, falling back to casual engine:', e);
    }
  }

  // 2. Casual / Built-in Minimax engine (Player-friendly easy model)
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

// Smooth piece sliding animation for AI moves (gives player clear visual feedback)
function animatePieceMove(fromSquare, toSquare, pieceKey, onComplete) {
  if (!state.aiMoveAnim || !el.chessboard || !el.chessboardWrapper) {
    onComplete();
    return;
  }

  const fromEl = el.chessboard.querySelector(`[data-square="${fromSquare}"]`);
  const toEl = el.chessboard.querySelector(`[data-square="${toSquare}"]`);
  if (!fromEl || !toEl) {
    onComplete();
    return;
  }

  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();
  const boardRect = el.chessboardWrapper.getBoundingClientRect();

  // Create floating gliding piece container
  const floater = document.createElement('div');
  floater.className = 'animated-gliding-piece';
  floater.style.width = `${fromRect.width}px`;
  floater.style.height = `${fromRect.height}px`;
  floater.style.left = `${fromRect.left - boardRect.left}px`;
  floater.style.top = `${fromRect.top - boardRect.top}px`;
  floater.innerHTML = getPieceSvg(pieceKey);

  el.chessboardWrapper.appendChild(floater);

  // Temporarily hide original piece during slide
  const originalPiece = fromEl.querySelector('.chess-piece-container');
  if (originalPiece) originalPiece.style.opacity = '0';

  // Force reflow
  void floater.offsetWidth;

  const dx = toRect.left - fromRect.left;
  const dy = toRect.top - fromRect.top;

  floater.style.transition = 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)';
  floater.style.transform = `translate(${dx}px, ${dy}px) scale(1.12)`;

  state.isAnimating = true;

  setTimeout(() => {
    if (floater.parentNode) floater.parentNode.removeChild(floater);
    state.isAnimating = false;
    onComplete();
  }, 470);
}

function handleAIMoveResult(aiMove) {
  if (!aiMove || state.gameStatus !== 'playing') return;

  state.hintMove = null;

  const fromSq = aiMove.from;
  const toSq = aiMove.to;
  const pieceObj = state.game.get(fromSq);
  const pieceKey = pieceObj ? `${pieceObj.color}${pieceObj.type.toUpperCase()}` : null;

  const finishAIMove = () => {
    const move = state.game.move(aiMove);
    if (!move) return;

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
    saveActiveSessionState();

    if (state.game.isGameOver()) {
      handleGameOver();
    }
  };

  if (state.aiMoveAnim && pieceKey) {
    animatePieceMove(fromSq, toSq, pieceKey, finishAIMove);
  } else {
    finishAIMove();
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
function formatDurationKo(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  if (s < 60) return `${s}초`;
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  if (mins < 60) return rem > 0 ? `${mins}분 ${rem}초` : `${mins}분`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}시간 ${remMins}분`;
}

function renderGameoverAnalyticsBox(analytics) {
  if (!el.gameoverAnalyticsBox) return;
  if (!analytics) {
    el.gameoverAnalyticsBox.style.display = 'none';
    return;
  }

  const helperText = analytics.totalHelpersUsed === 0
    ? '✨ 무훈수 자력 완주 (+90점)'
    : `💡힌트 ${analytics.hintsUsed}회 · ↩️무르기 ${analytics.undosUsed}회`;

  const topMistake = (analytics.keyMistakes && analytics.keyMistakes.length > 0)
    ? analytics.keyMistakes[0].reason
    : `블런더 없이 안정적인 수읽기(정확도 ${analytics.accuracy}%)를 보여주셨습니다!`;

  el.gameoverAnalyticsBox.innerHTML = `
    <div class="goa-header">
      <span style="font-size:0.82rem; font-weight:800; color:#93c5fd;">📊 이번 대국 AI 분석 리포트 (${analytics.humanName})</span>
      <span class="goa-score-badge">🎯 실력점수 ${analytics.skillScore}점</span>
    </div>
    <div class="goa-metrics-row">
      <div class="goa-metric-pill">수 정확도<strong>${analytics.accuracy}%</strong></div>
      <div class="goa-metric-pill">대국 소요시간<strong>${formatDurationKo(analytics.durationSeconds)}</strong></div>
      <div class="goa-metric-pill">도우미 활용<strong>${helperText}</strong></div>
    </div>
    <div class="goa-mistake-tip">
      <strong>🔍 복기 포인트:</strong> ${topMistake}
    </div>
  `;
  el.gameoverAnalyticsBox.style.display = 'flex';
}

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
  if (el.gameoverAnalyticsBox) el.gameoverAnalyticsBox.style.display = 'none';
  el.modalGameOver.classList.add('active');

  // Auto-save AI and local games to server
  if (state.mode === 'ai' || state.mode === 'local') {
    saveLocalGameToServer(winnerColor, reason, totalMoves);
  }

  clearActiveSessionState();
}

async function saveLocalGameToServer(winnerColor, endReason, totalMoves) {
  try {
    const history = state.game.history({ verbose: true });
    if (!history || history.length === 0) return;

    const apiPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';

    const elapsedNow = state.gameStartTime ? Math.round((Date.now() - state.gameStartTime) / 1000) : 0;
    const durationSeconds = Math.max(5, (state.priorElapsedSeconds || 0) + elapsedNow);

    let whiteName, blackName;
    const aiLabel = state.aiModel === 'stockfish' ? `Stockfish Lv.${state.aiLevel}` : `AI Lv.${state.aiLevel}`;
    if (state.mode === 'ai') {
      const myName = (state.playerName || '플레이어 1').trim();
      whiteName = state.playerColor === 'w' ? myName : aiLabel;
      blackName = state.playerColor === 'b' ? myName : aiLabel;
    } else {
      whiteName = el.userName.innerText.replace(' (백)', '').replace(' (White)', '') || '플레이어 1';
      blackName = el.opponentName.innerText.replace(' (흑)', '').replace(' (Black)', '') || '플레이어 2';
    }

    let winnerName = '무승부';
    if (winnerColor === 'w') winnerName = whiteName;
    else if (winnerColor === 'b') winnerName = blackName;

    const timeMinutes = state.timeControl?.initial ? Math.round(state.timeControl.initial / 60) : 0;
    const modeTag = state.mode === 'ai' ? aiLabel : '로컬 2인';

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
      durationSeconds,
      hintsUsed: state.hintsUsed || 0,
      undosUsed: state.undosUsed || 0,
      aiModel: state.aiModel || 'minimax',
      aiLevel: state.aiLevel || 1,
      playerColor: state.playerColor || 'w',
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

    const res = await fetch(`${apiPrefix}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameRecord)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.analytics) {
        renderGameoverAnalyticsBox(data.analytics);
      }
      loadAnalyticsDashboard(state.selectedAnalyticsProfile);
      loadLobbyRecentGames();
    }
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
    state.hintsUsed = 0;
    state.undosUsed = 0;
    state.priorElapsedSeconds = 0;
    state.gameStartTime = Date.now();
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
    state.hintsUsed = 0;
    state.undosUsed = 0;
    state.priorElapsedSeconds = 0;
    state.gameStartTime = Date.now();
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
      if (!state.gameStartTime) state.gameStartTime = Date.now();
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
        state.hintsUsed = 0;
        state.undosUsed = 0;
        state.priorElapsedSeconds = 0;
        state.gameStartTime = Date.now();
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

    if (msg.status === 'playing') {
      saveActiveSessionState();
    }

    // Handle Draw Offer: only show modal to opponent (not spectator or offerer)
    if (msg.drawOffer) {
      if (state.playerColor === msg.drawOffer) {
        state.drawOfferPending = true;
        if (el.btnOfferDraw) {
          el.btnOfferDraw.innerText = '⏳ 무승부 응답 대기 중...';
          el.btnOfferDraw.disabled = true;
          el.btnOfferDraw.style.opacity = '0.6';
          el.btnOfferDraw.style.pointerEvents = 'none';
        }
      } else if (state.playerColor === 'w' || state.playerColor === 'b') {
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
      clearActiveSessionState();
      if (el.modalDrawOffer) el.modalDrawOffer.classList.remove('active');
      if (prevStatus !== 'ended') {
        const isWin = (msg.winner === state.playerColor);
        audio.playGameEnd(isWin);
        el.gameoverIcon.innerText = isWin ? '🏆' : (msg.winner === 'draw' ? '🤝' : '⚔️');
        el.gameoverTitle.innerText = msg.winner === 'draw' ? '무승부' : `${msg.winner === 'w' ? '백' : '흑'} 승리!`;
        el.gameoverReason.innerText = msg.endReason || '대국이 종료되었습니다.';
        if (el.gameoverAnalyticsBox) el.gameoverAnalyticsBox.style.display = 'none';
        el.modalGameOver.classList.add('active');

        if (el.btnModalRematch) {
          el.btnModalRematch.innerText = '🔄 재대국 요청';
          el.btnModalRematch.disabled = false;
        }

        loadAnalyticsDashboard(state.selectedAnalyticsProfile);
        loadLeaderboard();
        loadGameRecords();
      }

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
    document.body.classList.remove('in-game');
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
    // Refresh lobby analytics & recent games panel
    loadAnalyticsDashboard(state.selectedAnalyticsProfile);
    loadLobbyRecentGames();
  } else if (viewName === 'game') {
    document.body.classList.add('in-game');
    el.viewLobby.classList.remove('active');
    el.viewGame.classList.add('active');
    if (el.onlineRoomTopbar) {
      el.onlineRoomTopbar.style.display = (state.mode === 'wifi') ? 'flex' : 'none';
    }
    updateBoardOnlyStatus();
    renderBoard();
  }
}

async function loadLobbyRecentGames() {
  if (!el.lobbyRecentGames) return;
  try {
    const apiPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';
    const res = await fetch(`${apiPrefix}/api/games`);
    const data = await res.json();
    const games = (data.games || []).slice(0, 6);

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
      if (roomId.startsWith('AI') || roomId.startsWith('Stockfish')) modeTag = '🤖';
      else if (roomId === '로컬 2인') modeTag = '👥';

      const skillTag = g.analytics ? `🎯${g.analytics.skillScore}점` : '';

      return `
        <div class="lobby-recent-item" data-id="${g.id}">
          <span class="lri-mode">${modeTag}</span>
          <span class="lri-vs">${g.white} vs ${g.black}</span>
          <span class="lri-result">${resultEmoji} · ${g.totalMoves}수 ${skillTag ? '· ' + skillTag : ''}</span>
          <span class="lri-date">${dateStr}</span>
          <button class="btn-mini lri-replay-btn" data-id="${g.id}">🔍</button>
        </div>
      `;
    }).join('');

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

function updateAiOpponentBadge() {
  const isStockfish = state.aiModel === 'stockfish';
  if (el.sideAiModelTag) {
    el.sideAiModelTag.innerText = isStockfish ? '🚀 Stockfish 16' : '🧸 캐주얼 AI';
    el.sideAiModelTag.style.background = isStockfish ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)';
    el.sideAiModelTag.style.color = isStockfish ? '#3b82f6' : '#10b981';
  }
  if (state.mode === 'ai') {
    if (el.opponentName) {
      el.opponentName.innerText = isStockfish ? 'Stockfish 16' : '캐주얼 체스 AI';
    }
    if (el.opponentTag) {
      el.opponentTag.innerText = `레벨 ${state.aiLevel}`;
    }
    if (el.opponentAvatar) {
      el.opponentAvatar.innerText = isStockfish ? '🚀' : '🧸';
    }
  }
}

// ================= PER-IP ACTIVE SESSION PERSISTENCE (ALL 3 MODES) =================
let sessionSaveTimeout = null;

async function saveActiveSessionState() {
  if (state.gameStatus !== 'playing') return;

  const elapsedNow = state.gameStartTime ? Math.round((Date.now() - state.gameStartTime) / 1000) : 0;
  const totalElapsedSeconds = (state.priorElapsedSeconds || 0) + elapsedNow;

  const sessionData = {
    mode: state.mode,
    fen: state.game.fen(),
    history: state.game.history({ verbose: true }),
    lastMove: state.lastMove ? {
      from: state.lastMove.from,
      to: state.lastMove.to,
      piece: state.lastMove.piece,
      color: state.lastMove.color,
      san: state.lastMove.san
    } : null,
    playerColor: state.playerColor,
    playerName: state.playerName,
    boardFlipped: state.boardFlipped,
    aiLevel: state.aiLevel,
    aiModel: state.aiModel,
    timeControl: state.timeControl,
    timers: state.timers,
    activeTurn: state.activeTurn,
    gameStatus: state.gameStatus,
    maxHints: state.maxHints,
    hintsUsed: state.hintsUsed || 0,
    undosUsed: state.undosUsed || 0,
    elapsedSeconds: totalElapsedSeconds,
    roomId: state.roomId,
    playerId: state.playerId
  };

  try {
    localStorage.setItem('chess_active_session_backup', JSON.stringify(sessionData));
  } catch (e) {}

  if (sessionSaveTimeout) clearTimeout(sessionSaveTimeout);
  sessionSaveTimeout = setTimeout(async () => {
    try {
      const apiPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';
      await fetch(`${apiPrefix}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
    } catch (err) {
      console.warn('Network sync paused, session safely preserved in offline cache:', err);
    }
  }, 250);
}

async function clearActiveSessionState() {
  try {
    localStorage.removeItem('chess_active_session_backup');
  } catch (e) {}

  if (sessionSaveTimeout) clearTimeout(sessionSaveTimeout);
  state.cachedSessionToResume = null;

  if (el.lobbyResumeBanner) {
    el.lobbyResumeBanner.style.display = 'none';
  }
  if (el.modalResume) {
    el.modalResume.classList.remove('active');
  }

  try {
    const apiPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';
    await fetch(`${apiPrefix}/api/session`, { method: 'DELETE' });
  } catch (err) {}
}

async function checkActiveSession() {
  let session = null;
  let clientIp = state.clientIp || '127.0.0.1';

  try {
    const apiPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';
    const res = await fetch(`${apiPrefix}/api/session`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        state.clientIp = data.ip;
        clientIp = data.ip;
      }
      if (data && data.session && data.session.gameStatus === 'playing') {
        session = data.session;
      }
    }
  } catch (err) {
    console.warn('Server offline/LAN disconnected, checking offline cache:', err);
  }

  if (!session) {
    try {
      const raw = localStorage.getItem('chess_active_session_backup');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.gameStatus === 'playing') {
          session = parsed;
        }
      }
    } catch (e) {}
  }

  if (session && session.gameStatus === 'playing') {
    promptResumeSession(session, clientIp);
  }
}

function promptResumeSession(session, clientIp) {
  state.cachedSessionToResume = session;

  const modeLabel = session.mode === 'ai' ? '🤖 AI 트레이닝' :
                    session.mode === 'local' ? '👥 로컬 2인' : '🌐 온라인 Wi-Fi';
  const movesCount = (session.history && session.history.length) || 0;
  const colorText = session.playerColor === 'w' ? '백' : session.playerColor === 'b' ? '흑' : '관전';
  const infoText = `[${modeLabel} · ${movesCount}수 진행 중 · ${colorText} 진영]`;

  if (el.resumeGameInfo) {
    el.resumeGameInfo.innerText = infoText;
  }
  if (el.resumeIpTag) {
    el.resumeIpTag.innerText = `접속 IP: ${clientIp || '127.0.0.1'}`;
  }
  if (el.lobbyResumeTitle) {
    el.lobbyResumeTitle.innerText = `진행 중이던 ${modeLabel} 대국이 있습니다!`;
  }
  if (el.lobbyResumeDesc) {
    el.lobbyResumeDesc.innerText = `${movesCount}수 진행 중 · 접속 IP(${clientIp || '127.0.0.1'}) 전용 보관`;
  }

  if (el.lobbyResumeBanner) {
    el.lobbyResumeBanner.style.display = 'flex';
  }
}

function resumeActiveSession(session) {
  if (!session || !session.fen) return;

  if (el.modalResume) el.modalResume.classList.remove('active');
  if (el.lobbyResumeBanner) el.lobbyResumeBanner.style.display = 'none';

  state.mode = session.mode || 'ai';
  state.game = new Chess();
  try {
    state.game.load(session.fen);
  } catch (e) {
    console.error('Failed to load session FEN:', e);
    showToast('대국 데이터 복원 실패');
    return;
  }

  state.moveHistory = session.history || [];
  state.lastMove = session.lastMove || null;
  state.playerColor = session.playerColor || 'w';
  if (session.playerName) {
    state.playerName = session.playerName;
  }
  state.boardFlipped = !!session.boardFlipped;
  state.aiLevel = session.aiLevel || 1;
  state.aiModel = session.aiModel || 'minimax';
  state.timeControl = session.timeControl || { initial: 600, increment: 0 };
  state.timers = session.timers || { w: 600, b: 600 };
  state.activeTurn = state.game.turn();
  state.gameStatus = 'playing';
  state.aiThinking = false;
  state.maxHints = session.maxHints !== undefined ? session.maxHints : -1;
  state.hintsUsed = session.hintsUsed || 0;
  state.undosUsed = session.undosUsed || 0;
  state.priorElapsedSeconds = session.elapsedSeconds || 0;
  state.gameStartTime = Date.now();

  if (session.mode === 'ai') {
    if (el.sideAiModelBox) el.sideAiModelBox.style.display = 'block';
    if (el.sideAiModelPicker) el.sideAiModelPicker.value = state.aiModel;
    if (el.sideAiLevelPicker) el.sideAiLevelPicker.value = String(state.aiLevel);
    updateAiOpponentBadge();
    el.userName.innerText = state.playerName || '플레이어 1';
    el.userTag.innerText = state.playerColor === 'w' ? '백' : '흑';
    el.userAvatar.innerText = '👤';
  } else if (session.mode === 'local') {
    if (el.sideAiModelBox) el.sideAiModelBox.style.display = 'none';
    el.userName.innerText = '플레이어 1 (백)';
    el.opponentName.innerText = '플레이어 2 (흑)';
    el.userAvatar.innerText = '👥';
    el.opponentAvatar.innerText = '👥';
  } else if (session.mode === 'wifi') {
    if (el.sideAiModelBox) el.sideAiModelBox.style.display = 'none';
    state.roomId = session.roomId;
    if (session.roomId) {
      connectWebSocket(() => {
        state.ws.send(JSON.stringify({
          type: 'join_room',
          roomId: session.roomId,
          playerId: state.playerId,
          playerName: state.playerName
        }));
      });
    }
  }

  switchView('game');
  updateHintUi();
  renderBoard();
  triggerAsyncEvaluation();

  if (state.mode === 'ai' || state.mode === 'local') {
    startLocalClocks();
    if (state.mode === 'ai' && state.activeTurn !== state.playerColor) {
      setTimeout(triggerAIMove, 600);
    }
  }

  showToast('🎉 진행 중이던 대국을 성공적으로 복원했습니다!');
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

  if (el.aiPlayerName) {
    const customName = el.aiPlayerName.value.trim() || '플레이어 1';
    state.playerName = customName;
    localStorage.setItem('chess_player_name', customName);
    if (el.createPlayerName) el.createPlayerName.value = customName;
  }

  const activeColorBtn = el.aiColorPicker.querySelector('.btn-segment.active');
  let chosenColor = activeColorBtn ? activeColorBtn.dataset.color : 'w';
  if (chosenColor === 'random') chosenColor = Math.random() < 0.5 ? 'w' : 'b';

  state.playerColor = chosenColor;
  state.boardFlipped = (chosenColor === 'b');
  state.aiLevel = parseInt(el.aiLevelPicker.value, 10);
  if (el.aiModelPicker) {
    state.aiModel = el.aiModelPicker.value;
  }

  const timeMinutes = parseInt(el.aiTimePicker.value, 10);
  state.timeControl = { initial: timeMinutes * 60, increment: 0 };

  if (el.aiHintPicker) {
    state.maxHints = parseInt(el.aiHintPicker.value, 10);
  }
  state.hintsUsed = 0;
  state.undosUsed = 0;
  state.priorElapsedSeconds = 0;
  state.gameStartTime = Date.now();

  if (el.sideAiModelBox) el.sideAiModelBox.style.display = 'block';
  if (el.sideAiModelPicker) el.sideAiModelPicker.value = state.aiModel;
  if (el.sideAiLevelPicker) el.sideAiLevelPicker.value = String(state.aiLevel);
  updateAiOpponentBadge();

  el.userName.innerText = state.playerName || '플레이어 1';
  el.userTag.innerText = chosenColor === 'w' ? '백' : '흑';
  el.userAvatar.innerText = '👤';
  el.btnOfferDraw.style.display = 'none';

  switchView('game');
  updateHintUi();
  startLocalClocks();
  triggerAsyncEvaluation();
  saveActiveSessionState();

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
  state.undosUsed = 0;
  state.priorElapsedSeconds = 0;
  state.gameStartTime = Date.now();

  const timeMinutes = parseInt(el.localTimePicker.value, 10);
  state.timeControl = { initial: timeMinutes * 60, increment: 0 };

  if (el.sideAiModelBox) el.sideAiModelBox.style.display = 'none';
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
  saveActiveSessionState();
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

// ================= FAMILY & PER-IP AI LEARNING & WEAKNESS ANALYTICS =================
function renderAnalyticsProfileHtml(p, isModal = false) {
  if (!p || p.totalGames === 0) {
    return `<div class="room-empty-state">아직 분석할 대국 데이터가 없습니다. AI 대국이나 와이파이 대국을 진행하면 자동으로 실력과 약점이 기록됩니다!</div>`;
  }

  const openingWarn = p.phaseWeaknessPct.opening >= p.phaseWeaknessPct.middlegame && p.phaseWeaknessPct.opening >= p.phaseWeaknessPct.endgame && p.phaseMistakes.opening > 0;
  const middleWarn = !openingWarn && p.phaseWeaknessPct.middlegame >= p.phaseWeaknessPct.endgame && p.phaseMistakes.middlegame > 0;
  const endWarn = !openingWarn && !middleWarn && p.phaseMistakes.endgame > 0;

  const diagHtml = (p.diagnosisList || []).map(d => `
    <div class="coach-diag-item">
      <div class="cdi-icon">${d.icon}</div>
      <div class="cdi-body">
        <div class="cdi-title">${d.title}</div>
        <div class="cdi-desc">${d.desc}</div>
      </div>
    </div>
  `).join('');

  const maxTrendScore = Math.max(1200, ...((p.skillTrend || []).map(t => t.skillScore || 750)));
  const trendBarsHtml = (p.skillTrend || []).map(t => {
    const heightPct = Math.max(16, Math.min(100, Math.round(((t.skillScore || 700) / maxTrendScore) * 100)));
    const pillarClass = t.outcome === 'win' ? 'trend-pillar-win' : t.outcome === 'draw' ? 'trend-pillar-draw' : 'trend-pillar-loss';
    const outcomeKo = t.outcome === 'win' ? '승' : t.outcome === 'draw' ? '무' : '패';
    return `
      <div class="trend-bar-col" data-game-id="${t.id}" title="${t.opponent}전 (${t.moves}수 ${outcomeKo}) · 실력점수 ${t.skillScore}점 · 정확도 ${t.accuracy}% (클릭 시 복기)">
        <span class="trend-bar-val">${t.skillScore}</span>
        <div class="trend-bar-pillar ${pillarClass}" style="height: ${heightPct}%;"></div>
        <span class="trend-bar-label">${t.moves}수·${outcomeKo}</span>
      </div>
    `;
  }).join('');

  const oppChipsHtml = (p.opponentsList || []).slice(0, 6).map(o => `
    <span class="lost-piece-chip">🤖 <strong>${o.opponent}</strong>: ${o.games}전 (${o.wins}승 ${o.draws}무 ${o.losses}패 · 평균 ${o.avgMoves}수)</span>
  `).join('');

  return `
    <!-- 4 KPI Cards -->
    <div class="analytics-kpi-grid">
      <div class="analytics-kpi-card kpi-highlight">
        <div class="kpi-top-row">
          <span>🎯 종합 체스 실력점수</span>
          <span>최고 ${p.bestSkillScore}점</span>
        </div>
        <div class="kpi-main-value">
          <span>${p.skillRating}점</span>
          <span class="kpi-tier-pill" style="color:${p.tierColor}; border:1px solid ${p.tierColor}66;">${p.tierBadge}</span>
        </div>
        <div class="kpi-sub-meta">평균 수 정확도 <strong>${p.avgAccuracy}%</strong> · 우상단 도우미/난이도 반영</div>
      </div>

      <div class="analytics-kpi-card">
        <div class="kpi-top-row">
          <span>⏱️ 총 누적 학습·대국시간</span>
          <span>평균 ${formatDurationKo(p.avgDurationSeconds)}/판</span>
        </div>
        <div class="kpi-main-value">
          <span>${formatDurationKo(p.totalDurationSeconds)}</span>
        </div>
        <div class="kpi-sub-meta">총 <strong>${p.totalGames}판</strong> 완주 (${p.wins}승 ${p.draws}무 ${p.losses}패 · 승률 <strong>${p.winRate}%</strong>)</div>
      </div>

      <div class="analytics-kpi-card">
        <div class="kpi-top-row">
          <span>♟️ 대국 수(Moves) 지구력</span>
          <span>누적 ${p.totalMoves}수</span>
        </div>
        <div class="kpi-main-value">
          <span>평균 ${p.avgMoves}수</span>
          <span class="kpi-tier-pill" style="color:#38bdf8;">최고 ${p.maxMoves}수</span>
        </div>
        <div class="kpi-sub-meta">최장 대국 상대: <strong>${p.maxMovesOpponent}</strong></div>
      </div>

      <div class="analytics-kpi-card">
        <div class="kpi-top-row">
          <span>💡 최선수 힌트 & 무르기 활용</span>
          <span>무훈수 ${p.cleanPlayRate}%</span>
        </div>
        <div class="kpi-main-value">
          <span>힌트 ${p.totalHintsUsed}회</span>
          <span class="kpi-tier-pill" style="color:#fbbf24;">무르기 ${p.totalUndosUsed}회</span>
        </div>
        <div class="kpi-sub-meta">판당 평균 힌트 <strong>${p.avgHintsPerGame}회</strong> · 자력 완주 <strong>${p.cleanGamesCount}판</strong></div>
      </div>
    </div>

    <!-- 2-Column Weakness & AI Coach Prescription -->
    <div class="analytics-main-grid">
      <!-- Left: Phase Weakness & Lost Pieces -->
      <div class="analytics-panel-box">
        <h4 class="apb-title">
          <span>📉 국면별 실수 분포 & 취약 기물 분석</span>
          <small>집중 보완: ${p.weakestPhase}</small>
        </h4>

        <div class="phase-weakness-list">
          <div class="phase-bar-item">
            <div class="phase-bar-label">
              <span>🌱 초반 오프닝 전개 (1~10수)</span>
              <span>실수 ${p.phaseMistakes.opening}회 (${p.phaseWeaknessPct.opening}%)</span>
            </div>
            <div class="phase-bar-track">
              <div class="phase-bar-fill phase-fill-opening ${openingWarn ? 'weakest-alert' : ''}" style="width: ${Math.max(6, p.phaseWeaknessPct.opening)}%;"></div>
            </div>
          </div>

          <div class="phase-bar-item">
            <div class="phase-bar-label">
              <span>⚔️ 중반 전술·수읽기 교전 (11~25수)</span>
              <span>실수 ${p.phaseMistakes.middlegame}회 (${p.phaseWeaknessPct.middlegame}%)</span>
            </div>
            <div class="phase-bar-track">
              <div class="phase-bar-fill phase-fill-middlegame ${middleWarn ? 'weakest-alert' : ''}" style="width: ${Math.max(6, p.phaseWeaknessPct.middlegame)}%;"></div>
            </div>
          </div>

          <div class="phase-bar-item">
            <div class="phase-bar-label">
              <span>🏁 종반 엔드게임 마무리 (26수 이후)</span>
              <span>실수 ${p.phaseMistakes.endgame}회 (${p.phaseWeaknessPct.endgame}%)</span>
            </div>
            <div class="phase-bar-track">
              <div class="phase-bar-fill phase-fill-endgame ${endWarn ? 'weakest-alert' : ''}" style="width: ${Math.max(6, p.phaseWeaknessPct.endgame)}%;"></div>
            </div>
          </div>
        </div>

        <div class="lost-pieces-row">
          <span class="lost-piece-chip danger">⚠️ 치명적 실수(블런더): ${p.blunders}회</span>
          <span class="lost-piece-chip">❗ 일반 실수: ${p.mistakes}회</span>
          <span class="lost-piece-chip">🛡️ 공짜 헌납(Hanging): ${p.tacticalDrops.hangingPiece}회</span>
          <span class="lost-piece-chip">🎯 포획 놓침: ${p.tacticalDrops.missedCapture}회</span>
        </div>

        <div class="lost-pieces-row">
          <span class="lost-piece-chip ${p.lostPieces.q > 0 ? 'danger' : ''}">♕ 퀸 손실 ${p.lostPieces.q}</span>
          <span class="lost-piece-chip">♖ 룩 손실 ${p.lostPieces.r}</span>
          <span class="lost-piece-chip">♗ 비숍 손실 ${p.lostPieces.b}</span>
          <span class="lost-piece-chip">♘ 나이트 손실 ${p.lostPieces.n}</span>
          <span class="lost-piece-chip">♙ 폰 손실 ${p.lostPieces.p}</span>
        </div>
      </div>

      <!-- Right: AI Coach Personalized Diagnosis & Trend -->
      <div class="analytics-panel-box">
        <h4 class="apb-title">
          <span>🤖 AI 코치 맞춤형 약점 진단 & 훈련 처방</span>
          <small>IP: ${p.ipTag}</small>
        </h4>
        <div class="coach-diagnosis-list">
          ${diagHtml}
        </div>
      </div>
    </div>

    <!-- Bottom: Recent Skill Score Trend Chart & Opponents Faced -->
    <div class="analytics-panel-box">
      <h4 class="apb-title">
        <span>📈 최근 대국별 종합 실력점수 추이 (막대 클릭 시 기보 복기)</span>
        <small>초록=승리 · 노랑=무승부 · 파랑=패배</small>
      </h4>
      <div class="skill-trend-chart">
        ${trendBarsHtml}
      </div>
      <div class="lost-pieces-row" style="margin-top:0.2rem;">
        ${oppChipsHtml}
      </div>
    </div>
  `;
}

function bindTrendChartClicks(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll('.trend-bar-col').forEach(col => {
    col.addEventListener('click', async () => {
      const gid = col.dataset.gameId;
      if (!gid) return;
      try {
        const apiPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';
        const r = await fetch(`${apiPrefix}/api/games/${gid}`);
        const game = await r.json();
        if (game && game.history) openReplayModal(game);
      } catch (e) {
        showToast('기보를 불러오지 못했습니다.');
      }
    });
  });
}

async function loadAnalyticsDashboard(forceProfileKey = null) {
  try {
    const apiPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';
    const res = await fetch(`${apiPrefix}/api/analytics`);
    if (!res.ok) return;
    const data = await res.json();
    state.analyticsCache = data;

    if (data.myIp) {
      state.clientIp = data.myIp;
      if (el.lobbyAnalyticsIpBadge) {
        el.lobbyAnalyticsIpBadge.innerText = `내 접속 IP: ${data.myIp} · 우리집 공유 통합`;
      }
    }

    const profiles = data.profiles || [];
    if (profiles.length === 0) return;

    let selectedKey = forceProfileKey || state.selectedAnalyticsProfile || 'all';
    if (!profiles.some(p => p.key === selectedKey)) {
      selectedKey = 'all';
    }
    state.selectedAnalyticsProfile = selectedKey;

    const activeProfile = profiles.find(p => p.key === selectedKey) || profiles[0];

    const renderTabsInto = (tabsEl) => {
      if (!tabsEl) return;
      tabsEl.innerHTML = profiles.map(prof => {
        const isActive = prof.key === selectedKey ? 'active' : '';
        const isMyIp = prof.key === `ip:${data.myIp}`;
        const labelText = isMyIp ? `📱 내 기기 IP (${data.myIp})` : prof.label;
        return `
          <button type="button" class="analytics-tab-chip ${isActive}" data-profile="${prof.key}">
            <span>${labelText}</span>
            <span class="chip-count">${prof.totalGames}판 · ${prof.skillRating}점</span>
          </button>
        `;
      }).join('');

      tabsEl.querySelectorAll('.analytics-tab-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const nextKey = btn.dataset.profile;
          state.selectedAnalyticsProfile = nextKey;
          loadAnalyticsDashboard(nextKey);
        });
      });
    };

    renderTabsInto(el.lobbyAnalyticsTabs);
    renderTabsInto(el.modalAnalyticsTabs);

    const htmlContent = renderAnalyticsProfileHtml(activeProfile);
    if (el.lobbyAnalyticsBody) {
      el.lobbyAnalyticsBody.innerHTML = htmlContent;
      bindTrendChartClicks(el.lobbyAnalyticsBody);
    }
    if (el.modalAnalyticsBody) {
      el.modalAnalyticsBody.innerHTML = htmlContent;
      bindTrendChartClicks(el.modalAnalyticsBody);
    }
  } catch (err) {
    console.warn('Failed to load analytics dashboard:', err);
  }
}

async function loadLeaderboard() {
  if (!el.leaderboardTbody) return;
  el.leaderboardTbody.innerHTML = '<tr><td colspan="6" class="empty-table-msg">랭킹 불러오는 중...</td></tr>';
  try {
    const apiPrefix = window.location.pathname.startsWith('/chess') ? '/chess' : '';
    const res = await fetch(`${apiPrefix}/api/leaderboard`);
    const data = await res.json();
    const list = data.leaderboard || [];

    if (list.length === 0) {
      el.leaderboardTbody.innerHTML = '<tr><td colspan="6" class="empty-table-msg">아직 저장된 대국 기록이 없습니다.<br>대국을 완료하면 승률과 실력점수가 자동 집계됩니다.</td></tr>';
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
          <td style="text-align:center;"><span style="font-weight:800; color:#fbbf24;">🎯 ${p.avgSkillScore || 750}점</span> <small style="color:#94a3b8;">(${p.tierBadge || '🥈 실버'})</small></td>
          <td style="text-align:center;">${p.wins}승 ${p.draws}무 ${p.losses}패 (${p.games}전 · 평균 ${p.avgMoves || 0}수)</td>
          <td style="text-align:center;"><span class="player-winrate-badge">${p.winRate}%</span></td>
          <td style="text-align:center;"><div class="recent-streak">${streakHtml || '-'}</div></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    el.leaderboardTbody.innerHTML = '<tr><td colspan="6" class="empty-table-msg">전적 불러오기 실패</td></tr>';
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

      const roomId = g.roomId || '';
      let modeTag = '🌐 와이파이';
      if (roomId.startsWith('AI') || roomId.startsWith('Stockfish')) modeTag = `🤖 ${roomId}`;
      else if (roomId === '로컬 2인') modeTag = '👥 로컬';
      else if (roomId.length <= 4 && roomId.length > 0) modeTag = `🌐 방:${roomId}`;

      const a = g.analytics;
      const analyticsMeta = a
        ? `· 🎯 <strong>${a.skillScore}점</strong> (정확도 ${a.accuracy}% · 블런더 ${a.blunders} · ⏱️${formatDurationKo(a.durationSeconds)} · 💡${a.hintsUsed}/↩️${a.undosUsed})`
        : '';

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
              ${analyticsMeta}
              · ${g.endReason}
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

// ================= AI HINT & TACTICAL ANALYSIS =================
const PIECE_NAMES_KO = {
  p: '폰',
  n: '나이트',
  b: '비숍',
  r: '룩',
  q: '퀸',
  k: '킹'
};

const PIECE_ICONS_KO = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' }
};

function clearHintUi() {
  state.hintMove = null;
  state.hintTacticalData = null;
  state.lastHintTtsText = null;
  if (el.hintResultCard) {
    el.hintResultCard.style.display = 'none';
  }
  if (el.modalHintPopup) {
    el.modalHintPopup.classList.remove('active');
  }
}

function speakText(text) {
  if (!('speechSynthesis' in window)) {
    showToast('이 브라우저는 음성(TTS) 읽기 기능을 지원하지 않습니다.');
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    if (el.btnHintTts) el.btnHintTts.classList.add('speaking');
    utterance.onend = () => {
      if (el.btnHintTts) el.btnHintTts.classList.remove('speaking');
    };
    utterance.onerror = () => {
      if (el.btnHintTts) el.btnHintTts.classList.remove('speaking');
    };
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('TTS error:', e);
  }
}

function analyzeTacticalMove(game, moveObj) {
  const pieceName = PIECE_NAMES_KO[moveObj.piece.toLowerCase()] || '기물';
  const oppColor = moveObj.color === 'w' ? 'b' : 'w';

  let type = 'strategy'; // 'attack' | 'defense' | 'strategy'
  let badge = '♟️ 전략수';
  let badgeClass = 'hint-badge-strategy';
  let explanation = '';
  let speechSummary = '';

  // 1. Checkmate or Check
  if (moveObj.san.includes('#')) {
    type = 'attack';
    badge = '🏆 체크메이트';
    badgeClass = 'hint-badge-mate';
    explanation = `상대 킹을 외통수로 몰아넣어 승리를 결정짓는 완벽한 체크메이트입니다!`;
    speechSummary = `승리를 결정짓는 결정적 체크메이트 공격수입니다!`;
  } else if (moveObj.san.includes('+')) {
    type = 'attack';
    badge = '⚔️ 체크 공격';
    badgeClass = 'hint-badge-attack';
    explanation = `${pieceName}이(가) 상대 킹을 직접 겨누며 강력한 압박을 가하는 체크 공격수입니다.`;
    speechSummary = `상대 킹을 직접 위협하는 체크 공격수입니다.`;
  }
  // 2. Promotion
  else if (moveObj.promotion) {
    const promoName = PIECE_NAMES_KO[moveObj.promotion.toLowerCase()] || '퀸';
    type = 'attack';
    badge = '👑 폰 승격';
    badgeClass = 'hint-badge-attack';
    explanation = `폰을 ${promoName}(으)로 승격시켜 전력을 극대화하는 결정적 전술수입니다.`;
    speechSummary = `폰을 ${promoName}으로 승격시키는 결정적 공격수입니다.`;
  }
  // 3. Captures
  else if (moveObj.captured) {
    const capName = PIECE_NAMES_KO[moveObj.captured.toLowerCase()] || '기물';
    type = 'attack';
    badge = `⚔️ ${capName} 포획`;
    badgeClass = 'hint-badge-attack';
    explanation = `상대 ${capName}을(를) 포획하여 전력상 우위를 점하는 직접적인 공격수입니다.`;
    speechSummary = `상대 ${capName}을 잡아 전력 우위를 점하는 공격수입니다.`;
  }
  // 4. Castling
  else if (moveObj.flags && (moveObj.flags.includes('k') || moveObj.flags.includes('q'))) {
    type = 'defense';
    badge = '🛡️ 킹 보호 캐슬링';
    badgeClass = 'hint-badge-defense';
    explanation = `킹을 안전한 구석으로 대피시키고 룩의 활동 반경을 넓히는 핵심 방어·전개수입니다.`;
    speechSummary = `킹을 안전하게 지키고 룩을 중앙으로 전개하는 캐슬링 방어수입니다.`;
  }
  // 5. Escape / Defense / Fork / Center
  else {
    let wasThreatened = false;
    let threatPieces = [];
    try {
      const mockGame = new Chess(game.fen());
      const tokens = mockGame.fen().split(' ');
      tokens[1] = oppColor;
      tokens[3] = '-';
      mockGame.load(tokens.join(' '), { skipValidation: true });
      const oppMoves = mockGame.moves({ verbose: true });
      const threats = oppMoves.filter(m => m.to === moveObj.from);
      if (threats.length > 0) {
        wasThreatened = true;
        threatPieces = threats.map(t => PIECE_NAMES_KO[t.piece.toLowerCase()] || '상대 기물');
      }
    } catch (e) {}

    // Check if new destination threatens opponent pieces
    let nowThreatens = [];
    try {
      const nextGame = new Chess(game.fen());
      nextGame.move(moveObj);
      const myNextMoves = nextGame.moves({ verbose: true });
      const destAttacks = myNextMoves.filter(m => m.from === moveObj.to && m.captured);
      nowThreatens = destAttacks.map(m => PIECE_NAMES_KO[m.captured.toLowerCase()] || '상대 기물');
    } catch (e) {}

    if (wasThreatened) {
      type = 'defense';
      const threatSource = threatPieces[0] || '상대';
      badge = '🛡️ 기물 대피·방어';
      badgeClass = 'hint-badge-defense';
      explanation = `${threatSource}의 위협을 받고 있던 ${pieceName}을(를) 안전한 ${moveObj.to} 칸으로 대피시키는 방어수입니다.`;
      speechSummary = `상대의 위협을 피해 ${pieceName}을 안전하게 대피시키는 방어수입니다.`;
    } else if (nowThreatens.length > 1) {
      type = 'attack';
      badge = '⚡ 양수겸장(포크)';
      badgeClass = 'hint-badge-attack';
      explanation = `${pieceName}이(가) ${nowThreatens.slice(0, 2).join('와(과) ')}을(를) 동시에 위협하는 포크(Fork) 공격수입니다.`;
      speechSummary = `상대 기물 여러 개를 동시에 노리는 포크 공격수입니다.`;
    } else if (nowThreatens.length === 1) {
      type = 'attack';
      const target = nowThreatens[0];
      badge = `⚔️ ${target} 위협`;
      badgeClass = 'hint-badge-attack';
      explanation = `${moveObj.to} 칸으로 진출하여 상대 ${target}을(를) 정조준하고 압박을 가하는 날카로운 공격수입니다.`;
      speechSummary = `상대 ${target}을 겨냥하여 압박하는 날카로운 공격수입니다.`;
    } else {
      const centerSquares = ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'];
      const isCenter = centerSquares.includes(moveObj.to);
      if (isCenter) {
        badge = '♟️ 중앙 장악';
        badgeClass = 'hint-badge-strategy';
        explanation = `체스판의 핵심 요충지인 ${moveObj.to} 중앙 칸을 장악하여 전술적 주도권을 잡는 전략수입니다.`;
        speechSummary = `중앙 요충지를 장악하여 판세를 유리하게 이끄는 전략수입니다.`;
      } else {
        badge = '♟️ 전개 및 포지션 강화';
        badgeClass = 'hint-badge-strategy';
        explanation = `${pieceName}의 활동 공간을 넓히고 아군 진영을 탄탄하게 구축하는 균형 잡힌 수입니다.`;
        speechSummary = `${pieceName}의 활동 범위를 넓히는 포지션 강화수입니다.`;
      }
    }
  }

  return { type, badge, badgeClass, explanation, speechSummary };
}

function updateHintSettingsUi() {
  if (el.hintModelPicker) el.hintModelPicker.value = state.hintModel;
  if (el.hintLevelPicker) el.hintLevelPicker.value = String(state.hintLevel);
  if (el.settingHintModel) el.settingHintModel.value = state.hintModel;
  if (el.settingHintLevel) el.settingHintLevel.value = String(state.hintLevel);
  if (el.settingHintTts) el.settingHintTts.checked = state.hintAutoTts;
}

async function requestBestMoveHint() {
  if (state.gameStatus !== 'playing') return;
  if (state.mode === 'ai' && state.activeTurn !== state.playerColor) {
    showToast('상대 AI가 생각 중일 때는 힌트를 사용할 수 없습니다.');
    return;
  }
  if (state.maxHints === 0) {
    showToast('최선수 힌트 기능이 비활성화되어 있습니다.');
    return;
  }
  const isUnlimited = state.maxHints < 0;
  if (!isUnlimited && state.hintsUsed >= state.maxHints) {
    showToast(`최선수 힌트 횟수를 모두 소진했습니다. (최대 ${state.maxHints}회)`);
    return;
  }

  // Set loading state on clock hint buttons
  if (el.btnClockHint) {
    el.btnClockHint.classList.add('loading');
    el.btnClockHint.innerHTML = '<span class="clock-hint-icon">⏳</span><span class="clock-hint-text">탐색중...</span>';
  }
  if (el.btnOpponentClockHint) {
    el.btnOpponentClockHint.classList.add('loading');
    el.btnOpponentClockHint.innerHTML = '<span class="clock-hint-icon">⏳</span><span class="clock-hint-text">탐색중...</span>';
  }

  try {
    state.hintsUsed++;
    updateHintUi();

    const chosenModel = state.hintModel || 'stockfish';
    const chosenLevel = state.hintLevel || 5;

    const isStockfish = (chosenModel === 'stockfish') && state.stockfish && state.stockfish.isReady;
    const engineName = isStockfish ? 'Stockfish 16 (젤리피쉬)' : 'Minimax AI';

    if (el.engineHintText) {
      el.engineHintText.innerText = `💡 ${engineName}이 최선수를 탐색 중입니다... (난이도 Lv.${chosenLevel})`;
    }

    let moveObj = null;
    let calculatedDepth = chosenLevel;

    if (isStockfish) {
      const maxTime = chosenLevel === 5 ? 1800 : chosenLevel === 4 ? 1200 : chosenLevel === 3 ? 800 : 500;
      const uciMove = await state.stockfish.getAIMove(state.game.fen(), chosenLevel, maxTime);
      calculatedDepth = (state.stockfish.getLastDepth && state.stockfish.getLastDepth()) || (chosenLevel * 3 + 2);

      if (uciMove) {
        const from = uciMove.slice(0, 2);
        const to = uciMove.slice(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
        moveObj = state.game.moves({ verbose: true }).find(m =>
          m.from === from && m.to === to && (!promotion || m.promotion === promotion)
        );
      }
    }

    // Fallback to Minimax if Stockfish returned null or Minimax was chosen
    if (!moveObj) {
      calculatedDepth = chosenLevel;
      const aiMove = state.engine.getAIMove(state.game, chosenLevel, 2000);
      if (aiMove) {
        moveObj = state.game.moves({ verbose: true }).find(m =>
          m.from === aiMove.from && m.to === aiMove.to && (!aiMove.promotion || m.promotion === aiMove.promotion)
        );
      }
      if (!moveObj) {
        const analysis = state.engine.analyzePosition(state.game);
        moveObj = analysis.bestMove;
      }
    }

    if (!moveObj) {
      showToast('추천할 최선수를 찾을 수 없습니다.');
      return;
    }

    state.hintMove = moveObj;
    const tactical = analyzeTacticalMove(state.game, moveObj);
    state.hintTacticalData = tactical;

    const remainText = isUnlimited ? '무제한 ♾️' : `남은 횟수: ${state.maxHints - state.hintsUsed}회`;
    const moveCoordStr = `${moveObj.from.toUpperCase()} ➔ ${moveObj.to.toUpperCase()}`;
    const moveSanStr = moveObj.san;

    // Piece Details for Tactical Explanation Popup Modal
    const pieceColor = moveObj.color === 'w' ? '백' : '흑';
    const pieceName = PIECE_NAMES_KO[moveObj.piece.toLowerCase()] || '기물';
    const pieceIcon = (PIECE_ICONS_KO[moveObj.color] && PIECE_ICONS_KO[moveObj.color][moveObj.piece.toLowerCase()]) || '♟';

    // Update Tactical Explanation Popup Modal
    if (el.hintPopupEngineTag) {
      el.hintPopupEngineTag.innerText = `${engineName} · ${calculatedDepth}수 앞 심층 탐색`;
    }
    if (el.hintPopupPieceIcon) {
      el.hintPopupPieceIcon.innerText = pieceIcon;
    }
    if (el.hintPopupPieceTitle) {
      el.hintPopupPieceTitle.innerText = `${pieceColor} ${pieceName}`;
    }
    if (el.hintPopupMoveCoords) {
      el.hintPopupMoveCoords.innerText = `${moveCoordStr} (${moveSanStr})`;
    }
    if (el.hintPopupTacticalBadge) {
      el.hintPopupTacticalBadge.className = `hint-tactical-badge ${tactical.badgeClass}`;
      el.hintPopupTacticalBadge.innerText = tactical.badge;
    }
    if (el.hintPopupEvalScore) {
      const evalVal = (state.evaluation !== undefined && state.evaluation !== null) ? state.evaluation : 0;
      const evalSign = evalVal > 0 ? '+' : '';
      el.hintPopupEvalScore.innerText = `형세: ${evalSign}${evalVal.toFixed(1)}`;
    }
    if (el.hintPopupExplanation) {
      el.hintPopupExplanation.innerText = tactical.explanation;
    }

    // Open the tactical explanation popup modal!
    if (el.modalHintPopup) {
      el.modalHintPopup.classList.add('active');
    }

    // Update Side UI Card if visible
    if (el.hintResultCard) {
      el.hintResultCard.style.display = 'flex';
    }
    if (el.hintMoveTag) {
      el.hintMoveTag.innerText = `${moveSanStr} (${moveCoordStr})`;
    }
    if (el.hintTacticalBadge) {
      el.hintTacticalBadge.className = `hint-tactical-badge ${tactical.badgeClass}`;
      el.hintTacticalBadge.innerText = tactical.badge;
    }
    if (el.hintDepthBadge) {
      el.hintDepthBadge.innerText = `수읽기: ${calculatedDepth}수 앞 (Depth ${calculatedDepth})`;
    }
    if (el.hintExplanationText) {
      el.hintExplanationText.innerText = tactical.explanation;
    }
    if (el.engineHintText) {
      el.engineHintText.innerText = `💡 ${engineName} 추천 [${moveSanStr}] - ${tactical.badge} [${remainText}]`;
    }

    showToast(`💡 최선수(${engineName}): ${pieceColor} ${pieceName} ${moveCoordStr} · ${tactical.badge}`);
    renderBoard();
    audio.playNotify();

    // TTS Voice Output
    const fullTtsText = `${calculatedDepth}수 앞을 내다본 ${engineName} 최선수는, ${pieceColor} ${pieceName} ${moveObj.from}에서 ${moveObj.to}로 이동하는 ${moveSanStr}입니다. ${tactical.speechSummary}`;
    state.lastHintTtsText = fullTtsText;

    if (state.hintAutoTts) {
      speakText(fullTtsText);
    }
  } finally {
    if (el.btnClockHint) {
      el.btnClockHint.classList.remove('loading');
      el.btnClockHint.innerHTML = '<span class="clock-hint-icon">💡</span><span class="clock-hint-text">최선수</span><span class="clock-hint-count" id="clock-hint-count" style="display: none;"></span>';
    }
    if (el.btnOpponentClockHint) {
      el.btnOpponentClockHint.classList.remove('loading');
      el.btnOpponentClockHint.innerHTML = '<span class="clock-hint-icon">💡</span><span class="clock-hint-text">최선수</span>';
    }
    updateHintUi();
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

  if (el.selectIntegratedTheme) {
    el.selectIntegratedTheme.addEventListener('change', (e) => {
      applyThemePreset(e.target.value, true);
    });
  }

  if (el.selectPieceStyle) {
    el.selectPieceStyle.addEventListener('change', (e) => {
      setPieceStyle(e.target.value);
      renderBoard();
      updateCapturedAndMaterial();
      showToast(`체스말 스타일이 변경되었습니다: ${e.target.options[e.target.selectedIndex].text}`);
    });
  }

  if (el.selectTheme) {
    el.selectTheme.addEventListener('change', (e) => {
      applyTheme(e.target.value);
      showToast(`체스판 테마가 변경되었습니다: ${e.target.options[e.target.selectedIndex].text}`);
    });
  }

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
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        if (modal.id !== 'modal-promotion') {
          modal.classList.remove('active');
        }
      });
      return;
    }
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

  if (el.btnAiHint) {
    el.btnAiHint.addEventListener('click', () => {
      requestBestMoveHint();
    });
  }

  if (el.btnClockHint) {
    el.btnClockHint.addEventListener('click', () => {
      requestBestMoveHint();
    });
  }

  if (el.btnOpponentClockHint) {
    el.btnOpponentClockHint.addEventListener('click', () => {
      requestBestMoveHint();
    });
  }

  if (el.btnCloseHintModal) {
    el.btnCloseHintModal.addEventListener('click', () => {
      if (el.modalHintPopup) el.modalHintPopup.classList.remove('active');
    });
  }

  if (el.btnConfirmHintModal) {
    el.btnConfirmHintModal.addEventListener('click', () => {
      if (el.modalHintPopup) el.modalHintPopup.classList.remove('active');
    });
  }

  if (el.btnPopupHintTts) {
    el.btnPopupHintTts.addEventListener('click', () => {
      if (state.lastHintTtsText) {
        speakText(state.lastHintTtsText);
      } else if (state.hintTacticalData) {
        speakText(state.hintTacticalData.explanation);
      }
    });
  }

  if (el.btnHintTts) {
    el.btnHintTts.addEventListener('click', () => {
      if (state.lastHintTtsText) {
        speakText(state.lastHintTtsText);
      } else if (state.hintTacticalData) {
        speakText(state.hintTacticalData.explanation);
      } else {
        speakText('최선수 힌트 버튼을 먼저 눌러주세요.');
      }
    });
  }

  if (el.hintModelPicker) {
    el.hintModelPicker.addEventListener('change', (e) => {
      state.hintModel = e.target.value;
      localStorage.setItem('chess_hint_model', state.hintModel);
      if (el.settingHintModel) el.settingHintModel.value = state.hintModel;
      showToast(`최선수 AI 모델: ${state.hintModel === 'stockfish' ? 'Stockfish 16 (젤리피쉬)' : 'Minimax'}`);
    });
  }

  if (el.hintLevelPicker) {
    el.hintLevelPicker.addEventListener('change', (e) => {
      state.hintLevel = parseInt(e.target.value, 10);
      localStorage.setItem('chess_hint_level', String(state.hintLevel));
      if (el.settingHintLevel) el.settingHintLevel.value = String(state.hintLevel);
      showToast(`최선수 수읽기 난이도: Lv.${state.hintLevel}`);
    });
  }

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

  // AI Model & Difficulty Event Listeners
  if (el.aiModelPicker) {
    el.aiModelPicker.addEventListener('change', (e) => {
      state.aiModel = e.target.value;
      localStorage.setItem('chess_ai_model', state.aiModel);
      if (el.sideAiModelPicker) el.sideAiModelPicker.value = state.aiModel;
      if (el.settingAiModel) el.settingAiModel.value = state.aiModel;
      updateAiOpponentBadge();
    });
  }

  if (el.aiLevelPicker) {
    el.aiLevelPicker.addEventListener('change', (e) => {
      state.aiLevel = parseInt(e.target.value, 10);
      localStorage.setItem('chess_ai_level', String(state.aiLevel));
      if (el.sideAiLevelPicker) el.sideAiLevelPicker.value = String(state.aiLevel);
      updateAiOpponentBadge();
    });
  }

  if (el.sideAiModelPicker) {
    el.sideAiModelPicker.addEventListener('change', (e) => {
      state.aiModel = e.target.value;
      localStorage.setItem('chess_ai_model', state.aiModel);
      if (el.aiModelPicker) el.aiModelPicker.value = state.aiModel;
      if (el.settingAiModel) el.settingAiModel.value = state.aiModel;
      updateAiOpponentBadge();
      showToast(`상대 AI가 [${state.aiModel === 'stockfish' ? 'Stockfish 16' : '캐주얼 체스 AI'}]로 변경되었습니다.`);
    });
  }

  if (el.sideAiLevelPicker) {
    el.sideAiLevelPicker.addEventListener('change', (e) => {
      state.aiLevel = parseInt(e.target.value, 10);
      localStorage.setItem('chess_ai_level', String(state.aiLevel));
      if (el.aiLevelPicker) el.aiLevelPicker.value = String(state.aiLevel);
      updateAiOpponentBadge();
      showToast(`상대 AI 난이도가 [레벨 ${state.aiLevel}]로 변경되었습니다.`);
    });
  }

  if (el.aiHintPicker) {
    el.aiHintPicker.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      state.maxHints = val;
      localStorage.setItem('chess_max_hints', String(val));
      localStorage.setItem('chess_max_hints_v2', String(val));
      if (el.settingHintLimit) el.settingHintLimit.value = String(val);
      updateHintUi();
    });
  }

  // Settings Modal Controls
  if (el.btnOpenSettings) {
    el.btnOpenSettings.addEventListener('click', () => {
      if (el.modalSettings) {
        if (el.settingHintLimit) el.settingHintLimit.value = String(state.maxHints);
        if (el.settingAiModel) el.settingAiModel.value = state.aiModel;
        if (el.settingShowAttack) el.settingShowAttack.checked = state.showAttackLines;
        if (el.settingShowThreat) el.settingShowThreat.checked = state.showThreatLines;
        if (el.settingShowPreview) el.settingShowPreview.checked = state.showPreviewLines;
        if (el.settingHintModel) el.settingHintModel.value = state.hintModel;
        if (el.settingHintLevel) el.settingHintLevel.value = String(state.hintLevel);
        if (el.settingHintTts) el.settingHintTts.checked = state.hintAutoTts;
        if (el.settingAiMoveAnim) el.settingAiMoveAnim.checked = state.aiMoveAnim;
        if (el.settingLastMoveTrail) el.settingLastMoveTrail.checked = state.showLastMoveTrail;
        if (el.selectTheme) el.selectTheme.value = localStorage.getItem('chess_theme') || 'theme-emerald';
        if (el.selectPieceStyle) el.selectPieceStyle.value = currentPieceStyle;
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
        localStorage.setItem('chess_max_hints_v2', String(val));
        if (el.aiHintPicker) el.aiHintPicker.value = String(val);
      }
      if (el.settingHintModel) {
        state.hintModel = el.settingHintModel.value;
        localStorage.setItem('chess_hint_model', state.hintModel);
        if (el.hintModelPicker) el.hintModelPicker.value = state.hintModel;
      }
      if (el.settingHintLevel) {
        state.hintLevel = parseInt(el.settingHintLevel.value, 10);
        localStorage.setItem('chess_hint_level', String(state.hintLevel));
        if (el.hintLevelPicker) el.hintLevelPicker.value = String(state.hintLevel);
      }
      if (el.settingHintTts) {
        state.hintAutoTts = el.settingHintTts.checked;
        localStorage.setItem('chess_hint_auto_tts', String(state.hintAutoTts));
      }
      if (el.settingAiModel) {
        state.aiModel = el.settingAiModel.value;
        localStorage.setItem('chess_ai_model', state.aiModel);
        if (el.aiModelPicker) el.aiModelPicker.value = state.aiModel;
        if (el.sideAiModelPicker) el.sideAiModelPicker.value = state.aiModel;
        updateAiOpponentBadge();
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
      if (el.settingAiMoveAnim) {
        state.aiMoveAnim = el.settingAiMoveAnim.checked;
        localStorage.setItem('chess_ai_move_anim', String(state.aiMoveAnim));
      }
      if (el.settingLastMoveTrail) {
        state.showLastMoveTrail = el.settingLastMoveTrail.checked;
        localStorage.setItem('chess_last_move_trail', String(state.showLastMoveTrail));
      }
      if (el.selectTheme) {
        applyTheme(el.selectTheme.value);
      }
      if (el.selectPieceStyle) {
        setPieceStyle(el.selectPieceStyle.value);
        renderBoard();
        updateCapturedAndMaterial();
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
      const m1 = state.game.undo();
      const m2 = state.game.undo();
      if (m1 || m2) {
        state.undosUsed = (state.undosUsed || 0) + 1;
      }
      state.lastMove = null;
      state.hintMove = null;
      renderBoard();
      triggerAsyncEvaluation();
      saveActiveSessionState();
      showToast(`수를 1수 물렸습니다. (무르기 누적 ${state.undosUsed}회)`);
    } else if (state.mode === 'local') {
      const m1 = state.game.undo();
      if (m1) {
        state.undosUsed = (state.undosUsed || 0) + 1;
      }
      state.activeTurn = state.game.turn();
      if (state.autoFlip) state.boardFlipped = (state.activeTurn === 'b');
      state.lastMove = null;
      renderBoard();
      triggerAsyncEvaluation();
      saveActiveSessionState();
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

  el.btnLeaveGame.addEventListener('click', async () => {
    if (confirm('현재 대국을 나가고 로비로 이동하시겠습니까?')) {
      // If AI training game has >= 6 half-moves and is still playing, save training history before leaving
      const movesPlayed = state.game ? state.game.history().length : 0;
      if (state.mode === 'ai' && state.gameStatus === 'playing' && movesPlayed >= 6) {
        const oppColor = state.playerColor === 'w' ? 'b' : 'w';
        await saveLocalGameToServer(oppColor, '훈련 중도 종료 (기권)', movesPlayed);
        showToast('📊 진행한 AI 훈련 이력이 학습 통계에 반영되었습니다.');
      }
      if (state.ws) state.ws.close();
      clearActiveSessionState();
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

  // Records, Leaderboard & AI Analytics Modal Listeners
  const activateRecordsTab = (tabName) => {
    [el.tabBtnAnalytics, el.tabBtnLeaderboard, el.tabBtnGames].forEach(b => {
      if (b) b.classList.remove('active');
    });
    [el.rtabAnalytics, el.rtabLeaderboard, el.rtabGames].forEach(c => {
      if (c) c.classList.remove('active');
    });
    if (tabName === 'analytics') {
      if (el.tabBtnAnalytics) el.tabBtnAnalytics.classList.add('active');
      if (el.rtabAnalytics) el.rtabAnalytics.classList.add('active');
      loadAnalyticsDashboard(state.selectedAnalyticsProfile);
    } else if (tabName === 'leaderboard') {
      if (el.tabBtnLeaderboard) el.tabBtnLeaderboard.classList.add('active');
      if (el.rtabLeaderboard) el.rtabLeaderboard.classList.add('active');
      loadLeaderboard();
    } else if (tabName === 'games') {
      if (el.tabBtnGames) el.tabBtnGames.classList.add('active');
      if (el.rtabGames) el.rtabGames.classList.add('active');
      loadGameRecords();
    }
  };

  if (el.btnOpenRecords) {
    el.btnOpenRecords.addEventListener('click', () => {
      el.modalRecords.classList.add('active');
      loadAnalyticsDashboard(state.selectedAnalyticsProfile);
      loadLeaderboard();
      loadGameRecords();
    });
  }
  if (el.btnCloseRecordsModal) {
    el.btnCloseRecordsModal.addEventListener('click', () => {
      el.modalRecords.classList.remove('active');
    });
  }
  if (el.tabBtnAnalytics) {
    el.tabBtnAnalytics.addEventListener('click', () => activateRecordsTab('analytics'));
  }
  if (el.tabBtnLeaderboard) {
    el.tabBtnLeaderboard.addEventListener('click', () => activateRecordsTab('leaderboard'));
  }
  if (el.tabBtnGames) {
    el.tabBtnGames.addEventListener('click', () => activateRecordsTab('games'));
  }

  if (el.btnRefreshAnalytics) {
    el.btnRefreshAnalytics.addEventListener('click', () => {
      loadAnalyticsDashboard(state.selectedAnalyticsProfile);
      showToast('📊 AI 학습 및 약점 분석 데이터를 갱신했습니다.');
    });
  }
  if (el.btnOpenFullAnalytics) {
    el.btnOpenFullAnalytics.addEventListener('click', () => {
      if (el.modalRecords) {
        el.modalRecords.classList.add('active');
        activateRecordsTab('analytics');
        loadLeaderboard();
        loadGameRecords();
      }
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

  // Resume Session Modals & Banner Listeners
  if (el.btnResumeGame) {
    el.btnResumeGame.addEventListener('click', () => {
      if (state.cachedSessionToResume) {
        resumeActiveSession(state.cachedSessionToResume);
      }
    });
  }
  if (el.btnDiscardResume) {
    el.btnDiscardResume.addEventListener('click', () => {
      clearActiveSessionState();
      showToast('이전 대국 기록을 정리하고 새 AI 대국을 시작합니다!');
      startAiGame();
    });
  }
  if (el.btnCloseResumeModal) {
    el.btnCloseResumeModal.addEventListener('click', () => {
      if (el.modalResume) el.modalResume.classList.remove('active');
    });
  }

  // Backdrop click on modal overlay closes the modal (except promotion which requires piece selection)
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal.id === 'modal-promotion') return;
        modal.classList.remove('active');
      }
    });
  });
  if (el.btnLobbyResume) {
    el.btnLobbyResume.addEventListener('click', () => {
      if (state.cachedSessionToResume) {
        resumeActiveSession(state.cachedSessionToResume);
      }
    });
  }
  if (el.btnLobbyDiscard) {
    el.btnLobbyDiscard.addEventListener('click', () => {
      clearActiveSessionState();
      showToast('이전 대국 기록을 정리했습니다.');
    });
  }

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
  
  const savedTheme = localStorage.getItem('chess_theme') || 'theme-emerald';
  applyTheme(savedTheme);

  const savedPlayerName = localStorage.getItem('chess_player_name') || '플레이어 1';
  state.playerName = savedPlayerName;
  if (el.aiPlayerName) {
    el.aiPlayerName.value = savedPlayerName;
    el.aiPlayerName.addEventListener('change', (e) => {
      const v = e.target.value.trim() || '플레이어 1';
      state.playerName = v;
      localStorage.setItem('chess_player_name', v);
      if (el.createPlayerName) el.createPlayerName.value = v;
    });
  }
  if (el.createPlayerName) {
    el.createPlayerName.value = savedPlayerName;
  }

  const savedPreset = localStorage.getItem('chess_integrated_preset') || 'emerald-classic';
  if (el.selectIntegratedTheme) {
    el.selectIntegratedTheme.value = savedPreset;
  }
  if (el.selectPieceStyle) {
    el.selectPieceStyle.value = currentPieceStyle;
  }
  if (el.selectTheme) {
    el.selectTheme.value = savedTheme;
  }
  if (el.aiHintPicker) {
    el.aiHintPicker.value = String(state.maxHints);
  }
  if (el.settingHintLimit) {
    el.settingHintLimit.value = String(state.maxHints);
  }
  if (el.aiModelPicker) {
    el.aiModelPicker.value = state.aiModel;
  }
  if (el.aiLevelPicker) {
    el.aiLevelPicker.value = String(state.aiLevel);
  }
  if (el.sideAiModelPicker) {
    el.sideAiModelPicker.value = state.aiModel;
  }
  if (el.sideAiLevelPicker) {
    el.sideAiLevelPicker.value = String(state.aiLevel);
  }
  if (el.settingAiModel) {
    el.settingAiModel.value = state.aiModel;
  }
  updateAiOpponentBadge();
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
  if (el.settingAiDelay) {
    el.settingAiDelay.value = String(state.aiMoveDelay);
  }

  const savedAnim = localStorage.getItem('chess_ai_move_anim');
  if (savedAnim !== null) {
    state.aiMoveAnim = savedAnim === 'true';
  }
  if (el.settingAiMoveAnim) {
    el.settingAiMoveAnim.checked = state.aiMoveAnim;
  }
  const savedTrail = localStorage.getItem('chess_last_move_trail');
  if (savedTrail !== null) {
    state.showLastMoveTrail = savedTrail === 'true';
  }
  if (el.settingLastMoveTrail) {
    el.settingLastMoveTrail.checked = state.showLastMoveTrail;
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
  updateHintSettingsUi();
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
  setupHeaderDragScroll();
  renderBoard();

  // Load lobby AI analytics dashboard & recent games on startup
  loadAnalyticsDashboard('all');
  loadLobbyRecentGames();

  // Bind lobby "전체 보기" button
  if (el.btnLobbyOpenRecords) {
    el.btnLobbyOpenRecords.addEventListener('click', () => {
      if (el.modalRecords) {
        el.modalRecords.classList.add('active');
        if (el.tabBtnGames) el.tabBtnGames.click();
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

  // Check active session for this client's IP address (LAN reconnection / browser refresh)
  checkActiveSession();
}

window.addEventListener('DOMContentLoaded', init);
