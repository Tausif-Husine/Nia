const { AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
  name: 'dog',
  description: 'Sends a local dog picture!',
  async execute(interaction) {
   // const filePath = path.join(__dirname, 'image.png'); // Ensure the image is in the same directory as this file
    const attachment = new AttachmentBuilder('src/commands/fun/image.png');

    await interaction.reply({
      files: [attachment]
    });
  },
};
