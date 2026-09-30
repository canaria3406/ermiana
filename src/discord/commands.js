import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ContextMenuCommandBuilder,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';

export const REMOVE_MESSAGE_COMMAND_NAME = 'removeMessage';
export const BAN_PREVIEW_COMMAND_NAME = 'banpreview';
export const TWITTER_STYLE_COMMAND_NAME = 'twitter-style';
export const RESET_PREVIEW_COMMAND_NAME = 'resetpreview';
export const INFO_COMMAND_NAME = 'info';
export const CHECK_COMMAND_NAME = 'check';
export const FIX_COMMAND_NAME = 'fix';

export const PREVIEW_PROVIDER_CHOICES = Object.freeze([
  { name: 'PTT', value: 'ptt' },
  { name: '巴哈姆特', value: 'bahamut' },
  { name: '噗浪', value: 'plurk' },
  { name: 'Twitter', value: 'twitter' },
  { name: 'Pixiv', value: 'pixiv' },
  { name: 'Facebook', value: 'facebook' },
  { name: 'Instagram', value: 'instagram' },
  { name: 'Threads', value: 'threads' },
  { name: 'Bluesky', value: 'bluesky' },
  { name: 'Misskey', value: 'misskey' },
  { name: 'Bilibili', value: 'bilibili' },
  { name: 'TikTok', value: 'tiktok' },
  { name: 'PChome', value: 'pchome' },
  { name: 'ehentai', value: 'ehentai' },
  { name: 'nhentai', value: 'nhentai' },
]);

export const TWITTER_STYLE_CHOICES = Object.freeze([
  { name: 'old', value: 'old' },
  { name: 'default', value: 'default' },
  { name: 'new', value: 'new' },
]);

export const REMOVE_MESSAGE_NAME_LOCALIZATIONS = Object.freeze({
  'en-GB': 'Delete BOT Message',
  'en-US': 'Delete BOT Message',
  'zh-TW': '刪除機器人訊息',
  'zh-CN': '删除机器人信息',
  'ja': 'ロボメセを削除',
});

export function buildApplicationCommands() {
  return [
    new SlashCommandBuilder()
      .setName(BAN_PREVIEW_COMMAND_NAME)
      .setDescription('開啟或關閉指定網站的預覽處理')
      .setContexts(InteractionContextType.Guild)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption((option) => option
        .setName('site')
        .setDescription('要停用或恢復預覽的網站')
        .setRequired(true)
        .addChoices(...PREVIEW_PROVIDER_CHOICES))
      .toJSON(),
    new SlashCommandBuilder()
      .setName(TWITTER_STYLE_COMMAND_NAME)
      .setDescription('設定 Twitter 預覽樣式')
      .setContexts(InteractionContextType.Guild)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption((option) => option
        .setName('style')
        .setDescription('Twitter 預覽樣式')
        .setRequired(true)
        .addChoices(...TWITTER_STYLE_CHOICES))
      .toJSON(),
    new SlashCommandBuilder()
      .setName(RESET_PREVIEW_COMMAND_NAME)
      .setDescription('恢復此伺服器的所有網站預覽')
      .setContexts(InteractionContextType.Guild)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
    new SlashCommandBuilder()
      .setName(INFO_COMMAND_NAME)
      .setDescription('查看 ermiana 的運作狀態')
      .setContexts(InteractionContextType.Guild)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
    new SlashCommandBuilder()
      .setName(CHECK_COMMAND_NAME)
      .setDescription('檢查 ermiana 在此伺服器中的權限')
      .setContexts(InteractionContextType.Guild)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
    new SlashCommandBuilder()
      .setName(FIX_COMMAND_NAME)
      .setDescription('修復網站連結並顯示預覽')
      .setIntegrationTypes(
        ApplicationIntegrationType.GuildInstall,
        ApplicationIntegrationType.UserInstall,
      )
      .setContexts(
        InteractionContextType.Guild,
        InteractionContextType.PrivateChannel,
      )
      .addStringOption((option) => option
        .setName('url')
        .setDescription('網站連結')
        .setRequired(true))
      .toJSON(),
    new ContextMenuCommandBuilder()
      .setName(REMOVE_MESSAGE_COMMAND_NAME)
      .setNameLocalizations(REMOVE_MESSAGE_NAME_LOCALIZATIONS)
      .setType(ApplicationCommandType.Message)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setContexts(InteractionContextType.Guild)
      .toJSON(),
  ];
}
