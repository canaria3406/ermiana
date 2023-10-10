import { EmbedBuilder } from "discord.js";
import axios from "axios";
import { messageSender } from "../common/messageSender.js";
import { embedSuppresser } from "../common/embedSuppresser.js";

export async function handleMisskeyRegex( result, message ){
    
    try{
        await message.channel.sendTyping();
    } catch{}
    try{
        const resp = await axios.request({
            method: "post",
            url: "https://misskey.io/api/notes/show",
            data: {
                noteId: result[1]
            }
        });

        if (resp.status === 200) {

            const misskeyEmbed = new EmbedBuilder();
            misskeyEmbed.setColor(0x96d04a);
            misskeyEmbed.setAuthor({ name: "@" + resp.data.user.username , iconURL: resp.data.user.avatarUrl})
            misskeyEmbed.setTitle(resp.data.user.name);
            misskeyEmbed.setURL(result[0]);

            try{
                misskeyEmbed.setDescription(resp.data.text);
            } catch{}

            function sumReactions(reactions) {
                let total = 0;
                for (const key in reactions) {
                    total += reactions[key];
                }
                return total;
            }

            const noteinfo = " • 💬" + resp.data.repliesCount.toString() + " 🔁" + resp.data.renoteCount.toString() + " ❤️" + sumReactions(resp.data.reactions).toString();
            misskeyEmbed.setFooter({ text: "canaria3406" + noteinfo, iconURL: "https://cdn.discordapp.com/avatars/242927802557399040/1f3b1744568e4333a8889eafaa1f982a.png"});

            embedSuppresser(message);
            messageSender(message.channel, misskeyEmbed);

        } else {
            console.error(`Request failed`);
        }

    }
    catch{
        console.log("misskey error");
    }

};