// API Configuration
const API_BASE_URL = 'http://localhost:3000';

// API Endpoints Configuration
const API_ENDPOINTS = [
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: '𝕏',
    method: 'GET',
    path: '/api/v1/twitter/:statusId',
    description: '取得 Twitter/X 貼文資訊',
    examples: [
      'https://x.com/username/status/1234567890',
      'https://twitter.com/username/status/1234567890',
    ],
    parameters: [
      { name: 'statusId', label: 'Status ID', type: 'text', required: true, placeholder: '1861318090836787295' },
    ],
    buildUrl: (params) => `/api/v1/twitter/${params.statusId}`,
  },
  {
    id: 'pixiv',
    name: 'Pixiv',
    icon: '🎨',
    method: 'GET',
    path: '/api/v1/pixiv/:illustId',
    description: '取得 Pixiv 插畫資訊',
    examples: [
      'https://www.pixiv.net/artworks/123456789',
      'https://www.pixiv.net/en/artworks/123456789',
    ],
    parameters: [
      { name: 'illustId', label: 'Illustration ID', type: 'text', required: true, placeholder: '124747892' },
    ],
    buildUrl: (params) => `/api/v1/pixiv/${params.illustId}`,
  },
  {
    id: 'plurk',
    name: 'Plurk',
    icon: '💬',
    method: 'GET',
    path: '/api/v1/plurk/:plurkId',
    description: '取得 Plurk 噗文資訊',
    examples: [
      'https://www.plurk.com/p/abc1234',
      'https://www.plurk.com/m/p/abc1234',
    ],
    parameters: [
      { name: 'plurkId', label: 'Plurk ID', type: 'text', required: true, placeholder: '2rr6gw9mkn' },
    ],
    buildUrl: (params) => `/api/v1/plurk/${params.plurkId}`,
  },
  {
    id: 'bluesky',
    name: 'Bluesky',
    icon: '🦋',
    method: 'GET',
    path: '/api/v1/bluesky/:handle/:postId',
    description: '取得 Bluesky 貼文資訊',
    examples: [
      'https://bsky.app/profile/username.bsky.social/post/abc123xyz',
    ],
    parameters: [
      { name: 'handle', label: 'Handle', type: 'text', required: true, placeholder: 'bsky.app' },
      { name: 'postId', label: 'Post ID', type: 'text', required: true, placeholder: '3lbfb7aq2ds2u' },
    ],
    buildUrl: (params) => `/api/v1/bluesky/${params.handle}/${params.postId}`,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    method: 'POST',
    path: '/api/v1/tiktok',
    description: '取得 TikTok 影片資訊',
    examples: [
      'https://www.tiktok.com/@username/video/1234567890123456789',
    ],
    parameters: [
      { name: 'url', label: 'TikTok URL', type: 'textarea', required: true, placeholder: 'https://www.tiktok.com/@username/video/1234567890123456789' },
    ],
    buildUrl: () => `/api/v1/tiktok`,
    buildBody: (params) => ({ url: params.url }),
  },
  {
    id: 'bilibili',
    name: 'Bilibili',
    icon: '📺',
    method: 'GET',
    path: '/api/v1/bilibili/:opusId',
    description: '取得 Bilibili 專欄資訊',
    examples: [
      'https://www.bilibili.com/opus/123456789',
    ],
    parameters: [
      { name: 'opusId', label: 'Opus ID', type: 'text', required: true, placeholder: '1087896863688556544' },
    ],
    buildUrl: (params) => `/api/v1/bilibili/${params.opusId}`,
  },
  {
    id: 'eh',
    name: 'E-Hentai',
    icon: '📚',
    method: 'GET',
    path: '/api/v1/eh/:galleryId/:token',
    description: '取得 E-Hentai 畫廊資訊',
    examples: [
      'https://e-hentai.org/g/123456/abcdef1234',
      'https://exhentai.org/g/123456/abcdef1234',
    ],
    parameters: [
      { name: 'galleryId', label: 'Gallery ID', type: 'text', required: true, placeholder: '123456' },
      { name: 'token', label: 'Token', type: 'text', required: true, placeholder: 'abcdef1234' },
    ],
    buildUrl: (params) => `/api/v1/eh/${params.galleryId}/${params.token}`,
  },
  {
    id: 'pchome',
    name: 'PChome 24h',
    icon: '🛒',
    method: 'GET',
    path: '/api/v1/pchome/:productId',
    description: '取得 PChome 商品資訊',
    examples: [
      'https://24h.pchome.com.tw/prod/ABCDEF-ABC123456',
    ],
    parameters: [
      { name: 'productId', label: 'Product ID', type: 'text', required: true, placeholder: 'ABCDEF-ABC123456' },
    ],
    buildUrl: (params) => `/api/v1/pchome/${params.productId}`,
  },
  {
    id: 'baha',
    name: '巴哈姆特',
    icon: '🎮',
    method: 'GET',
    path: '/api/v1/baha/:postId',
    description: '取得巴哈姆特論壇文章',
    examples: [
      'https://forum.gamer.com.tw/C.php?bsn=60076&snA=123456',
      'https://m.gamer.com.tw/forum/C.php?bsn=60076&snA=123456',
    ],
    parameters: [
      { name: 'postId', label: 'Post ID', type: 'text', required: true, placeholder: 'C.php?bsn=60076&snA=123456' },
    ],
    buildUrl: (params) => `/api/v1/baha/${params.postId}`,
  },
  {
    id: 'misskey',
    name: 'Misskey',
    icon: '🐱',
    method: 'GET',
    path: '/api/v1/misskey/:host/:noteId',
    description: '取得 Misskey 筆記資訊',
    examples: [
      'https://misskey.io/notes/abc123xyz',
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'text', required: true, placeholder: 'misskey.io' },
      { name: 'noteId', label: 'Note ID', type: 'text', required: true, placeholder: 'abc123xyz' },
    ],
    buildUrl: (params) => `/api/v1/misskey/${params.host}/${params.noteId}`,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📷',
    method: 'GET',
    path: '/api/v1/instagram/:postId',
    description: '取得 Instagram 貼文資訊',
    examples: [
      'https://www.instagram.com/p/ABC123xyz/',
      'https://www.instagram.com/reel/ABC123xyz/',
    ],
    parameters: [
      { name: 'postId', label: 'Post ID', type: 'text', required: true, placeholder: 'ABC123xyz' },
    ],
    buildUrl: (params) => `/api/v1/instagram/${params.postId}`,
  },
  {
    id: 'threads',
    name: 'Threads',
    icon: '🧵',
    method: 'POST',
    path: '/api/v1/threads',
    description: '取得 Threads 貼文資訊',
    examples: [
      'https://www.threads.net/@username/post/ABC123xyz',
    ],
    parameters: [
      { name: 'url', label: 'Threads URL', type: 'textarea', required: true, placeholder: 'https://www.threads.net/@username/post/ABC123xyz' },
    ],
    buildUrl: () => `/api/v1/threads`,
    buildBody: (params) => ({ url: params.url }),
  },
  {
    id: 'ptt',
    name: 'PTT',
    icon: '💻',
    method: 'GET',
    path: '/api/v1/ptt/:board/:postId',
    description: '取得 PTT 文章資訊',
    examples: [
      'https://www.ptt.cc/bbs/Gossiping/M.1234567890.A.123.html',
    ],
    parameters: [
      { name: 'board', label: 'Board', type: 'text', required: true, placeholder: 'Gossiping' },
      { name: 'postId', label: 'Post ID', type: 'text', required: true, placeholder: 'M.1234567890.A.123' },
    ],
    buildUrl: (params) => `/api/v1/ptt/${params.board}/${params.postId}`,
  },
  {
    id: 'weibo',
    name: 'Weibo',
    icon: '🐦',
    method: 'GET',
    path: '/api/v1/weibo/:statusId',
    description: '取得微博貼文資訊',
    examples: [
      'https://m.weibo.cn/detail/1234567890123456',
    ],
    parameters: [
      { name: 'statusId', label: 'Status ID', type: 'text', required: true, placeholder: '1234567890123456' },
    ],
    buildUrl: (params) => `/api/v1/weibo/${params.statusId}`,
  },
];

