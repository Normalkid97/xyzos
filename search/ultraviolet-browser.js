import { BareMuxConnection } from "/search/baremux/index.mjs";

const address = document.getElementById("scramjet-address");
const form = document.getElementById("scramjet-form");
const frameHost = document.getElementById("scramjet-frame-host");
const status = document.getElementById("scramjet-status");
const goButton = document.getElementById("scramjet-go");
const backButton = document.querySelector("[data-browser-back]");
const forwardButton = document.querySelector("[data-browser-forward]");
const reloadButton = document.querySelector("[data-browser-reload]");

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "https://example.com";
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

let transport;

function withTimeout(promise, message, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => window.setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

async function registerUltraviolet() {
  if (!navigator.serviceWorker) throw new Error("Service workers are not supported.");
  status.textContent = "Registering Ultraviolet service worker…";
  const registration = await withTimeout(
    navigator.serviceWorker.register("/search/sw.js", { scope: "/search/" }),
    "Ultraviolet service worker registration timed out.",
  );
  await withTimeout(registration.update(), "Ultraviolet service worker update timed out.");
  if (!navigator.serviceWorker.controller) {
    await Promise.race([
      new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true })),
      new Promise((resolve) => window.setTimeout(resolve, 5000)),
    ]);
  }
  if (!navigator.serviceWorker.controller) {
    throw new Error("Ultraviolet service worker did not activate. Reload the page and try again.");
  }
  status.textContent = "Connecting Ultraviolet transport…";
  if (!transport) transport = new BareMuxConnection("/search/baremux/worker.js");
  const bareUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/search/service/`;
  await withTimeout(
    transport.setTransport("/search/libcurl/index.mjs", [{ websocket: bareUrl }]),
    "Ultraviolet transport connection timed out.",
  );
  self.__uv$config = {
    prefix: "/search/service/",
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: "/search/uv/uv.handler.js",
    bundle: "/search/uv/uv.bundle.js",
    config: "/search/uv/uv.config.js",
    sw: "/search/uv/uv.sw.js",
  };
}

async function browse(event) {
  event.preventDefault();
  goButton.disabled = true;
  status.textContent = "Starting Ultraviolet…";
  try {
    await registerUltraviolet();
    const target = normalizeUrl(address.value);
    const frame = document.createElement("iframe");
    frame.className = "scramjet-frame";
    frame.title = "Ultraviolet proxy view";
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (!settled) {
        status.textContent = "Ultraviolet timed out loading this address. Try another URL.";
        goButton.disabled = false;
      }
    }, 10000);
    frame.addEventListener("load", () => {
      settled = true;
      window.clearTimeout(timeout);
      status.textContent = "Connected through Ultraviolet";
    }, { once: true });
    frame.addEventListener("error", () => {
      settled = true;
      window.clearTimeout(timeout);
      status.textContent = "Ultraviolet could not load this address.";
      goButton.disabled = false;
    }, { once: true });
    frame.src = `${self.__uv$config.prefix}${self.__uv$config.encodeUrl(target)}`;
    frameHost.replaceChildren(frame);
    address.value = target;
    status.textContent = "Loading through Ultraviolet…";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Unable to start Ultraviolet.";
  } finally {
    goButton.disabled = false;
  }
}

form.addEventListener("submit", browse);
function activeFrame() {
  return frameHost.querySelector("iframe");
}

backButton.addEventListener("click", () => {
  try { activeFrame()?.contentWindow.history.back(); } catch { status.textContent = "Back is unavailable for this page."; }
});
forwardButton.addEventListener("click", () => {
  try { activeFrame()?.contentWindow.history.forward(); } catch { status.textContent = "Forward is unavailable for this page."; }
});
reloadButton.addEventListener("click", () => {
  const frame = activeFrame();
  if (frame) frame.contentWindow.location.reload();
  else status.textContent = "Nothing to reload yet.";
});
status.textContent = "Ready — enter a URL to browse";
