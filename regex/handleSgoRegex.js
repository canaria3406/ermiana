import { EmbedBuilder } from "discord.js";
import axios from "axios";
import Conf from "conf";
import { messageSender } from "../common/messageSender.js";
import { reloadSgoTK } from "../common/reloadSgoTK.js";

export async function handleSgoRegex(result, message) {
    try {
        await message.channel.sendTyping();
    } catch {}
    const rid = result[1];
    try {
        const ermianaSGO = new Conf({projectName: "ermianaJS"});
        if(!ermianaSGO.get("SGOtoken")){
            await reloadSgoTK();
        }
        const SGOtoken = ermianaSGO.get("SGOtoken");
        
        const resp = await axios.request({
            method: "get",
            url: "https://api.swordgale.online/api/report/" + rid,
            headers: { token: SGOtoken }
        });

        const options = {
            timeZone: "Asia/Taipei",
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        };

        const date = new Date(resp.data.time);
        const formatter = Intl.DateTimeFormat('zh-TW', options);
        const battletime = formatter.format(date).replace(",", "");
        const battlezone = resp.data.zone + " (" + resp.data.stage + ")";

        const teamA = [];
        resp.data.meta.teamA.forEach((element) => {
            teamA.push(element.name + "\nHP: " + element.hp + " 體: " + element.sp);
        });
        
        const teamAn = teamA.length;
        if(teamAn >= 4){
            teamA.splice(3);
            teamA.push("...等" + (teamAn - 3) + "個未顯示");
        }

        const teamB = [];
        const teamB2 = [];
        resp.data.meta.teamB.forEach((element) => {
            teamB.push(element.name);
        });

        const teamBn = teamB.length;
        if (teamBn > 5) {
            const teamBMap = {};
            teamB.forEach((element) => {
                const match = element.match(/([\u4E00-\u9FA5\u3040-\u30FFa-zA-Z]+)(\d+)/);
                if (match) {
                  const name = match[1];
                  const number = parseInt(match[2], 10);
                  if (!teamBMap[name] || number > teamBMap[name].number) {
                      teamBMap[name] = { name, number };
                  }
                }
                else{
                  teamB2.push(element);
                }
            });

            for (const name in teamBMap) {
                teamB2.push(`${name}${teamBMap[name].number}`);
            }
        }
        else if(teamBn <= 5){
            teamB.forEach((element) => {
                teamB2.push(element);
            })
        }

        if(teamB2.length >= 5){
            teamB2.splice(4);
            teamB2.push("...等" + (teamBn - 4) + "個未顯示");
        }

        const criticalevent = [];
        resp.data.messages.forEach((element) => {
            if (element.s == "critical" || element.s == "subInfo") {
                criticalevent.push(element.m);
            }
        });

        const sgoEmbed = new EmbedBuilder();
        sgoEmbed.setColor(2210780);
        sgoEmbed.addFields(
                { name: "時間", value: battletime },
                { name: "地點", value: battlezone },
                { name: "攻擊方", value: teamA.join("\n"), inline: true },
                { name: "防守方", value: teamB2.join("\n"), inline: true },
                { name: "戰鬥摘要", value: criticalevent.join("\n")}
        );
        try {
            sgoEmbed.setThumbnail("https://swordgale.b-cdn.net/" + resp.data.meta.teamA[0].avatar);
        } catch {}
        sgoEmbed.setFooter({ text: "canaria3406", iconURL: "https://cdn.discordapp.com/avatars/242927802557399040/1f3b1744568e4333a8889eafaa1f982a.png"});
        
        messageSender(message.channel, sgoEmbed);
    } catch {
        console.log("sgo error");
    }
};
