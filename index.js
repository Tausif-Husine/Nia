const config = require('./config.json');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const path = require('path');
const logger = require('./src/utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL']
});

client.config = config;
client.commands = new Collection();
client.cooldowns = new Collection();
client.textCommands = new Map(); // populated by commandHandler

// attach handlers
const commandHandler = require('./src/handlers/commandHandler')(client);
const eventHandler = require('./src/handlers/eventHandler')(client);

client.commandHandler = commandHandler;
client.eventHandler = eventHandler;

(async () => {
  try {
    // load and register
    await client.commandHandler.loadCommands();
    await client.commandHandler.registerCommands();
    await client.eventHandler.loadEvents();

    // start watchers (hot reload)
    client.commandHandler.watchCommands();
    client.eventHandler.watchEvents();

    // login
    await client.login(client.config.token);
    logger.info('Client logged in.');
  } catch (err) {
    logger.error('Startup failed:', err);
    process.exit(1);
  }
})();

// graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
