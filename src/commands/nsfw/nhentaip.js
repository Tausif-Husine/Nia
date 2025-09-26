const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');

// --- Helper Functions (Copied for simplicity) ---
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

// --- Command Definition ---
module.exports = {
  name: 'nhentaip',
  description: 'Searches nhentai and shows a random page from results.',
  options: [
    { name: 'tags', type: ApplicationCommandOptionType.String, description: 'Tags to search for, separated by spaces.', required: true },
    { name: 'amount', type: ApplicationCommandOptionType.Integer, description: 'Number of random pages to show (Default: 1, Max: 15).', required: false },
  ],

  async execute(ctx, client, args) {
    await ctx.deferReply();

    let queryParts = [];
    let amount = 1;

    if (ctx.isCommand()) {
      const [tags, amountValue] = args;
      if (tags) queryParts.push(tags);
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

    await ctx.editReply(`Found ${searchResults.length} results. Picking ${amount} random pages...`);
    
    // Shuffle and pick results
    const shuffled = searchResults.sort(() => 0.5 - Math.random());
    const finalResults = shuffled.slice(0, amount);

    for (const resultId of finalResults) {
      const details = await getDoujinDetails(resultId);
      if (details) {
        const extensionMap = { 'j': 'jpg', 'p': 'png', 'g': 'gif' };
        const randomPageNum = Math.floor(Math.random() * details.num_pages) + 1;
        const pageInfo = details.images.pages[randomPageNum - 1];
        const pageUrl = `https://i.nhentai.net/galleries/${details.media_id}/${randomPageNum}.${extensionMap[pageInfo.t]}`;
        const embed = new EmbedBuilder().setTitle(details.title.pretty).setURL(`https://nhentai.net/g/${details.id}`).setImage(pageUrl).setColor(0xED2553).setFooter({ text: `Page ${randomPageNum} of ${details.num_pages} | ID: ${details.id}` });
        await ctx.followUp({ embeds: [embed] });
      }
    }
  }
};
