const { AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
  name: 'saint',
  description: 'Describe Saint Wewo ♡',
  async execute(interaction) {
   // const filePath = path.join(__dirname, 'image.png'); // Ensure the image is in the same directory as this file
    const attachment = new AttachmentBuilder('src/commands/fun/saint.jpg');

    await interaction.reply({
      files: [attachment]
    });
  },
};
