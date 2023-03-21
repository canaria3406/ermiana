import { EmbedBuilder } from "discord.js";
import axios from "axios";
import { messageSender } from "../common/messageSender.js";

export async function handleSgoRegex(result, message) {
    try {
        await message.channel.sendTyping();
    } catch {}
    const rid = result[1];
    try {
        const resp = await axios.request({
            method: "get",
            url: "https://api.swordgale.online/api/report/" + rid,
            headers: { token: "" }
        });
	
        const battletime = resp.time.toLocaleString("en-US", {
            timeZone: "Asia/Taipei",
            hour12: false,
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }).replace(",", "");
        const battlezone = " " + resp.zone + " (" + resp.stage + ")";
	
        const teamA = [];
        resp.meta.teamA.forEach((element) => {
            teamA.push(element.name + "\nHP: " + element.hp + " 體: " + element.sp);
        });
        const teamB = [];
        resp.meta.teamB.forEach((element) => {
            teamB.push(element.name + "\nHP: " + element.hp + " 體: " + element.sp);
        });
	
        const criticalevent = [];
        resp.messages.forEach((element) => {
            if (element.s == "critical") {
                criticalevent.push(element.m);
            }
        });
	
        const sgoEmbed = new EmbedBuilder();
        sgoEmbed.setColor(2210780);
        sgoEmbed.addFields(
			    { name: "時間地點", value: battletime + battlezone },
			    { name: "攻擊方", value: teamA.join("\n"), inline: true },
			    { name: "防守方", value: teamB.join("\n"), inline: true },
			    { name: "戰鬥摘要", value: criticalevent.join("\n")}
		);
        sgoEmbed.setFooter({ text: "canaria3406", iconURL: "https://cdn.discordapp.com/avatars/242927802557399040/1f3b1744568e4333a8889eafaa1f982a.png"});
        
		messageSender(message.channel, sgoEmbed);
    } catch {
        console.log("sgo error");
    }
};