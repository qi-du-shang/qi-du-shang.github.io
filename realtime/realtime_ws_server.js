const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');

const DATA_FILE = path.join(__dirname, 'realtime_data.json');
const PORT = process.env.PORT || 3002;
const WS_PATH = process.env.WS_PATH || '/ws';
const BASIC_USER = process.env.BASIC_AUTH_USER || '';
const BASIC_PASS = process.env.BASIC_AUTH_PASS || '';
const SSL_KEY = process.env.SSL_KEY || '';
const SSL_CERT = process.env.SSL_CERT || '';

let state = { rooms: {} };
// Transient in-memory map for storing live last positions per user without persisting them in state JSON.
// Key: `${roomName}:${userId}` -> { lat, lng, ts }
const transientLastPos = {};
const USER_STALE_TIMEOUT_MS = 30 * 1000;
const USER_STALE_CHECK_MS = 5000;
// body-parser/raw-body does not support a true "unlimited" HTTP limit; 0 rejects all payloads.
// Use a very large practical ceiling here and leave the real production ceiling to Nginx/proxy and storage limits.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB practical ceiling


function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8') || '{}';
      state = JSON.parse(raw);
      state.rooms = state.rooms || {};
    }
  } catch (error) {
    console.error('Failed to load state:', error);
  }
}

// Asynchronous debounced save to avoid blocking the Node event loop when writing large payloads (e.g., base64 media).
let _saveScheduled = false;
let _saveTimer = null;
let _saveInFlight = false;
let _lastSaveError = null;

function doWriteState(callback) {
  const tmp = DATA_FILE + '.tmp';
  const payload = JSON.stringify(state, null, 2);
  // Write to temp file then rename for atomic replace
  fs.writeFile(tmp, payload, 'utf8', (err) => {
    if (err) {
      _lastSaveError = err;
      console.error('Failed to write temp state file:', err);
      if (callback) return callback(err);
      return;
    }
    fs.rename(tmp, DATA_FILE, (err2) => {
      if (err2) {
        _lastSaveError = err2;
        console.error('Failed to rename temp state file to DATA_FILE:', err2);
        if (callback) return callback(err2);
        return;
      }
      _lastSaveError = null;
      if (callback) callback(null);
    });
  });
}

function scheduleSaveState(immediate = false) {
  // If an immediate write requested, and no write currently in-flight, perform it now
  if (immediate) {
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
    if (_saveInFlight) return; // let in-flight complete; state will be persisted soon
    _saveInFlight = true;
    doWriteState((err) => { _saveInFlight = false; });
    return;
  }
  if (_saveScheduled) return;
  _saveScheduled = true;
  // debounce window: 700ms (batch frequent writes)
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    _saveScheduled = false;
    if (_saveInFlight) {
      // chain after current in-flight completes
      const check = setInterval(() => {
        if (!_saveInFlight) {
          clearInterval(check);
          _saveInFlight = true;
          doWriteState((err) => { _saveInFlight = false; });
        }
      }, 100);
    } else {
      _saveInFlight = true;
      doWriteState((err) => { _saveInFlight = false; });
    }
  }, 700);
}

loadState();
// Periodic flush: ensure state eventually persisted even if no new operations
setInterval(() => scheduleSaveState(true), 5000);

const app = express();

// Allow large JSON payloads for upload endpoint (base64 data). Set a generous limit but prefer using
// dedicated file uploads in production (S3, resumable upload, or multipart streaming).
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin === '*' ? '*' : origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-File-Name,X-Room-Name');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '10gb' }));
app.use(express.urlencoded({ extended: true, limit: '10gb' }));

if (BASIC_USER && BASIC_PASS) {
  app.use((req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Restricted"');
      return res.status(401).send('Authentication required');
    }
    const payload = Buffer.from(auth.split(' ')[1], 'base64').toString('utf8');
    const [user, pass] = payload.split(':');
    if (user === BASIC_USER && pass === BASIC_PASS) {
      return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="Restricted"');
    return res.status(403).send('Forbidden');
  });
}

