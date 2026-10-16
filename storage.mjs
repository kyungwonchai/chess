import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Chess } from 'chess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const PIECE_NAMES_KO = { p: '폰', n: '나이트', b: '비숍', r: '룩', q: '퀸', k: '킹' };
const CENTER_SQUARES = new Set(['d4', 'd5', 'e4', 'e5']);
const EXTENDED_CENTER = new Set(['c3', 'd3', 'e3', 'f3', 'c4', 'f4', 'c5', 'f5', 'c6', 'd6', 'e6', 'f6']);

// Ensure data directory, sessions directory, and files exist
function initStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
  if (!fs.existsSync(GAMES_FILE)) {
    fs.writeFileSync(GAMES_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

// Fast board evaluator from White's perspective (in centipawns)
function evaluateBoardFast(chess) {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw()) return 0;

  const board = chess.board();
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      let val = PIECE_VALUES[piece.type] || 0;
      const sq = piece.square;
      if (CENTER_SQUARES.has(sq)) val += 25;
      else if (EXTENDED_CENTER.has(sq)) val += 10;

      // Pawn advancement bonus
      if (piece.type === 'p') {
        const advancement = piece.color === 'w' ? (6 - r) : (r - 1);
        val += advancement * 8;
      }
      score += piece.color === 'w' ? val : -val;
    }
  }
  return score;
}

// Evaluate position for the player whose turn it is, considering 1-ply tactical captures
function getBest1PlyScore(chess, color) {
  const sign = color === 'w' ? 1 : -1;
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return evaluateBoardFast(chess) * sign;

  let best = -999999;
  for (const m of moves) {
    chess.move(m);
    const s = evaluateBoardFast(chess) * sign;
    if (s > best) best = s;
    chess.undo();
  }
  return best;
}

