addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

const validPathPattern = /^\/[A-Za-z0-9\-_/]+\.(?:jpg|jpeg|png|gif|webp)$/i;

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path == '/') {
    return Response.redirect('https://canaria.cc', 301);
  } else if (!validPathPattern.test(path)) {
    return new Response('Not Found', { status: 404 });
  } else {
    const imgUrl = new URL(`https://i.pximg.net${path}`);
    const imgRequest = new Request(imgUrl, request);
    return fetch(imgRequest, {
      headers: {
        'Referer': 'https://www.pixiv.net/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      },
    });
  }
}
