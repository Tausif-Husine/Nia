const { Collection, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return interaction.reply({ content: 'Command not found.', ephemeral: true });

    // Owner check
    if (command.ownerOnly && interaction.user.id !== client.config.ownerId) {
      return interaction.reply({ content: 'You cannot use this command.', ephemeral: true });
    }

    // Guild-only
    if (command.guildOnly && !interaction.inGuild()) {
      return interaction.reply({ content: 'This command can only be used in servers.', ephemeral: true });
    }

    // User permissions
    if (command.permissions && command.permissions.length) {
      const member = interaction.member;
      if (!member.permissions.has(PermissionsBitField.resolve(command.permissions))) {
        return interaction.reply({ content: 'You do not have the required permissions.', ephemeral: true });
      }
    }

    // Bot permissions
    if (command.botPermissions && command.botPermissions.length && interaction.inGuild()) {
      const me = interaction.guild.members.me;
      if (!me.permissions.has(PermissionsBitField.resolve(command.botPermissions))) {
        return interaction.reply({ content: 'I need additional permissions to run this command.', ephemeral: true });
      }
    }

    // Cooldowns
    const now = Date.now();
    const timestamps = client.cooldowns.get(command.name) || new Collection();
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(interaction.user.id)) {
      const expiration = timestamps.get(interaction.user.id) + cooldownAmount;
      if (now < expiration) {
        const timeLeft = ((expiration - now) / 1000).toFixed(1);
        return interaction.reply({ content: `Please wait ${timeLeft}s before using \`${command.name}\`.`, ephemeral: true });
      }
    }
    timestamps.set(interaction.user.id, now);
    client.cooldowns.set(command.name, timestamps);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    // Execute command
    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(`Error executing ${command.name}:`, err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error executing the command.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error executing the command.', ephemeral: true });
      }
    }
  }
};