export function analyzeGameRecord(game) {
  try {
    const history = Array.isArray(game.history) ? game.history : [];
    const totalMoves = game.totalMoves || history.length;
    const roomId = String(game.roomId || '');
    const whiteName = String(game.white || '플레이어 1').trim();
    const blackName = String(game.black || '플레이어 2').trim();

    const isWhiteAi = /^AI Lv\./i.test(whiteName) || /Stockfish/i.test(whiteName) || /캐주얼/i.test(whiteName);
    const isBlackAi = /^AI Lv\./i.test(blackName) || /Stockfish/i.test(blackName) || /캐주얼/i.test(blackName);
    const isAiGame = isWhiteAi || isBlackAi || roomId.startsWith('AI Lv.') || game.mode === 'ai';

    let humanColor = game.playerColor || 'w';
    if (isBlackAi && !isWhiteAi) humanColor = 'w';
    else if (isWhiteAi && !isBlackAi) humanColor = 'b';

    const humanName = humanColor === 'w' ? whiteName : blackName;
    const opponentName = humanColor === 'w' ? blackName : whiteName;

    // Extract AI level & model
    let aiLevel = game.aiLevel || 1;
    const lvlMatch = (roomId + ' ' + opponentName).match(/Lv\.?\s*(\d+)/i);
    if (lvlMatch) aiLevel = parseInt(lvlMatch[1], 10);

    const aiModel = game.aiModel || (/stockfish/i.test(opponentName) ? 'stockfish' : 'minimax');
    const mode = isAiGame ? 'ai' : (roomId === '로컬 2인' || game.mode === 'local' ? 'local' : 'wifi');

    // Determine outcome for human player
    let outcome = 'draw';
    if (game.winner === 'w') outcome = humanColor === 'w' ? 'win' : 'loss';
    else if (game.winner === 'b') outcome = humanColor === 'b' ? 'win' : 'loss';

    // Replay moves to detect mistakes, blunders, phase weaknesses, and lost pieces
    const chess = new Chess();
    const sign = humanColor === 'w' ? 1 : -1;

    let playerMovesCount = 0;
    let goodMoves = 0;
    let inaccuracies = 0;
    let mistakes = 0;
    let blunders = 0;
    let tacticalDrops = {
      hangingPiece: 0,    // 기물 공짜 헌납 / 사각지대 피격
      missedCapture: 0,   // 유리한 기물 포획 찬스 놓침
      kingSafety: 0,      // 킹 수비 및 체크 방어 취약
      positional: 0       // 중앙/진영 전개 열세
    };

    const phaseMistakes = { opening: 0, middlegame: 0, endgame: 0 };
    const phaseMoves = { opening: 0, middlegame: 0, endgame: 0 };
    const lostPieces = { q: 0, r: 0, b: 0, n: 0, p: 0 };
    const capturedByHuman = { q: 0, r: 0, b: 0, n: 0, p: 0 };
    const keyMistakes = [];

    for (let i = 0; i < history.length; i++) {
      const m = history[i];
      const moveNum = Math.floor(i / 2) + 1;
      const phase = moveNum <= 10 ? 'opening' : (moveNum <= 25 ? 'middlegame' : 'endgame');

      let bestCaptureMove = null;
      let bestCaptureVal = 0;
      const evalBefore = evaluateBoardFast(chess) * sign;

      if (m.color === humanColor) {
        phaseMoves[phase]++;
        playerMovesCount++;
        // Check if human had a high-value capture available
        const legalBefore = chess.moves({ verbose: true });
        for (const cand of legalBefore) {
          if (cand.captured) {
            const cVal = PIECE_VALUES[cand.captured] || 100;
            const attackerVal = PIECE_VALUES[cand.piece] || 100;
            // Favorable or equal capture
            if (cVal >= 300 && cVal >= attackerVal - 50 && cVal > bestCaptureVal) {
              bestCaptureVal = cVal;
              bestCaptureMove = cand;
            }
          }
        }
      }

      // Apply the actual move
      let applied = null;
      try {
        applied = chess.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
      } catch (e) {
        if (m.san) {
          try { applied = chess.move(m.san); } catch (err) {}
        }
      }
      if (!applied) break;

      if (m.color !== humanColor) {
        if (applied.captured && lostPieces[applied.captured] !== undefined) {
          lostPieces[applied.captured]++;
        }
      } else {
        if (applied.captured && capturedByHuman[applied.captured] !== undefined) {
          capturedByHuman[applied.captured]++;
        }

        const evalAfterImmediate = evaluateBoardFast(chess) * sign;
        // Check opponent's immediate threats / captures after human's move
        const oppLegal = chess.moves({ verbose: true });
        let maxOppThreatVal = 0;
        let threatenedPiece = null;
        let allowsMate = false;

        for (const oppM of oppLegal) {
          if (oppM.san && oppM.san.includes('#')) {
            allowsMate = true;
          }
          if (oppM.captured) {
            const capVal = PIECE_VALUES[oppM.captured] || 100;
            // If opponent captures the piece we just moved or a major piece
            if (oppM.to === applied.to || capVal >= 300) {
              if (capVal > maxOppThreatVal) {
                maxOppThreatVal = capVal;
                threatenedPiece = oppM.captured;
              }
            }
          }
        }

        const nextMove = history[i + 1];
        const nextCapturedVal = (nextMove && nextMove.captured) ? (PIECE_VALUES[nextMove.captured] || 0) : 0;
        const humanCapturedVal = applied.captured ? (PIECE_VALUES[applied.captured] || 0) : 0;

        // Net material/positional loss on this turn
        let evalDrop = 0;
        if (allowsMate) {
          evalDrop = 600;
        } else if (nextCapturedVal > humanCapturedVal + 150) {
          evalDrop = nextCapturedVal - humanCapturedVal;
        } else if (maxOppThreatVal > humanCapturedVal + 200) {
          evalDrop = (maxOppThreatVal - humanCapturedVal) * 0.85;
        } else if (bestCaptureVal >= 320 && humanCapturedVal === 0) {
          evalDrop = bestCaptureVal * 0.65;
        } else {
          evalDrop = Math.max(0, evalBefore - evalAfterImmediate);
        }

        const pName = PIECE_NAMES_KO[applied.piece] || '기물';
        const phaseLabel = phase === 'opening' ? '초반(오프닝)' : (phase === 'middlegame' ? '중반(전술교전)' : '종반(엔드게임)');

        if (evalDrop >= 260) {
          blunders++;
          phaseMistakes[phase]++;
          let reasonText = `${moveNum}수(${phaseLabel})에서 ${pName}(${m.from}➔${m.to}) 착수 후 상대의 반격에 주요 기물 손실이 발생했습니다.`;
          if (allowsMate) {
            tacticalDrops.kingSafety++;
            reasonText = `${moveNum}수(${phaseLabel})에서 킹 수비 라인이 뚫려 상대에게 체크메이트 찬스를 허용했습니다.`;
          } else if (nextMove && nextMove.captured && PIECE_VALUES[nextMove.captured] >= 300) {
            tacticalDrops.hangingPiece++;
            const lostName = PIECE_NAMES_KO[nextMove.captured] || '기물';
            reasonText = `${moveNum}수(${phaseLabel}) ${pName}(${m.from}➔${m.to}) 이동 후 상대에게 귀중한 [${lostName}]을(를) 내주었습니다.`;
          } else if (threatenedPiece) {
            tacticalDrops.hangingPiece++;
            const thrName = PIECE_NAMES_KO[threatenedPiece] || '기물';
            reasonText = `${moveNum}수(${phaseLabel}) ${pName}(${m.from}➔${m.to}) 착수로 [${thrName}]이(가) 상대 공격 사정거리에 노출되었습니다.`;
          } else if (bestCaptureMove) {
            tacticalDrops.missedCapture++;
            const missedName = PIECE_NAMES_KO[bestCaptureMove.captured] || '기물';
            reasonText = `${moveNum}수(${phaseLabel})에서 상대 [${missedName}] 포획 찬스(${bestCaptureMove.san})를 놓쳤습니다.`;
          }

          if (keyMistakes.length < 4) {
            keyMistakes.push({
              moveNumber: moveNum,
              phase,
              phaseLabel,
              san: applied.san,
              from: m.from,
              to: m.to,
              piece: applied.piece,
              pieceName: pName,
              bestSan: bestCaptureMove ? bestCaptureMove.san : null,
              severity: 'blunder',
              evalDrop: Math.round(evalDrop / 10) / 10,
              reason: reasonText
            });
          }
        } else if (evalDrop >= 130) {
          mistakes++;
          phaseMistakes[phase]++;
          let reasonText = `${moveNum}수(${phaseLabel}) ${pName}(${m.from}➔${m.to}) 착수로 기물 방어선이나 중앙 주도권이 약화되었습니다.`;
          if (bestCaptureMove) {
            tacticalDrops.missedCapture++;
            const missedName = PIECE_NAMES_KO[bestCaptureMove.captured] || '기물';
            reasonText = `${moveNum}수(${phaseLabel})에서 상대 [${missedName}] 포획 기회(${bestCaptureMove.san})를 놓쳤습니다.`;
          } else {
            tacticalDrops.positional++;
          }

          if (keyMistakes.length < 4) {
            keyMistakes.push({
              moveNumber: moveNum,
              phase,
              phaseLabel,
              san: applied.san,
              from: m.from,
              to: m.to,
              piece: applied.piece,
              pieceName: pName,
              bestSan: bestCaptureMove ? bestCaptureMove.san : null,
              severity: 'mistake',
              evalDrop: Math.round(evalDrop / 10) / 10,
              reason: reasonText
            });
          }
        } else if (evalDrop >= 50) {
          inaccuracies++;
          tacticalDrops.positional++;
        } else {
          goodMoves++;
        }
      }
    }

    // Calculate move accuracy (0 ~ 100%)
    const weightedPoints = (goodMoves * 100) + (inaccuracies * 68) + (mistakes * 32) + (blunders * 0);
    const accuracy = playerMovesCount > 0
      ? Math.max(15, Math.min(100, Math.round(weightedPoints / playerMovesCount)))
      : 80;

    // Play duration (seconds)
    const durationSeconds = (typeof game.durationSeconds === 'number' && game.durationSeconds > 0)
      ? Math.round(game.durationSeconds)
      : Math.max(25, Math.round(totalMoves * 8.5));

    // Helper usage (Best move hints & Undos)
    const hintsUsed = typeof game.hintsUsed === 'number' ? Math.max(0, game.hintsUsed) : 0;
    const undosUsed = typeof game.undosUsed === 'number' ? Math.max(0, game.undosUsed) : 0;
    const totalHelpersUsed = hintsUsed + undosUsed;

    // Comprehensive Skill Score Calculation
    // 1. Base opponent rating
    let baseOpponentScore = 850;
    if (mode === 'ai') {
      const levelScores = { 1: 600, 2: 780, 3: 1000, 4: 1220, 5: 1450 };
      baseOpponentScore = levelScores[aiLevel] || 750;
      if (aiModel === 'stockfish') baseOpponentScore += 200;
    } else if (mode === 'wifi') {
      baseOpponentScore = 1000;
    } else {
      baseOpponentScore = 900;
    }

    // 2. Result & Endurance (how many moves played with this opponent)
    let resultBonus = 0;
    if (outcome === 'win') {
      resultBonus = 240;
      if (playerMovesCount <= 22 && playerMovesCount >= 4) resultBonus += 50; // Quick decisive win
    } else if (outcome === 'draw') {
      resultBonus = 80;
    } else {
      resultBonus = -60;
    }

    // Endurance bonus: going deep in moves (especially against higher levels)
    const enduranceBonus = Math.min(180, Math.round(playerMovesCount * (1.8 + aiLevel * 0.5)));

    // 3. Accuracy bonus
    const accuracyBonus = Math.round((accuracy - 65) * 2.2);

    // 4. Helper (Hint / Undo) adjustment
    let helperAdjustment = 0;
    if (totalHelpersUsed === 0 && playerMovesCount >= 5) {
      helperAdjustment = 90; // Pure self-reliant bonus
    } else {
      helperAdjustment = -Math.min(360, (hintsUsed * 22) + (undosUsed * 28));
    }

    const skillScore = Math.max(300, Math.round(
      baseOpponentScore + resultBonus + enduranceBonus + accuracyBonus + helperAdjustment
    ));

    return {
      mode,
      humanColor,
      humanName,
      opponentName,
      aiModel,
      aiLevel,
      outcome,
      playerMovesCount,
      totalMoves,
      durationSeconds,
      hintsUsed,
      undosUsed,
      totalHelpersUsed,
      cleanPlay: totalHelpersUsed === 0,
      accuracy,
      goodMoves,
      inaccuracies,
      mistakes,
      blunders,
      phaseMistakes,
      phaseMoves,
      tacticalDrops,
      lostPieces,
      capturedByHuman,
      keyMistakes,
      skillScore
    };
  } catch (err) {
    console.error('Error in analyzeGameRecord:', err);
    return {
      mode: 'ai',
      humanColor: 'w',
      humanName: game.white || '플레이어 1',
      opponentName: game.black || 'AI',
      aiModel: 'minimax',
      aiLevel: 1,
      outcome: 'draw',
      playerMovesCount: Math.ceil((game.totalMoves || 10) / 2),
      totalMoves: game.totalMoves || 10,
      durationSeconds: game.durationSeconds || 90,
      hintsUsed: game.hintsUsed || 0,
      undosUsed: game.undosUsed || 0,
      totalHelpersUsed: (game.hintsUsed || 0) + (game.undosUsed || 0),
      cleanPlay: ((game.hintsUsed || 0) + (game.undosUsed || 0)) === 0,
      accuracy: 78,
      goodMoves: 5,
      inaccuracies: 1,
      mistakes: 0,
      blunders: 0,
      phaseMistakes: { opening: 0, middlegame: 0, endgame: 0 },
      phaseMoves: { opening: 5, middlegame: 0, endgame: 0 },
      tacticalDrops: { hangingPiece: 0, missedCapture: 0, kingSafety: 0, positional: 0 },
      lostPieces: { q: 0, r: 0, b: 0, n: 0, p: 0 },
      capturedByHuman: { q: 0, r: 0, b: 0, n: 0, p: 0 },
      keyMistakes: [],
      skillScore: 750
    };
  }
}

