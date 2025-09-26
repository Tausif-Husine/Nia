module.exports = {
  name: 'help',
  description: 'Display commands',
  async execute(ctx, client) {
    const lines = [];
    for (const [name, cmd] of client.commands) {
      lines.push(`**${name}** — ${cmd.description || 'No description'}`);
    }
    await ctx.reply({ content: lines.join('\n') || 'No commands found.' });
  }
};
