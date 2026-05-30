const { google } = require('googleapis');
const { shell, ipcMain } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');

const TOKEN_PATH = path.join(require('os').homedir(), '.dm-cockpit-token.json');
const SCOPES = ['https://www.googleapis.com/auth/documents.readonly'];
const REDIRECT_URI = 'http://localhost:42813';

let oAuth2Client = null;

function loadCredentials() {
  // Read from environment variables (loaded from .env by dotenv in main.js)
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing from .env');
  }
  return { client_id: clientId, client_secret: clientSecret };
}

function createOAuthClient() {
  const creds = loadCredentials();
  oAuth2Client = new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    REDIRECT_URI
  );
  // Load saved token if it exists
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oAuth2Client.setCredentials(token);
    } catch (_) {}
  }
  return oAuth2Client;
}

function isAuthorized() {
  if (!oAuth2Client) return false;
  const creds = oAuth2Client.credentials;
  return !!(creds && (creds.access_token || creds.refresh_token));
}

function authorize() {
  return new Promise((resolve, reject) => {
    if (!oAuth2Client) createOAuthClient();
    if (isAuthorized()) return resolve(oAuth2Client);

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });

    // Start local server to catch the redirect
    const server = http.createServer(async (req, res) => {
      try {
        const qs = new url.URL(req.url, REDIRECT_URI).searchParams;
        const code = qs.get('code');
        if (!code) { res.end('No code received.'); return; }

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

        res.end('<html><body style="font-family:sans-serif;background:#0a0906;color:#c9a84c;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>✓ DM Cockpit authorised. You can close this tab.</h2></body></html>');
        server.close();
        resolve(oAuth2Client);
      } catch (err) {
        res.end('Auth error: ' + err.message);
        server.close();
        reject(err);
      }
    });

    server.listen(42813, () => {
      shell.openExternal(authUrl);
    });

    setTimeout(() => {
      server.close();
      reject(new Error('Auth timed out after 5 minutes'));
    }, 5 * 60 * 1000);
  });
}

async function getDocContent(docId) {
  if (!oAuth2Client) createOAuthClient();
  if (!isAuthorized()) await authorize();

  const docs = google.docs({ version: 'v1', auth: oAuth2Client });
  const res = await docs.documents.get({
    documentId: docId,
    includeTabsContent: true,
  });
  return res.data;
}

module.exports = { createOAuthClient, authorize, isAuthorized, getDocContent };