export function getSkillTierInfo(rating) {
  if (rating >= 1500) return { tier: '그랜드마스터', badge: '👑 그랜드마스터', color: '#f43f5e' };
  if (rating >= 1250) return { tier: '다이아몬드', badge: '💎 다이아몬드', color: '#38bdf8' };
  if (rating >= 1050) return { tier: '플래티넘', badge: '💠 플래티넘', color: '#2dd4bf' };
  if (rating >= 880) return { tier: '골드', badge: '🥇 골드', color: '#fbbf24' };
  if (rating >= 720) return { tier: '실버', badge: '🥈 실버', color: '#cbd5e1' };
  return { tier: '브론즈', badge: '🥉 브론즈', color: '#d97706' };
}

initStorage();

export function readAllGames() {
  try {
    if (!fs.existsSync(GAMES_FILE)) return [];
    const content = fs.readFileSync(GAMES_FILE, 'utf-8');
    const games = JSON.parse(content || '[]');
    let modified = false;
    for (const g of games) {
      if (!g.analytics) {
        g.analytics = analyzeGameRecord(g);
        modified = true;
      }
      if (!g.clientIp) {
        g.clientIp = '우리집 공유(LAN)';
        modified = true;
      }
    }
    if (modified) {
      try {
        fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2), 'utf-8');
      } catch (e) {}
    }
    return games;
  } catch (err) {
    console.error('Error reading games.json:', err);
    return [];
  }
}

