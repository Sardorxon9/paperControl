# 🐛 Error Debugging Guide

## Overview

The Telegram bot now sends detailed error messages directly to you for debugging.

---

## What Changed?

### Before:
```
❌ Произошла ошибка при создании коммерческого предложения.
Пожалуйста, попробуйте позже.
```

### After:
```
❌ ОШИБКА:

Тип: TypeError
Сообщение: Cannot read property 'X' of undefined

Stack:
Error: Cannot read property 'X' of undefined
    at generatePDF (/api/generate-commercial-proposal.js:125:30)
    at handler (/api/generate-commercial-proposal.js:180:15)
    ...

Отправьте этот текст разработчику для исправления
```

---

## How to Debug:

### Step 1: Try the Feature
1. Open Telegram bot
2. Click "📝 Создать ком.предложение"
3. Enter company name

### Step 2: Get Error Details
If it fails, you'll receive a message with:
- **Error Type** (e.g., TypeError, ReferenceError)
- **Error Message** (what went wrong)
- **Stack Trace** (where it went wrong)

### Step 3: Share Error with Developer
- Copy the entire error message
- Send it to the developer
- Developer can identify and fix the issue

---

## Common Errors & Solutions

### Error: "PDF API Error [500]"
**Cause:** PDF generation API failed
**Check:**
- Is Puppeteer installed? (`puppeteer-core` in package.json)
- Is Chromium available? (`@sparticuz/chromium`)
**Solution:** Check the error details in the message

### Error: "Telegram sendDocument failed"
**Cause:** Failed to send PDF via Telegram
**Check:**
- Is PDF too large? (Telegram limit: 50MB)
- Is bot token valid?
**Solution:** Check Telegram API response in error message

### Error: "Cannot read property 'adminChatIds'"
**Cause:** Config file not found
**Check:** Does `api/proposal-config.js` exist?
**Solution:** Verify the file is deployed

### Error: "fetch failed"
**Cause:** Network error or server unreachable
**Check:**
- Is Vercel deployment active?
- Is the API URL correct?
**Solution:** Check `serverUrl` in error message

---

## Testing Locally

To test without deploying:

```bash
# 1. Install dependencies
npm install

# 2. Set environment variable
export TELEGRAM_BOT_TOKEN="your_token_here"

# 3. Test PDF generation directly
curl -X POST http://localhost:3000/api/generate-commercial-proposal \
  -H "Content-Type: application/json" \
  -d '{"clientName": "TEST COMPANY"}' \
  --output test.pdf
```

---

## Error Message Format

All errors now include:

1. **Error Name** - Type of error (TypeError, ReferenceError, etc.)
2. **Error Message** - Human-readable description
3. **Stack Trace** - File and line number where error occurred
4. **Context** - Which function/API failed

---

## Developer Notes

### Error Logging Locations:

1. **Telegram Webhook** (`api/telegram-webhook.js:672-684`)
   - Catches errors in proposal generation flow
   - Sends error details to user via Telegram

2. **PDF Generation API** (`api/generate-commercial-proposal.js:202-218`)
   - Catches errors in PDF generation
   - Returns detailed JSON error response

3. **Main Webhook Handler** (`api/telegram-webhook.js:773-799`)
   - Catches any unexpected errors
   - Logs to console and sends to user

---

## Next Steps After Getting Error

1. **Copy the full error message**
2. **Note what you were doing** (which company name, etc.)
3. **Try again** to see if it's consistent
4. **Share error with developer** for fixing

---

**Remember:** Detailed errors help fix bugs faster! 🚀
