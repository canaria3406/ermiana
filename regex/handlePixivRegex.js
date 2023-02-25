import { EmbedBuilder } from "discord.js";
import axios from "axios";
import { messageSender } from "../common/messageSender.js";

export async function handlePixivRegex( result, message ){
    try{
        await message.channel.sendTyping();
    } catch{}
    const pid = result[1];
    try{
        const resp = await axios.request({
            method: "get",
            url: "https://www.pixiv.net/ajax/illust/" + pid,
        });

        const tagString = resp.data.body.tags.tags.map(element => `[${element.tag}](https://www.pixiv.net/tags/${element.tag}/artworks)`).join(", ");
        
        const pixivEmbed = new EmbedBuilder();
        pixivEmbed.setColor(2210780);
        pixivEmbed.setTitle(resp.data.body.title);
        pixivEmbed.setURL(result[0]);
        pixivEmbed.setDescription(resp.data.body.extraData.meta.twitter.description);
        pixivEmbed.addFields(
            { name: "作者", value: `[${resp.data.body.userName}](https://www.pixiv.net/users/${resp.data.body.userId})`, inline : true},
            { name: "收藏", value: resp.data.body.bookmarkCount.toString(), inline : true}            
        );
        try {
            pixivEmbed.addFields({ name: "標籤", value: tagString});
        } catch{}
        try {
            pixivEmbed.setImage("https://pixiv.cat/" + pid + ".jpg");
        } catch{}
        pixivEmbed.setFooter({ text: "canaria3406", iconURL: "https://cdn.discordapp.com/avatars/242927802557399040/1f3b1744568e4333a8889eafaa1f982a.png"});

        try{
            message.suppressEmbeds(true);
        } catch{
            console.log("no permission");
        }

        messageSender(message.channel, pixivEmbed);
    }
    catch{
        console.log("pixiv error");
    }
};