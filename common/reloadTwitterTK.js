import Conf from "conf";
import { configManager } from "./configManager.js";

export async function reloadTwitterTK() {

    try {
        const config = await configManager();

        const parameter_token = config.TWPT;
        const header_x_csrf_token = config.TWHT;
        const header_authorization = config.TWHA;
        const header_cookie = config.TWHC;
        const ermianaTwitter = new Conf({projectName: "ermianaJS"});
        ermianaTwitter.set("parameter_token", parameter_token);
        ermianaTwitter.set("header_x_csrf_token", header_x_csrf_token);
        ermianaTwitter.set("header_authorization", header_authorization);
        ermianaTwitter.set("header_cookie", header_cookie);
    }
    catch {
        console.log("twitter token error");
    }

}
