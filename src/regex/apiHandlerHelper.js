import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { typingSender } from '../events/typingSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { configManager } from '../utils/configManager.js';
import { PLATFORM_CONFIGS } from './platformConfigs.js';

/**
 * 統一的 API 調用處理器
 * @param {Object} options - 處理選項
 * @param {string} options.platform - 平台名稱
 * @param {string} options.apiPath - API 路徑
 * @param {Object} options.message - Discord 訊息對象
 * @param {boolean} options.spoiler - 是否使用劇透標籤
 * @param {Function} options.buildEmbed - 構建 Embed 的回調函數
 * @param {Function} options.sendMessage - 發送訊息的回調函數
 */
export async function handleAPIRequest(options) {
  const { platform, apiPath, message, spoiler, buildEmbed, sendMessage } = options;

  const platformConfig = PLATFORM_CONFIGS[platform];
  if (!platformConfig) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  typingSender(message);
  const config = await configManager();

  try {
    const apiResp = await axios.request({
      method: 'get',
      url: `${config.API_URL}${apiPath}`,
      timeout: 5000,
    });

    if (apiResp.status === 200 && apiResp.data.success) {
      const data = apiResp.data.data;

      // 構建基礎 Embed
      const embed = new EmbedBuilder();
      embed.setColor(platformConfig.color);

      // 調用自定義構建函數
      await buildEmbed(embed, data, platformConfig);

      // 調用自定義發送函數
      await sendMessage(message, spoiler, platformConfig.iconURL, embed, data);

      // 抑制原始 embed
      embedSuppresser(message);
    } else {
      throw new Error('API returned unsuccessful response');
    }
  } catch (error) {
    console.error(`${platformConfig.name} API handler error:`, error.message);
    console.log(`${platform} error in guild: ${message.guild?.name || 'DM'}`);
    
    // 提供更詳細的錯誤信息
    if (error.code === 'ECONNREFUSED') {
      console.error('  → API 服務器未運行或無法連接');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('  → API 請求超時');
    } else if (error.response) {
      console.error(`  → API 響應錯誤: ${error.response.status}`);
    }
    
    // 重新拋出錯誤以便上層處理 fallback
    throw error;
  }
}

/* 統一的 POST API 調用處理器 */
export async function handleAPIPostRequest(options) {
  const { platform, apiPath, message, spoiler, postData, buildEmbed, sendMessage } = options;

  const platformConfig = PLATFORM_CONFIGS[platform];
  if (!platformConfig) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  typingSender(message);
  const config = await configManager();

  try {
    const apiResp = await axios.request({
      method: 'post',
      url: `${config.API_URL}${apiPath}`,
      data: postData,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (apiResp.status === 200 && apiResp.data.success) {
      const data = apiResp.data.data;

      const embed = new EmbedBuilder();
      embed.setColor(platformConfig.color);

      await buildEmbed(embed, data, platformConfig);
      await sendMessage(message, spoiler, platformConfig.iconURL, embed, data);

      embedSuppresser(message);
    } else {
      throw new Error('API returned unsuccessful response');
    }
  } catch (error) {
    console.error(`${platformConfig.name} API handler error:`, error.message);
    console.log(`${platform} error: ${message.guild.name}`);
  }
}
