const SESSION_NAMESPACE = 'session';
const SESSION_KEY = 'bahamut';
const SESSION_TTL_SECONDS = 259200;
const SESSION_STALE_TTL_SECONDS = 604800;

export class BahaSessionService {
  constructor({ cache, http, userId, password, logger }) {
    this.cache = cache;
    this.http = http;
    this.userId = userId;
    this.password = password;
    this.logger = logger;
  }

  isConfigured() {
    return Boolean(this.userId && this.password);
  }

  async login() {
    const response = await this.http.postForm(
      'https://api.gamer.com.tw/mobile_app/user/v3/do_login.php',
      { uid: this.userId, passwd: this.password, vcode: '9487' },
      { headers: { cookie: 'ckAPP_VCODE=9487' } },
    );
    const setCookies = response.headers.getSetCookie?.() ?? [response.headers.get('set-cookie')].filter(Boolean);
    const wanted = new Map();
    for (const cookie of setCookies) {
      const pair = cookie.split(';', 1)[0];
      const separator = pair.indexOf('=');
      if (separator <= 0) continue;
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if ((name === 'BAHAENUR' || name === 'BAHARUNE') && value) wanted.set(name, value);
    }
    if (!wanted.has('BAHAENUR') || !wanted.has('BAHARUNE')) {
      throw new Error('Bahamut login did not return both session cookies');
    }
    return `BAHAENUR=${wanted.get('BAHAENUR')}; BAHARUNE=${wanted.get('BAHARUNE')}`;
  }

  cacheOptions() {
    return {
      ttlSeconds: SESSION_TTL_SECONDS,
      staleTtlSeconds: SESSION_STALE_TTL_SECONDS,
    };
  }

  async refresh() {
    if (!this.isConfigured()) return '';
    const cookie = await this.login();
    await this.cache.set(SESSION_NAMESPACE, SESSION_KEY, cookie, this.cacheOptions());
    this.logger?.info('Bahamut session refreshed');
    return cookie;
  }

  async getCookie({ force = false } = {}) {
    if (!this.isConfigured()) return '';
    if (force) await this.cache.delete(SESSION_NAMESPACE, SESSION_KEY);

    return this.cache.getOrLoad(SESSION_NAMESPACE, SESSION_KEY, async () => {
      const cookie = await this.login();
      this.logger?.info('Bahamut session refreshed');
      return cookie;
    }, this.cacheOptions());
  }
}
