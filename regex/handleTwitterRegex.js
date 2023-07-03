import { EmbedBuilder } from "discord.js";
import axios from "axios";
import Conf from "conf";
import { messageSender } from "../common/messageSender.js";
import { reloadTwitterTK } from "../common/reloadTwitterTK.js";

export async function handleTwitterRegex( result, message ){
    try{
        await message.channel.sendTyping();
    } catch{}
    const tid = result[1];
    try{
        const ermianaTwitter = new Conf({projectName: "ermianaJS"});
        if(!ermianaTwitter.get("parameter_token")){
            await reloadTwitterTK();
        }
        const parameter_token = ermianaTwitter.get("parameter_token");
        const header_x_csrf_token = ermianaTwitter.get("header_x_csrf_token");
        const header_authorization = ermianaTwitter.get("header_authorization");
        const header_cookie = ermianaTwitter.get("header_cookie");

        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Host": "twitter.com",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0",
            "Accept": "*/*",
            "Accept-Language": "zh-TW,zh;q=0.8,en-US;q=0.5,en;q=0.3",
            "Accept-Encoding": "gzip, deflate, br",
            "content-type": "application/json",
            "x-twitter-auth-type": "OAuth2Session",
            "x-csrf-token": header_x_csrf_token,
            "x-twitter-client-language": "zh-tw",
            "x-twitter-active-user": "yes",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "authorization": header_authorization,
            "Connection": "keep-alive",
            "Cookie": header_cookie,
            "TE": "trailers",
          };

        const url = "https://twitter.com/i/api/graphql/" + parameter_token + "/TweetDetail?variables=%7B%22focalTweetId%22%3A%22" + tid + "%22%2C%22with_rux_injections%22%3Afalse%2C%22includePromotedContent%22%3Atrue%2C%22withCommunity%22%3Atrue%2C%22withQuickPromoteEligibilityTweetFields%22%3Atrue%2C%22withBirdwatchNotes%22%3Atrue%2C%22withVoice%22%3Atrue%2C%22withV2Timeline%22%3Atrue%7D&features=%7B%22rweb_lists_timeline_redesign_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22tweetypie_unmention_optimization_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Afalse%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C%22responsive_web_media_download_video_enabled%22%3Afalse%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D&fieldToggles=%7B%22withArticleRichContentState%22%3Afalse%7D";

        const resp = await axios.request({
            method: "get",
            url: url,
            headers: headers
        });

        const result = resp.data.data.threaded_conversation_with_injections_v2.instructions[0].entries[0].content.itemContent.tweet_results.result;

        const twitterEmbed = new EmbedBuilder();
        twitterEmbed.setColor(0x1DA1F2);
        twitterEmbed.setAuthor({ name: result.core.user_results.result.legacy.screen_name, iconURL: result.core.user_results.result.legacy.profile_image_url_https})
        twitterEmbed.setTitle(result.core.user_results.result.legacy.name);
        twitterEmbed.setURL("https://twitter.com/i/status/" + tid);
        twitterEmbed.addFields(
            { name: "喜歡", value: result.legacy.favorite_count.toString(), inline: true },
            { name: "轉推", value: result.legacy.retweet_count.toString(), inline: true }
        );
        try{
            twitterEmbed.setDescription(result.legacy.full_text);
        } catch{}
        try {
            twitterEmbed.setImage(result.legacy.entities?.media[0].media_url_https);
        } catch{}
        twitterEmbed.setFooter({ text: "canaria3406", iconURL: "https://cdn.discordapp.com/avatars/242927802557399040/1f3b1744568e4333a8889eafaa1f982a.png"});

        messageSender(message.channel, twitterEmbed);
    }
    catch{
        console.log("twitter error");
    }
};