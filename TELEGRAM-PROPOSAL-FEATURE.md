# 📝 Telegram Bot: Commercial Proposal Generator

## Overview

This feature allows admin users to generate PDF commercial proposals directly from the Telegram bot.

---

## 🎯 Features

- ✅ Admin-only access (secured by chat ID)
- ✅ Dynamic PDF generation with company name
- ✅ Automatic date insertion (today's date in Russian format)
- ✅ Professional WhiteRay branding
- ✅ Configurable pricing (easy to update)
- ✅ Instant PDF delivery via Telegram

---

## 🔧 How It Works

### User Flow:
1. Admin opens Telegram bot
2. Clicks **"📝 Создать ком.предложение"** button
3. Bot asks for company name
4. User enters company name (e.g., "AYDAR-ARNASOY RESORT")
5. Bot generates PDF and sends it back (5-10 seconds)

### Technical Flow:
1. `telegram-webhook.js` receives the company name
2. Calls `generate-commercial-proposal.js` API
3. API loads HTML template from `api/templates/commercial-proposal.html`
4. Replaces placeholders with actual data (company name, date, prices)
5. Uses Puppeteer + Chromium to convert HTML → PDF
6. Returns PDF buffer
7. Telegram webhook sends PDF to user

---

## ⚙️ Configuration

### 1. **Admin Access**

Edit `api/proposal-config.js`:

```javascript
adminChatIds: [
  685385466,  // Current admin
  123456789,  // Add more admin chat IDs here
]
```

**How to get your Telegram Chat ID:**
1. Message your bot
2. Check server logs for `chat.id`
3. Add that number to `adminChatIds` array

---

### 2. **Pricing & Product Details**

Edit `api/proposal-config.js`:

```javascript
product1: {
  name: 'Белый сахар',              // Product name
  description: 'Сахар в стик-упаковке',  // Description
  pricePerUnit: 150,                // Price per unit (сум)
  format: 'Стик / 5 г',             // Format and weight
  minBatch: 20000,                  // Minimum order quantity
  clicheColors: 1,                  // Number of colors for printing
  clichePricePerColor: 250000       // Cliche price per color (сум)
}
```

**Calculations are automatic:**
- Batch cost = `pricePerUnit × minBatch`
- Cliche cost = `clicheColors × clichePricePerColor`
- Total = Batch cost + Cliche cost

---

### 3. **Company Information**

Edit `api/proposal-config.js`:

```javascript
company: {
  name: 'WhiteRay PRO',
  website: 'www.whiteray.uz',
  phone: '+998 97 716 61 33',
  address: 'г. Ташкент, Юнусабад 17-6'
}
```

---

## 📄 Template Customization

The PDF template is located at: `api/templates/commercial-proposal.html`

### Dynamic Placeholders:

| Placeholder | Description | Example |
|------------|-------------|---------|
| `{{CLIENT_NAME}}` | Company name (user input) | AYDAR-ARNASOY RESORT |
| `{{PROPOSAL_DATE}}` | Today's date (auto) | 9 Январь, 2026 |
| `{{P1_PRICE}}` | Product 1 price | 150 сум |
| `{{P1_MINBATCH}}` | Product 1 min batch | 20 000 шт |
| `{{P1_BATCHCOST}}` | Product 1 batch cost | 3 000 000 сум |
| `{{P2_PRICE}}` | Product 2 price | 400 сум |
| `{{COMPANY_PHONE}}` | Company phone | +998 97 716 61 33 |

See template for all available placeholders.

---

## 🚀 Deployment

### Vercel Deployment:

1. **Push to Git:**
   ```bash
   git add .
   git commit -m "Add commercial proposal generator"
   git push
   ```

2. **Vercel will auto-deploy** (if connected to GitHub)

3. **Verify deployment:**
   - Check Vercel dashboard for successful deployment
   - Test the bot by sending `/start` command

---

## 🧪 Testing

### Test the PDF Generator Directly:

```bash
curl -X POST https://paper-control.vercel.app/api/generate-commercial-proposal \
  -H "Content-Type: application/json" \
  -d '{"clientName": "TEST COMPANY"}' \
  --output test-proposal.pdf
```

### Test in Telegram:

1. Message your bot
2. Send `/start`
3. If you're an admin, you'll see the **"📝 Создать ком.предложение"** button
4. Click it
5. Enter a company name
6. Wait ~5-10 seconds
7. Receive PDF

---

## 📊 File Structure

```
paperControl/
├── api/
│   ├── telegram-webhook.js          # Main bot handler (UPDATED)
│   ├── generate-commercial-proposal.js  # PDF generation API (NEW)
│   ├── proposal-config.js           # Pricing & admin config (NEW)
│   └── templates/
│       └── commercial-proposal.html # PDF template (NEW)
├── package.json                     # Added puppeteer dependencies
└── TELEGRAM-PROPOSAL-FEATURE.md     # This file
```

---

## 🛠️ Troubleshooting

### Bot doesn't show the button?
- **Check:** Is your chat ID in `proposal-config.js` → `adminChatIds`?
- **Solution:** Add your chat ID and redeploy

### PDF generation fails?
- **Check:** Vercel logs for errors
- **Common issue:** Puppeteer timeout (increase timeout in `generate-commercial-proposal.js`)
- **Solution:** Check if Chromium is properly installed

### PDF is blank or incorrectly formatted?
- **Check:** `api/templates/commercial-proposal.html`
- **Solution:** Verify all `{{placeholders}}` are correct

### Long generation time?
- **Normal:** First request takes 10-15 seconds (Chromium cold start)
- **Subsequent requests:** 3-5 seconds

---

## 💡 Future Enhancements

Potential improvements:
- [ ] Add custom pricing per proposal
- [ ] Support multiple templates
- [ ] Save generated proposals to Firebase
- [ ] Add proposal history for admins
- [ ] Email delivery option
- [ ] Multi-language support

---

## 📞 Support

For issues or questions:
- Check Vercel deployment logs
- Review Telegram bot logs
- Verify environment variables (`TELEGRAM_BOT_TOKEN`)

---

**Built with:**
- Puppeteer + Chromium (PDF generation)
- Telegram Bot API
- Vercel Serverless Functions
- Node.js 18+

**Last updated:** January 9, 2026
