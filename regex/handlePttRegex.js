import { EmbedBuilder } from "discord.js";
import axios from "axios";
import cheerio from "cheerio";
import { messageSender } from "../common/messageSender.js";

export async function handlePttRegex( result, message ){
    await message.channel.sendTyping();
    try{
        const pageHTML = await axios.request({
            url: result[0],
            method: "get",
            headers: {Cookie: "over18=1;"} 
        });

        const $ = cheerio.load(pageHTML.data);

        const pttEmbed = new EmbedBuilder();
        pttEmbed.setColor(2894892);
        pttEmbed.setTitle($('meta[property=og:title]').attr('content'));
        pttEmbed.setURL(result[0]);
        try {
            pttEmbed.setDescription($('meta[property=og:description]').attr('content'));
        } catch{}
        pttEmbed.setFooter({ text: 'canaria3406', iconURL: 'https://cdn.discordapp.com/avatars/242927802557399040/1f3b1744568e4333a8889eafaa1f982a.png'});

        messageSender(message.channel, pttEmbed);
    }
    catch{
        console.log("ptt error");
    }
};