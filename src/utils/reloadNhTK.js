import Conf from 'conf';
import { configManager } from './configManager.js';

export async function reloadNhTK() {
  const config = await configManager();
  const ermianaNH = new Conf({ projectName: 'ermianaJS' });

  try {
    ermianaNH.set('NhHeaderToken', config.NHTK);
  } catch {}
}
