module.exports = {
  name: 'green',
  description: 'Example: green with two args (t and r)',
  options: [
    { name: 't', description: 'first value', type: 3, required: true },
    { name: 'r', description: 'second value', type: 3, required: true }
  ],
  async execute(ctx, client, args = []) {
    const t = args[0] ?? null;
    const r = args[1] ?? null;
    if (!t || !r) {
      return ctx.reply('Usage: N.green <t> <r>  OR  /green t:<value> r:<value>');
    }
    await ctx.reply(`Green received: T=${t} , R=${r}`);
  }
};
