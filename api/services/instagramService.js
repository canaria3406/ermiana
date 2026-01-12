import axios from 'axios';

export async function getInstagramData(postId) {
  try {
    // Try ddinstagram first
    const ddResp = await axios.request({
      url: 'https://www.ddinstagram.com/',
      method: 'get',
      timeout: 4400,
    });

    if (ddResp.status === 200) {
      return {
        success: true,
        proxyUrl: `https://www.ddinstagram.com/p/${postId}/`,
        source: 'ddinstagram',
      };
    }

    throw new Error('ddinstagram not available');
  } catch (error) {
    // Fallback to instagramez
    try {
      const ezResp = await axios.request({
        url: `https://www.instagramez.com/p/${postId}/`,
        method: 'get',
        timeout: 2500,
      });

      if (ezResp.status === 200) {
        return {
          success: true,
          proxyUrl: `https://www.instagramez.com/p/${postId}/`,
          source: 'instagramez',
        };
      }

      throw new Error('instagramez not available');
    } catch (fallbackError) {
      // Return fallback URL if both fail
      return {
        error: 'Both Instagram proxies unavailable',
        fallbackUrl: `https://www.ddinstagram.com/p/${postId}/`,
      };
    }
  }
}
