import { EmbedBuilder } from "discord.js";
import axios from "axios";
import Conf from "conf";
import { messageSender } from "../common/messageSender.js";
import { reloadNhTK } from "../common/reloadNhTK.js";
import { embedSuppresser } from "../common/embedSuppresser.js";

export async function handleNhRegex( result, message ){
    
    try{
        await message.channel.sendTyping();
    } catch{}

    const nid = result[1];

    try{
        
        const ermianaNh = new Conf({projectName: "ermianaJS"});
        if(!ermianaNh.get("cf_clearance")){
            await reloadNhTK();
        }
        
        const cf_clearance = ermianaNh.get("cf_clearance");
        const csrftoken = ermianaNh.get("csrftoken");

        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0",
            "Cookie": "cf_clearance=" + cf_clearance + "; csrftoken=" + csrftoken + ";"
        };
        
        const resp = await axios.request({
            method: "get",
            url: "https://nhentai.net/api/gallery/" + nid,
            headers: headers
        });

        if (resp.status === 200) {

            const tagMap = new Map();
            resp.data.tags.forEach((tag) => {
                const type = tag.type;
                const name = tag.name;
                
                if (tagMap.has(type)) {
                    tagMap.get(type).push(name);
                } else {
                    tagMap.set(type, [name]);
                }
            });

            //translate the tag keys
            const translateTags = [];
            const tagReplaceList = new Map([
                ["artist", "繪師"],
                ["category", "類別"],
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
                ["temp", "臨時"],
                ["tag", "標籤"]
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

            const nhEmbed = new EmbedBuilder();
            nhEmbed.setColor(0xed2553);

            try {
                if (resp.data.title.japanese) {
                    nhEmbed.setTitle(resp.data.title.japanese);
                }
                else {
                    nhEmbed.setTitle(resp.data.title.english);
                }
            } catch{}
            
            nhEmbed.setURL(result[0]);
            //nhEmbed.addFields(
            //        { name: "頁數", value: resp.data.num_pages.toString(), inline : true},
            //        { name: "收藏", value: resp.data.num_favorites.toString(), inline : true}
            //);
            try{
                nhEmbed.addFields({ name: "說明", value: translateTags.reverse().join("\n")});
            } catch{}
            try {
                nhEmbed.setImage("https://t.nhentai.net/galleries/" + resp.data.media_id + "/thumb.jpg");
            } catch{}
            nhEmbed.setFooter({ text: "canaria3406", iconURL: "https://cdn.discordapp.com/avatars/242927802557399040/1f3b1744568e4333a8889eafaa1f982a.png"});

            messageSender(message.channel, nhEmbed);
            embedSuppresser(message);

        } else {
            console.error("Request failed");
        }

    }
    catch{
        console.log("nh error");
    }
};