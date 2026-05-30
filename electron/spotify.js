/**
 * electron/spotify.js  —  v0.3 (resume/pause toggle + previous track)
 */

const { shell } = require('electron');
const http  = require('http');
const https = require('https');
const path  = require('path');
const fs    = require('fs');
const url   = require('url');

const TOKEN_PATH   = path.join(require('os').homedir(), '.dm-cockpit-spotify-token.json');
const REDIRECT_URI = 'http://127.0.0.1:42814/callback';
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
  'streaming',
].join(' ');

let tokens = null;

// ── Config & tokens ───────────────────────────────────────────────────────────

function loadConfig() {
  // Read from environment variables (loaded from .env by dotenv in main.js)
  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET missing from .env');
  }
  return { clientId, clientSecret };
}

function loadTokens() {
  if (tokens) return tokens;
  if (fs.existsSync(TOKEN_PATH)) {
    try { tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')); } catch (_) {}
  }
  return tokens;
}

function saveTokens(t) {
  tokens = t;
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(t));
}

function isAuthorized() {
  const t = loadTokens();
  return !!(t && t.access_token);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const req  = https.request({ method: 'POST', hostname, path, headers }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(hostname, path, accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      method: 'GET', hostname, path,
      headers: { Authorization: `Bearer ${accessToken}` },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function httpsPut(hostname, path, accessToken, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req  = https.request({
      method: 'PUT', hostname, path,
      headers: {
        Authorization:   `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => { res.resume(); resolve({ status: res.statusCode }); });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function httpsCommand(method, path, accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      method, hostname: 'api.spotify.com', path,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Length': 0 },
    }, (res) => { res.resume(); resolve({ status: res.statusCode }); });
    req.on('error', reject);
    req.end();
  });
}

// ── Token management ──────────────────────────────────────────────────────────

async function refreshAccessToken() {
  const cfg = loadConfig();
  const t   = loadTokens();
  if (!t?.refresh_token) throw new Error('No refresh token');
  const body  = `grant_type=refresh_token&refresh_token=${encodeURIComponent(t.refresh_token)}`;
  const creds = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  const result = await httpsPost('accounts.spotify.com', '/api/token', {
    'Content-Type':  'application/x-www-form-urlencoded',
    'Authorization': `Basic ${creds}`,
    'Content-Length': Buffer.byteLength(body),
  }, body);
  if (result.access_token) {
    const updated = { ...t, access_token: result.access_token };
    if (result.refresh_token) updated.refresh_token = result.refresh_token;
    if (result.expires_in)    updated.expires_at = Date.now() + (result.expires_in * 1000);
    saveTokens(updated);
    return updated.access_token;
  }
  throw new Error('Token refresh failed: ' + JSON.stringify(result));
}

async function getAccessToken() {
  const t = loadTokens();
  if (!t) throw new Error('Not authorized');
  if (t.expires_at && Date.now() > t.expires_at - 60000) return refreshAccessToken();
  return t.access_token;
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

function authorize() {
  return new Promise((resolve, reject) => {
    const cfg     = loadConfig();
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${cfg.clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&show_dialog=true`;

    const server = http.createServer(async (req, res) => {
      try {
        const qs   = new url.URL(req.url, 'http://127.0.0.1:42814').searchParams;
        const code = qs.get('code');
        if (!code) { res.end('No code.'); return; }
        const body  = `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
        const creds = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
        const result = await httpsPost('accounts.spotify.com', '/api/token', {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': `Basic ${creds}`,
          'Content-Length': Buffer.byteLength(body),
        }, body);
        if (!result.access_token) throw new Error(JSON.stringify(result));
        saveTokens({
          access_token:  result.access_token,
          refresh_token: result.refresh_token,
          expires_at:    Date.now() + (result.expires_in * 1000),
        });
        res.end('<html><body style="font-family:sans-serif;background:#0a0906;color:#c9a84c;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>✓ Spotify connected. You can close this tab.</h2></body></html>');
        server.close();
        resolve(true);
      } catch (err) { res.end('Error: ' + err.message); server.close(); reject(err); }
    });

    server.listen(42814, '127.0.0.1', () => shell.openExternal(authUrl));
    setTimeout(() => { server.close(); reject(new Error('Timed out')); }, 5 * 60 * 1000);
  });
}

// ── Playback ──────────────────────────────────────────────────────────────────

async function getPlaylists() {
  const token  = await getAccessToken();
  const result = await httpsGet('api.spotify.com', '/v1/me/playlists?limit=50', token);
  if (result.status !== 200) throw new Error('Failed to fetch playlists');
  return result.data.items.map(p => ({
    id:    p.id,
    name:  p.name,
    uri:   p.uri,
    total: p.tracks?.total || 0,
  }));
}

async function playPlaylist(playlistUri) {
  const token  = await getAccessToken();
  const devRes = await httpsGet('api.spotify.com', '/v1/me/player/devices', token);
  const devices = devRes.data?.devices || [];
  const device  = devices.find(d => d.is_active) || devices[0];
  if (!device) throw new Error('No active Spotify device found. Open Spotify on your computer first.');
  await httpsPut('api.spotify.com', `/v1/me/player/play?device_id=${device.id}`, token, { context_uri: playlistUri });
}

async function resumePlayback() {
  const token = await getAccessToken();
  const devRes = await httpsGet('api.spotify.com', '/v1/me/player/devices', token);
  const devices = devRes.data?.devices || [];
  const device  = devices.find(d => d.is_active) || devices[0];
  if (!device) throw new Error('No active Spotify device found.');
  await httpsPut('api.spotify.com', `/v1/me/player/play?device_id=${device.id}`, token, null);
}

async function pausePlayback() {
  const token = await getAccessToken();
  await httpsCommand('PUT', '/v1/me/player/pause', token);
}

async function skipTrack() {
  const token = await getAccessToken();
  await httpsCommand('POST', '/v1/me/player/next', token);
}

async function previousTrack() {
  const token = await getAccessToken();
  await httpsCommand('POST', '/v1/me/player/previous', token);
}

async function getCurrentTrack() {
  const token  = await getAccessToken();
  const result = await httpsGet('api.spotify.com', '/v1/me/player/currently-playing', token);
  if (result.status === 204 || !result.data?.item) return null;
  return {
    name:       result.data.item.name,
    artist:     result.data.item.artists?.map(a => a.name).join(', '),
    isPlaying:  result.data.is_playing,
    playlistId: result.data.context?.uri?.split(':').pop() || null,
  };
}

module.exports = {
  authorize, isAuthorized,
  getPlaylists, playPlaylist, resumePlayback, pausePlayback, skipTrack, previousTrack,
  getCurrentTrack,
};