export function saveGame(gameRecord) {
  try {
    initStorage();
    const games = readAllGames();
    if (!gameRecord.clientIp) {
      gameRecord.clientIp = '127.0.0.1';
    }
    gameRecord.analytics = analyzeGameRecord(gameRecord);
    games.unshift(gameRecord);

    // Limit to last 500 games to keep file manageable
    const trimmed = games.slice(0, 500);
    fs.writeFileSync(GAMES_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
    return gameRecord;
  } catch (err) {
    console.error('Error saving game:', err);
    return null;
  }
}

export function getGames(limit = 50, offset = 0) {
  const games = readAllGames();
  return {
    total: games.length,
    games: games.slice(offset, offset + limit)
  };
}

export function getGameById(id) {
  const games = readAllGames();
  return games.find(g => g.id === id) || null;
}

// Build rich Analytics & Weakness Report for all Home Profiles (by Player Name & IP)
export function getAnalyticsDashboard(requestIp = '127.0.0.1') {
  const games = readAllGames();

  function buildProfileBucket(key, label, ipTag, type) {
    return {
      key,
      label,
      ipTag,
      type, // 'all' | 'ip' | 'player'
      ips: new Set(),
      names: new Set(),
      totalGames: 0,
      aiGames: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      totalMoves: 0,
      maxMoves: 0,
      maxMovesOpponent: '-',
      totalDurationSeconds: 0,
      totalHintsUsed: 0,
      totalUndosUsed: 0,
      cleanGamesCount: 0,
      accuracySum: 0,
      skillScoreSum: 0,
      bestSkillScore: 0,
      blunders: 0,
      mistakes: 0,
      inaccuracies: 0,
      goodMoves: 0,
      phaseMistakes: { opening: 0, middlegame: 0, endgame: 0 },
      phaseMoves: { opening: 0, middlegame: 0, endgame: 0 },
      tacticalDrops: { hangingPiece: 0, missedCapture: 0, kingSafety: 0, positional: 0 },
      lostPieces: { q: 0, r: 0, b: 0, n: 0, p: 0 },
      opponentsFaced: {},
      recentGames: [],
      skillTrend: []
    };
  }

  const buckets = {
    all: buildProfileBucket('all', '🏠 우리집 전체 통합', '전체 가족 공유', 'all')
  };

  function addGameToBucket(b, g) {
    const a = g.analytics || analyzeGameRecord(g);
    b.totalGames++;
    if (a.mode === 'ai') b.aiGames++;
    if (g.clientIp) b.ips.add(g.clientIp);
    if (a.humanName) b.names.add(a.humanName);

    if (a.outcome === 'win') b.wins++;
    else if (a.outcome === 'draw') b.draws++;
    else b.losses++;

    b.totalMoves += (a.totalMoves || 0);
    if ((a.totalMoves || 0) > b.maxMoves) {
      b.maxMoves = a.totalMoves;
      b.maxMovesOpponent = `${a.opponentName} (${a.totalMoves}수)`;
    }

    b.totalDurationSeconds += (a.durationSeconds || 0);
    b.totalHintsUsed += (a.hintsUsed || 0);
    b.totalUndosUsed += (a.undosUsed || 0);
    if (a.cleanPlay) b.cleanGamesCount++;

    b.accuracySum += (a.accuracy || 75);
    b.skillScoreSum += (a.skillScore || 750);
    if ((a.skillScore || 0) > b.bestSkillScore) b.bestSkillScore = a.skillScore;

    b.blunders += (a.blunders || 0);
    b.mistakes += (a.mistakes || 0);
    b.inaccuracies += (a.inaccuracies || 0);
    b.goodMoves += (a.goodMoves || 0);

    for (const ph of ['opening', 'middlegame', 'endgame']) {
      b.phaseMistakes[ph] += (a.phaseMistakes?.[ph] || 0);
      b.phaseMoves[ph] += (a.phaseMoves?.[ph] || 0);
    }
    for (const td of ['hangingPiece', 'missedCapture', 'kingSafety', 'positional']) {
      b.tacticalDrops[td] += (a.tacticalDrops?.[td] || 0);
    }
    for (const pc of ['q', 'r', 'b', 'n', 'p']) {
      b.lostPieces[pc] += (a.lostPieces?.[pc] || 0);
    }

    const oppKey = a.opponentName || 'AI';
    if (!b.opponentsFaced[oppKey]) {
      b.opponentsFaced[oppKey] = { opponent: oppKey, games: 0, wins: 0, draws: 0, losses: 0, avgMoves: 0, totalMoves: 0 };
    }
    const oppEntry = b.opponentsFaced[oppKey];
    oppEntry.games++;
    oppEntry.totalMoves += (a.totalMoves || 0);
    oppEntry.avgMoves = Math.round(oppEntry.totalMoves / oppEntry.games);
    if (a.outcome === 'win') oppEntry.wins++;
    else if (a.outcome === 'draw') oppEntry.draws++;
    else oppEntry.losses++;

    if (b.recentGames.length < 25) {
      b.recentGames.push({
        id: g.id,
        playedAt: g.playedAt,
        clientIp: g.clientIp || '우리집 공유(LAN)',
        humanName: a.humanName,
        opponentName: a.opponentName,
        mode: a.mode,
        outcome: a.outcome,
        endReason: g.endReason,
        totalMoves: a.totalMoves,
        playerMovesCount: a.playerMovesCount,
        durationSeconds: a.durationSeconds,
        hintsUsed: a.hintsUsed,
        undosUsed: a.undosUsed,
        accuracy: a.accuracy,
        blunders: a.blunders,
        mistakes: a.mistakes,
        skillScore: a.skillScore,
        keyMistakes: a.keyMistakes || []
      });
    }
  }

  for (const g of games) {
    const a = g.analytics || analyzeGameRecord(g);
    addGameToBucket(buckets.all, g);

    // Group by Player Name (so 경원, 원, 귀요미채서연, 민준, 플레이어 1 each have their own tab)
    const pName = a.humanName || '플레이어 1';
    const playerKey = `player:${pName}`;
    if (!buckets[playerKey]) {
      buckets[playerKey] = buildProfileBucket(playerKey, `👤 ${pName}`, g.clientIp || '우리집 LAN', 'player');
    }
    addGameToBucket(buckets[playerKey], g);

    // Group by IP address if specific IP exists
    const ipVal = g.clientIp || '우리집 공유(LAN)';
    if (ipVal && ipVal !== '우리집 공유(LAN)') {
      const ipKey = `ip:${ipVal}`;
      if (!buckets[ipKey]) {
        buckets[ipKey] = buildProfileBucket(ipKey, `📱 기기 IP (${ipVal})`, ipVal, 'ip');
      }
      addGameToBucket(buckets[ipKey], g);
    }
  }

  // Finalize statistics and generate AI Coach Weakness Diagnosis for each bucket
  const finalizedProfiles = Object.values(buckets).map(b => {
    const gamesCount = Math.max(1, b.totalGames);
    const winRate = b.totalGames > 0 ? Number(((b.wins / b.totalGames) * 100).toFixed(1)) : 0;
    const avgMoves = Math.round(b.totalMoves / gamesCount);
    const avgDurationSeconds = Math.round(b.totalDurationSeconds / gamesCount);
    const avgAccuracy = Math.round(b.accuracySum / gamesCount);
    const avgSkillScore = Math.round(b.skillScoreSum / gamesCount);
    // Weighted skill rating: 70% average skill + 30% best performance + experience bonus
    const expBonus = Math.min(120, b.totalGames * 6);
    const skillRating = b.totalGames > 0
      ? Math.round(avgSkillScore * 0.75 + b.bestSkillScore * 0.25 + expBonus)
      : 600;
    const tierInfo = getSkillTierInfo(skillRating);

    const avgHintsPerGame = Number((b.totalHintsUsed / gamesCount).toFixed(1));
    const avgUndosPerGame = Number((b.totalUndosUsed / gamesCount).toFixed(1));
    const cleanPlayRate = Math.round((b.cleanGamesCount / gamesCount) * 100);

    // Calculate phase weakness percentages
    const totalPhaseMistakes = Math.max(1, b.phaseMistakes.opening + b.phaseMistakes.middlegame + b.phaseMistakes.endgame);
    const phaseWeaknessPct = {
      opening: Math.round((b.phaseMistakes.opening / totalPhaseMistakes) * 100),
      middlegame: Math.round((b.phaseMistakes.middlegame / totalPhaseMistakes) * 100),
      endgame: Math.round((b.phaseMistakes.endgame / totalPhaseMistakes) * 100)
    };

    // Determine weakest phase
    let weakestPhase = '중반 전술·수읽기 (11~25수)';
    let weakestPhaseKey = 'middlegame';
    if (b.phaseMistakes.opening >= b.phaseMistakes.middlegame && b.phaseMistakes.opening >= b.phaseMistakes.endgame && b.phaseMistakes.opening > 0) {
      weakestPhase = '초반 오프닝 전개 (1~10수)';
      weakestPhaseKey = 'opening';
    } else if (b.phaseMistakes.endgame > b.phaseMistakes.middlegame && b.phaseMistakes.endgame > b.phaseMistakes.opening) {
      weakestPhase = '종반 엔드게임 마무리 (26수~)';
      weakestPhaseKey = 'endgame';
    }

    // Most vulnerable major piece (excluding pawns)
    const majorPieces = [
      { type: 'q', name: '퀸 (♕)', count: b.lostPieces.q, weight: b.lostPieces.q * 3.0 },
      { type: 'n', name: '나이트 (♘)', count: b.lostPieces.n, weight: b.lostPieces.n * 1.4 },
      { type: 'b', name: '비숍 (♗)', count: b.lostPieces.b, weight: b.lostPieces.b * 1.4 },
      { type: 'r', name: '룩 (♖)', count: b.lostPieces.r, weight: b.lostPieces.r * 1.8 }
    ].sort((x, y) => y.weight - x.weight);

    const mostLostMajor = majorPieces[0] && majorPieces[0].count > 0 ? majorPieces[0] : { type: 'p', name: '폰 (♙)', count: b.lostPieces.p };

    // Build personalized coaching tips
    const diagnosisList = [];
    if (weakestPhaseKey === 'opening') {
      diagnosisList.push({
        icon: '🌱',
        title: `초반 오프닝(1~10수) 실수 비중이 ${phaseWeaknessPct.opening}%로 높습니다`,
        desc: '초반에 퀸이나 같은 기물을 여러 번 움직이기보다, 중앙 폰(e4/d4)을 진출시키고 나이트·비숍을 빠르게 전개한 뒤 10수 이내에 캐슬링(킹 보호)을 완료해보세요.'
      });
    } else if (weakestPhaseKey === 'middlegame') {
      diagnosisList.push({
        icon: '⚔️',
        title: `중반 교전(11~25수)에서 실수의 ${phaseWeaknessPct.middlegame}%가 집중 발생합니다`,
        desc: '기물들이 중앙에서 맞부딪힐 때 상대의 양수겸장(포크)이나 지켜주는 기물이 없는 사각지대(Hanging Piece)에서 손실이 잦습니다. 착수 전 [위협선 표시]를 켜거나 상대의 다음 응수를 꼭 1수 먼저 확인하세요.'
      });
    } else {
      diagnosisList.push({
        icon: '🏁',
        title: `종반전(26수 이후) 뒷심 및 마무리에서 실수(${phaseWeaknessPct.endgame}%)가 발생합니다`,
        desc: '기물이 줄어든 엔드게임에서는 킹을 적극적으로 중앙으로 진출시키고, 폰을 끝까지 전진시켜 퀸으로 승격(프로모션)시키는 전략이 승패를 가릅니다.'
      });
    }

    if (b.tacticalDrops.hangingPiece >= b.tacticalDrops.missedCapture && b.blunders > 0) {
      diagnosisList.push({
        icon: '🛡️',
        title: `주요 손실 기물: [${mostLostMajor.name}] (총 ${mostLostMajor.count}회 손실 · 블런더 ${b.blunders}회)`,
        desc: `공격에만 집중하다가 내 ${mostLostMajor.name}이(가) 상대 공격 사정거리에 공짜로 노출되는 경우가 많습니다. 말을 옮길 칸이 상대 폰이나 비숍·나이트에 지켜지고 있는지 먼저 점검하세요.`
      });
    } else {
      diagnosisList.push({
        icon: '🎯',
        title: `상대 기물 포획 찬스 포착 및 기물 교환 정밀도 향상 필요`,
        desc: `내가 잡을 수 있는 상대 기물을 놓치거나 불리한 등가교환을 하는 경우가 있습니다. 우상단 시계 옆 [💡 최선수] 버튼의 전술 이유 팝업을 통해 포크와 핀 공격 타이밍을 익혀보세요.`
      });
    }

    if (avgHintsPerGame > 1.5 || avgUndosPerGame > 1.0) {
      diagnosisList.push({
        icon: '💡',
        title: `도우미 활용: 경기당 평균 힌트 ${avgHintsPerGame}회 · 무르기 ${avgUndosPerGame}회 사용 중`,
        desc: `최선수 도우미를 통해 좋은 수를 배우고 계십니다! 실력 점수를 한 단계 더 올리려면 힌트 횟수를 경기당 1~2회 이하로 줄여 '무훈수 자력 완주 보너스(+90점)'에 도전해보세요.`
      });
    } else {
      diagnosisList.push({
        icon: '✨',
        title: `높은 자력 대국 비율 (${cleanPlayRate}% 무훈수 완주 · 평균 정확도 ${avgAccuracy}%)`,
        desc: `도우미 의존도가 낮고 스스로 수읽기를 해내는 능력이 훌륭합니다! 현재 최고 ${b.maxMovesOpponent}까지 겨루셨으며, 한 단계 높은 AI 레벨에 도전해보세요.`
      });
    }

    // Skill trend (oldest to newest of last 12 games)
    const skillTrend = b.recentGames.slice(0, 12).reverse().map((rg, idx) => ({
      index: idx + 1,
      id: rg.id,
      playedAt: rg.playedAt,
      opponent: rg.opponentName,
      moves: rg.totalMoves,
      outcome: rg.outcome,
      hintsUsed: rg.hintsUsed,
      accuracy: rg.accuracy,
      skillScore: rg.skillScore
    }));

    return {
      key: b.key,
      label: b.label,
      ipTag: Array.from(b.ips).join(', ') || b.ipTag,
      names: Array.from(b.names),
      type: b.type,
      totalGames: b.totalGames,
      aiGames: b.aiGames,
      wins: b.wins,
      draws: b.draws,
      losses: b.losses,
      winRate,
      totalMoves: b.totalMoves,
      avgMoves,
      maxMoves: b.maxMoves,
      maxMovesOpponent: b.maxMovesOpponent,
      totalDurationSeconds: b.totalDurationSeconds,
      avgDurationSeconds,
      totalHintsUsed: b.totalHintsUsed,
      totalUndosUsed: b.totalUndosUsed,
      avgHintsPerGame,
      avgUndosPerGame,
      cleanGamesCount: b.cleanGamesCount,
      cleanPlayRate,
      avgAccuracy,
      avgSkillScore,
      bestSkillScore: b.bestSkillScore,
      skillRating,
      tier: tierInfo.tier,
      tierBadge: tierInfo.badge,
      tierColor: tierInfo.color,
      blunders: b.blunders,
      mistakes: b.mistakes,
      inaccuracies: b.inaccuracies,
      goodMoves: b.goodMoves,
      phaseMistakes: b.phaseMistakes,
      phaseMoves: b.phaseMoves,
      phaseWeaknessPct,
      weakestPhase,
      tacticalDrops: b.tacticalDrops,
      lostPieces: b.lostPieces,
      mostLostMajor,
      opponentsList: Object.values(b.opponentsFaced).sort((x, y) => y.games - x.games),
      diagnosisList,
      skillTrend,
      recentGames: b.recentGames
    };
  });

  // Sort profiles: 'all' first, then requester's IP if present, then by totalGames desc
  finalizedProfiles.sort((a, b) => {
    if (a.key === 'all') return -1;
    if (b.key === 'all') return 1;
    if (a.key === `ip:${requestIp}`) return -1;
    if (b.key === `ip:${requestIp}`) return 1;
    return b.totalGames - a.totalGames;
  });

  return {
    myIp: requestIp,
    totalGamesStored: games.length,
    profiles: finalizedProfiles
  };
}

export function getLeaderboard() {
  const games = readAllGames();
  const playerMap = {};

  for (const game of games) {
    const white = (game.white || '').trim();
    const black = (game.black || '').trim();
    const winner = game.winner; // 'w', 'b', 'draw'
    const date = game.playedAt;
    const a = game.analytics || analyzeGameRecord(game);

    const processPlayer = (name, isWhite) => {
      if (!name) return;
      if (!playerMap[name]) {
        playerMap[name] = {
          name,
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          score: 0,
          winRate: 0,
          totalMoves: 0,
          totalDurationSeconds: 0,
          totalHints: 0,
          skillScoreSum: 0,
          avgSkillScore: 0,
          recent: [],
          lastPlayed: date
        };
      }

      const p = playerMap[name];
      p.games += 1;
      p.totalMoves += (game.totalMoves || 0);
      p.totalDurationSeconds += (a.durationSeconds || 0);
      if ((isWhite && a.humanColor === 'w') || (!isWhite && a.humanColor === 'b')) {
        p.totalHints += (a.hintsUsed || 0);
        p.skillScoreSum += (a.skillScore || 750);
      } else {
        p.skillScoreSum += 800;
      }

      if (!p.lastPlayed || new Date(date) > new Date(p.lastPlayed)) {
        p.lastPlayed = date;
      }

      let result = 'D';
      if (winner === 'draw') {
        p.draws += 1;
        p.score += 0.5;
        result = 'D';
      } else if ((winner === 'w' && isWhite) || (winner === 'b' && !isWhite)) {
        p.wins += 1;
        p.score += 1.0;
        result = 'W';
      } else {
        p.losses += 1;
        result = 'L';
      }

      if (p.recent.length < 5) {
        p.recent.push(result);
      }
    };

    processPlayer(white, true);
    processPlayer(black, false);
  }

  const leaderboard = Object.values(playerMap).map(p => {
    const rate = p.games > 0 ? ((p.wins / p.games) * 100).toFixed(1) : '0.0';
    const avgSkill = p.games > 0 ? Math.round(p.skillScoreSum / p.games) : 700;
    const tierInfo = getSkillTierInfo(avgSkill);
    return {
      ...p,
      winRate: parseFloat(rate),
      avgMoves: p.games > 0 ? Math.round(p.totalMoves / p.games) : 0,
      avgSkillScore: avgSkill,
      tierBadge: tierInfo.badge
    };
  });

  leaderboard.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.games - a.games;
  });

  return leaderboard;
}

