const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');

// --- Helper Functions (Shared) ---
async function searchNhentai(query) {
  try {
    const url = `https://nhentai.net/search/?q=${encodeURIComponent(query)}&sort=popular`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`NHentai search failed with status ${response.status}`);
      return [];
    }
    return (await response.text()).match(/<a href="\/g\/(\d+)\/">/g)?.map(m => m.match(/\d+/)[0]) || [];
  } catch (err) {
    console.error('Error during nhentai search:', err);
    return null;
  }
}

async function getDoujinDetails(id) {
  try {
    const url = `https://nhentai.net/api/gallery/${id}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error(`Error fetching details for ID ${id}:`, err);
    return null;
  }
}

function createDoujinEmbed(details) {
  const extensionMap = { 'j': 'jpg', 'p': 'png', 'g': 'gif' };
  const coverUrl = `https://i.nhentai.net/galleries/${details.media_id}/cover.${extensionMap[details.images.cover.t]}`;
  const tags = details.tags.filter(t => t.type === 'tag').map(t => `\`${t.name}\``).join(', ');
  const artists = details.tags.filter(t => t.type === 'artist').map(t => t.name).join(', ') || 'N/A';
  return new EmbedBuilder().setTitle(details.title.pretty).setURL(`https://nhentai.net/g/${details.id}`).setImage(coverUrl).setColor(0xED2553).addFields({ name: 'Artist(s)', value: artists, inline: true },{ name: 'Pages', value: details.num_pages.toString(), inline: true },{ name: 'Tags', value: tags.length > 1024 ? tags.substring(0, 1021) + '...' : tags }).setFooter({ text: `ID: ${details.id}` });
}

// --- Command Definition ---
module.exports = {
  name: 'nhentai',
  description: 'Searches nhentai for doujins and shows their covers.',
  options: [
    { name: 'tags', type: ApplicationCommandOptionType.String, description: 'Tags to search for, separated by spaces.', required: true },
    { name: 'artist', type: ApplicationCommandOptionType.String, description: 'Filter by artist.', required: false },
    { name: 'language', type: ApplicationCommandOptionType.String, description: 'Filter by language.', required: false, choices: [{ name: 'English', value: 'english' }, { name: 'Japanese', value: 'japanese' }, { name: 'Chinese', value: 'chinese' }] },
    { name: 'amount', type: ApplicationCommandOptionType.Integer, description: 'Number of results to show (Default: 1, Max: 15).', required: false },
  ],

  async execute(ctx, client, args) {
    await ctx.deferReply();

    let queryParts = [];
    let amount = 1;

    if (ctx.isCommand()) {
      const [tags, artist, language, amountValue] = args;
      if (tags) queryParts.push(tags);
      if (artist) queryParts.push(`artist:"${artist}"`);
      if (language) queryParts.push(`language:${language}`);
      amount = amountValue || 1;
    } else {
      const lastArg = parseInt(args[args.length - 1], 10);
      if (!isNaN(lastArg) && lastArg > 0) {
        amount = lastArg;
        args.pop();
      }
      queryParts = args;
    }

    amount = Math.max(1, Math.min(amount, 15));
    const fullQuery = queryParts.join(' ');
    const searchResults = await searchNhentai(fullQuery);

    if (searchResults === null) {
      return ctx.editReply('❌ **Connection Failed:** Could not connect to the search service.');
    }
    if (searchResults.length === 0) {
      return ctx.editReply('No results found for your query.');
    }

    const finalResults = searchResults.slice(0, amount);
    const embeds = [];
    const buttons = [];

    for (const resultId of finalResults.slice(0, 5)) {
      const details = await getDoujinDetails(resultId);
      if (details) {
        embeds.push(createDoujinEmbed(details));
        buttons.push(new ButtonBuilder().setCustomId(`nhentai_pages_${details.id}`).setLabel(`Pages for ID ${details.id}`).setStyle(ButtonStyle.Secondary));
      }
    }

    if (embeds.length === 0) {
      return ctx.editReply("Could not fetch details for any of the found results.");
    }

    const actionRow = new ActionRowBuilder().addComponents(buttons);
    const sentMessage = await ctx.editReply({ embeds, components: [actionRow] });

    // Handle button clicks
    const collector = sentMessage.channel.createMessageComponentCollector({ time: 300_000 });
    collector.on('collect', async i => {
        if (!i.customId.startsWith('nhentai_pages_')) return;
        await i.deferReply({ ephemeral: true });
        const doujinId = i.customId.split('_')[2];
        const details = await getDoujinDetails(doujinId);
        if (!details) return i.editReply('Sorry, I could not fetch the details for this doujin.');

        await i.editReply(`Sending all ${details.num_pages} pages for ID ${details.id}...`);
        const extensionMap = { 'j': 'jpg', 'p': 'png', 'g': 'gif' };
        for (let j = 0; j < details.num_pages; j += 10) {
            const batch = details.images.pages.slice(j, j + 10);
            const imageEmbeds = batch.map((p, index) => new EmbedBuilder().setURL(`https://nhentai.net/g/${doujinId}`).setImage(`https://i.nhentai.net/galleries/${details.media_id}/${j + index + 1}.${extensionMap[p.t]}`).setColor(0xED2553));
            await i.followUp({ embeds: imageEmbeds, ephemeral: true }).catch(err => console.error("Error sending follow-up pages:", err));
        }
    });

    collector.on('end', () => {
        const disabledRow = new ActionRowBuilder().addComponents(buttons.map(b => b.setDisabled(true)));
        ctx.editReply({ components: [disabledRow] }).catch(() => {});
    });
  }
};
