const botID = "1078919650764652594";
const kv = await Deno.openKv();

const discordApplicationUrl =
  `https://discord.com/api/v9/application-directory-static/applications/${botID}`;

async function updateKV() {
  const response = await fetch(discordApplicationUrl, {
    headers: {
      Referer: `https://discord.com/application-directory/${botID}`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Discord application lookup failed: ${response.status}`);
  }

  const responseData = await response.json();
  const name = responseData?.name;
  const guildCount = responseData?.directory_entry?.guild_count;

  if (typeof name !== "string" || !Number.isFinite(Number(guildCount))) {
    throw new Error("Discord application response is missing badge data");
  }

  await kv.atomic()
    .set(["name"], name)
    .set(["count"], String(guildCount))
    .commit();
}

async function initializeKV() {
  const [{ value: name }, { value: count }] = await Promise.all([
    kv.get<string>(["name"]),
    kv.get<string>(["count"]),
  ]);

  if (name !== null && count !== null) return;

  console.log("KV is empty; fetching initial badge data...");
  await updateKV();
}

Deno.cron("update", "0 0 * * *", {
  backoffSchedule: [1000, 5000, 30000],
}, async () => {
  console.log("Running cron job to update KV...");
  await updateKV();
});

const initialUpdate = initializeKV().catch((error) => {
  console.error("Initial KV update failed:", error);
});

Deno.serve(async () => {
  await initialUpdate;

  const [{ value: name }, { value: count }] = await Promise.all([
    kv.get<string>(["name"]),
    kv.get<string>(["count"]),
  ]);

  const jsonData = {
    schemaVersion: 1,
    label: name ?? "api_error",
    message: `${count ?? "0"} servers`,
    color: "7289DA",
  };

  return new Response(JSON.stringify(jsonData), {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
});
