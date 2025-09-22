module.exports = {
  name: 'ping',
  description: 'Replies with latency.',
  cooldown: 3,
  async execute(interaction, client) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    return interaction.editReply(`Latency: ${latency}ms — API: ${Math.round(client.ws.ping)}ms`);
  }
};
