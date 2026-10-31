import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ContextMenuCommandBuilder,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { translations } from './interaction-i18n.js';

export const REMOVE_MESSAGE_COMMAND_NAME = 'removeMessage';
export const BAN_PREVIEW_COMMAND_NAME = 'banpreview';
export const TWITTER_STYLE_COMMAND_NAME = 'twitter-style';
export const RESET_PREVIEW_COMMAND_NAME = 'resetpreview';
export const INFO_COMMAND_NAME = 'info';
export const CHECK_COMMAND_NAME = 'check';
export const FIX_COMMAND_NAME = 'fix';

const COMMAND_DESCRIPTION_LOCALIZATIONS = Object.freeze({
  [BAN_PREVIEW_COMMAND_NAME]: translations(
    'Enable or disable previews for a specific website',
    '開啟或關閉指定網站的預覽處理',
    '启用或禁用指定网站的预览处理',
    '指定したサイトのプレビューを有効または無効にします',
  ),
  [TWITTER_STYLE_COMMAND_NAME]: translations(
    'Set the Twitter preview style',
    '設定 Twitter 預覽樣式',
    '设置 Twitter 预览样式',
    'Twitterのプレビュースタイルを設定します',
  ),
  [RESET_PREVIEW_COMMAND_NAME]: translations(
    'Restore all website previews in this server',
    '恢復此伺服器的所有網站預覽',
    '恢复此服务器的所有网站预览',
    'このサーバーのすべてのサイトのプレビューを元に戻します',
  ),
  [INFO_COMMAND_NAME]: translations(
    "View ermiana's operational status",
    '查看 ermiana 的運作狀態',
    '查看 ermiana 的运行状态',
    'ermianaの稼働状況を表示します',
  ),
  [CHECK_COMMAND_NAME]: translations(
    "Check ermiana's permissions in this server",
    '檢查 ermiana 在此伺服器中的權限',
    '检查 ermiana 在此服务器中的权限',
    'このサーバーでのermianaの権限を確認します',
  ),
  [FIX_COMMAND_NAME]: translations(
    'Fix a website link and display its preview',
    '修復網站連結並顯示預覽',
    '修复网站链接并显示预览',
    'サイトのリンクを修正してプレビューを表示します',
  ),
});

const OPTION_DESCRIPTION_LOCALIZATIONS = Object.freeze({
  site: translations(
    'The website whose previews will be enabled or disabled',
    '要停用或恢復預覽的網站',
    '要禁用或恢复预览的网站',
    'プレビューを無効化または再有効化するサイト',
  ),
  style: translations(
    'The Twitter preview style',
    'Twitter 預覽樣式',
    'Twitter 预览样式',
    'Twitterのプレビュースタイル',
  ),
  url: translations('The website link', '網站連結', '网站链接', 'サイトのリンク'),
});

function frozenChoice(name, value, nameLocalizations) {
  return Object.freeze({
    name,
    ...(nameLocalizations ? { name_localizations: nameLocalizations } : {}),
    value,
  });
}

export const PREVIEW_PROVIDER_CHOICES = Object.freeze([
  frozenChoice('PTT', 'ptt'),
  frozenChoice('Bahamut', 'bahamut', translations('Bahamut', '巴哈姆特', '巴哈姆特', 'バハムート')),
  frozenChoice('Plurk', 'plurk', translations('Plurk', '噗浪', '噗浪', 'Plurk')),
  frozenChoice('Twitter', 'twitter'),
  frozenChoice('Pixiv', 'pixiv'),
  frozenChoice('Facebook', 'facebook'),
  frozenChoice('Instagram', 'instagram'),
  frozenChoice('Threads', 'threads'),
  frozenChoice('Bluesky', 'bluesky'),
  frozenChoice('Misskey', 'misskey'),
  frozenChoice('Bilibili', 'bilibili'),
  frozenChoice('TikTok', 'tiktok'),
  frozenChoice('PChome', 'pchome'),
  frozenChoice(
    'Steam Workshop',
    'steam',
    translations('Steam Workshop', 'Steam 工作坊', 'Steam 创意工坊', 'Steamワークショップ'),
  ),
  frozenChoice('ehentai', 'ehentai'),
  frozenChoice('nhentai', 'nhentai'),
]);

export const TWITTER_STYLE_CHOICES = Object.freeze([
  frozenChoice('old', 'old'),
  frozenChoice('default', 'default'),
  frozenChoice('new', 'new'),
]);

export const REMOVE_MESSAGE_NAME_LOCALIZATIONS = translations(
  'Delete BOT Message',
  '刪除機器人訊息',
  '删除机器人消息',
  'ロボメセを削除',
);

export function buildApplicationCommands() {
  return [
    new SlashCommandBuilder()
      .setName(BAN_PREVIEW_COMMAND_NAME)
      .setDescription('Enable or disable previews for a specific website')
      .setDescriptionLocalizations(COMMAND_DESCRIPTION_LOCALIZATIONS[BAN_PREVIEW_COMMAND_NAME])
      .setContexts(InteractionContextType.Guild)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption((option) => option
        .setName('site')
        .setDescription('The website whose previews will be enabled or disabled')
        .setDescriptionLocalizations(OPTION_DESCRIPTION_LOCALIZATIONS.site)
        .setRequired(true)
        .addChoices(...PREVIEW_PROVIDER_CHOICES))
      .toJSON(),
    new SlashCommandBuilder()
      .setName(TWITTER_STYLE_COMMAND_NAME)
      .setDescription('Set the Twitter preview style')
      .setDescriptionLocalizations(COMMAND_DESCRIPTION_LOCALIZATIONS[TWITTER_STYLE_COMMAND_NAME])
      .setContexts(InteractionContextType.Guild)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption((option) => option
        .setName('style')
        .setDescription('The Twitter preview style')
        .setDescriptionLocalizations(OPTION_DESCRIPTION_LOCALIZATIONS.style)
        .setRequired(true)
        .addChoices(...TWITTER_STYLE_CHOICES))
      .toJSON(),
    new SlashCommandBuilder()
      .setName(RESET_PREVIEW_COMMAND_NAME)
      .setDescription('Restore all website previews in this server')
      .setDescriptionLocalizations(COMMAND_DESCRIPTION_LOCALIZATIONS[RESET_PREVIEW_COMMAND_NAME])
      .setContexts(InteractionContextType.Guild)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
    new SlashCommandBuilder()
      .setName(INFO_COMMAND_NAME)
      .setDescription("View ermiana's operational status")
      .setDescriptionLocalizations(COMMAND_DESCRIPTION_LOCALIZATIONS[INFO_COMMAND_NAME])
      .setContexts(InteractionContextType.Guild)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
    new SlashCommandBuilder()
      .setName(CHECK_COMMAND_NAME)
      .setDescription("Check ermiana's permissions in this server")
      .setDescriptionLocalizations(COMMAND_DESCRIPTION_LOCALIZATIONS[CHECK_COMMAND_NAME])
      .setContexts(InteractionContextType.Guild)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
    new SlashCommandBuilder()
      .setName(FIX_COMMAND_NAME)
      .setDescription('Fix a website link and display its preview')
      .setDescriptionLocalizations(COMMAND_DESCRIPTION_LOCALIZATIONS[FIX_COMMAND_NAME])
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
        .setDescription('The website link')
        .setDescriptionLocalizations(OPTION_DESCRIPTION_LOCALIZATIONS.url)
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
