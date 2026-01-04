#!/usr/bin/env node

/**
 * Setup script for Telegram Bot
 * This script sets up the webhook URL and menu button for the Telegram bot
 *
 * Usage:
 *   node scripts/setup-telegram-bot.js <your-webhook-url>
 *
 * Example:
 *   node scripts/setup-telegram-bot.js https://your-domain.vercel.app/api/telegram-webhook
 */

require('dotenv').config({ path: './api/.env' });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in api/.env file');
  process.exit(1);
}

const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function setWebhook(webhookUrl) {
  try {
    console.log(`🔄 Setting webhook to: ${webhookUrl}`);

    const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Webhook set successfully!');
      console.log('   Description:', data.description);
      return true;
    } else {
      console.error('❌ Failed to set webhook');
      console.error('   Error:', data.description);
      return false;
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error.message);
    return false;
  }
}

async function getWebhookInfo() {
  try {
    console.log('\n📡 Getting webhook info...');

    const response = await fetch(`${TELEGRAM_API_URL}/getWebhookInfo`);
    const data = await response.json();

    if (data.ok) {
      console.log('✅ Current webhook info:');
      console.log('   URL:', data.result.url || '(not set)');
      console.log('   Pending updates:', data.result.pending_update_count || 0);

      if (data.result.last_error_date) {
        const errorDate = new Date(data.result.last_error_date * 1000);
        console.log('   ⚠️  Last error:', data.result.last_error_message);
        console.log('   Last error date:', errorDate.toLocaleString());
      }

      return true;
    } else {
      console.error('❌ Failed to get webhook info');
      return false;
    }
  } catch (error) {
    console.error('❌ Error getting webhook info:', error.message);
    return false;
  }
}

async function setMenuButton() {
  try {
    console.log('\n🔘 Setting menu button...');

    const response = await fetch(`${TELEGRAM_API_URL}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'commands'
        }
      })
    });

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Menu button set successfully!');
      return true;
    } else {
      console.error('❌ Failed to set menu button');
      console.error('   Error:', data.description);
      return false;
    }
  } catch (error) {
    console.error('❌ Error setting menu button:', error.message);
    return false;
  }
}

async function setCommands() {
  try {
    console.log('\n⚙️  Setting bot commands...');

    const response = await fetch(`${TELEGRAM_API_URL}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          {
            command: 'start',
            description: 'Начать работу с ботом'
          }
        ]
      })
    });

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Commands set successfully!');
      return true;
    } else {
      console.error('❌ Failed to set commands');
      console.error('   Error:', data.description);
      return false;
    }
  } catch (error) {
    console.error('❌ Error setting commands:', error.message);
    return false;
  }
}

async function getBotInfo() {
  try {
    console.log('\n🤖 Getting bot info...');

    const response = await fetch(`${TELEGRAM_API_URL}/getMe`);
    const data = await response.json();

    if (data.ok) {
      console.log('✅ Bot info:');
      console.log('   Username: @' + data.result.username);
      console.log('   Name:', data.result.first_name);
      console.log('   ID:', data.result.id);
      return true;
    } else {
      console.error('❌ Failed to get bot info');
      return false;
    }
  } catch (error) {
    console.error('❌ Error getting bot info:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Telegram Bot Setup Script\n');
  console.log('================================\n');

  // Get bot info first
  await getBotInfo();

  // Get current webhook info
  await getWebhookInfo();

  // Get webhook URL from command line arguments
  const webhookUrl = process.argv[2];

  if (!webhookUrl) {
    console.log('\n⚠️  No webhook URL provided.');
    console.log('   Usage: node scripts/setup-telegram-bot.js <webhook-url>');
    console.log('   Example: node scripts/setup-telegram-bot.js https://your-domain.vercel.app/api/telegram-webhook');
    console.log('\n   To remove webhook, use: node scripts/setup-telegram-bot.js remove');
    process.exit(0);
  }

  if (webhookUrl === 'remove') {
    console.log('\n🗑️  Removing webhook...');
    await setWebhook('');
    await getWebhookInfo();
    process.exit(0);
  }

  // Validate webhook URL
  if (!webhookUrl.startsWith('https://')) {
    console.error('\n❌ Webhook URL must start with https://');
    process.exit(1);
  }

  // Set webhook
  const webhookSuccess = await setWebhook(webhookUrl);

  if (!webhookSuccess) {
    process.exit(1);
  }

  // Set menu button
  await setMenuButton();

  // Set commands
  await setCommands();

  // Get final webhook info
  await getWebhookInfo();

  console.log('\n✨ Setup complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Make sure your webhook endpoint is deployed');
  console.log('   2. Open your bot in Telegram: @' + (process.env.BOT_USERNAME || 'your_bot'));
  console.log('   3. Send /start to begin');
  console.log('   4. Click "Узнать бумагу" button to test');
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
