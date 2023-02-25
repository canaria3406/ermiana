import { EmbedBuilder } from "discord.js";
import axios from "axios";
import cheerio from "cheerio";
import { messageSender } from "../common/messageSender.js";

export async function handlePlurkRegex( result, message ){
    try{
        await message.channel.sendTyping();
        const pageHTML = await axios.request({
            url: result[0],
            method: "get"
        });
    
        const $ = cheerio.load(pageHTML.data);

        const rePlurk = $("script").text().match(/"replurkers_count": (\d+),/)[1] || "0";
        const favPlurk = $("script").text().match(/"favorite_count": (\d+),/)[1] || "0";
        const respPlurk = $("script").text().match(/"response_count": (\d+),/)[1] || "0";

        const plurkEmbed = new EmbedBuilder();
        plurkEmbed.setColor(16556594);
        plurkEmbed.setTitle($(".name").text());
        plurkEmbed.setURL(result[0]);
        try {
            plurkEmbed.setDescription($(".text_holder").text());
        } catch{}
        plurkEmbed.addFields(
            { name: "喜歡", value: favPlurk, inline : true},
            { name: "轉噗", value: rePlurk, inline : true},
            { name: "回應", value: respPlurk, inline : true}
        );
        try {
            plurkEmbed.setImage($("script").text().match(/https:\/\/images\.plurk\.com\/[^"]+\.(jpg|png)/)[0]);
        } catch{}
        plurkEmbed.setFooter({ text: "canaria3406", iconURL: "https://cdn.discordapp.com/avatars/242927802557399040/1f3b1744568e4333a8889eafaa1f982a.png"});
        
        try{
            message.suppressEmbeds(true);
        } catch{
            console.log("no permission");
        }

        messageSender(message.channel, plurkEmbed);
    }
    catch{
       console.log("plurk error");
    }
};