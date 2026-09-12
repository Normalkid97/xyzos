importScripts("/search/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
let configReady;

async function ensureConfig() {
  configReady ||= scramjet.loadConfig();
  await configReady;
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  event.respondWith((async () => {
    try {
      await ensureConfig();
      return scramjet.route(event) ? await scramjet.fetch(event) : await fetch(event.request);
    } catch (error) {
      console.error("[Scramjet] request failed", error);
      return fetch(event.request);
    }
  })());
});
