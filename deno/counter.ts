const botID = '1078919650764652594';

async function updateKV() {
  const kv = await Deno.openKv();
  const response = await fetch("https://discord.com/api/v9/application-directory-static/applications/" + botID, {
    headers: {
      'Referer': 'https://discord.com/application-directory/' + botID,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    }
  });
  if (response.ok) {
    const responseData = await response.json();
    await kv.set(["name"], responseData.name);
    await kv.set(["count"], responseData.directory_entry.guild_count.toString());
  }
  kv.close();
}

Deno.cron('update','0 0 * * *', async () => {
  console.log("Running cron job to update KV...");
  await updateKV();
});

Deno.serve(async () => {
  const kv = await Deno.openKv();
  const name = await kv.get(["name"]) || "Deno";
  const count = await kv.get(["count"]) || "0";
  kv.close();
  const jsonData = {
    schemaVersion: 1,
    label: name.value,
    message: count.value + ' servers',
    color: '7289DA',
  };
  return new Response(JSON.stringify(jsonData), {
    headers: { "content-type": "application/json" },
  });
});