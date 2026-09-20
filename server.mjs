import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { networkInterfaces } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { Chess } from 'chess.js';
import { saveGame, getGames, getGameById, getLeaderboard } from './storage.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 10151;

app.use(express.json());
app.use('/chess', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// Helper to get local IP addresses
function getLocalIPs() {
  const nets = networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    // Deprioritize virtual bridges (virbr, docker, veth)
    const isVirtual = name.startsWith('virbr') || name.startsWith('docker') || name.startsWith('veth') || name.startsWith('br-');
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push({
          interface: name,
          address: net.address,
          url: `http://${net.address}:${PORT}`,
          isVirtual,
          isHomeWifi: net.address.startsWith('172.30.') || net.address.startsWith('192.168.')
        });
      }
    }
  }

  // Sort: Home WiFi (172.30.x / 192.168.x) physical first, then others, virtual last
  results.sort((a, b) => {
    if (a.isHomeWifi && !b.isHomeWifi) return -1;
    if (!a.isHomeWifi && b.isHomeWifi) return 1;
    if (!a.isVirtual && b.isVirtual) return -1;
    if (a.isVirtual && !b.isVirtual) return 1;
    return 0;
  });

  // Fallback if none found
  if (results.length === 0) {
    results.push({
      interface: 'localhost',
      address: '127.0.0.1',
      url: `http://127.0.0.1:${PORT}`,
      isVirtual: false,
      isHomeWifi: false
    });
  }
  return results;
}

// API to get network info and quick QR code
const handleInfo = async (req, res) => {
  const ips = getLocalIPs();
  const primaryUrl = ips[0] ? ips[0].url : `http://127.0.0.1:${PORT}`;
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(primaryUrl, {
      margin: 1,
      color: {
        dark: '#1e293b',
        light: '#f8fafc'
      }
    });
  } catch (err) {
    console.error('QR code generation error:', err);
  }

  res.json({
    port: PORT,
    ips,
    primaryUrl,
    qrCode: qrCodeDataUrl,
    activeRooms: Object.keys(rooms).length
  });
};

