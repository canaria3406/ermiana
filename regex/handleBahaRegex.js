import { EmbedBuilder } from "discord.js";
import axios from "axios";
import cheerio from "cheerio";
import Conf from "conf";
import { messageSender } from "../common/messageSender.js";
import { reloadBahaTK } from "../common/reloadBahaTK.js";
import { embedSuppresser } from "../common/embedSuppresser.js";

export async function handleBahaRegex( result, message ){
    try{
        await message.channel.sendTyping();
    } catch{}
    try {
        const ermianaBH = new Conf({projectName: "ermianaJS"});
        if(!ermianaBH.get("BAHAENUR") || !ermianaBH.get("BAHARUNE")){
            await reloadBahaTK();
        }
        const BAHAENUR = ermianaBH.get("BAHAENUR");
        const BAHARUNE = ermianaBH.get("BAHARUNE");

        const pageHTML = await axios.request({
            url: result[0],
            method: "get",
            headers: {Cookie: "BAHAENUR="+ BAHAENUR +"; BAHARUNE="+ BAHARUNE +";"} 
        });

        const $ = cheerio.load(pageHTML.data);

        const bahaEmbed = new EmbedBuilder();
        bahaEmbed.setColor(1559500);
        bahaEmbed.setTitle($("meta[property=og:title]").attr("content"));
        bahaEmbed.setURL(result[0]);
        try {
            bahaEmbed.setDescription($("meta[property=og:description]").attr("content"));
        } catch{}
        try {
            bahaEmbed.setImage($("meta[property=og:image]").attr("content"));
        } catch{}
        bahaEmbed.setFooter({ text: "canaria3406", iconURL: "https://cdn.discordapp.com/avatars/242927802557399040/1f3b1744568e4333a8889eafaa1f982a.png"});

        embedSuppresser(message);
        messageSender(message.channel, bahaEmbed);
    }
    catch{
        console.log("baha error");
        await reloadBahaTK();
        try {
            const ermianaBH2 = new Conf({projectName: "ermianaJS"});
            const BAHAENUR2 = ermianaBH2.get("BAHAENUR");
            const BAHARUNE2 = ermianaBH2.get("BAHARUNE");

            const pageHTML2 = await axios.request({
                url: result[0],
                method: "get",
                headers: {Cookie: "BAHAENUR="+ BAHAENUR2 +"; BAHARUNE="+ BAHARUNE2 +";"} 
            });

            const $ = cheerio.load(pageHTML2.data);

            const bahaEmbed2 = new EmbedBuilder();
            bahaEmbed2.setColor(1559500);
            bahaEmbed2.setTitle($("meta[property=og:title]").attr("content"));
            bahaEmbed2.setURL(result[0]);
            try {
                bahaEmbed2.setDescription($("meta[property=og:description]").attr("content"));
            } catch{}
            try {
                bahaEmbed2.setImage($("meta[property=og:image]").attr("content"));
            } catch{}
            bahaEmbed2.setFooter({ text: "canaria3406", iconURL: "https://cdn.discordapp.com/avatars/242927802557399040/1f3b1744568e4333a8889eafaa1f982a.png"});

            embedSuppresser(message);
            messageSender(message.channel, bahaEmbed2);
        }
        catch {
            console.log("baha second try error");
        }
    }
};