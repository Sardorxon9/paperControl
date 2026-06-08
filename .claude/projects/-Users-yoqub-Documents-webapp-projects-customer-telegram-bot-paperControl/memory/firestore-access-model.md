---
name: firestore-access-model
description: How the bot/serverless code reads & writes Firestore (no Admin SDK; open rules)
metadata:
  type: project
---

The Vercel serverless functions (`api/*.js`) access Firestore **only via the REST API**
(`firestore.googleapis.com/v1/...?key=<web API key>`), project `paper-control-6bce2`.

- **No Admin SDK / service account is configured** even though `firebase-admin` is in
  `package.json`. Don't reach for `admin.initializeApp` in serverless code — there are no creds.
- Deployed **security rules are open/test-mode**: unauthenticated REST **reads AND writes**
  with just the web API key both succeed (verified by probe, 2026-06). So server-side writes
  go through REST `POST/PATCH .../documents/<collection>`.
- Serverless = stateless: the module-level `userSessions` object does NOT persist across
  invocations. New flows must carry state in inline-button `callback_data` (64-byte limit),
  not sessions. (Commit c585a79 moved standard-search off sessions for this reason.)
- `users` auth field is **`chatId`** (camelCase, stringValue); some docs also carry a legacy
  `chatID`. Match `from.id` against both, as strings. Admin = `role === 'admin'`.
