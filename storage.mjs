import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');

// Ensure data directory and file exist
function initStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(GAMES_FILE)) {
    fs.writeFileSync(GAMES_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

initStorage();

export function readAllGames() {
  try {
    if (!fs.existsSync(GAMES_FILE)) return [];
    const content = fs.readFileSync(GAMES_FILE, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading games.json:', err);
    return [];
  }
}

export function saveGame(gameRecord) {
  try {
    initStorage();
    const games = readAllGames();
    // Add to beginning of array so newest games appear first
    games.unshift(gameRecord);

    // Limit to last 500 games to keep file manageable
    const trimmed = games.slice(0, 500);
    fs.writeFileSync(GAMES_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving game:', err);
    return false;
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

export function getLeaderboard() {
  const games = readAllGames();
  const playerMap = {};

  for (const game of games) {
    const white = (game.white || '').trim();
    const black = (game.black || '').trim();
    const winner = game.winner; // 'w', 'b', 'draw'
    const date = game.playedAt;

    const processPlayer = (name, isWhite) => {
      if (!name) return;
      if (!playerMap[name]) {
        playerMap[name] = {
          name,
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          score: 0, // wins * 1 + draws * 0.5
          winRate: 0,
          recent: [], // max 5 recent outcomes
          lastPlayed: date
        };
      }

      const p = playerMap[name];
      p.games += 1;

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

  // Calculate win rates and sort
  const leaderboard = Object.values(playerMap).map(p => {
    const rate = p.games > 0 ? ((p.wins / p.games) * 100).toFixed(1) : '0.0';
    return {
      ...p,
      winRate: parseFloat(rate)
    };
  });

  // Sort criteria:
  // 1. Total score (wins + draws * 0.5) desc
  // 2. Total wins desc
  // 3. Win rate desc
  // 4. Total games desc
  leaderboard.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.games - a.games;
  });

  return leaderboard;
}

const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

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
