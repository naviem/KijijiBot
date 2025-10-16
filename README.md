# 🤖 Kijiji Discord Bot

A powerful Node.js bot that monitors Kijiji listings and sends notifications to Discord webhooks when new items are found.

## ✨ Features

- 🔍 **Multiple Search Keywords** - Monitor different products simultaneously
- 🌍 **Multiple Regions** - Search across different cities (Edmonton, Calgary, etc.)
- 🔗 **Multiple Discord Webhooks** - Send notifications to different channels
- ⏰ **Custom Scan Intervals** - Set different intervals for each search (e.g., 5 min, 30 min)
- 📊 **Duplicate Prevention** - Only sends notifications for new listings
- 🖥️ **Web Dashboard** - Modern UI for easy management
- ✏️ **Edit & Pause** - Modify searches and pause without deleting
- 🗄️ **SQLite Database** - Persistent storage of searches and results

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd kijiji-discord-bot

# Install dependencies
npm install

# Create data directory
mkdir data

# Create config file (optional - uses defaults if not present)
cp config.example.json config.json
```

### 2. Start the Bot

```bash
# Start the bot
npm start
```

### Web Dashboard

The web UI starts automatically with `npm start` on port 3000 (configurable in config.json).

Visit `http://localhost:3000` to manage your bot.

**Features:**
- ✅ Add/Edit/Delete searches, webhooks, and regions
- ✅ Pause/Resume searches without deleting
- ✅ Test webhooks with one click
- ✅ View all search details (price, category, radius, last scan, status)
- ✅ Clean database (Settings tab removes orphaned data)

**Tabs:**
- **Searches** - Manage all your Kijiji searches
- **Webhooks** - Configure Discord webhook notifications
- **Regions** - View available regions (16 Canadian cities pre-loaded)
- **Settings** - Database cleanup and configuration

```bash
# To run web UI standalone (without scanner)
npm run web
```

## 📁 Project Structure

```
src/
├── config/        # Configuration loader
├── database/      # Database operations
├── scanner/       # Main scanning logic
├── services/      # Kijiji and Discord services
├── web/           # Web UI and API
└── index.js       # Main entry point
```

## 🔧 Configuration

### Config File (Optional)

The bot can be configured using a `config.json` file. If not present, it will use default settings.

```bash
# Create config from template
cp config.example.json config.json
```

**Available Settings:**

```json
{
  "server": {
    "port": 3000                      // Web UI port (default: 3000)
  },
  "database": {
    "path": "./data/kijiji_bot.db"    // Database file location
  },
  "scanner": {
    "immediateStart": true              // Run searches immediately on startup
  }
}
```

**Priority:** Environment variables > config.json > defaults
Example: `PORT=8080 npm start` overrides config.json port


### Discord Webhooks

1. Go to your Discord server settings
2. Navigate to Integrations → Webhooks
3. Create a new webhook
4. Copy the webhook URL
5. Add it to the bot using the CLI or web UI

## 📊 Database Schema

The bot uses SQLite with the following tables:

- **webhooks**: Discord webhook configurations
- **regions**: Kijiji region URLs
- **searches**: Search configurations
- **results**: Tracked listings (prevents duplicates)

## 🚨 Important Notes

- **Rate Limiting**: The bot includes delays to respect Kijiji's rate limits
- **Terms of Service**: Always check Kijiji's terms of service before scraping
- **Webhook Limits**: Discord webhooks have rate limits (5 requests per 2 seconds)
- **Data Persistence**: All data is stored in `data/kijiji_bot.db`

## 🔍 Troubleshooting

### Common Issues

1. **Webhook not working**
   - Check the webhook URL is correct
   - Use the Test button in the Web Dashboard (Webhooks tab)

2. **No new listings found**
   - Check the region URL is valid
   - Verify the keyword is spelled correctly
   - Check the bot logs for errors

3. **Bot not starting**
   - Ensure all dependencies are installed
   - Check the database file permissions
   - Verify the data directory exists


## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review the logs for error messages
3. Create an issue with detailed information