export function getChessSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return {};
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8') || '{}');
  } catch (err) {
    return {};
  }
}

export function saveChessSettings(settings) {
  try {
    initStorage();
    const current = getChessSettings();
    const updated = { ...current, ...settings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    return {};
  }
}

// ================= PER-IP ACTIVE SESSION STORAGE =================
function sanitizeIp(ip) {
  if (!ip) return '127.0.0.1';
  const cleaned = String(ip).replace(/^.*:/, '').trim();
  const safe = cleaned.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return safe || '127.0.0.1';
}

export function saveActiveSession(ip, sessionData) {
  try {
    initStorage();
    const safeIp = sanitizeIp(ip);
    const filePath = path.join(SESSIONS_DIR, `${safeIp}.json`);
    const record = {
      ...sessionData,
      ip: String(ip).replace(/^.*:/, '').trim(),
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
    return record;
  } catch (err) {
    console.error('Error saving active session:', err);
    return null;
  }
}

export function getActiveSession(ip) {
  try {
    const safeIp = sanitizeIp(ip);
    const filePath = path.join(SESSIONS_DIR, `${safeIp}.json`);
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || 'null');
  } catch (err) {
    console.error('Error reading active session:', err);
    return null;
  }
}

export function deleteActiveSession(ip) {
  try {
    const safeIp = sanitizeIp(ip);
    const filePath = path.join(SESSIONS_DIR, `${safeIp}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error deleting active session:', err);
    return false;
  }
}
