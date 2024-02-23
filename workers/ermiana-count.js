addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const botID = '1078919650764652594';
  const response = await fetch('https://discord.com/api/v9/application-directory-static/applications/' + botID, {
    headers: {
      'Referer': 'https://discord.com/application-directory/' + botID,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    },
  });

  if (!response.ok) {
    const errorResponse = {
      schemaVersion: 1,
      label: 'error',
      message: '-1 servers',
      color: '7289DA',
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const responseData = await response.json();
  const jsonResponse = {
    schemaVersion: 1,
    label: responseData.name,
    message: responseData.directory_entry.guild_count.toString() + ' servers',
    color: '7289DA',
  };
  return new Response(JSON.stringify(jsonResponse), {
    headers: { 'Content-Type': 'application/json' },
  });
}
