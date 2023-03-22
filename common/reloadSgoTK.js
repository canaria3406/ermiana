import Conf from "conf";
import { configManager } from "./configManager.js";

export async function reloadSgoTK() {

    const config = await configManager();
    const SGOtoken = config.SGOT;
    
    try {
        const ermianaSGO = new Conf({projectName: "ermianaJS"});
        ermianaSGO.set("SGOtoken", SGOtoken);
    }
    catch {
        console.log("sgo token error");
    }

}