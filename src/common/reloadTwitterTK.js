import Conf from 'conf';
import { configManager } from './configManager.js';

export async function reloadTwitterTK() {
  try {
    const config = await configManager();
    const parameterToken = config.TWPT;
    const headerXcsrfToken = config.TWHT;
    const headerAuthorization = config.TWHA;
    const headerCookie = config.TWHC;
    const ermianaTwitter = new Conf({ projectName: 'ermianaJS' });
    ermianaTwitter.set('parameter_token', parameterToken);
    ermianaTwitter.set('header_x_csrf_token', headerXcsrfToken);
    ermianaTwitter.set('header_authorization', headerAuthorization);
    ermianaTwitter.set('header_cookie', headerCookie);
  } catch {
    console.log('twitter token error');
  }
}
