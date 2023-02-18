export async function messageSender(channel, embed){
    try {
        await channel.send({ embeds: [embed] });
    }
    catch {
        console.log("message send error");
    }
}