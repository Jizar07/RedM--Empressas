# RedM Discord Bot / RedM--Empressas

A comprehensive Discord bot for managing RedM (Red Dead Redemption Online RP) servers with a web dashboard.
Gerenciador de empressa do RedM

## Features

- 🤖 **Discord Bot Integration**
  - Slash commands for server management
  - Real-time server status monitoring
  - Player management commands
  - Role synchronization

- 🌐 **Web Dashboard**
  - Real-time server statistics
  - Player management interface
  - Server configuration
  - Analytics and logs

- 🎮 **RedM Server Integration**
  - Server status monitoring
  - Player tracking
  - RCON command execution
  - Resource management

## Prerequisites

- Node.js v18 or higher
- MongoDB (optional, for data persistence)
- A RedM/FiveM server
- Discord Bot Token

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Jizar07/RedM--Empressas.git
cd DiscordBot
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up Discord Bot:
   - Go to https://discord.com/developers/applications
   - Create a new application
   - Go to Bot section and create a bot
   - Copy the bot token to your .env file
   - Enable necessary intents (Server Members, Message Content, Presence)

5. Run the bot:
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## Configuration

Edit the `.env` file with your settings:

- `DISCORD_TOKEN` - Your Discord bot token
- `DISCORD_CLIENT_ID` - Your Discord application ID
- `DISCORD_GUILD_ID` - Your Discord server ID (for development)
- `REDM_SERVER_IP` - Your RedM server IP address
- `REDM_SERVER_PORT` - Your RedM server port (default: 30120)
- `MONGODB_URI` - MongoDB connection string (optional)

## Commands

### Info Commands
- `/ping` - Check bot latency
- `/help` - Display help information
- `/about` - About the bot

### RedM Commands
- `/status` - Check server status
- `/players` - List online players
- `/playerinfo <player>` - Get player information

### Admin Commands
- `/restart` - Restart the server
- `/kick <player> [reason]` - Kick a player
- `/ban <player> [reason] [duration]` - Ban a player
- `/whitelist <add|remove> <player>` - Manage whitelist

## API Endpoints

The bot includes a REST API for the web dashboard:

- `GET /api/status` - Server status
- `GET /api/players` - Player list
- `GET /api/bot/stats` - Bot statistics
- `POST /api/players/:id/kick` - Kick player
- `POST /api/players/:id/ban` - Ban player

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Format code
npm run format
```

## Project Structure

```
DiscordBot/
├── src/
│   ├── bot/           # Discord bot logic
│   │   ├── commands/  # Bot commands
│   │   ├── events/    # Discord events
│   │   └── utils/     # Bot utilities
│   ├── api/           # REST API
│   │   ├── routes/    # API routes
│   │   └── middleware/# Express middleware
│   ├── services/      # Business logic
│   ├── models/        # Database models
│   ├── config/        # Configuration
│   └── index.ts       # Entry point
├── .env               # Environment variables
├── package.json       # Dependencies
└── tsconfig.json      # TypeScript config
```

## License

MIT

## Support

For issues and feature requests, please use the GitHub issue tracker.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