// Ensure uploads directory exists and serve it statically so uploaded files are accessible
const UPLOADS_DIR = path.join(__dirname, 'uploads');
try { if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR); } catch (e) { console.error('Failed to ensure uploads dir', e); }

// Simple upload endpoint that accepts JSON { name, mime, data } where data is a base64 string or data URL.
app.post('/upload', (req, res) => {
  try {
    const { name, mime, data, room: roomName } = req.body || {};
    if (!data || typeof data !== 'string') return res.status(400).json({ success: false, error: 'missing_data' });
    const raw = data.indexOf(',') !== -1 ? data.split(',')[1] : data;
    const buffer = Buffer.from(raw, 'base64');
    // sanitize name
    const safeName = (name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = Date.now() + '-' + Math.random().toString(36).slice(2,8) + '-' + safeName;
    const outPath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const url = new URL('/uploads/' + filename, baseUrl).toString();
    if (roomName && typeof roomName === 'string') {
      const room = state.rooms[roomName.trim()];
      if (room && Array.isArray(room.uploads)) {
        room.uploads.push(filename);
      }
    }
    scheduleSaveState();
    return res.json({ success: true, url, filename });
  } catch (e) {
    console.error('Upload failed', e);
    return res.status(500).json({ success: false, error: 'upload_failed' });
  }
});

app.post('/upload-binary', express.raw({ type: '*/*', limit: '10gb' }), (req, res) => {
    try {
      const nameHeader = req.headers['x-file-name'] || 'upload.bin';
      const roomNameHeader = req.headers['x-room-name'] || '';
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
      if (!body || body.length === 0) {
        return res.status(400).json({ success: false, error: 'empty_body' });
      }

      let decodedName = 'upload.bin';
      try {
        decodedName = typeof nameHeader === 'string' ? decodeURIComponent(nameHeader) : String(nameHeader);
      } catch (_) {
        decodedName = typeof nameHeader === 'string' ? nameHeader : String(nameHeader);
      }
      const safeName = path.basename(decodedName).replace(/[^a-zA-Z0-9._-]/g, '_') || 'upload.bin';
      const filename = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safeName;
      const outPath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(outPath, body);

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const url = new URL('/uploads/' + filename, baseUrl).toString();
      let roomName = '';
      try {
        roomName = typeof roomNameHeader === 'string' ? decodeURIComponent(roomNameHeader) : '';
      } catch (_) {
        roomName = typeof roomNameHeader === 'string' ? roomNameHeader : '';
      }
      if (roomName && typeof roomName === 'string') {
        const room = state.rooms[roomName.trim()];
        if (room && Array.isArray(room.uploads)) {
          room.uploads.push(filename);
        }
      }
      scheduleSaveState();
      return res.json({ success: true, url, filename });
    } catch (e) {
      console.error('Binary upload failed', e);
      return res.status(500).json({ success: false, error: 'upload_failed' });
    }
});

app.use(express.static(__dirname));

let server;
if (SSL_KEY && SSL_CERT && fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT)) {
  server = https.createServer({ key: fs.readFileSync(SSL_KEY), cert: fs.readFileSync(SSL_CERT) }, app);
  console.log('Starting HTTPS server');
} else {
  server = http.createServer(app);
  console.log('Starting HTTP server');
}

// For ws, 0 means no message-size cap; for HTTP body-parser, a finite large value is required.
const MAX_WS_PAYLOAD = 0;
const wss = new WebSocket.Server({ noServer: true, maxPayload: MAX_WS_PAYLOAD });

function broadcast(data, except) {
  const text = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      client.send(text);
    }
  });
}

function nowTs() {
  return Date.now();
}

function ensureRoom(roomName) {
  if (!roomName) return null;
  state.rooms[roomName] = state.rooms[roomName] || { users: {}, chat: [], positions: [], uploads: [], pendingChats: {} };
  return state.rooms[roomName];
}

