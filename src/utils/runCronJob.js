import { CronJob } from 'cron';
import { reloadBahaTK } from './reloadBahaTK.js';
import { refreshContextMenus } from './refreshContextMenus.js';

export function runCronJob() {
  const bahaJob = new CronJob('00 30 15 * * 0,2,4,6', function() {
    try {
      console.log('Baha Cronjob running...');
      reloadBahaTK();
    } catch {
      console.log('Failed to reload BahaTK.');
    }
  }, null, true, 'Asia/Taipei');
  console.log('Baha Cronjob set ok!');
  bahaJob.start();

  const contextMenuJob = new CronJob('00 08 14 * * 1', function() {
    try {
      console.log('ContextMenu Cronjob running...');
      refreshContextMenus();
    } catch {
      console.log('Failed to reload context menus.');
    }
  }, null, true, 'Asia/Taipei');
  console.log('ContextMenu Cronjob set ok!');
  contextMenuJob.start();
}
