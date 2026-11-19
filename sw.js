// 인터넷이 없어도 앱이 열리도록 앱 파일을 폰에 보관해요.
// 앱을 고친 뒤 다시 올릴 때는 아래 버전 숫자를 하나 올려주세요. 그래야 폰이 새 파일을 받아요.
const CACHE = "trivial-plan-v4";
const FILES = [
  "./",
  "./index.html",
  "./plans.js",
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// 인터넷이 되면 새 파일을 받아 보관하고, 안 되면 보관해둔 파일을 보여줘요
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("./index.html")))
  );
});
