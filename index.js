const config = require("./config.json");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const path = require("path");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Collections
client.commands = new Collection();
client.cooldowns = new Collection();
client.config = config;

// Load handlers
const commandHandler = require("./src/handlers/commandHandler")(client);
const eventHandler = require("./src/handlers/eventHandler")(client);

// Expose handlers on client
client.commandHandler = commandHandler;
client.eventHandler = eventHandler;

(async () => {
  try {
    await commandHandler.loadCommands();
    await commandHandler.registerCommands();
    await eventHandler.loadEvents();

    commandHandler.watchCommands();
    eventHandler.watchEvents();

    await client.login(config.token);
  } catch (err) {
    console.error("Failed to start bot:", err);
    process.exit(1);
  }
})();

// Global error handling
process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
});
