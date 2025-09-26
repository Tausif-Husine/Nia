const path = require('path');

module.exports = {
  name: 'reload',
  description: 'Reload config, commands & events (owner only)',
  ownerOnly: true,
  async execute(ctx, client) {
    // owner check is handled by interaction/message handlers
    await ctx.deferReply();
    try {
      // reload config.json
      delete require.cache[require.resolve(path.join(__dirname, '../../../config.json'))];
      client.config = require(path.join(__dirname, '../../../config.json'));

      await client.commandHandler.loadCommands();
      await client.commandHandler.registerCommands();
      await client.eventHandler.loadEvents();

      await ctx.editReply('✅ Reloaded config, commands & events.');
    } catch (err) {
      console.error('Reload failed:', err);
      await ctx.editReply(`❌ Reload failed: ${err.message}`);
    }
  }
};