function cleanupRoomUploads(roomName) {
  const room = state.rooms[roomName];
  if (!room || !Array.isArray(room.uploads) || room.uploads.length === 0) return;
  room.uploads.forEach(filename => {
    try {
      const safeFilename = path.basename(filename);
      const outPath = path.join(UPLOADS_DIR, safeFilename);
      if (fs.existsSync(outPath)) {
        fs.unlinkSync(outPath);
      }
    } catch (e) {
      console.warn(`Failed to delete upload file for room ${roomName}:`, e);
    }
  });
}

function isRoomActive(roomName) {
  const room = state.rooms[roomName];
  if (!room || !room.users) return false;
  return Object.values(room.users).some(user => user && user.online === true);
}

function pruneStaleRoom(roomName) {
  const room = state.rooms[roomName];
  if (!room) return;
  if (!isRoomActive(roomName)) {
    // If no active users, remove the room entirely to make rooms ephemeral.
    cleanupRoomUploads(roomName);
    delete state.rooms[roomName];
    scheduleSaveState();
    console.log(`Pruned room "${roomName}" from state because it had no active users.`);
  }
}

function ensureRoomUser(roomName, id) {
  const room = ensureRoom(roomName);
  if (!room || !id) return null;
  room.users[id] = room.users[id] || { id, nick: id, color: '#3aa0ff', online: false, lastSeen: 0, lastPos: null, sharing: false, presenceToken: null };
  return room.users[id];
}

function recordPositionHistory(roomName, user, lastPos, options = {}) {
  const room = state.rooms[roomName];
  if (!room || !user || !lastPos) return;
  room.positions = room.positions || [];
  const entry = {
    id: user.id,
    nick: user.nick,
    color: user.color,
    lat: lastPos.lat,
    lng: lastPos.lng,
    ts: lastPos.ts,
    status: options.status || 'offline',
    reason: options.reason || ''
  };
  const lastEntry = room.positions[room.positions.length - 1];
  if (lastEntry && lastEntry.id === entry.id && lastEntry.ts === entry.ts && lastEntry.status === entry.status) {
    return;
  }
  room.positions.push(entry);
  if (room.positions.length > 50000) room.positions.shift();
}

function broadcastRoom(roomName, data, except) {
  const text = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client !== except && client.readyState === WebSocket.OPEN && client._meta && client._meta.room === roomName) {
      client.send(text);
    }
  });
}

function getRoomUsersSummary(roomName) {
  const room = state.rooms[roomName];
  if (!room) return [];
  return Object.values(room.users)
    .filter(u => u.online)
    .map(u => {
      const key = roomName + ':' + u.id;
      const lp = transientLastPos[key] || null;
      return { id: u.id, nick: u.nick, color: u.color, online: true, lastPos: lp, presenceToken: u.presenceToken || null, publicKey: u.publicKey || null };
    });
}

function findOpenSocketForUser(roomName, id) {
  for (const client of wss.clients) {
    if (client && client.readyState === WebSocket.OPEN && client._meta && client._meta.room === roomName && client._meta.id === id) {
      return client;
    }
  }
  return null;
}

