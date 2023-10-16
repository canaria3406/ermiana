import Conf from "conf";
import { configManager } from "./configManager.js";

export async function reloadNhTK() {

    try {
        const config = await configManager();

        const NhHeaderCookie = config.NHHC;
        const ermianaNh = new Conf({projectName: "ermianaJS"});
        ermianaNh.set("NhHeaderCookie", NhHeaderCookie);
    }
    catch {
        console.log("nh token error");
    }

}
