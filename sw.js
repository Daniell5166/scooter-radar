/* =====================================================================
   SERVICE WORKER – der "Hintergrund-Helfer" der App
   ---------------------------------------------------------------------
   Er sitzt zwischen App und Internet und entscheidet bei jeder Anfrage:

   1. App-Dateien (index.html, version.json, Icons …): NETZWERK ZUERST.
      Online kommt immer die neueste Fassung (→ automatische Updates),
      offline die zuletzt gespeicherte.

   2. Bibliotheken von unpkg (Leaflet, Gruppen-Erweiterung, QR-Leser):
      SPEICHER ZUERST. Die Versionen sind fest, ändern sich also nie.

   3. Kartenkacheln: SPEICHER ZUERST, sonst laden und speichern.
      → Schon gesehene Gegenden erscheinen sofort, auch ohne Internet.
      München wird auf Wunsch der App einmalig vorab geladen.

   4. Alles andere (Fußwege, Schriften …): einfach durchreichen.

   Für normale Updates musst du diese Datei NICHT ändern: index.html ändern,
   version.json hochzählen, hochladen – fertig.
   ===================================================================== */

const APP_CACHE = "scooter-radar-app-v2";
const LIB_CACHE = "scooter-radar-libs-v1";
const TILE_CACHE = "scooter-radar-tiles-v1";        // unterwegs angesehene Kacheln (begrenzt)
const OFFLINE_CACHE = "scooter-radar-offline-v1";   // vorab geladene Kacheln München
const KEEP = [APP_CACHE, LIB_CACHE, TILE_CACHE, OFFLINE_CACHE];
const MAX_TILES = 3000;                             // ca. 50–60 MB, dann fliegen die ältesten raus

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./version.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

const LIBRARY_FILES = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css",
  "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js",
];

const TILE_HOSTS = ["server.arcgisonline.com", "basemaps.cartocdn.com", "tile.openstreetmap.org"];
const isTile = (url) => TILE_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith("." + h));

// ---------- Installieren: App-Dateien und Bibliotheken speichern ----------
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const app = await caches.open(APP_CACHE);
    const libs = await caches.open(LIB_CACHE);
    // Einzeln speichern: fehlt eine Datei, klappt der Rest trotzdem
    await Promise.allSettled(APP_FILES.map((f) => app.add(f)));
    await Promise.allSettled(LIBRARY_FILES.map(async (f) => {
      if (!(await libs.match(f))) await libs.add(f);
    }));
  })());
  self.skipWaiting();   // neue Version des Helfers sofort aktivieren
});

// ---------- Aktivieren: alte Speicherstände wegräumen ----------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ---------- Jede Anfrage ----------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(appFile(req));
    return;
  }
  if (url.hostname === "unpkg.com") {
    event.respondWith(libraryFile(req));
    return;
  }
  if (isTile(url)) {
    event.respondWith(tile(req));
    return;
  }
  // Alles andere: normal durchreichen
});

// 1. App-Dateien: Netzwerk zuerst
async function appFile(req) {
  const key = req.url.split("?")[0];
  try {
    const res = await fetch(req.url, { cache: "no-cache" });
    if (res.ok) {
      const copy = res.clone();
      caches.open(APP_CACHE).then((c) => c.put(key, copy));
    }
    return res;
  } catch (e) {
    const hit = (await caches.match(key)) || (req.mode === "navigate" ? await caches.match("./index.html") : null);
    return hit || Response.error();
  }
}

// 2. Bibliotheken: Speicher zuerst, sonst laden und speichern
async function libraryFile(req) {
  const hit = await caches.match(req.url);
  if (hit) return hit;
  try {
    const res = await fetch(req.url, { mode: "cors", credentials: "omit" });   // unpkg erlaubt CORS
    if (res.ok) {
      const copy = res.clone();
      caches.open(LIB_CACHE).then((c) => c.put(req.url, copy));
    }
    return res;
  } catch (e) {
    try { return await fetch(req); } catch (e2) { return Response.error(); }
  }
}

// 3. Kartenkacheln: Speicher zuerst, sonst laden und speichern
async function tile(req) {
  const hit = await caches.match(req.url);
  if (hit) return hit;
  try {
    // Mit CORS anfragen: Nur dann darf die Kachel platzsparend gespeichert werden.
    const res = await fetch(req.url, { mode: "cors", credentials: "omit" });
    if (res.ok) storeTile(req.url, res.clone());
    return res;
  } catch (e) {
    // Server erlaubt kein CORS oder kein Netz: normal laden (dann ohne Speichern)
    try { return await fetch(req); } catch (e2) { return Response.error(); }
  }
}

let putsSinceTrim = 0;
async function storeTile(url, res) {
  const cache = await caches.open(TILE_CACHE);
  await cache.put(url, res);
  if (++putsSinceTrim >= 100) {
    putsSinceTrim = 0;
    const keys = await cache.keys();                 // älteste zuerst
    const extra = keys.length - MAX_TILES;
    for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
  }
}

// ---------- Offline-Karte: Kacheln auf Wunsch der App vorab laden ----------
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "warm-tiles" || !Array.isArray(data.urls)) return;
  event.waitUntil(warmTiles(data.urls, event.source));
});

async function warmTiles(urls, client) {
  const cache = await caches.open(OFFLINE_CACHE);
  const total = urls.length;
  let done = 0, failed = 0, next = 0;
  const report = (type) => client && client.postMessage({ type, done, total, failed });

  async function worker() {
    while (next < urls.length) {
      const url = urls[next++];
      try {
        if (!(await cache.match(url))) {
          const res = await fetch(url, { mode: "cors", credentials: "omit" });
          if (res.ok) await cache.put(url, res); else failed++;
        }
      } catch (e) {
        failed++;
      }
      done++;
      if (done % 20 === 0) report("warm-progress");
    }
  }
  // 4 Downloads gleichzeitig – schnell, ohne den Kartenserver zu überlasten
  await Promise.all([worker(), worker(), worker(), worker()]);
  report("warm-done");
}
