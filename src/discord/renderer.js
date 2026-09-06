import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { truncate } from '../providers/helpers.js';

export const PAGINATION_IDS = Object.freeze({
  cycle: 'morePictureButton',
  first: 'theAPicture',
  previous: 'theBPicture',
  page: 'pagePicture',
  next: 'theNPicture',
  last: 'theZPicture',
});

export const NHENTAI_PAGINATION_IDS = Object.freeze({
  first: 'theAPictureN',
  previous: 'theBPictureN',
  page: 'pagePictureN',
  next: 'theNPictureN',
  last: 'theZPictureN',
});

const MAX_DISCORD_STORED_IMAGES = 4;

function safeUrl(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value) ? value : undefined;
}

export function createEmbed(data = {}, iconUrl) {
  const embed = new EmbedBuilder();
  const footerText = truncate(data.footer, 2048) ?? 'ermiana';
  let remainingCharacters = 6000 - footerText.length;
  const consume = (value, maximum) => {
    if (!value || remainingCharacters <= 0) return '';
    const text = truncate(String(value), Math.min(maximum, remainingCharacters));
    remainingCharacters -= text.length;
    return text;
  };

  if (Number.isInteger(data.color)) embed.setColor(data.color);
  if (data.author?.name) {
    const name = consume(data.author.name, 256);
    embed.setAuthor({
      name,
      iconURL: safeUrl(data.author.iconUrl),
      url: safeUrl(data.author.url),
    });
  }
  if (data.title) embed.setTitle(consume(data.title, 256));
  if (safeUrl(data.url)) embed.setURL(data.url);
  if (data.description && remainingCharacters > 0) embed.setDescription(consume(data.description, 4096));
  if (safeUrl(data.image)) embed.setImage(data.image);
  if (safeUrl(data.thumbnail)) embed.setThumbnail(data.thumbnail);
  if (data.timestamp) embed.setTimestamp(new Date(data.timestamp));
  const fields = [];
  for (const field of (data.fields ?? []).slice(0, 25)) {
    if (!field?.name || field?.value === undefined || field?.value === null || remainingCharacters < 2) continue;
    const name = consume(field.name, Math.min(256, remainingCharacters - 1));
    const value = consume(field.value, 1024);
    if (name && value) fields.push({ name, value, inline: Boolean(field.inline) });
  }
  if (fields.length > 0) embed.addFields(fields);
  embed.setFooter({ text: footerText, iconURL: safeUrl(iconUrl) });
  return embed;
}

export function createPaginationRow(currentPage, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(PAGINATION_IDS.first).setLabel('<<').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(PAGINATION_IDS.previous).setLabel('<').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(PAGINATION_IDS.page).setLabel(`${currentPage}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(PAGINATION_IDS.next).setLabel('>').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(PAGINATION_IDS.last).setLabel('>>').setStyle(ButtonStyle.Secondary),
  );
}

export function createNhentaiPaginationRow(currentPage, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(NHENTAI_PAGINATION_IDS.first).setLabel('<<').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(NHENTAI_PAGINATION_IDS.previous).setLabel('<').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(NHENTAI_PAGINATION_IDS.page).setLabel(`${currentPage}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(NHENTAI_PAGINATION_IDS.next).setLabel('>').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(NHENTAI_PAGINATION_IDS.last).setLabel('>>').setStyle(ButtonStyle.Secondary),
  );
}

export function createUrlStorageRow(images, currentIndex = 0) {
  const storedImages = images.slice(0, MAX_DISCORD_STORED_IMAGES);
  return new ActionRowBuilder().addComponents(storedImages.map((url, index) => {
    if (index === currentIndex) {
      return new ButtonBuilder()
        .setCustomId(PAGINATION_IDS.cycle)
        .setLabel('更多圖片')
        .setStyle(ButtonStyle.Secondary);
    }
    return new ButtonBuilder()
      .setLabel(String(index + 1))
      .setURL(url)
      .setStyle(ButtonStyle.Link)
      .setDisabled(true);
  }));
}

function spoilerText(value, spoiler) {
  return spoiler ? `||${value}||` : value;
}

async function suppressOriginal(message, logger) {
  try {
    if (message.deletable) await message.suppressEmbeds(true);
  } catch (error) {
    logger?.warn({ messageId: message.id, guildId: message.guildId, channelId: message.channelId, err: error }, 'could not suppress original embed');
  }
}

export class DiscordRenderer {
  constructor({ logger } = {}) {
    this.logger = logger;
  }

  async send(message, preview, { spoiler = false } = {}) {
    const images = (preview.images ?? []).slice(0, MAX_DISCORD_STORED_IMAGES);
    const templatePages = preview.pagination?.type === 'pixiv-url'
      ? Number(preview.pagination.totalPages)
      : 0;
    const nhentaiPages = preview.pagination?.type === 'nhentai-url'
      ? Number(preview.pagination.totalPages)
      : 0;
    const embed = preview.embed ? createEmbed({ ...preview.embed, image: images[0] ?? preview.embed.image }, preview.iconUrl) : null;
    const payload = {
      allowedMentions: { parse: [], repliedUser: false },
    };
    if (embed) payload.embeds = [embed];
    if (preview.content) {
      payload.content = spoilerText(preview.content, spoiler);
    } else if (spoiler && safeUrl(preview.canonicalUrl)) {
      payload.content = spoilerText(preview.canonicalUrl, true);
    }
    if (templatePages > 1 && images[0]) {
      payload.components = [createPaginationRow(1, templatePages)];
    } else if (nhentaiPages > 1 && images[0]) {
      payload.components = [createNhentaiPaginationRow(1, nhentaiPages)];
    } else if (images.length > 1) {
      payload.components = [createUrlStorageRow(images)];
    }
    if (!payload.content && !payload.embeds) throw new Error('Preview has no renderable content');

    const reply = await message.reply(payload);
    for (const mediaUrl of (preview.media ?? []).slice(0, 4)) {
      const link = `[連結](${mediaUrl})`;
      await message.channel.send({
        content: spoilerText(link, spoiler),
        allowedMentions: { parse: [] },
      });
    }
    if (preview.suppressOriginal) await suppressOriginal(message, this.logger);
    return reply;
  }
}
