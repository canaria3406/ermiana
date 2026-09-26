import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  EmbedBuilder,
  escapeMarkdown,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  TextDisplayBuilder,
} from 'discord.js';
import {
  MAX_DISCORD_STORED_MEDIA,
  truncate,
  twitterImageUrl,
} from '../providers/helpers.js';

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

function safeUrl(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value) ? value : undefined;
}

function discordTimestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
}

function twitterVideoFooter(data, emoji, handle) {
  const parts = [];
  if (handle) parts.push(escapeMarkdown(handle));
  parts.push(escapeMarkdown(truncate(data.footer, 256) ?? 'ermiana'));
  const timestamp = discordTimestamp(data.timestamp);
  if (timestamp) parts.push(timestamp);
  return `-# ${emoji} ${parts.join(' • ')}`;
}

function twitterTitleLink(label, url) {
  const escaped = escapeMarkdown(label);
  if (!url) return escaped;
  const emojiIndex = label.search(/\p{Extended_Pictographic}/u);
  const link = `[開啟推文](${url.replaceAll(')', '%29')})`;
  if (emojiIndex < 0) return `[${escaped}](${url.replaceAll(')', '%29')})`;
  if (emojiIndex === 0) return `${escaped} ${link}`;
  const prefix = label.slice(0, emojiIndex).trimEnd();
  const suffix = label.slice(emojiIndex);
  return `[${escapeMarkdown(prefix)}](${url.replaceAll(')', '%29')})${escapeMarkdown(label.slice(prefix.length)) || suffix}`;
}

function twitterVideoUrl(sourceMediaUrl) {
  const mediaUrl = safeUrl(sourceMediaUrl);
  try {
    const url = new URL(mediaUrl);
    if (url.hostname === 'video.twimg.com' && url.pathname.endsWith('.mp4')) {
      return `https://vxtwitter.com/tvid${url.pathname.slice(0, -4)}`;
    }
  } catch {
    return mediaUrl;
  }
  return mediaUrl;
}

function twitterGalleryMediaItems(preview) {
  const structuredMedia = Array.isArray(preview.twitterGalleryMedia)
    ? preview.twitterGalleryMedia
    : [];
  const counts = { image: 0, video: 0 };
  const mediaUrls = [];
  for (const media of structuredMedia) {
    if (media?.type !== 'image' && media?.type !== 'video') continue;
    if (counts[media.type] >= MAX_DISCORD_STORED_MEDIA) continue;
    const url = media.type === 'image' ? twitterImageUrl(media.url) : twitterVideoUrl(media.url);
    if (!safeUrl(url)) continue;
    counts[media.type] += 1;
    mediaUrls.push({ type: media.type, url });
  }
  return mediaUrls;
}

function isTwitterMediaGallery(preview, twitterStyle, mediaItems) {
  const counts = mediaItems.reduce((result, media) => {
    result[media.type] += 1;
    return result;
  }, { image: 0, video: 0 });
  return twitterStyle !== 'old'
    && preview.provider === 'twitter'
    && (counts.image >= 2 || counts.video >= 1)
    && Boolean(preview.embed)
    && !preview.content;
}

function createTwitterMediaContainer(preview, mediaUrls, spoiler, footerEmoji) {
  const data = preview.embed;
  const container = new ContainerBuilder()
    .setAccentColor(Number.isInteger(data.color) ? data.color : 0x1da1f2)
    .setSpoiler(spoiler);
  const title = truncate(data.title, 256) ?? 'X / Twitter';
  const titleUrl = safeUrl(data.url);
  const description = truncate(data.description, 1000);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `## ${twitterTitleLink(title, titleUrl)}`,
  ));
  if (description) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
  const mediaItems = mediaUrls.map((url) => new MediaGalleryItemBuilder()
    .setURL(url)
    .setDescription(truncate(data.description ?? data.title, 128) ?? 'Twitter media'));
  container
    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(...mediaItems))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      twitterVideoFooter(data, footerEmoji, data.author?.name),
    ));
  return container;
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
  const storedImages = images.slice(0, MAX_DISCORD_STORED_MEDIA);
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
    this.twitterFooterEmoji = ':bird:';
  }

  async send(message, preview, { spoiler = false, twitterStyle = 'old' } = {}) {
    const images = (preview.images ?? []).slice(0, MAX_DISCORD_STORED_MEDIA);
    const twitterMediaItems = twitterGalleryMediaItems(preview);
    const useTwitterMediaGallery = isTwitterMediaGallery(preview, twitterStyle, twitterMediaItems);
    const templatePages = preview.pagination?.type === 'pixiv-url'
      ? Number(preview.pagination.totalPages)
      : 0;
    const nhentaiPages = preview.pagination?.type === 'nhentai-url'
      ? Number(preview.pagination.totalPages)
      : 0;
    const embed = !useTwitterMediaGallery && preview.embed
      ? createEmbed({ ...preview.embed, image: images[0] ?? preview.embed.image }, preview.iconUrl)
      : null;
    const payload = {
      allowedMentions: { parse: [], repliedUser: false },
    };
    if (useTwitterMediaGallery) {
      payload.flags = MessageFlags.IsComponentsV2;
      payload.components = [createTwitterMediaContainer(
        preview,
        twitterMediaItems.map((media) => media.url),
        spoiler,
        this.twitterFooterEmoji,
      )];
    } else {
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
    }
    if (!payload.content && !payload.embeds && !payload.components) throw new Error('Preview has no renderable content');

    const reply = await message.reply(payload);
    if (!useTwitterMediaGallery) {
      for (const mediaUrl of (preview.media ?? []).slice(0, MAX_DISCORD_STORED_MEDIA)) {
        const renderedMediaUrl = preview.provider === 'twitter' && twitterStyle === 'old'
          ? twitterVideoUrl(mediaUrl)
          : mediaUrl;
        const link = `[連結](${renderedMediaUrl})`;
        await message.channel.send({
          content: spoilerText(link, spoiler),
          allowedMentions: { parse: [] },
        });
      }
    }
    if (preview.suppressOriginal) await suppressOriginal(message, this.logger);
    return reply;
  }
}
