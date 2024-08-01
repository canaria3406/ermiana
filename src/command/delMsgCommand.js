import { configManager } from '../utils/configManager.js';

export async function delMsgCommand(interaction) {
  const config = await configManager();
  const locales = {
    sucess: {
      'en-GB': 'Message deleted successfully.',
      'en-US': 'Message deleted successfully.',
      'zh-TW': '成功刪除訊息。',
      'zh-CN': '成功删除信息。',
      'ja': 'メッセージを削除しました。',
    },
    fail: {
      'en-GB': 'Failed to delete the message.',
      'en-US': 'Failed to delete the message.',
      'zh-TW': '刪除訊息時發生錯誤。',
      'zh-CN': '删除信息时发生错误。',
      'ja': 'メッセージの削除に失敗しました。',
    },
    noPermission: {
      'en-GB': 'I cannot delete this message. Please contact the server administrator to grant me the necessary permissions.',
      'en-US': 'I cannot delete this message. Please contact the server administrator to grant me the necessary permissions.',
      'zh-TW': '我無法刪除這個訊息，請聯絡伺服器管理員，並給我相關權限。',
      'zh-CN': '我无法删除这个信息，请联系服务器管理员，并给我相关权限。',
      'ja': 'このメッセージを削除できません。サーバー管理者に連絡して、関連する権限を与えてください。',
    },
    notMyMessage: {
      'en-GB': 'I can only delete messages that I have sent.',
      'en-US': 'I can only delete messages that I have sent.',
      'zh-TW': '我只能刪除由我自己發送的訊息喔。',
      'zh-CN': '我只能删除由我自己发送的信息。',
      'ja': '私は自分で送信したメッセージのみを削除できます。',
    },
  };
  try {
    if (interaction.targetMessage.author.id === config.DCID) {
      if (interaction.targetMessage.deletable) {
        try {
          await interaction.targetMessage.delete()
              .then(() => {
                if (interaction.targetMessage.reference?.messageId) {
                  interaction.reply( { content: (locales.sucess[interaction.locale] ?? locales.sucess['en-US']) });
                } else if (interaction.targetMessage.interaction?.id) {
                  interaction.reply( { content: (locales.sucess[interaction.locale] ?? locales.sucess['en-US']) });
                } else {
                  interaction.reply( { content: (locales.sucess[interaction.locale] ?? locales.sucess['en-US']), ephemeral: true });
                }
              })
              .catch(() => {
                interaction.reply( { content: (locales.fail[interaction.locale] ?? locales.fail['en-US']), ephemeral: true });
              });
        } catch {
          interaction.reply( { content: (locales.fail[interaction.locale] ?? locales.fail['en-US']), ephemeral: true });
        }
      } else {
        interaction.reply( { content: (locales.noPermission[interaction.locale] ?? locales.noPermission['en-US']), ephemeral: true });
      }
    } else {
      interaction.reply( { content: (locales.notMyMessage[interaction.locale] ?? locales.notMyMessage['en-US']), ephemeral: true });
    }
  } catch {}
}
