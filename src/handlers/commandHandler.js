const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const chokidar = require('chokidar');
const logger = require('../utils/logger');

module.exports = (client) => {
  const commandsPath = path.join(__dirname, '..', 'commands');
  let registeredCommands = [];

  function listFiles(dir) {
    const files = [];
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
      const res = path.join(dir, dirent.name);
      if (dirent.isDirectory()) files.push(...listFiles(res));
      else if (dirent.isFile() && dirent.name.endsWith('.js')) files.push(res);
    }
    return files;
  }

  async function loadCommands() {
    client.commands.clear();
    client.textCommands = new Map();
    const files = listFiles(commandsPath);
    const slashCommands = [];

    for (const file of files) {
      try {
        delete require.cache[require.resolve(file)];
        const command = require(file);

        if (!command || !command.name || typeof command.execute !== 'function') {
          logger.warn(`Skipping invalid command file: ${file}`);
          continue;
        }

        client.commands.set(command.name, command);

        // text trigger mapping: map by lowercase name and optional aliases
        client.textCommands.set(command.name.toLowerCase(), command);
        if (Array.isArray(command.aliases)) {
          for (const a of command.aliases) client.textCommands.set(a.toLowerCase(), command);
        }

        slashCommands.push({
          name: command.name,
          description: command.description || 'No description',
          options: command.options || []
        });
      } catch (err) {
        logger.error(`Error loading command ${file}:`, err);
      }
    }

    registeredCommands = slashCommands;
    logger.info(`Loaded ${client.commands.size} commands.`);
    return registeredCommands;
  }

  async function registerCommands() {
    if (!client.config || !client.config.clientId) {
      logger.warn('clientId not set; skipping command registration.');
      return;
    }

    const rest = new REST({ version: '10' }).setToken(client.config.token);

    try {
      if (client.config.devGuildId) {
        await rest.put(
          Routes.applicationGuildCommands(client.config.clientId, client.config.devGuildId),
          { body: registeredCommands }
        );
        logger.info('Registered commands to DEV guild:', client.config.devGuildId);
      } else {
        await rest.put(
          Routes.applicationCommands(client.config.clientId),
          { body: registeredCommands }
        );
        logger.info('Registered global application commands.');
      }
    } catch (err) {
      logger.error('Failed to register commands:', err);
      throw err;
    }
  }

  function watchCommands() {
    const watcher = chokidar.watch(commandsPath, { ignoreInitial: true });
    let timeout = null;
    const doReload = async () => {
      try {
        await loadCommands();
        await registerCommands();
        logger.info('Hot-reloaded commands.');
      } catch (err) {
        logger.error('Hot-reload failed:', err);
      }
    };
    watcher.on('all', () => {
      clearTimeout(timeout);
      timeout = setTimeout(doReload, 250);
    });
    return watcher;
  }

  return {
    loadCommands,
    registerCommands,
    watchCommands
  };
};
