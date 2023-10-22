import { CronJob } from "cron";
import { reloadBahaTK } from "./reloadBahaTK.js";

export function runBahaCron() {
    const bahaJob = new CronJob("00 30 15 * * 0,2,4,6", function() {
        console.log("Cronjob running...");
        reloadBahaTK();
    }, null, true, "Asia/Taipei");
    console.log("Baha Cronjob set ok!");
    bahaJob.start();
}