function cleanupStaleUsers() {
  const now = nowTs();
  for (const roomName of Object.keys(state.rooms)) {
    const room = state.rooms[roomName];
    if (!room || !room.users) continue;
    for (const id of Object.keys(room.users)) {
      const user = room.users[id];
      if (!user || !user.online) continue;
      const socketConnected = !!findOpenSocketForUser(roomName, id);
      const timedOut = now - (user.lastSeen || 0) > USER_STALE_TIMEOUT_MS;
      if (!socketConnected || timedOut) {
        const nick = user.nick || '访客';
        const key = roomName + ':' + id;
        const live = transientLastPos[key] || null;
        const shouldRecord = live && user.sharing;
        const lastPos = shouldRecord ? live : null;
        if (shouldRecord) {
          recordPositionHistory(roomName, user, live, { status: 'offline', reason: timedOut ? 'stale_timeout' : 'network_disconnect' });
        }
        user.sharing = false;
        // capture current presence token snapshot and re-check socket to avoid races with reconnect
        const tokenSnapshot = user.presenceToken || null;
        if (findOpenSocketForUser(roomName, id)) continue;
        // deduplicate leave events using presence token (preferred) or timestamp
        const leaveKey = id + ':' + (tokenSnapshot ? ('pt:' + tokenSnapshot) : ('ts:' + now));
        if (user._lastLeaveKey === leaveKey) continue;
        user._lastLeaveKey = leaveKey;

        user.online = false;
        user.lastSeen = now;
        // include the token that corresponded to the offline event
        const leavePayload = { type: 'leave', id, nick, lastPos, lastPosStatus: shouldRecord ? 'offline' : undefined, presenceToken: tokenSnapshot };
        const hasPersistedHistory = (room.chat && room.chat.length > 0) || (room.positions && room.positions.length > 0);
        if (!Object.values(room.users).some(u => u && u.online === true) && !hasPersistedHistory && Object.keys(room.users).length === 0) {
          delete state.rooms[roomName];
          scheduleSaveState();
          console.log(`Room "${roomName}" removed because it had no history and no users after stale cleanup.`);
        } else {
          scheduleSaveState();
        }
        broadcastRoom(roomName, leavePayload);
        // After a leave due to cleanup, send an updated users list so clients see the current presence immediately
        if (state.rooms[roomName]) {
          broadcastRoom(roomName, { type: 'users', users: getRoomUsersSummary(roomName) });
        }
      }
    }
  }
}

function removeRoomUser(roomName, id) {
  const room = state.rooms[roomName];
  if (!room || !id || !room.users || !room.users[id]) return;
  const user = room.users[id];
  // mark user as offline
  try {
    user.sharing = false;
    user.online = false;
    user.lastSeen = nowTs();
    const anyOnline = Object.values(room.users).some(u => u && u.online === true);
    // If there are no active users, remove the room (ephemeral rooms behavior)
    if (!anyOnline) {
      cleanupRoomUploads(roomName);
      delete state.rooms[roomName];
      scheduleSaveState();
      console.log(`Room "${roomName}" removed because it had no active users.`);
    } else {
      scheduleSaveState();
    }
  } catch (e) {
    console.error('Error while removing room user:', e);
  }
}

setInterval(cleanupStaleUsers, USER_STALE_CHECK_MS);

