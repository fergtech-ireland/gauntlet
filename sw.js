/* Gauntlet service worker.
 *
 * What it is for: the app opens instantly and still works offline.
 * What it must never do: keep someone on an old version after you publish.
 *
 * The rules:
 *  - The app page itself (index.html) is NETWORK FIRST. When online, every
 *    open gets the newest version you have published. The saved copy is only
 *    used when there is no connection, or when the network is so slow that
 *    waiting would be worse than opening the saved copy for now.
 *  - Icons and the manifest are served from the saved copy and refreshed in
 *    the background.
 *  - Google Fonts are saved once and reused.
 *  - Nothing else is touched. Supabase, the coach endpoint and anything else
 *    on another site pass straight through, and nothing that writes (POST,
 *    PATCH, DELETE) is ever intercepted.
 *
 * Paths are relative, because the app lives at /gauntlet/ on GitHub Pages.
 *
 * You do NOT need to edit this file when you publish a new index.html. Only
 * change VERSION if you change this file's own behaviour or the SHELL list.
 */
const VERSION = 'gauntlet-shell-v2';
const FONTS = 'gauntlet-fonts-v1';
const KEEP = [VERSION, FONTS];

/* the files the app needs to open offline */
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon.svg'];

/* how long to wait for the network before opening the saved copy instead */
const PAGE_TIMEOUT_MS = 4000;

self.addEventListener('install', event => {
  /* Take over straight away rather than waiting for every open copy of the
     app to close. A home screen app is almost never fully closed, which is
     how people used to sit on old versions for days. */
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    /* one at a time, so a single missing icon cannot stop the rest saving */
    await Promise.all(SHELL.map(url =>
      fetch(new Request(url, { cache: 'reload' }))
        .then(res => { if (res && res.ok) return cache.put(url, res); })
        .catch(() => {})
    ));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    /* clear anything left by older versions of this file, including the
       previous service worker's caches */
    const names = await caches.keys();
    await Promise.all(names.filter(n => !KEEP.includes(n)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

/* kept for compatibility: a page may ask a waiting worker to take over */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

function isAppPage(request, url) {
  if (request.mode === 'navigate') return true;
  const scope = new URL(self.registration ? self.registration.scope : './', self.location).pathname;
  return url.pathname === scope || url.pathname.endsWith('/index.html');
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      event.respondWith(cacheFirst(request, FONTS));
    }
    return;
  }

  if (isAppPage(request, url)) {
    event.respondWith(networkFirst(event, url));
    return;
  }

  if (SHELL.some(p => new URL(p, self.location).pathname === url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, request));
  }
  /* any other same-site file passes straight through */
});

/* The page. 'no-cache' makes the browser check with GitHub Pages every time
   rather than reusing its own copy for up to 10 minutes, and costs almost
   nothing when the file has not changed. */
async function networkFirst(event, url) {
  const cache = await caches.open(VERSION);
  const key = new URL('./index.html', self.location).href;
  const fromNetwork = fetch(url.href.split('#')[0], { cache: 'no-cache', credentials: 'same-origin' })
    .then(res => {
      if (res && res.ok && res.type !== 'opaque') {
        const copy = res.clone();
        event.waitUntil(cache.put(key, copy));
      }
      return res;
    });

  const saved = await cache.match(key);
  if (!saved) {
    try { return await fromNetwork; }
    catch (e) { return new Response('Gauntlet needs a connection the first time it opens.', { status: 503, headers: { 'Content-Type': 'text/plain' } }); }
  }

  /* there is a saved copy: wait a few seconds for the network, then fall back */
  const timeout = new Promise(resolve => setTimeout(() => resolve(null), PAGE_TIMEOUT_MS));
  try {
    const res = await Promise.race([fromNetwork, timeout]);
    if (res && res.ok) return res;
    /* too slow, or the server answered with an error: open the saved copy,
       and let the network finish in the background so the next open is fresh */
    event.waitUntil(fromNetwork.catch(() => {}));
    return saved;
  } catch (e) {
    return saved;
  }
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(VERSION);
  const saved = await cache.match(request, { ignoreSearch: true });
  const refresh = fetch(request, { cache: 'no-cache' })
    .then(res => { if (res && res.ok) return cache.put(request, res.clone()).then(() => res); return res; })
    .catch(() => null);
  if (saved) { event.waitUntil(refresh); return saved; }
  const res = await refresh;
  return res || new Response('', { status: 504 });
}

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
  const saved = await cache.match(request);
  if (saved) return saved;
  try {
    const res = await fetch(request);
    /* font files come back opaque from another site; that is fine to keep */
    if (res && (res.ok || res.type === 'opaque')) await cache.put(request, res.clone());
    return res;
  } catch (e) {
    return new Response('', { status: 504 });
  }
}
