import { EmbedBuilder } from "discord.js";
import axios from "axios";
import { messageSender } from "../common/messageSender.js";

export async function handleEhRegex( result, message ){
    await message.channel.sendTyping();
    const galleryId = parseInt(result[1]);
    const galleryToken = result[2];
    try{
        const resp = await axios.request({
        method: "post",
        url: "https://api.e-hentai.org/api.php",
        data: {
            method: "gdata",
            gidlist: [[galleryId, galleryToken]],
            namespace: 1,
        }
        });
    
        //merge the tag with same keys
        const tagMap = new Map();
        resp.data.gmetadata[0].tags.forEach((element) => {
            const tag = element.split(":");
            const tagList = tagMap.get(tag[0]);
            if (tagList) {
                tagList.push(tag[1]);
            }
            else {
                tagMap.set(tag[0], [tag[1]]);
            }
        });

        //translate the tag keys
        const translateTags = [];
        const tagReplaceList = new Map([
            ["artist", "繪師"],
            ["character", "角色"],
            ["cosplayer", "coser"],
            ["female", "女性"],
            ["group", "社團"],
            ["language", "語言"],
            ["male", "男性"],
            ["mixed", "混合"],
            ["other", "其他"],
            ["parody", "原作"],
            ["reclass", "重新分類"],
            ["temp", "臨時"]
        ]);
        tagMap.forEach((value, key) => {
            const values = value.join(", ");
            if (tagReplaceList.has(key)) {
                translateTags.push(tagReplaceList.get(key) + ": " + values);
            }
            else {
                translateTags.push(key + ": " + values);
            }
        });

        const ehEmbed = new EmbedBuilder();
        ehEmbed.setColor(16185594);
        ehEmbed.addFields(
                { name: "標題", value: resp.data.gmetadata[0].title},
                { name: "類別", value: resp.data.gmetadata[0].category, inline : true},
                { name: "評分", value: resp.data.gmetadata[0].rating, inline : true},
                { name: "上傳者", value: resp.data.gmetadata[0].uploader, inline : true},
                { name: "標籤", value: translateTags.join("\n")}
        );
        try {
            ehEmbed.setImage(resp.data.gmetadata[0].thumb);
        } catch{}
        ehEmbed.setFooter({ text: "canaria3406", iconURL: "https://cdn.discordapp.com/avatars/242927802557399040/1f3b1744568e4333a8889eafaa1f982a.png"});

        messageSender(message.channel, ehEmbed);
    }
    catch{
        console.log("eh error");
    }
};