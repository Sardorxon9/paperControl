# Telegram Bot Setup Guide - "Узнать бумагу" Feature

This guide explains how to set up and use the new Telegram bot feature for checking paper inventory.

## Overview

The Telegram bot allows users to:
1. Click a button "Узнать бумагу" (Check Paper)
2. Enter a restaurant name
3. Get intelligent fuzzy search results
4. View detailed paper inventory information including:
   - Restaurant name and organization
   - Product type and gramm
   - List of paper rolls with weights
   - Total kg available

## Architecture

The implementation consists of:
- **Webhook Handler**: `api/telegram-webhook.js` - Receives updates from Telegram
- **Setup Script**: `scripts/setup-telegram-bot.js` - Configures the bot
- **Fuzzy Search**: Built-in fuzzy matching algorithm for restaurant names
- **Firebase Integration**: Reads data from Firestore

## Prerequisites

1. **Telegram Bot Token**: Already configured in `api/.env`
2. **Firebase Project**: Already set up (`paper-control-6bce2`)
3. **Deployment Platform**: Vercel (or similar serverless platform)
4. **Node.js**: Version 18 or higher

## Installation

### Step 1: Install Dependencies

```bash
npm install
```

This will install the new dependency:
- `firebase-admin@^12.0.0` - For server-side Firebase access

### Step 2: Environment Configuration

The `api/.env` file has been updated with:
```env
TELEGRAM_BOT_TOKEN=8246058998:AAGMv8uqKtjnzZAb2pLps2V3OKllgw_8yo4
PORT=3001
FIREBASE_PROJECT_ID=paper-control-6bce2
```

### Step 3: Deploy to Vercel

1. Make sure you're logged in to Vercel:
   ```bash
   vercel login
   ```

2. Deploy the project:
   ```bash
   vercel --prod
   ```

3. Note down your deployment URL (e.g., `https://your-app.vercel.app`)

### Step 4: Set Up Webhook

After deployment, run the setup script:

```bash
node scripts/setup-telegram-bot.js https://your-app.vercel.app/api/telegram-webhook
```

This script will:
- Set the webhook URL for your bot
- Configure the menu button
- Set bot commands
- Display current webhook status

**Example output:**
```
🚀 Telegram Bot Setup Script

================================

🤖 Getting bot info...
✅ Bot info:
   Username: @your_bot
   Name: Paper Control Bot
   ID: 8246058998

🔄 Setting webhook to: https://your-app.vercel.app/api/telegram-webhook
✅ Webhook set successfully!

🔘 Setting menu button...
✅ Menu button set successfully!

⚙️  Setting bot commands...
✅ Commands set successfully!

✨ Setup complete!
```

## How It Works

### User Flow

1. **User sends /start**:
   - Bot responds with welcome message
   - Shows "📄 Узнать бумагу" button

2. **User clicks "Узнать бумагу"**:
   - Bot prompts: "🔍 Пожалуйста, введите название ресторана:"

3. **User enters restaurant name** (e.g., "Макдональдс"):
   - Bot performs fuzzy search across all clients
   - Handles typos and Cyrillic/Latin variations

4. **Single match found**:
   - Bot displays formatted paper information immediately

5. **Multiple matches found**:
   - Bot shows inline buttons to select the correct one
   - User clicks the desired option
   - Bot displays paper information

### Search Algorithm

The fuzzy search:
- Searches across: `name`, `orgName`, `restaurant` fields
- Uses Levenshtein distance for typo tolerance
- Prioritizes exact substring matches
- Handles threshold-based filtering (40% of query length)

### Data Sources

The bot queries Firestore collections:
- **clients**: Main restaurant data
- **clients/{id}/paperRolls**: Paper roll subcollection
- **products**: Product names
- **packageTypes**: Package type names
- **productTypes**: Gramm values

## Response Format

Example response message:

