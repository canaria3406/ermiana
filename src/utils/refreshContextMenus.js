import { configManager } from './configManager.js';
import { ContextMenuCommandBuilder, ApplicationCommandType, REST, Routes } from 'discord.js';

export async function refreshContextMenus() {
  const commandData = [
    new ContextMenuCommandBuilder()
        .setName('刪除訊息')
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
