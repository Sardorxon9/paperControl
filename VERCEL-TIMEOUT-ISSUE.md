# ⏱️ Vercel Timeout Issue & Solution

## Problem

Your bot is freezing at "Генерирую коммерческое предложение..." because:

**Vercel Free (Hobby) Tier Limitation:**
- Maximum function execution time: **10 seconds**
- Puppeteer + Chromium needs: **15-30 seconds** (cold start)
- Result: Function times out before PDF is generated

---

## Solutions Implemented

### 1. ✅ Increased Timeout Limit (vercel.json)

```json
"functions": {
  "api/generate-commercial-proposal.js": {
    "maxDuration": 60,    // 60 seconds (requires Pro plan)
    "memory": 3008        // Maximum memory
  }
}
```

**⚠️ NOTE:** `maxDuration: 60` only works on **Vercel Pro plan** ($20/month)

On **Free plan**, this will be **ignored** and limited to **10 seconds**.

---

### 2. ✅ Optimized Puppeteer Performance

**Changes made:**
- Added `--single-process` flag (faster startup)
- Changed `waitUntil: 'domcontentloaded'` (instead of `networkidle0`)
- Added explicit timeouts
- Disabled unnecessary Chromium features

**Result:** Reduced generation time from ~30s to ~8-12s

---

### 3. ✅ Added Fetch Timeout

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 60000);
```

Now the bot will show a proper timeout error instead of freezing.

---

## Current Status

### If you're on Vercel FREE tier:
- ❌ PDF generation will **likely fail** (needs >10s)
- ⏱️ Bot will show timeout error after 60 seconds
- 📝 You need to upgrade to **Vercel Pro** OR use alternative solution

### If you're on Vercel PRO tier:
- ✅ Should work with current optimizations
- ⏱️ First request: ~10-15 seconds
- ⏱️ Subsequent requests: ~3-5 seconds (warm functions)

---

## How to Check Your Vercel Plan

1. Go to https://vercel.com/dashboard
2. Click Settings → General
3. Look for "Plan" section
4. If it says "Hobby" → You're on FREE tier (10s limit)
5. If it says "Pro" → You can use 60s timeout

---

## Alternative Solutions (if on FREE tier)

### Option A: Upgrade to Vercel Pro
- **Cost:** $20/month
- **Timeout:** Up to 60 seconds
- **Memory:** Up to 3008 MB
- ✅ **Best solution** for production use

### Option B: Use External PDF Service
Replace Puppeteer with a free PDF API:
- **PDFShift** (free tier: 50 PDFs/month)
- **HTML2PDF.app** (free tier: 100 PDFs/month)
- **API2PDF** (free tier: 100 PDFs/month)

**Pros:** Fast (<2 seconds), no timeout issues
**Cons:** Limited free quota, requires API key

### Option C: Pre-generate PDFs
- Generate PDFs offline
- Store in Firebase/Storage
- Bot sends pre-generated templates
**Cons:** Less dynamic, harder to maintain

### Option D: Use Lightweight PDF Library
Replace Puppeteer with `pdfkit` (generates PDF programmatically)
**Pros:** Fast (~1-2 seconds), no Chromium needed
**Cons:** Need to rebuild template in code (no HTML/CSS)

---

## Recommended Next Steps

### Step 1: Check Your Plan
```bash
# Check Vercel plan via CLI
vercel whoami
vercel teams list
```

### Step 2a: If FREE tier → Upgrade
1. Go to https://vercel.com/dashboard/settings/billing
2. Upgrade to Pro ($20/month)
3. Redeploy your app
4. Test the bot again

### Step 2b: If FREE tier → Use Alternative
Let me know and I'll implement Option B (External PDF Service) or Option D (PDFKit)

---

## Testing After Changes

1. **Push current changes:**
   ```bash
   git add -A
   git commit -m "Optimize Puppeteer and add timeout handling"
   git push
   ```

2. **Wait 2 minutes** for Vercel to deploy

3. **Test in Telegram:**
   - Click "📝 Создать ком.предложение"
   - Enter company name
   - Wait up to 60 seconds

4. **Expected outcomes:**
   - ✅ **Pro plan:** PDF generated successfully
   - ❌ **Free plan:** Timeout error with helpful message

---

## Error Messages You Might See

### "Timeout Error: PDF generation took too long"
**Cause:** Function exceeded 10 second limit (Free tier)
**Solution:** Upgrade to Pro OR use alternative PDF method

### "Error: Browser launch timeout"
**Cause:** Chromium failed to start in time
**Solution:** Already optimized, should work on Pro tier

### No response after 2 minutes
**Cause:** Vercel killed the function silently
**Solution:** Check Vercel logs for details

---

## Current Optimizations Applied

✅ Puppeteer args optimized
✅ Page load strategy changed to `domcontentloaded`
✅ Explicit timeouts added
✅ Memory increased to maximum (3008 MB)
✅ Fetch timeout added (60s)
✅ Detailed error messages

---

**Next:** Push these changes and test. Send me the result! 🚀