wss.on('connection', (ws) => {
  ws._meta = { id: null, room: null };
  ws.on('error', (error) => {
    console.warn('WebSocket client error:', error && error.code ? error.code : error);
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (error) {
      return;
    }
    if (!msg || typeof msg.type !== 'string') {
      return;
    }

    if (msg.type === 'room') {
      // Use in-memory authoritative state for room create/join handling to avoid races
      // with asynchronous persistence. The server persists changes via scheduleSaveState().
      const action = msg.action;
      const roomName = typeof msg.room === 'string' ? msg.room.trim() : '';
      if (!roomName) {
        ws.send(JSON.stringify({ type: 'room_error', message: '聊天室名称不能为空。' }));
        return;
      }
      const roomExists = !!state.rooms[roomName];
      if (roomExists && !isRoomActive(roomName)) {
        // If the room exists only as stale persisted data with no active users,
        // treat it as gone so a new room with the same name can be created empty.
        pruneStaleRoom(roomName);
      }
      const effectiveRoomExists = !!state.rooms[roomName];
      if (action === 'create') {
        if (effectiveRoomExists) {
          ws.send(JSON.stringify({ type: 'room_error', message: '聊天室已存在，无法创建同名聊天室。' }));
          return;
        }
      } else if (action === 'join') {
        if (!effectiveRoomExists) {
          ws.send(JSON.stringify({ type: 'room_error', message: '聊天室不存在，无法加入。' }));
          return;
        }
      } else {
        ws.send(JSON.stringify({ type: 'room_error', message: '未知的聊天室操作。' }));
        return;
      }

      const room = ensureRoom(roomName);
      const id = msg.id || ('u-' + Math.random().toString(36).slice(2, 9));
      const user = ensureRoomUser(roomName, id);
      user.nick = msg.nick || user.nick;
      user.color = msg.color || user.color;
      user.online = true;
      user.lastSeen = msg.ts || nowTs();
      user.sharing = false;
      // accept an optional publicKey for end-to-end encryption (clients should send this when joining)
      if (msg.publicKey && typeof msg.publicKey === 'string') {
        user.publicKey = msg.publicKey;
        ws._meta.publicKey = msg.publicKey;
      }
      // store live lastPos transiently (do not persist into state JSON)
      if (typeof msg.lat === 'number' && typeof msg.lng === 'number') {
        transientLastPos[roomName + ':' + id] = { lat: msg.lat, lng: msg.lng, ts: msg.ts || nowTs() };
      }
      // assign a fresh presence token for this login so subsequent stale/old leave events can be ignored by clients
      const presenceToken = 'pt-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
      user.presenceToken = presenceToken;
      ws._meta.presenceToken = presenceToken;

      // persist presence change so reconnects get authoritative state (note: lastPos kept transient)
      scheduleSaveState();

      // If another open socket exists for this same user id in this room, terminate it.
      // This ensures the most recent connection becomes the active presence and avoids duplicate sockets.
      const existingSocket = findOpenSocketForUser(roomName, id);
      if (existingSocket && existingSocket !== ws) {
        try { existingSocket.terminate(); } catch (e) { /* ignore */ }
      }

      ws._meta.id = id;
      ws._meta.nick = user.nick;
      ws._meta.color = user.color;
      ws._meta.room = roomName;
      const usersSummary = getRoomUsersSummary(roomName);
      // Per privacy policy: do not send or persist plaintext chat messages on the server.
      // The server will act as a transient relay for chat messages only (clients should perform end-to-end
      // encryption if they require confidentiality). Do not include chat history in the init payload.
      const chat = [];
      const positions = (room.positions && Array.isArray(room.positions)) ? room.positions.slice(-2000) : [];
      ws.send(JSON.stringify({ type: 'init', room: roomName, users: usersSummary, chat, positions }));
      const joinPayload = { type: 'join', id, nick: user.nick, color: user.color, presenceToken: user.presenceToken, publicKey: user.publicKey || null };
      const tkey = roomName + ':' + id;
      const jpos = transientLastPos[tkey] || null;
      if (jpos) {
        joinPayload.lat = jpos.lat;
        joinPayload.lng = jpos.lng;
        joinPayload.ts = jpos.ts;
      }
      // Notify all clients (including the joining socket) that this user joined
      broadcastRoom(roomName, joinPayload);
      // Also send an authoritative users list update so all clients refresh presence immediately
      broadcastRoom(roomName, { type: 'users', users: getRoomUsersSummary(roomName) });
    } else if (msg.type === 'pos') {
      const roomName = ws._meta.room;
      if (!roomName) return;
      const id = msg.id || ws._meta.id || ('u-' + Math.random().toString(36).slice(2, 9));
      const user = ensureRoomUser(roomName, id);
      user.nick = msg.nick || user.nick;
      user.color = msg.color || user.color;
      user.online = true;
      user.lastSeen = msg.ts || nowTs();
      // mark that the user is actively sharing position
      user.sharing = true;
      if (typeof msg.lat === 'number' && typeof msg.lng === 'number') {
        transientLastPos[roomName + ':' + id] = { lat: msg.lat, lng: msg.lng, ts: msg.ts || nowTs() };
      }
      ws._meta.id = id;
      const tkeyPos = roomName + ':' + id;
      const livePos = transientLastPos[tkeyPos] || null;
      if (livePos) {
        broadcastRoom(roomName, { type: 'pos', id, nick: user.nick, color: user.color, lat: livePos.lat, lng: livePos.lng, ts: livePos.ts }, ws);
      }
    } else if (msg.type === 'pos_stop') {
      const roomName2 = ws._meta.room;
      if (!roomName2) return;
      const id2 = msg.id || ws._meta.id;
      const user2 = state.rooms[roomName2] && state.rooms[roomName2].users[id2];
      const wasSharing = !!(user2 && user2.sharing);
      if (!wasSharing) {
        // Ignore stop notifications for users who were not actively sharing.
        // This prevents spurious "stopped sharing location" notices after reconnect/refresh.
        return;
      }
      if (user2) {
        // mark user as no longer actively sharing and record their last position so others can still see it
        user2.sharing = false;
        user2.lastSeen = msg.ts || nowTs();
        const key2 = roomName2 + ':' + id2;
        const live2 = transientLastPos[key2] || null;
        if (live2) {
          // persist the stopping event as a position history entry so it's available after reconnect/reload
          recordPositionHistory(roomName2, user2, live2, { status: 'stopped', reason: 'manual_pos_stop' });
          scheduleSaveState();
        }
      }
      // Notify clients that user stopped sharing. Include lastPos so clients can continue showing it
      const keyLast = roomName2 + ':' + id2;
      const lastPos = transientLastPos[keyLast] || null;
      broadcastRoom(roomName2, { type: 'pos_stop', id: id2, lastPos, lastPosStatus: lastPos ? 'stopped' : undefined }, ws);
    } else if (msg.type === 'chat') {
      const roomName = ws._meta.room;
      if (!roomName) return;
      const id = msg.id || ws._meta.id || ('u-' + Math.random().toString(36).slice(2, 9));
      const user = ensureRoomUser(roomName, id);
      user.nick = msg.nick || user.nick;
      user.color = msg.color || user.color;
      user.online = true;
      user.lastSeen = msg.ts || nowTs();
      ws._meta.id = id;

      // No application-level media size cap. Large uploads are accepted by the HTTP upload endpoint.
      // Reverse proxy / Nginx must still be configured with a sufficiently large client_max_body_size if deployed behind it.
      const reqId = msg.requestId && typeof msg.requestId === 'string' && msg.requestId.trim() ? msg.requestId : ('msg-' + Date.now() + '-' + Math.random().toString(36).slice(2,8));
      const entry = {
        id,
        nick: user.nick,
        color: user.color,
        text: msg.text || '',
        ts: msg.ts || nowTs(),
        kind: msg.kind || 'text',
        // If the client provided a remote URL (after uploading via /upload), prefer that over inlined data
        data: msg.url ? '' : (msg.data || ''),
        url: msg.url || '',
        mimeType: msg.mimeType || '',
        name: msg.name || '',
        duration: msg.duration || 0,
        status: 'sent',
        requestId: reqId
      };
      const room = ensureRoom(roomName);
      // Privacy change: do NOT persist plaintext chat messages to server-side JSON. The server will
      // relay the chat payload to connected clients but will not store the message body.
      // Note: clients should encrypt message payloads end-to-end before sending if they require confidentiality.
      const relay = Object.assign({ type: 'chat' }, entry);
      // NOTE: relay contains the message payload (possibly encrypted). Per privacy policy the server
      // does not persist this data — it is only forwarded to connected clients.
      // broadcast to all room members (excluding the sender socket) so others get the message
      broadcastRoom(roomName, relay);
      // store a lightweight, in-memory index of recent messages to support retracts without persisting plaintext
      try {
        room.pendingChats = room.pendingChats || {};
        room.pendingChats[reqId] = { id: id, ts: entry.ts };
        // schedule cleanup of this pending chat index after 5 minutes
        setTimeout(() => {
          try { if (room && room.pendingChats) delete room.pendingChats[reqId]; } catch (e) {}
        }, 5 * 60 * 1000);
      } catch (e) { console.warn('Failed to index pending chat', e); }
      // finally ack to sender so client marks message as delivered
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'chat_ack', requestId: reqId, success: true, ts: nowTs() }));
      }
    } else if (msg.type === 'retract') {
      const roomName = ws._meta.room;
      if (!roomName) return;
      const id = msg.id || ws._meta.id;
      const reqId = msg.requestId;
      if (!reqId) {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'retract_ack', requestId: reqId, success: false, error: 'missing_requestId' }));
        return;
      }
      const room = state.rooms[roomName];
      if (!room) {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'retract_ack', requestId: reqId, success: false, error: 'no_room' }));
        return;
      }
      const idx = room.chat.findIndex(m => m.requestId === reqId);
      const now = nowTs();
      if (idx === -1) {
        // If server does not persist plaintext messages, check the in-memory pendingChats index
        const pending = room.pendingChats && room.pendingChats[reqId];
        if (!pending) {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'retract_ack', requestId: reqId, success: false, error: 'not_found' }));
          return;
        }
        // verify requester is original sender and within allowed window
        if (pending.id !== id) {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'retract_ack', requestId: reqId, success: false, error: 'not_authorized' }));
          return;
        }
        if ((now - (pending.ts || 0)) > 2*60*1000) {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'retract_ack', requestId: reqId, success: false, error: 'expired' }));
          return;
        }
        // Acknowledge the retract to requester and broadcast retract to others
        const user = room.users[id] || { nick: id };
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'retract_ack', requestId: reqId, success: true }));
        broadcastRoom(roomName, { type: 'chat_retract', requestId: reqId, retractedBy: user.nick || id, ts: now }, ws);
        // remove pending index to prevent re-retract or reuse
        try { delete room.pendingChats[reqId]; } catch (e) {}
        return;
      }
      const entry = room.chat[idx];
      // only allow original sender to retract within 2 minutes
      if (entry.id !== id) {
        ws.send(JSON.stringify({ type: 'retract_ack', requestId: reqId, success: false, error: 'not_authorized' }));
        return;
      }
      if ((now - (entry.ts || 0)) > 2*60*1000) {
        ws.send(JSON.stringify({ type: 'retract_ack', requestId: reqId, success: false, error: 'expired' }));
        return;
      }
      // mark the chat entry as retracted so original content is not visible to anyone
      // backup original content if needed (not persisted to clients)
      const user = room.users[id] || { nick: id };
      entry.retracted = true;
      entry.retractedBy = user.nick || id;
      entry.retractedAt = now;
      // scrub content to avoid exposure
      entry.text = '';
      entry.data = '';
      entry.kind = 'retract';
      // persist state and notify clients
      scheduleSaveState();
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'retract_ack', requestId: reqId, success: true }));
      // notify remaining users to mark message as retracted (include who retracted)
      broadcastRoom(roomName, { type: 'chat_retract', requestId: reqId, retractedBy: entry.retractedBy, ts: now }, ws);
    } else if (msg.type === 'rename') {
      const roomName = ws._meta.room;
      const id = msg.id || ws._meta.id;
      if (!roomName || !id) return;
      const user = ensureRoomUser(roomName, id);
      const oldNick = user.nick;
      user.nick = msg.nick || user.nick;
      user.color = msg.color || user.color;
      broadcastRoom(roomName, { type: 'rename', id, nick: user.nick, oldNick }, ws);
    } else if (msg.type === 'leave') {
      const roomName = ws._meta.room;
      const id = msg.id || ws._meta.id;
      if (!roomName || !id) return;
      const user = state.rooms[roomName] && state.rooms[roomName].users[id];
      const nick = user ? user.nick : '访客';
      const key = roomName + ':' + id;
      const live = transientLastPos[key] || null;
      const shouldRecord = user && live && user.sharing;
      if (shouldRecord) {
        recordPositionHistory(roomName, user, live, { status: 'leave', reason: 'manual_leave' });
        scheduleSaveState();
      }
      if (user) {
        user.sharing = false;
      }
      const lastPos = shouldRecord ? live : null;
      // compute leave key and dedupe leave broadcasts (avoid duplicates from client leave + close/stale-cleanup)
      const presenceToken = ws._meta && ws._meta.presenceToken ? ws._meta.presenceToken : (user && user.presenceToken) || null;
      const leaveKey = id + ':' + (presenceToken ? ('pt:' + presenceToken) : ('ts:' + (Date.now())));
      if (!user._lastLeaveKey || user._lastLeaveKey !== leaveKey) {
        user._lastLeaveKey = leaveKey;
        removeRoomUser(roomName, id);
        broadcastRoom(roomName, { type: 'leave', id, nick, lastPos, lastPosStatus: shouldRecord ? 'leave' : undefined, presenceToken }, ws);
      } else {
        // already processed similar leave
        removeRoomUser(roomName, id);
      }
    } else if (msg.type === 'ping') {
      const roomName = ws._meta.room;
      const id = ws._meta.id;
      if (roomName && id) {
        const user = state.rooms[roomName] && state.rooms[roomName].users && state.rooms[roomName].users[id];
        if (user) {
          user.online = true;
          user.lastSeen = msg.ts || nowTs();
        }
      }
      ws.send(JSON.stringify({ type: 'pong', ts: nowTs() }));
    }
  });

  ws.on('close', () => {
    const roomName = ws._meta.room;
    const id = ws._meta.id;
    if (!roomName || !id) return;
    const user = state.rooms[roomName] && state.rooms[roomName].users[id];
    const nick = user ? user.nick : '访客';
    const key = roomName + ':' + id;
    const live = transientLastPos[key] || null;
    const shouldRecord = user && live && user.sharing;
    const lastPos = shouldRecord ? live : null;
    const presenceToken = ws._meta && ws._meta.presenceToken ? ws._meta.presenceToken : (user && user.presenceToken) || null;
    if (shouldRecord) {
      recordPositionHistory(roomName, user, live, { status: 'offline', reason: 'network_disconnect' });
      scheduleSaveState();
    }
    if (user) {
      user.sharing = false;
    }
    // Deduplicate leave events: use presenceToken if available, otherwise timestamp
    const leaveKey = id + ':' + (presenceToken ? ('pt:' + presenceToken) : ('ts:' + now));
    // If user entry is already gone (e.g., room pruned concurrently), nothing to do
    if (!user) {
      return;
    }
    if (!user._lastLeaveKey || user._lastLeaveKey !== leaveKey) {
      user._lastLeaveKey = leaveKey;
      removeRoomUser(roomName, id);
      // broadcast leave with the presenceToken associated with this socket so clients can ignore stale leave events
      broadcastRoom(roomName, { type: 'leave', id, nick, lastPos, lastPosStatus: shouldRecord ? 'offline' : undefined, presenceToken }, ws);
      // Broadcast updated users list to remaining clients so presence UI updates in real time
      if (state.rooms[roomName]) {
        broadcastRoom(roomName, { type: 'users', users: getRoomUsersSummary(roomName) });
      }
    } else {
      // already handled similar leave
      removeRoomUser(roomName, id);
    }
  });
});

server.on('upgrade', (request, socket, head) => {
  if (BASIC_USER && BASIC_PASS) {
    const auth = request.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm="Restricted"\r\n\r\n');
      socket.destroy();
      return;
    }
    const payload = Buffer.from(auth.split(' ')[1], 'base64').toString('utf8');
    const [user, pass] = payload.split(':');
    if (user !== BASIC_USER || pass !== BASIC_PASS) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
  }

  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname !== WS_PATH) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，无法启动服务器。请关闭占用该端口的进程后重试。`);
    process.exit(1);
  }
  console.error('服务器发生错误：', error);
});

server.listen(PORT, () => {
  console.log(`Realtime server listening on port ${PORT} (WS path ${WS_PATH})`);
});

process.on('SIGINT', () => {
  console.log('Shutting down, flushing state synchronously...');
  try {
    // ensure final sync write to disk before exit
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to perform final sync saveState on shutdown:', e);
  }
  process.exit(0);
});
