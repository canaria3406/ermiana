export async function getThreadsData(url) {
  try {
    // Threads uses fixthreads.net as proxy
    const fixedUrl = url.replace(/threads\.net/, 'fixthreads.net');

    return {
      success: true,
      originalUrl: url,
      proxyUrl: fixedUrl,
    };
  } catch (error) {
    return {
      error: error.message,
      fallbackUrl: url.replace(/threads\.net/, 'fixthreads.net'),
    };
  }
}
