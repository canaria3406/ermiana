import { CronJob } from 'cron';
import { reloadBahaTK } from "./reloadBahaTK.js";

export function runBahaCron() {
    const job = new CronJob('00 48 17 * * 6', function() {
        console.log('Cronjob running...');
        reloadBahaTK();
    }, null, true, 'Asia/Taipei');
    console.log("Cronjob set ok!");
    job.start();
}