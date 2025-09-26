/**
 * createCtxForMessage(message)
 * createCtxForInteraction(interaction)
 *
 * Both return an object with:
 * - isCommand() => boolean
 * - reply(options)
 * - deferReply()
 * - editReply(content)
 * - followUp(options)
 *
 * The message variant emulates defer/edit by sending a temporary message and editing it.
 */

const path = require('path');

function createCtxForMessage(message) {
  let deferredMessage = null;
  return {
    isCommand: () => false,
    author: message.author,
    member: message.member,
    guild: message.guild,
    channel: message.channel,
    content: message.content,
    createdTimestamp: message.createdTimestamp,
    async deferReply() {
      try {
        // send a small placeholder and keep it so editReply can update it
        deferredMessage = await message.channel.send('⏳ Processing...');
      } catch (e) {
        // fallback to typing
        try { await message.channel.sendTyping(); } catch {}
      }
    },
    async reply(options) {
      if (typeof options === 'string') return message.reply(options);
      if (options && typeof options === 'object') {
        // ignore ephemeral for messages
        const content = options.content ?? options;
        if (options.fetchReply) {
          return message.reply(content);
        }
        return message.reply(content);
      }
      return message.reply(String(options));
    },
    async editReply(content) {
      if (deferredMessage) {
        return deferredMessage.edit(typeof content === 'string' ? content : (content.content || ''));
      }
      return message.channel.send(typeof content === 'string' ? content : (content.content || ''));
    },
    async followUp(options) {
      if (typeof options === 'string') return message.channel.send(options);
      return message.channel.send(options.content || '');
    }
  };
}

function createCtxForInteraction(interaction) {
  return {
    isCommand: () => true,
    author: interaction.user,
    member: interaction.member,
    guild: interaction.guild,
    channel: interaction.channel,
    content: null,
    createdTimestamp: interaction.createdTimestamp,
    async deferReply(opts) {
      return interaction.deferReply(opts);
    },
    async reply(options) {
      return interaction.reply(options);
    },
    async editReply(content) {
      return interaction.editReply(content);
    },
    async followUp(options) {
      return interaction.followUp(options);
    }
  };
}

module.exports = {
  createCtxForMessage,
  createCtxForInteraction
};
