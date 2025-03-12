import { configManager } from '../utils/configManager.js';

export async function reloadPreviewCommand(interaction) {
  const config = await configManager();
  function matchLinks(content) {
    const rules = [
      /ddinstagram.com/,
    ];
    return rules.some((rule) => rule.test(content));
  }
  const locales = {
    sucess: {
      'en-GB': 'Preview reloaded successfully.',
      'en-US': 'Preview reloaded successfully.',
      'zh-TW': '成功重新載入預覽。',
      'zh-CN': '成功重新加载预览。',
      'ja': 'プレビューを正常に再読み込みしました。',
    },
    fail: {
      'en-GB': 'Failed to reload the preview.',
      'en-US': 'Failed to reload the preview.',
      'zh-TW': '重新載入預覽時發生錯誤。',
      'zh-CN': '重新加载预览时发生错误。',
      'ja': 'プレビューの再読み込みに失敗しました。',
    },
    notMyMessage: {
      'en-GB': 'I can only reload the preview of messages that I have sent.',
      'en-US': 'I can only reload the preview of messages that I have sent.',
      'zh-TW': '我只能重新載入由我自己發送的訊息的預覽。',
      'zh-CN': '我只能重新加载由我自己发送的信息的预览。',
      'ja': '私は自分で送信したメッセージのプレビューのみを再読み込みできます。',
    },
    notSupport: {
      'en-GB': 'This command is not supported for this message.',
      'en-US': 'This command is not supported for this message.',
      'zh-TW': '此訊息不支援此指令。',
      'zh-CN': '此消息不支持此指令。',
      'ja': 'このメッセージではこのコマンドはサポートされていません。',
    },
  };
  try {
    if (interaction.targetMessage.author.id === config.DCID) {
      if (matchLinks(interaction.targetMessage.content)) {
        interaction.targetMessage.fetch(true).then(() => {
          interaction.targetMessage.edit({ content: interaction.targetMessage.content });
          new Promise((resolve) => setTimeout(resolve, 1500));
          interaction.reply( { content: (locales.sucess[interaction.locale] ?? locales.sucess['en-US']), ephemeral: true });
        }).catch(() => {
          interaction.reply( { content: (locales.fail[interaction.locale] ?? locales.fail['en-US']), ephemeral: true });
        });
      } else {
        interaction.reply( { content: (locales.notSupport[interaction.locale] ?? locales.notSupport['en-US']), ephemeral: true });
      }
    } else {
      interaction.reply( { content: (locales.notMyMessage[interaction.locale] ?? locales.notMyMessage['en-US']), ephemeral: true });
    }
  } catch {
    interaction.reply( { content: (locales.fail[interaction.locale] ?? locales.fail['en-US']), ephemeral: true });
  }
}
