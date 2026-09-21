/* ============================================================
   SERVICE WORKER SUITE
   Browsers do not run service workers inside jsdom, so this runs the real
   sw.js in a sandbox that behaves like one: a Cache Storage, install and
   activate events, fetch events, and a fake GitHub Pages server that can be
   given a new version, taken offline, or made slow.
   The first test is the one that matters: publish a new index.html, open the
   app, and get the new version.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { suite } = require('./harness');

const SCOPE = 'https://fergtech-ireland.github.io/gauntlet/';
const SRC = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');

/* ---------- a small, faithful Cache Storage ---------- */
function makeCaches() {
  const stores = new Map();
  const keyOf = (req, ignoreSearch) => {
    const u = new URL(typeof req === 'string' ? req : req.url, SCOPE);
    if (ignoreSearch) u.search = '';
    u.hash = '';
    return u.href;
  };
  class Cache {
    constructor() { this.map = new Map(); }
    async put(req, res) { this.map.set(keyOf(req), res.clone()); }
    async match(req, opts) {
      const ig = opts && opts.ignoreSearch;
      const k = keyOf(req, ig);
      for (const [key, res] of this.map) if ((ig ? keyOf(key, true) : key) === k) return res.clone();
      return undefined;
    }
    async keys() { return [...this.map.keys()]; }
  }
  return {
    stores,
    async open(n) { if (!stores.has(n)) stores.set(n, new Cache()); return stores.get(n); },
    async keys() { return [...stores.keys()]; },
    async delete(n) { return stores.delete(n); },
    async match(req) { for (const c of stores.values()) { const r = await c.match(req); if (r) return r; } }
  };
}

/* ---------- a fake GitHub Pages ---------- */
function makeServer() {
  const s = {
    files: {
      'gauntlet/': '<html>v1</html>', 'gauntlet/index.html': '<html>v1</html>',
      'gauntlet/manifest.webmanifest': '{}', 'gauntlet/icon-192.png': 'PNG', 'gauntlet/icon.svg': '<svg/>'
    },
    offline: false, delay: 0, status: 200, calls: [],
    publish(html) { this.files['gauntlet/'] = html; this.files['gauntlet/index.html'] = html; },
    fetch: null
  };
  s.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url, SCOPE);
    const cacheMode = (init && init.cache) || (typeof input !== 'string' && input.cache) || 'default';
    s.calls.push({ url: url.href, cache: cacheMode, method: (init && init.method) || (typeof input !== 'string' && input.method) || 'GET' });
    if (s.delay) await new Promise(r => setTimeout(r, s.delay));
    if (s.offline) throw new TypeError('Failed to fetch');
    if (/fonts\.g(oogleapis|static)\.com/.test(url.hostname)) return new Response('FONT', { status: 200 });
    const key = url.pathname.replace(/^\//, '');
    if (!(key in s.files)) return new Response('not found', { status: 404 });
    return new Response(s.files[key], { status: s.status, headers: { 'Content-Type': 'text/html' } });
  };
  return s;
}

/* ---------- a service worker global scope, running the real file ---------- */
function makeWorker(server, opts) {
  const listeners = {};
  const caches = (opts && opts.caches) || makeCaches();
  let claimed = false, skipped = false;
  const RequestShim = class extends Request {
    constructor(input, init) { super(typeof input === 'string' ? new URL(input, SCOPE).href : input, init); }
  };
  const self = {
    location: new URL('sw.js', SCOPE),
    registration: { scope: SCOPE },
    clients: { claim: async () => { claimed = true; } },
    skipWaiting: () => { skipped = true; },
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); }
  };
  const src = opts && opts.timeoutMs ? SRC.replace('PAGE_TIMEOUT_MS = 4000', 'PAGE_TIMEOUT_MS = ' + opts.timeoutMs) : SRC;
  const ctx = vm.createContext({ self, caches, fetch: server.fetch, Request: RequestShim, Response, URL, Promise, setTimeout, console });
  vm.runInContext(src, ctx);
  const fire = async (type, extra) => {
    const waits = []; let responded = null;
    const ev = Object.assign({ waitUntil: p => waits.push(p), respondWith: p => { responded = p; } }, extra || {});
    (listeners[type] || []).forEach(fn => fn(ev));
    const res = responded ? await responded : undefined;
    return { res, responded: !!responded, settle: () => Promise.all(waits) };
  };
  return {
    caches, fire, get claimed() { return claimed; }, get skipped() { return skipped; },
    async install() { const r = await fire('install'); await r.settle(); },
    async activate() { const r = await fire('activate'); await r.settle(); },
    async get(url, init) {
      /* only a real browser navigation can carry mode 'navigate', so it is
         set on the event's request rather than passed to the constructor */
      const { mode, ...rest } = init || {};
      const req = new Request(new URL(url, SCOPE).href, Object.assign({ method: 'GET' }, rest));
      /* a plain object carrying exactly what sw.js reads from a request */
      const evReq = { mode: mode || 'cors', url: req.url, method: req.method, cache: req.cache, clone: () => req.clone() };
      const r = await fire('fetch', { request: evReq });
      return r;
    }
  };
}
const text = async r => (r && r.res ? await r.res.clone().text() : null);

