import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { typingSender } from '../events/typingSender.js';

// 是否啟用平台表情符號 (預設關閉 = 純文字平台)
const ENABLE_PLATFORM_EMOJI = process.env.ENABLE_GNN_PLATFORM_EMOJI === '1' ||
  process.env.ENABLE_GNN_PLATFORM_EMOJI === 'true';

const PLATFORM_MAP = {
  'platform-anime': '動畫',
  'platform-olg': 'PC 線上',
  'platform-pc': 'PC 單機',
  'platform-ios': 'iOS',
  'platform-android': 'Android',
  'platform-ps4': 'PS4',
  'platform-xbone': 'Xbox One',
  'platform-ns': 'Switch',
  'platform-ps5': 'PS5',
  'platform-xbsx': 'Xbox SX',
  'platform-ns2': 'Switch 2',
};

// 平台表情符號 ID 從環境變數讀取，沒有設定就留空字串，代表不使用表情
const PLATFORM_EMOJI = {
  default: '',
  pc: { id: process.env.GNN_EMOJI_PC || '', name: 'pc' },
  ps: { id: process.env.GNN_EMOJI_PS || '', name: 'ps' },
  switch: { id: process.env.GNN_EMOJI_SWITCH || '', name: 'switch' },
  xbox: { id: process.env.GNN_EMOJI_XBOX || '', name: 'xbox' },
};

function getPlatformEmoji(platformName) {
  if (!ENABLE_PLATFORM_EMOJI) {
    return PLATFORM_EMOJI.default;
  }
  if (!platformName) {
    return PLATFORM_EMOJI.default;
  }
  const lower = platformName.toLowerCase();
  if (lower.includes('xbox') && PLATFORM_EMOJI.xbox.id) {
    return PLATFORM_EMOJI.xbox;
  }
  if (lower.startsWith('ps') && PLATFORM_EMOJI.ps.id) {
    return PLATFORM_EMOJI.ps;
  }
  if (lower.includes('switch') && PLATFORM_EMOJI.switch.id) {
    return PLATFORM_EMOJI.switch;
  }
  if (lower.includes('pc') && PLATFORM_EMOJI.pc.id) {
    return PLATFORM_EMOJI.pc;
  }
  // 沒有對應或沒設定 ID 就回傳空字串，後面會自動走純文字顯示
  return PLATFORM_EMOJI.default;
}

export async function handleGnnRegex( result, message, spoiler ) {
  typingSender(message);
  try {
    const iconURL = 'https://cdn.discordapp.com/avatars/1430084520446525441/02ffe8de21e3f92f4310edea3142c2fa.webp?size=240';
    const url = result[0];
    const resp = await axios.request({
      url: url,
      method: 'get',
      timeout: 2500,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
      },
    });

    const $ = cheerio.load(resp.data);

    const gnnEmbed = new EmbedBuilder();
    gnnEmbed.setColor(0x009CAD);
    try {
      const title = $('meta[property="og:title"]').attr('content') || $('title').text();
      if (title) {
        gnnEmbed.setTitle(title);
      }
    } catch {}
    gnnEmbed.setURL(url);
    // 描述改為單一空白，避免完全空字串造成相容性問題
    gnnEmbed.setDescription(' ');
    try {
      const image = $('meta[property="og:image"]').attr('content');
      if (image) {
        gnnEmbed.setImage(image);
      }
    } catch {}

    // 解析平台標籤 (platform-tag)
    try {
      const platforms = [];
      $('.platform-tag li').each((_index, element) => {
        const classAttr = ($(element).attr('class') || '').split(/\s+/);
        const platformClass = classAttr.find((c) => c.startsWith('platform-'));
        const href = ($(element).find('a').attr('href') || '').trim();
        let platformName = '';
        if (platformClass && PLATFORM_MAP[platformClass]) {
          platformName = PLATFORM_MAP[platformClass];
        } else {
          platformName = $(element).text().trim();
        }
        if (!platformName) {
          return;
        }
        const emoji = getPlatformEmoji(platformName);
        let display = platformName;
        if (emoji && href) {
          // 只顯示表情 + URL
          display = `[<:${emoji.name}:${emoji.id}>](${href})`;
        } else if (emoji && !href) {
          // 只顯示表情
          display = `<:${emoji.name}:${emoji.id}>`;
        } else if (!emoji && href) {
          // 沒有表情則保留純文字 + URL
          display = `[${platformName}](${href})`;
        }
        if (!platforms.includes(display)) {
          platforms.push(display);
        }
      });
      if (platforms.length > 0) {
        gnnEmbed.addFields({
          name: '平台',
          value: platforms.join('、 '),
          inline: true,
        });
      }
    } catch {}

    // 解析 GNN 標籤 (hash tag)
    try {
      const tags = [];
      $('.gnn-label a.label').each((_index, element) => {
        const raw = $(element).text().trim();
        const href = ($(element).attr('href') || '').trim();
        if (!raw) {
          return;
        }
        const text = raw.replace(/\s+/g, ' ');
        let display = text;
        if (href) {
          display = `[${text}](${href})`;
        }
        if (!tags.includes(display)) {
          tags.push(display);
        }
      });
      if (tags.length > 0) {
        const hashText = tags.join(' ');
        const value = hashText.length > 1000 ? hashText.substring(0, 997) + '...' : hashText;
        gnnEmbed.addFields({
          name: '標籤',
          value: value,
          inline: true,
        });
      }
    } catch {}

    messageSender(message, spoiler, iconURL, gnnEmbed, '巴哈姆特 GNN 新聞網');
    embedSuppresser(message);
  } catch {
    console.log('gnn error: ' + message.guild.name);
  }
};