```
📋 Информация о бумаге

🏢 Ресторан: Макдональдс
🏛 Организация: МакДональдс УЗ ООО

📦 Продукт: Burger Paper (4 гр)
📐 Упаковка: Коробка

📜 Рулоны бумаги:
  • Рулон 1: 15 кг
  • Рулон 2: 23 кг
  • Рулон 3: 18 кг

🔢 ИТОГО: 56 кг
```

## Code Structure

### Webhook Handler (`api/telegram-webhook.js`)

Main components:
- **Session Management**: In-memory storage for user states
- **Message Handlers**:
  - `/start` - Welcome message with keyboard
  - `📄 Узнать бумагу` - Initiates search flow
  - Text input - Restaurant name search
  - Callback queries - Product selection
- **Database Queries**:
  - `searchRestaurants()` - Fuzzy search
  - `getPaperRolls()` - Fetch paper inventory
  - `formatPaperInfoMessage()` - Generate response

### Setup Script (`scripts/setup-telegram-bot.js`)

Functions:
- `setWebhook()` - Configure webhook URL
- `getWebhookInfo()` - Check current status
- `setMenuButton()` - Configure menu
- `setCommands()` - Set bot commands
- `getBotInfo()` - Display bot information

## Testing

### Local Testing

For local testing, you can use ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Start local server
vercel dev

# In another terminal, expose local server
ngrok http 3000

# Set webhook to ngrok URL
node scripts/setup-telegram-bot.js https://abc123.ngrok.io/api/telegram-webhook
```

### Manual Testing Steps

1. Open your bot in Telegram
2. Send `/start`
3. Click "📄 Узнать бумагу"
4. Enter a restaurant name
5. Verify the response contains correct data

### Edge Cases to Test

- ✅ Restaurant with no paper rolls
- ✅ Multiple products for same restaurant
- ✅ Typos in restaurant name
- ✅ Non-existent restaurant
- ✅ Cyrillic and Latin text variations

## Troubleshooting

### Webhook Not Receiving Updates

Check webhook status:
```bash
node scripts/setup-telegram-bot.js
```

If there are errors, check:
- Vercel deployment is successful
- Environment variables are set correctly
- Firebase credentials are configured

### Bot Not Responding

1. Check Vercel logs:
   ```bash
   vercel logs
   ```

2. Verify bot token:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getMe
   ```

3. Test webhook manually:
   ```bash
   curl -X POST https://your-app.vercel.app/api/telegram-webhook \
     -H "Content-Type: application/json" \
     -d '{"message":{"chat":{"id":123},"text":"/start"}}'
   ```

### Firebase Permission Errors

Ensure Firebase Admin SDK is properly initialized:
- Check `FIREBASE_PROJECT_ID` in `api/.env`
- Verify Vercel has access to Firebase (may need service account)

## Maintenance

### Updating the Bot

1. Make changes to `api/telegram-webhook.js`
2. Test locally if needed
3. Deploy:
   ```bash
   vercel --prod
   ```
4. No need to reset webhook if URL hasn't changed

### Monitoring

Monitor bot activity:
- Check Vercel function logs
- Watch for webhook errors in Telegram
- Track user sessions in application logs

## Security Considerations

1. **Token Security**: Bot token is in `.env` (not committed to git)
2. **Session Storage**: Currently in-memory (consider Redis for production)
3. **Input Validation**: All user inputs are sanitized
4. **Rate Limiting**: Telegram has built-in rate limits

## Future Enhancements

Potential improvements:
- 🔄 Real-time notifications when paper is low
- 📊 Statistics on most searched restaurants
- 🔐 User authentication/authorization
- 💾 Persistent session storage (Redis)
- 🌐 Multi-language support
- 📱 Deep linking for specific restaurants
- 🎨 Rich media responses (images, charts)

## Support

For issues or questions:
1. Check Vercel deployment logs
2. Review Telegram webhook info
3. Verify Firebase data structure
4. Contact the development team

---

**Last Updated**: January 2026
**Version**: 1.0.0
**Status**: ✅ Production Ready
