import { configManager } from './configManager.js';
import { ContextMenuCommandBuilder, ApplicationCommandType, REST, Routes } from 'discord.js';

export async function refreshContextMenus() {
  const commandData = [
    new ContextMenuCommandBuilder()
        .setName('removeMessage')
        .setNameLocalizations({
          'en-GB': 'Delete BOT Message',
          'en-US': 'Delete BOT Message',
          'zh-TW': '刪除機器人訊息',
          'zh-CN': '删除机器人信息',
          'ja': 'ロボメセを削除',
        })
        .setType(ApplicationCommandType.Message),
    new ContextMenuCommandBuilder()
        .setName('reloadPreview')
        .setNameLocalizations({
          'en-GB': 'Reload Preview',
          'en-US': 'Reload Preview',
          'zh-TW': '重新載入預覽',
          'zh-CN': '重新加载预览',
          'ja': 'リンクをリロード',
        })
        .setType(ApplicationCommandType.Message),
  ];

  const config = await configManager();
  const rest = new REST({ version: '9' }).setToken(config.DCTK);
  try {
    await rest.put(
        Routes.applicationCommands(config.DCID),
        { body: commandData },
    );
    console.log('Successfully reloaded Context Menus.');
  } catch {
    console.log('Failed to reload Context Menus.');
  }
}