(async () => {
  const s = suite('SERVICE WORKER');
  const t = s.t;

  /* ---- 1. the complaint: publish, open, see it ---- */
  {
    const server = makeServer();
    const sw = makeWorker(server);
    await sw.install(); await sw.activate();
    t('install takes over at once rather than waiting for every copy to close', sw.skipped);
    t('activate takes control of open pages', sw.claimed);
    const first = await sw.get('./', { mode: 'navigate' });
    t('opening the app gets the published version', (await text(first)) === '<html>v1</html>');
    server.publish('<html>v2</html>');
    const second = await sw.get('./', { mode: 'navigate' });
    t('PUBLISH A NEW index.html, OPEN THE APP, GET THE NEW VERSION', (await text(second)) === '<html>v2</html>', await text(second));
    await second.settle();
    const saved = await (await sw.caches.open('gauntlet-shell-v2')).match(SCOPE + 'index.html');
    t('and the saved copy is updated for offline use', saved && (await saved.text()) === '<html>v2</html>');
    const pageCall = server.calls.filter(c => c.url === SCOPE).pop();
    t('the page is fetched with no-cache, so GitHub Pages\' 10 minute cache cannot hold it back', pageCall && pageCall.cache === 'no-cache', JSON.stringify(pageCall));
  }

  /* ---- 2. install ---- */
  {
    const server = makeServer();
    delete server.files['gauntlet/icon.svg'];
    const sw = makeWorker(server);
    await sw.install();
    const c = await sw.caches.open('gauntlet-shell-v2');
    const keys = await c.keys();
    t('install saves the app shell', ['', 'index.html', 'manifest.webmanifest', 'icon-192.png'].every(k => keys.includes(SCOPE + k)), keys.join(', '));
    t('a missing file does not stop the rest being saved', !keys.includes(SCOPE + 'icon.svg') && keys.length === 4);
    t('install asks the server, not the browser cache', server.calls.every(x => x.cache === 'reload'));
  }

  /* ---- 3. old caches from your previous service worker are cleared ---- */
  {
    const server = makeServer();
    const caches = makeCaches();
    await caches.open('gauntlet-v1'); await caches.open('some-old-cache'); await caches.open('gauntlet-fonts-v1');
    const sw = makeWorker(server, { caches });
    await sw.install(); await sw.activate();
    const names = await caches.keys();
    t('activate clears caches left by older versions', !names.includes('gauntlet-v1') && !names.includes('some-old-cache'), names.join(', '));
    t('and keeps the current ones', names.includes('gauntlet-shell-v2') && names.includes('gauntlet-fonts-v1'));
  }

  /* ---- 4. offline, slow, and broken networks ---- */
  {
    const server = makeServer();
    const sw = makeWorker(server, { timeoutMs: 60 });
    await sw.install(); await sw.activate();
    server.offline = true;
    t('offline, it opens the saved copy', (await text(await sw.get('./', { mode: 'navigate' }))) === '<html>v1</html>');
    server.offline = false; server.publish('<html>v2</html>'); server.delay = 300;
    const t0 = Date.now();
    const slow = await sw.get('./', { mode: 'navigate' });
    const took = Date.now() - t0;
    t('on a very slow connection it opens the saved copy rather than hanging', (await text(slow)) === '<html>v1</html>' && took < 250, took + 'ms');
    await slow.settle();
    const c = await sw.caches.open('gauntlet-shell-v2');
    t('and still finishes downloading, so the next open is the new version', (await (await c.match(SCOPE + 'index.html')).text()) === '<html>v2</html>');
    server.delay = 0; server.status = 500;
    t('if the server errors, it opens the saved copy', (await text(await sw.get('./', { mode: 'navigate' }))) === '<html>v2</html>');
    server.status = 200;
  }
  {
    const server = makeServer(); server.offline = true;
    const sw = makeWorker(server);
    await sw.activate();
    const r = await sw.get('./', { mode: 'navigate' });
    t('the very first open with no connection explains itself', r.res.status === 503 && /needs a connection the first time/.test(await r.res.text()));
  }

  /* ---- 5. things it must leave alone ---- */
  {
    const server = makeServer();
    const sw = makeWorker(server);
    await sw.install(); await sw.activate();
    const post = await sw.get('./', { method: 'POST', body: 'x' });
    t('it never touches anything that writes', !post.responded);
    const supa = await sw.get('https://abc.supabase.co/rest/v1/state?user_id=eq.1');
    t('it never touches Supabase', !supa.responded);
    const coach = await sw.get('https://example.org/coach');
    t('or any other site', !coach.responded);
    const tests = await sw.get('./uat.js');
    t('or other files in the repository, like the tests', !tests.responded);
  }

  /* ---- 6. icons and fonts ---- */
  {
    const server = makeServer();
    const sw = makeWorker(server);
    await sw.install(); await sw.activate();
    server.files['gauntlet/icon-192.png'] = 'PNG2';
    const icon = await sw.get('./icon-192.png');
    t('icons open from the saved copy', (await text(icon)) === 'PNG');
    await icon.settle();
    t('and refresh in the background', (await text(await sw.get('./icon-192.png'))) === 'PNG2');
    const f1 = await sw.get('https://fonts.gstatic.com/s/archivo.woff2');
    const before = server.calls.length;
    const f2 = await sw.get('https://fonts.gstatic.com/s/archivo.woff2');
    t('fonts are downloaded once and reused', (await text(f1)) === 'FONT' && (await text(f2)) === 'FONT' && server.calls.length === before);
  }

  /* ---- 7. the app's own update check goes through the same path ---- */
  {
    const server = makeServer();
    const sw = makeWorker(server);
    await sw.install(); await sw.activate();
    server.publish('<html>v3</html>');
    const r = await sw.get('./', { cache: 'no-cache' });
    t('the in-app update check sees the newest version too', (await text(r)) === '<html>v3</html>');
  }

  const r = s.report([]);
  if (require.main === module) process.exit(r.fail ? 1 : 0);
})();
