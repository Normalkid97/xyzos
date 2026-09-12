const address = document.getElementById("scramjet-address");
const form = document.getElementById("scramjet-form");
const frameHost = document.getElementById("scramjet-frame-host");
const status = document.getElementById("scramjet-status");
const goButton = document.getElementById("scramjet-go");

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "https://example.com";
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

async function registerUltraviolet() {
  if (!navigator.serviceWorker) throw new Error("Service workers are not supported.");
  const registration = await navigator.serviceWorker.register("/search/sw.js", { scope: "/search/" });
  await registration.update();
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
    status.textContent = "Loading through Ultraviolet…";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Unable to start Ultraviolet.";
  } finally {
    goButton.disabled = false;
  }
}

form.addEventListener("submit", browse);
status.textContent = "Ready — enter a URL to browse";