// Statistics
const stats = {
  total: 0,
  success: 0,
  error: 0,
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkServerStatus();
  renderEndpoints();
  setupNavigation();
});

// Check Server Status
async function checkServerStatus() {
  const statusIndicator = document.getElementById('serverStatus');
  const statusText = document.getElementById('serverStatusText');

  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      statusIndicator.classList.add('online');
      statusText.textContent = 'API 運行中';
    } else {
      statusIndicator.classList.add('offline');
      statusText.textContent = 'API 異常';
    }
  } catch (error) {
    statusIndicator.classList.add('offline');
    statusText.textContent = 'API 離線';
  }
}

// Render All Endpoints
function renderEndpoints() {
  const container = document.getElementById('endpointsContainer');

  API_ENDPOINTS.forEach((endpoint) => {
    const card = createEndpointCard(endpoint);
    container.appendChild(card);
  });
}

// Create Endpoint Card
function createEndpointCard(endpoint) {
  const card = document.createElement('div');
  card.className = 'endpoint-card';
  card.id = endpoint.id;

  // Header
  const header = document.createElement('div');
  header.className = 'endpoint-header';
  header.innerHTML = `
    <div class="endpoint-title">
      <div class="endpoint-icon">${endpoint.icon}</div>
      <h3 class="endpoint-name">${endpoint.name}</h3>
    </div>
    <div class="endpoint-meta">
      <span class="method-badge ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
      <code class="endpoint-path">${endpoint.path}</code>
    </div>
  `;

  // Body
  const body = document.createElement('div');
  body.className = 'endpoint-body';

  // Examples
  const examplesHtml = `
    <div class="section">
      <div class="section-header">範例網址</div>
      <div class="example-urls">
        ${endpoint.examples.map((url) => `<div class="example-url">${url}</div>`).join('')}
      </div>
    </div>
  `;

  // Parameters Form
  const formHtml = `
    <div class="section">
      <div class="section-header">參數</div>
      <form class="test-form" data-endpoint-id="${endpoint.id}">
        ${endpoint.parameters.map((param) => `
          <div class="form-group">
            <label class="form-label">
              ${param.label}
              ${param.required ? '<span class="required">*</span>' : ''}
            </label>
            ${param.type === 'textarea' ?
              `<textarea class="form-textarea" name="${param.name}" placeholder="${param.placeholder}" ${param.required ? 'required' : ''}></textarea>` :
              `<input type="text" class="form-input" name="${param.name}" placeholder="${param.placeholder}" ${param.required ? 'required' : ''}>`
}
          </div>
        `).join('')}
        <div class="button-group">
          <button type="submit" class="btn btn-primary">
            <span class="btn-text">測試 API</span>
          </button>
          <button type="button" class="btn btn-secondary btn-clear">清除結果</button>
        </div>
      </form>
    </div>
  `;

  // Response Container
  const responseHtml = `
    <div class="response-container" data-response-id="${endpoint.id}">
      <div class="response-header">
        <div class="response-status"></div>
        <div class="response-time"></div>
      </div>
      <div class="response-body"><pre></pre></div>
    </div>
  `;

  body.innerHTML = examplesHtml + formHtml + responseHtml;

  card.appendChild(header);
  card.appendChild(body);

  // Toggle expand/collapse
  header.addEventListener('click', () => {
    body.classList.toggle('expanded');
  });

  // Handle form submission
  const form = body.querySelector('.test-form');
  form.addEventListener('submit', (e) => handleFormSubmit(e, endpoint));

  // Handle clear button
  const clearBtn = body.querySelector('.btn-clear');
  clearBtn.addEventListener('click', () => clearResponse(endpoint.id));

  return card;
}

