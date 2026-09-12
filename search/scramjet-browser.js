import { BareMuxConnection } from "/search/baremux/index.mjs";

const address = document.getElementById("scramjet-address");
const form = document.getElementById("scramjet-form");
const frameHost = document.getElementById("scramjet-frame-host");
const status = document.getElementById("scramjet-status");
const goButton = document.getElementById("scramjet-go");

let scramjet;
let connection;
let frame;

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "https://example.com";
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function registerScramjet() {
  if (!navigator.serviceWorker) throw new Error("Service workers are not supported.");
  try {
    indexedDB.deleteDatabase("$scramjet");
  } catch {
    // Ignore unavailable IndexedDB databases.
  }
  await navigator.serviceWorker.register("/search/sw.js", { scope: "/search/" });
  const registration = await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
    await new Promise((resolve) => {
      navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
    });
  }
  await registration.active?.postMessage({ type: "scramjet-ready" });

  const { ScramjetController } = $scramjetLoadController();
  scramjet = new ScramjetController({
    files: {
      wasm: "/search/scram/scramjet.wasm.wasm",
      all: "/search/scram/scramjet.all.js",
      sync: "/search/scram/scramjet.sync.js",
    },
  });
  try {
    await scramjet.init();
  } catch (error) {
    indexedDB.deleteDatabase("$scramjet");
    throw error;
  }
  connection = new BareMuxConnection("/search/baremux/worker.js");
}

async function browse(event) {
  event.preventDefault();
  goButton.disabled = true;
  status.textContent = "Starting secure proxy…";
  try {
    if (!scramjet) await registerScramjet();
    const wispUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;
    await connection.setTransport("/search/libcurl/index.mjs", [{ websocket: wispUrl }]);
    if (frame) frame.frame.remove();
    frame = scramjet.createFrame();
    frame.frame.className = "scramjet-frame";
    frameHost.replaceChildren(frame.frame);
    frame.go(normalizeUrl(address.value));
    status.textContent = "Connected through Scramjet";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Unable to start Scramjet.";
  } finally {
    goButton.disabled = false;
  }
}

form.addEventListener("submit", browse);
  status.textContent = "Ready — enter a URL to browse";

window.addEventListener("error", (event) => {
  if (event.error) console.error("[Scramjet] browser error", event.error);
});
