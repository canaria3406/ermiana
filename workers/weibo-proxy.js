addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path == '/') {
    return Response.redirect('https://canaria.cc', 301);
  } else {
    const match = path.match(/\/(\w+)\/(.+)/);
    if (match) {
      url.hostname = `${match[1]}.sinaimg.cn`;
      url.pathname = `/${match[2]}`;
      const imgRequest = new Request(url, request);
      return fetch(imgRequest, {
        headers: {
          'Referer': 'https://m.weibo.cn/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        },
      });
    } else {
      return Response.redirect('https://canaria.cc', 301);
    }
  }
}
