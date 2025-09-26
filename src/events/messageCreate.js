const { Collection, PermissionsBitField } = require('discord.js');
const { createCtxForMessage } = require('../utils/respond');

/**
 * parseArgs: tokenizes supporting quotes
 */
function parseArgs(text) {
  const re = /"([^"]+)"|'([^']+)'|`([^`]+)`|([^\s]+)/g;
  const args = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    args.push(match[1] ?? match[2] ?? match[3] ?? match[4]);
  }
  return args;
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    try {
      if (message.author.bot) return;

      const prefix = (client.config && client.config.prefix) ? client.config.prefix : 'N.';
      if (!message.content || !message.content.toLowerCase().startsWith(prefix.toLowerCase())) return;

      const after = message.content.slice(prefix.length).trim();
      if (!after) return;

      const tokens = parseArgs(after);
      if (tokens.length === 0) return;

      const commandName = tokens.shift().toLowerCase();
      const command = client.textCommands && client.textCommands.get(commandName);
      if (!command) return;

      // owner support (ownerId or ownerID)
      const ownerId = (client.config && (client.config.ownerId || client.config.ownerID)) || null;

      // owner-only
      if (command.ownerOnly && message.author.id !== ownerId) {
        return message.reply({ content: 'You cannot use this command.' }).catch(()=>{});
      }

      // guild-only
      if (command.guildOnly && !message.guild) {
        return message.reply({ content: 'This command can only be used in servers.' }).catch(()=>{});
      }

      // user permissions
      if (command.permissions && command.permissions.length && message.guild) {
        const member = message.member;
        if (!member.permissions.has(PermissionsBitField.resolve(command.permissions))) {
          return message.reply({ content: 'You do not have the required permissions to run this command.' }).catch(()=>{});
        }
      }

      // bot permissions
      if (command.botPermissions && command.botPermissions.length && message.guild) {
        const me = message.guild.members.me;
        if (!me.permissions.has(PermissionsBitField.resolve(command.botPermissions))) {
          return message.reply({ content: 'I need additional permissions to run this command.' }).catch(()=>{});
        }
      }

      // cooldowns (same mechanic)
      const now = Date.now();
      const timestamps = client.cooldowns.get(command.name) || new Collection();
      const cooldownAmount = (command.cooldown || 3) * 1000;
      if (timestamps.has(message.author.id)) {
        const expiration = timestamps.get(message.author.id) + cooldownAmount;
        if (now < expiration) {
          const timeLeft = ((expiration - now) / 1000).toFixed(1);
          return message.reply({ content: `Please wait ${timeLeft}s before using \`${command.name}\` again.` }).catch(()=>{});
        }
      }
      timestamps.set(message.author.id, now);
      client.cooldowns.set(command.name, timestamps);
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

      // ctx wrapper
      const ctx = createCtxForMessage(message);

      // execute with tokens as args
      await command.execute(ctx, client, tokens);
    } catch (err) {
      console.error('Error in messageCreate handler:', err);
    }
  }
};
