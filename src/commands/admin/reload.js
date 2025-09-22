const path = require('path');

module.exports = {
  name: 'reload',
  description: 'Reload all commands & events (owner only).',
  ownerOnly: true,
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    try {
      // reload config first
      delete require.cache[require.resolve(path.join(__dirname, '../../../config.json'))];
      client.config = require(path.join(__dirname, '../../../config.json'));

      await client.commandHandler.loadCommands();
      await client.commandHandler.registerCommands();
      await client.eventHandler.loadEvents();

      return interaction.editReply({ content: '✅ Reloaded config, commands & events.' });
    } catch (err) {
      console.error('Manual reload failed:', err);
      return interaction.editReply({ content: `❌ Reload failed: ${err.message}` });
    }
  }
};
