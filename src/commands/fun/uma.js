module.exports = {
  name: 'uma',
  description: 'Say Uma Wewo is a cutipie ♡',
  async execute(ctx, client, args = []) {
    await ctx.reply('Uma Wewo is a cutipie ♡');
  }
};
