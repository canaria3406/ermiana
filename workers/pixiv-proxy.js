addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path == '/') {
    return Response.redirect('https://canaria.cc', 301);
  } else {
    url.hostname = 'i.pximg.net';
    const imgRequest = new Request(url, request);
    return fetch(imgRequest, {
      headers: {
        'Referer': 'https://www.pixiv.net/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      },
    });
  }
}
