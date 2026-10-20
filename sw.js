/* =====================================================================
   SERVICE WORKER – der "Hintergrund-Helfer" der App
   ---------------------------------------------------------------------
   Er sitzt zwischen App und Internet und entscheidet bei jeder Anfrage:
     - App-Dateien (index.html, Icons, version.json …):
         IMMER zuerst online die neueste Version holen ("Netzwerk zuerst").
         Klappt das, wird sie gleich für später gespeichert.
         Nur ohne Internet nimmt er die gespeicherte Kopie.
       → Deshalb kommen Änderungen am Code automatisch beim nächsten Start an,
         ohne dass man die App neu installieren muss.
     - Leaflet (Kartenbibliothek von unpkg): gespeicherte Kopie reicht,
       die Version ist fest (1.9.4) und ändert sich nie.
     - Kartenkacheln und Routing: einfach durchreichen, nicht speichern.

   Diese Datei musst du normalerweise NIE ändern. Für Updates reicht es,
   index.html zu ändern und in version.json die Nummer hochzuzählen.
   ===================================================================== */

const CACHE = "scooter-radar-v1";

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
];

// Beim Installieren: alles einmal herunterladen und speichern
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([...APP_FILES, ...LIBRARY_FILES])).catch(() => {})
  );
  self.skipWaiting();   // neue Version des Helfers sofort aktivieren
});

// Beim Aktivieren: alte Speicherstände wegräumen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Eigene App-Dateien: Netzwerk zuerst, sonst gespeicherte Kopie
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req.url, { cache: "no-cache" })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req.url.split("?")[0], copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req.url.split("?")[0]).then((hit) => hit || caches.match("./index.html"))
        )
    );
    return;
  }

  // Kartenbibliothek: gespeicherte Kopie, sonst laden
  if (url.hostname === "unpkg.com") {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
    return;
  }

  // Alles andere (Kartenkacheln, Routing, Schriften): normal durchreichen
});
