import { configManager } from '../utils/configManager.js';

export async function delMsgCommand(interaction) {
  const config = await configManager();
  try {
    if (interaction.targetMessage.author.id === config.DCID) {
      if (interaction.targetMessage.deletable) {
        interaction.targetMessage.delete()
            .then(() => {
              interaction.reply( { content: '成功刪除訊息。' });
            })
            .catch(() => {
              interaction.reply( { content: '刪除訊息時發生錯誤。', ephemeral: true });
            });
      } else {
        interaction.reply( { content: '我沒有權限刪除這個訊息，請聯絡管理員，並給我**管理訊息**權限。', ephemeral: true });
      }
    } else {
      interaction.reply( { content: '我只能刪除由我自己發送的訊息喔。', ephemeral: true });
    }
  } catch {}
}
