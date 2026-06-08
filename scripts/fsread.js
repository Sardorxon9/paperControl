/**
 * Firestore reader using the local Firebase CLI credentials.
 *
 * Reuses the access/refresh token that `firebase login` already stored in
 * ~/.config/configstore/firebase-tools.json — no service-account key needed.
 * Talks to the Firestore REST API scoped to your own Google permissions.
 *
 * Usage:
 *   node scripts/fsread.js collections                 # list top-level collections
 *   node scripts/fsread.js list <collection> [limit]   # list docs in a collection
 *   node scripts/fsread.js get  <path/to/doc>          # get one document
 *   node scripts/fsread.js sub  <path/to/doc>          # list a doc's subcollections
 */

const os = require('os');
const path = require('path');
const https = require('https');

const PROJECT = process.env.FS_PROJECT || 'paper-control-6bce2';
const DB = '(default)';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${encodeURIComponent(DB)}/documents`;
const CONFIG = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');

// Firebase CLI public OAuth client (used to refresh the CLI's own token).
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

function httpJson(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const req = https.request(
      { method, hostname: u.hostname, path: u.pathname + u.search, headers },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          let parsed = null;
          try { parsed = buf ? JSON.parse(buf) : null; } catch (_) { parsed = buf; }
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(`HTTP ${res.statusCode}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`));
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function refresh(refreshToken) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }).toString();
  const res = await httpJson('POST', 'https://oauth2.googleapis.com/token',
    { 'Content-Type': 'application/x-www-form-urlencoded' }, body);
  return res.access_token;
}

async function token() {
  const cfg = require(CONFIG);
  const t = cfg.tokens || {};
  // Use the cached access token if it still has > 60s of life; otherwise refresh.
  if (t.access_token && t.expires_at && t.expires_at - Date.now() > 60000) return t.access_token;
  if (t.refresh_token) return refresh(t.refresh_token);
  if (t.access_token) return t.access_token;
  throw new Error('No usable token in firebase-tools config. Run `firebase login`.');
}

// ---- value decoding (Firestore REST -> plain JS) ----
function decode(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('referenceValue' in v) return v.referenceValue;
  if ('geoPointValue' in v) return v.geoPointValue;
  if ('bytesValue' in v) return '<bytes>';
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return v;
}
function decodeFields(fields) {
  const out = {};
  for (const k of Object.keys(fields)) out[k] = decode(fields[k]);
  return out;
}
function docName(name) { return name.split('/documents/')[1]; }

async function main() {
  const [, , cmd, arg, arg2] = process.argv;
  const auth = { Authorization: `Bearer ${await token()}` };

  if (cmd === 'collections') {
    const res = await httpJson('POST', `${BASE}:listCollectionIds`, { ...auth, 'Content-Type': 'application/json' }, {});
    console.log(JSON.stringify(res.collectionIds || [], null, 2));
    return;
  }
  if (cmd === 'list') {
    const limit = arg2 ? Number(arg2) : 25;
    const res = await httpJson('GET', `${BASE}/${arg}?pageSize=${limit}`, auth);
    const docs = (res.documents || []).map((d) => ({ id: docName(d.name), ...decodeFields(d.fields || {}) }));
    console.log(JSON.stringify({ count: docs.length, docs }, null, 2));
    return;
  }
  if (cmd === 'get') {
    const res = await httpJson('GET', `${BASE}/${arg}`, auth);
    console.log(JSON.stringify({ id: docName(res.name), ...decodeFields(res.fields || {}) }, null, 2));
    return;
  }
  if (cmd === 'sub') {
    const res = await httpJson('POST', `${BASE}/${arg}:listCollectionIds`, { ...auth, 'Content-Type': 'application/json' }, {});
    console.log(JSON.stringify(res.collectionIds || [], null, 2));
    return;
  }
  console.error('Usage: node scripts/fsread.js collections | list <coll> [limit] | get <docPath> | sub <docPath>');
  process.exit(1);
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