const handleQr = async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'url parameter required' });
  }
  try {
    const qrCode = await QRCode.toDataURL(targetUrl, {
      margin: 1,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
    res.json({ qrCode });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

app.get('/api/info', handleInfo);
app.get('/chess/api/info', handleInfo);
app.get('/api/qr', handleQr);
app.get('/chess/api/qr', handleQr);

// Game history and leaderboard APIs
app.get(['/api/games', '/chess/api/games'], (req, res) => {
  res.json(getGames(100));
});
app.post(['/api/games', '/chess/api/games'], (req, res) => {
  // Save AI/local game from client
  const gameRecord = req.body;
  if (!gameRecord || !gameRecord.history || gameRecord.history.length === 0) {
    return res.status(400).json({ error: 'Invalid game record' });
  }
  // Ensure ID
  if (!gameRecord.id) {
    gameRecord.id = `game_${Date.now()}_local`;
  }
  saveGame(gameRecord);
  res.json({ ok: true, id: gameRecord.id });
});
app.get(['/api/games/:id', '/chess/api/games/:id'], (req, res) => {
  const g = getGameById(req.params.id);
  if (!g) return res.status(404).json({ error: 'Game not found' });
  res.json(g);
});
app.get(['/api/leaderboard', '/chess/api/leaderboard'], (req, res) => {
  res.json({ leaderboard: getLeaderboard() });
});
app.get(['/api/settings', '/chess/api/settings'], (req, res) => {
  res.json(getChessSettings());
});
app.post(['/api/settings', '/chess/api/settings'], (req, res) => {
  const updated = saveChessSettings(req.body || {});
  res.json({ ok: true, settings: updated });
});

/*
  Room Data Structure:
  rooms[roomId] = {
    id: roomId,
    name: string,
    chess: Chess instance,
    timeControl: { initial: number (seconds), increment: number },
    white: { id, name, ws, timeLeft, lastMoveTime },
    black: { id, name, ws, timeLeft, lastMoveTime },
    spectators: [ { id, name, ws } ],
    status: 'waiting' | 'playing' | 'ended',
    winner: 'w' | 'b' | 'draw' | null,
    endReason: string,
    turn: 'w' | 'b',
    timerInterval: timer,
    moves: [],
    drawOffer: null, // 'w' | 'b'
    rematchOffer: { w: false, b: false },
    createdAt: timestamp
  }
*/
const rooms = {};
const clientRooms = new Map(); // ws -> { roomId, playerId }

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms[id] ? generateRoomId() : id;
}

function broadcastRoomState(room) {
  const state = {
    type: 'room_state',
    roomId: room.id,
    name: room.name,
    fen: room.chess.fen(),
    history: room.chess.history({ verbose: true }),
    turn: room.chess.turn(),
    isCheck: room.chess.inCheck(),
    isGameOver: room.chess.isGameOver(),
    status: room.status,
    winner: room.winner,
    endReason: room.endReason,
    timeControl: room.timeControl,
    white: room.white ? { id: room.white.id, name: room.white.name, timeLeft: room.white.timeLeft, connected: !!room.white.ws } : null,
    black: room.black ? { id: room.black.id, name: room.black.name, timeLeft: room.black.timeLeft, connected: !!room.black.ws } : null,
    spectatorCount: room.spectators.length,
    drawOffer: room.drawOffer,
    rematchOffer: room.rematchOffer
  };

  const payload = JSON.stringify(state);

  if (room.white && room.white.ws && room.white.ws.readyState === WebSocket.OPEN) {
    room.white.ws.send(payload);
  }
  if (room.black && room.black.ws && room.black.ws.readyState === WebSocket.OPEN) {
    room.black.ws.send(payload);
  }
  for (const spec of room.spectators) {
    if (spec.ws && spec.ws.readyState === WebSocket.OPEN) {
      spec.ws.send(payload);
    }
  }
}

function sendToRoom(room, msg) {
  const payload = JSON.stringify(msg);
  if (room.white?.ws?.readyState === WebSocket.OPEN) room.white.ws.send(payload);
  if (room.black?.ws?.readyState === WebSocket.OPEN) room.black.ws.send(payload);
  for (const spec of room.spectators) {
    if (spec.ws?.readyState === WebSocket.OPEN) spec.ws.send(payload);
  }
}

function startRoomTimer(room) {
  if (room.timeControl.initial <= 0) return; // Unlimited
  if (room.timerInterval) clearInterval(room.timerInterval);

  room.timerInterval = setInterval(() => {
    if (room.status !== 'playing') {
      clearInterval(room.timerInterval);
      return;
    }

    const currentTurn = room.chess.turn(); // 'w' or 'b'
    const player = currentTurn === 'w' ? room.white : room.black;

    if (player) {
      player.timeLeft = Math.max(0, player.timeLeft - 1);

      // Notify clock tick every second
      sendToRoom(room, {
        type: 'clock_tick',
        turn: currentTurn,
        whiteTime: room.white ? room.white.timeLeft : 0,
        blackTime: room.black ? room.black.timeLeft : 0
      });

      if (player.timeLeft <= 0) {
        clearInterval(room.timerInterval);
        room.status = 'ended';
        room.winner = currentTurn === 'w' ? 'b' : 'w';
        room.endReason = '시간 초과 (Time Out)';
        recordGameResult(room);
        broadcastRoomState(room);
        broadcastRoomList();
      }
    }
  }, 1000);
}

function stopRoomTimer(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
}

function recordGameResult(room) {
  if (!room || room.saved) return;
  const history = room.chess.history({ verbose: true });
  if (!history || history.length === 0) return;

  room.saved = true;
  const whiteName = room.white?.name || '백 (White)';
  const blackName = room.black?.name || '흑 (Black)';
  let winnerName = '무승부';
  if (room.winner === 'w') winnerName = whiteName;
  else if (room.winner === 'b') winnerName = blackName;

  const gameRecord = {
    id: `game_${Date.now()}_${room.id}`,
    roomId: room.id,
    playedAt: new Date().toISOString(),
    white: whiteName,
    black: blackName,
    winner: room.winner,
    winnerName,
    endReason: room.endReason || '대국 종료',
    totalMoves: history.length,
    fen: room.chess.fen(),
    pgn: room.chess.pgn(),
    timeControl: room.timeControl ? `${Math.round(room.timeControl.initial / 60)}분` : '무제한',
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

  saveGame(gameRecord);
}

function getRoomListData() {
  return Object.values(rooms).map(r => ({
    id: r.id,
    name: r.name,
    status: r.status,
    host: r.white?.name || r.black?.name || '익명',
    players: (r.white ? 1 : 0) + (r.black ? 1 : 0),
    timeControl: r.timeControl
  }));
}

function broadcastRoomList() {
  const payload = JSON.stringify({ type: 'room_list', rooms: getRoomListData() });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  // Send current room list on connect
  ws.send(JSON.stringify({ type: 'room_list', rooms: getRoomListData() }));

  ws.on('message', (messageText) => {
    let data;
    try {
      data = JSON.parse(messageText);
    } catch (e) {
      return;
    }

    const { type } = data;

    // 1. Create Room
    if (type === 'create_room') {
      const roomId = generateRoomId();
      const initialTime = data.timeMinutes ? parseInt(data.timeMinutes) * 60 : 600; // default 10m
      const increment = data.incrementSeconds ? parseInt(data.incrementSeconds) : 0;
      const playerName = data.playerName || '플레이어 1';
      const preferredColor = data.preferredColor || 'random'; // 'w', 'b', 'random'

      let assignedColor = preferredColor;
      if (assignedColor === 'random') {
        assignedColor = Math.random() < 0.5 ? 'w' : 'b';
      }

      const room = {
        id: roomId,
        name: data.roomName || `${playerName}의 체스방`,
        chess: new Chess(),
        timeControl: { initial: initialTime, increment },
        white: null,
        black: null,
        spectators: [],
        status: 'waiting',
        winner: null,
        endReason: '',
        turn: 'w',
        timerInterval: null,
        drawOffer: null,
        rematchOffer: { w: false, b: false },
        createdAt: Date.now()
      };

      const playerObj = {
        id: data.playerId || Math.random().toString(36).substring(2, 9),
        name: playerName,
        ws: ws,
        timeLeft: initialTime
      };

      if (assignedColor === 'w') {
        room.white = playerObj;
      } else {
        room.black = playerObj;
      }

      rooms[roomId] = room;
      clientRooms.set(ws, { roomId, playerId: playerObj.id, role: assignedColor });

      ws.send(JSON.stringify({
        type: 'room_created',
        roomId,
        yourRole: assignedColor,
        playerId: playerObj.id
      }));

      broadcastRoomState(room);
      broadcastRoomList();
    }

    // 2. Join Room
    else if (type === 'join_room') {
      const roomId = (data.roomId || '').toUpperCase().trim();
      const room = rooms[roomId];
      const playerName = data.playerName || '게스트';
      const playerId = data.playerId || Math.random().toString(36).substring(2, 9);

      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: '방 번호를 찾을 수 없습니다.' }));
        return;
      }

      // Check if reconnecting existing player
      let role = null;
      if (room.white && room.white.id === playerId) {
        room.white.ws = ws;
        role = 'w';
      } else if (room.black && room.black.id === playerId) {
        room.black.ws = ws;
        role = 'b';
      } else if (!room.white) {
        room.white = { id: playerId, name: playerName, ws, timeLeft: room.timeControl.initial };
        role = 'w';
      } else if (!room.black) {
        room.black = { id: playerId, name: playerName, ws, timeLeft: room.timeControl.initial };
        role = 'b';
      } else {
        // Spectator
        role = 'spectator';
        room.spectators.push({ id: playerId, name: playerName, ws });
      }

      clientRooms.set(ws, { roomId, playerId, role });

      // If both white and black are ready and was waiting, start the game
      if (room.white && room.black && room.status === 'waiting') {
        room.status = 'playing';
        startRoomTimer(room);
      }

      ws.send(JSON.stringify({
        type: 'room_joined',
        roomId,
        yourRole: role,
        playerId
      }));

      broadcastRoomState(room);
      broadcastRoomList();
    }

    // 3. Make Move
    else if (type === 'make_move') {
      const client = clientRooms.get(ws);
      if (!client) return;
      const room = rooms[client.roomId];
      if (!room || room.status !== 'playing') return;

      const currentTurn = room.chess.turn();
      const isPlayerTurn = (currentTurn === 'w' && room.white?.id === client.playerId) ||
                           (currentTurn === 'b' && room.black?.id === client.playerId);

      if (!isPlayerTurn) {
        ws.send(JSON.stringify({ type: 'error', message: '자신의 차례가 아닙니다.' }));
        return;
      }

      try {
        const moveResult = room.chess.move({
          from: data.from,
          to: data.to,
          promotion: data.promotion || 'q'
        });

        if (!moveResult) {
          ws.send(JSON.stringify({ type: 'error', message: '올바르지 않은 수입니다.' }));
          return;
        }

        // Apply increment
        const player = currentTurn === 'w' ? room.white : room.black;
        if (player && room.timeControl.increment > 0) {
          player.timeLeft += room.timeControl.increment;
        }

        // Clear any active draw offers
        room.drawOffer = null;

        // Check for Game Over conditions
        if (room.chess.isGameOver()) {
          stopRoomTimer(room);
          room.status = 'ended';
          if (room.chess.isCheckmate()) {
            room.winner = currentTurn; // The player who just moved won
            room.endReason = '체크메이트 (Checkmate)';
          } else if (room.chess.isDraw()) {
            room.winner = 'draw';
            if (room.chess.isStalemate()) {
              room.endReason = '스테일메이트 (Stalemate)';
            } else if (room.chess.isThreefoldRepetition()) {
              room.endReason = '3회 동형 반복 무승부 (Threefold Repetition)';
            } else if (room.chess.isInsufficientMaterial()) {
              room.endReason = '기물 부족 무승부 (Insufficient Material)';
            } else {
              room.endReason = '50수 무승부 규칙 (50-move Rule)';
            }
          }
          recordGameResult(room);
          broadcastRoomList();
        }

        broadcastRoomState(room);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: err.message || '체스 이동 오류' }));
      }
    }

    // 4. Resign
    else if (type === 'resign') {
      const client = clientRooms.get(ws);
      if (!client) return;
      const room = rooms[client.roomId];
      if (!room || room.status !== 'playing') return;

      stopRoomTimer(room);
      room.status = 'ended';
      if (room.white?.id === client.playerId) {
        room.winner = 'b';
        room.endReason = `${room.white.name} 백 기권`;
      } else if (room.black?.id === client.playerId) {
        room.winner = 'w';
        room.endReason = `${room.black.name} 흑 기권`;
      }
      recordGameResult(room);
      broadcastRoomState(room);
      broadcastRoomList();
    }

    // 5. Draw Offers
    else if (type === 'offer_draw') {
      const client = clientRooms.get(ws);
      if (!client) return;
      const room = rooms[client.roomId];
      if (!room || room.status !== 'playing') return;

      const side = (room.white?.id === client.playerId) ? 'w' : (room.black?.id === client.playerId) ? 'b' : null;
      if (!side) return; // Spectators cannot offer draw

      // Prevent duplicate offers if already pending
      if (room.drawOffer) {
        ws.send(JSON.stringify({ type: 'toast', message: '이미 무승부 제안이 진행 중입니다.' }));
        return;
      }

      room.drawOffer = side;
      broadcastRoomState(room);
    }
    else if (type === 'respond_draw') {
      const client = clientRooms.get(ws);
      if (!client) return;
      const room = rooms[client.roomId];
      if (!room || room.status !== 'playing') return;

      // Only the opponent (who didn't offer) can respond
      const side = (room.white?.id === client.playerId) ? 'w' : (room.black?.id === client.playerId) ? 'b' : null;
      if (!side || !room.drawOffer || room.drawOffer === side) return;

      if (data.accept) {
        stopRoomTimer(room);
        room.status = 'ended';
        room.winner = 'draw';
        room.endReason = '상호 합의 무승부 (Draw by Agreement)';
        room.drawOffer = null;
        recordGameResult(room);
        broadcastRoomState(room);
        broadcastRoomList();
      } else {
        // Declined
        const offeringPlayer = room.drawOffer === 'w' ? room.white : room.black;
        room.drawOffer = null;
        broadcastRoomState(room);
        if (offeringPlayer?.ws?.readyState === WebSocket.OPEN) {
          offeringPlayer.ws.send(JSON.stringify({ type: 'toast', message: '상대방이 무승부 제안을 거절했습니다.' }));
        }
      }
    }

    // 6. Rematch
    else if (type === 'request_rematch') {
      const client = clientRooms.get(ws);
      if (!client) return;
      const room = rooms[client.roomId];
      if (!room || room.status !== 'ended') return;

      const isWhite = room.white?.id === client.playerId;
      const isBlack = room.black?.id === client.playerId;

      if (!isWhite && !isBlack) return; // Spectators cannot request rematch

      if (isWhite) room.rematchOffer.w = true;
      if (isBlack) room.rematchOffer.b = true;

      // If both accepted rematch, reset board and swap colors!
      if (room.rematchOffer.w && room.rematchOffer.b) {
        room.chess = new Chess();
        room.status = 'playing';
        room.winner = null;
        room.endReason = '';
        room.drawOffer = null;
        room.rematchOffer = { w: false, b: false };
        room.saved = false;

        // Swap colors for fairness
        const prevWhite = room.white;
        const prevBlack = room.black;

        room.white = { ...prevBlack, timeLeft: room.timeControl.initial };
        room.black = { ...prevWhite, timeLeft: room.timeControl.initial };

        if (room.white?.ws) {
          const cw = clientRooms.get(room.white.ws);
          if (cw) cw.role = 'w';
        }
        if (room.black?.ws) {
          const cb = clientRooms.get(room.black.ws);
          if (cb) cb.role = 'b';
        }

        startRoomTimer(room);
        broadcastRoomList();
      }

      broadcastRoomState(room);
    }

    // 7. In-game Chat & Emojis
    else if (type === 'chat_message') {
      const client = clientRooms.get(ws);
      if (!client) return;
      const room = rooms[client.roomId];
      if (!room) return;

      const senderName = (room.white?.id === client.playerId) ? room.white.name :
                         (room.black?.id === client.playerId) ? room.black.name : '관전자';

      sendToRoom(room, {
        type: 'chat_broadcast',
        sender: senderName,
        text: (data.text || '').substring(0, 100),
        emoji: data.emoji || null,
        timestamp: Date.now()
      });
    }

    // 8. Public Room List
    else if (type === 'list_rooms') {
      ws.send(JSON.stringify({ type: 'room_list', rooms: getRoomListData() }));
    }
  });

  ws.on('close', () => {
    const client = clientRooms.get(ws);
    if (client) {
      const room = rooms[client.roomId];
      if (room) {
        if (room.white?.ws === ws) room.white.ws = null;
        if (room.black?.ws === ws) room.black.ws = null;
        room.spectators = room.spectators.filter(s => s.ws !== ws);

        // If all left and game is waiting or ended, cleanup after 5 minutes
        if (!room.white?.ws && !room.black?.ws && room.spectators.length === 0) {
          setTimeout(() => {
            if (!room.white?.ws && !room.black?.ws && room.spectators.length === 0) {
              stopRoomTimer(room);
              delete rooms[room.id];
              broadcastRoomList();
            }
          }, 300000);
        } else {
          broadcastRoomState(room);
        }
        broadcastRoomList();
      }
      clientRooms.delete(ws);
    }
  });
});

// Periodic heartbeat
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`  ♟️  CHESS MASTER SERVER STARTED  ♟️`);
  console.log(`  Local:   http://localhost:${PORT}`);
  const ips = getLocalIPs();
  ips.forEach(ip => {
    console.log(`  WiFi:    ${ip.url} (${ip.interface})`);
  });
  console.log(`=========================================`);
});
