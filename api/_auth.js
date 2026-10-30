// api/_auth.js - Shared login check for API routes.
// Files starting with "_" are not deployed as routes by Vercel.
//
// The browser sends `Authorization: Bearer <Firebase ID token>`. We verify the
// token with Firebase, then load the caller's doc from the `users` collection.
// Chat IDs are always taken from Firestore here — never from the request body —
// so a caller can't make the bot message arbitrary chats.

const FIREBASE_PROJECT_ID = 'paper-control-6bce2';
// Public web API key (same one shipped in the frontend) — not a secret.
const FIREBASE_API_KEY = 'AIzaSyBoYiTk7tqrpDKOvG9mDHHTlfP77MZ4sKA';
const FIRESTORE_API = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const fieldValue = (f) => f?.stringValue ?? f?.integerValue ?? null;

async function queryUsers(idToken, fieldPath, value) {
  const response = await fetch(`${FIRESTORE_API}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: { fieldFilter: { field: { fieldPath }, op: 'EQUAL', value: { stringValue: value } } },
      },
    }),
  });
  if (!response.ok) return [];
  const rows = await response.json();
  return rows.filter((row) => row.document).map((row) => row.document.fields);
}

// Returns { uid, role, chatId, idToken } for a valid logged-in app user, else null.
export async function getAuthedUser(req) {
  const header = req.headers.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!idToken) return null;

  try {
    const lookup = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
    );
    if (!lookup.ok) return null;
    const account = (await lookup.json()).users?.[0];
    if (!account?.localId || account.disabled) return null;

    const [fields] = await queryUsers(idToken, 'uID', account.localId);
    if (!fields) return null;

    return {
      uid: account.localId,
      role: fieldValue(fields.role),
      chatId: fieldValue(fields.chatId),
      idToken,
    };
  } catch (error) {
    console.error('[auth] token check failed:', error.message);
    return null;
  }
}

// Responds 401 and returns null when the caller isn't a logged-in app user.
export async function requireUser(req, res) {
  const user = await getAuthedUser(req);
  if (!user) {
    console.warn(`[auth] rejected ${req.url} — missing/invalid login`);
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  return user;
}

// Telegram chat IDs of all admins, read from Firestore.
export async function getAdminChatIds(idToken) {
  const admins = await queryUsers(idToken, 'role', 'admin');
  return admins.map((fields) => fieldValue(fields.chatId)).filter(Boolean);
}
