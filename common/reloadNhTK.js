import Conf from "conf";
import { configManager } from "./configManager.js";

export async function reloadNhTK() {

    try {
        const config = await configManager();

        const cf_clearance = config.NHCC;
        const csrftoken = config.NHCT;
        const ermianaNh = new Conf({projectName: "ermianaJS"});
        ermianaNh.set("cf_clearance", cf_clearance);
        ermianaNh.set("csrftoken", csrftoken);
    }
    catch {
        console.log("nh token error");
    }

}
