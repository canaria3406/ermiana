import axios from 'axios';
import Conf from 'conf';
import { configManager } from './configManager.js';

export async function reloadBahaTK() {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cookie': 'ckAPP_VCODE=9487',
  };

  const config = await configManager();
  const data = 'uid=' + config.BHUD + '&passwd=' + config.BHPD + '&vcode=9487';

  await axios.request({
    method: 'post',
    url: 'https://api.gamer.com.tw/mobile_app/user/v3/do_login.php',
    headers: headers,
    data: data,
    timeout: 2500,
  })
      .then((response) => {
        const ermianaBH = new Conf({ projectName: 'ermianaJS' });
        const cookies = response.headers['set-cookie'];
        cookies.forEach((element) => {
          if (element.startsWith('BAHAENUR=')) {
            // console.log('set BAHAENUR= ' + element.split('BAHAENUR=')[1].split(';')[0]);
            ermianaBH.set('BAHAENUR', element.split('BAHAENUR=')[1].split(';')[0]);
          }
          if (element.startsWith('BAHARUNE=')) {
            // console.log('set BAHARUNE= ' + element.split('BAHARUNE=')[1].split(';')[0]);
            ermianaBH.set('BAHARUNE', element.split('BAHARUNE=')[1].split(';')[0]);
          }
        });
      })
      .catch((error) => {
        console.log('baha api error : ' + error);
      });
}