// Handle Form Submit
async function handleFormSubmit(event, endpoint) {
  event.preventDefault();

  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.btn-text');

  // Collect form data
  const formData = new FormData(form);
  const params = {};
  for (const [key, value] of formData.entries()) {
    params[key] = value.trim();
  }

  // Validate
  if (endpoint.parameters.some((p) => p.required && !params[p.name])) {
    alert('請填寫所有必填欄位');
    return;
  }

  // Show loading
  submitBtn.disabled = true;
  btnText.innerHTML = '<span class="loading-spinner"></span>測試中...';

  // Build request
  const url = endpoint.buildUrl(params);
  const body = endpoint.buildBody ? endpoint.buildBody(params) : null;

  // Make request
  const startTime = Date.now();
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: endpoint.method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : null,
    });

    const data = await response.json();
    const time = Date.now() - startTime;

    displayResponse(endpoint.id, response.ok, data, time);
    updateStats(response.ok);
  } catch (error) {
    const time = Date.now() - startTime;
    displayResponse(endpoint.id, false, { error: error.message }, time);
    updateStats(false);
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = '測試 API';
  }
}

// Display Response
function displayResponse(endpointId, success, data, time) {
  const container = document.querySelector(`[data-response-id="${endpointId}"]`);
  const statusEl = container.querySelector('.response-status');
  const timeEl = container.querySelector('.response-time');
  const bodyEl = container.querySelector('.response-body pre');

  container.classList.add('show');

  statusEl.className = `response-status ${success ? 'success' : 'error'}`;
  statusEl.textContent = success ? '✓ 成功' : '✗ 失敗';

  timeEl.textContent = `⏱ ${time}ms`;

  bodyEl.textContent = JSON.stringify(data, null, 2);
}

// Clear Response
function clearResponse(endpointId) {
  const container = document.querySelector(`[data-response-id="${endpointId}"]`);
  container.classList.remove('show');
}

// Update Statistics
function updateStats(success) {
  stats.total++;
  if (success) {
    stats.success++;
  } else {
    stats.error++;
  }

  document.getElementById('totalTests').textContent = stats.total;
  document.getElementById('successTests').textContent = stats.success;
  document.getElementById('errorTests').textContent = stats.error;
}

// Setup Navigation
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();

      // Update active state
      navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');

      // Scroll to endpoint
      const targetId = item.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Expand the endpoint
        const body = targetElement.querySelector('.endpoint-body');
        if (!body.classList.contains('expanded')) {
          body.classList.add('expanded');
        }
      }
    });
  });
}
