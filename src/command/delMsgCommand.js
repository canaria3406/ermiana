import { configManager } from '../utils/configManager.js';

export async function delMsgCommand(interaction) {
  const config = await configManager();
  try {
    if (interaction.targetMessage.author.id === config.DCID) {
      if (interaction.targetMessage.deletable) {
        interaction.targetMessage.delete()
            .then(() => {
              if (interaction.targetMessage.reference?.messageId) {
                interaction.reply( { content: '成功刪除訊息。' });
              } else {
                interaction.reply( { content: '成功刪除訊息。', ephemeral: true });
              }
            })
            .catch(() => {
              interaction.reply( { content: '刪除訊息時發生錯誤。', ephemeral: true });
            });
      } else {
        interaction.reply( { content: '我無法刪除這個訊息，請聯絡伺服器管理員，並給我相關權限。', ephemeral: true });
      }
    } else {
      interaction.reply( { content: '我只能刪除由我自己發送的訊息喔。', ephemeral: true });
    }
  } catch {}
}
