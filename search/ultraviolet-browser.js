import { BareMuxConnection } from "/search/baremux/index.mjs";

const address = document.getElementById("scramjet-address");
const form = document.getElementById("scramjet-form");
const frameHost = document.getElementById("scramjet-frame-host");
const status = document.getElementById("scramjet-status");
const goButton = document.getElementById("scramjet-go");
const tabs = document.getElementById("browser-tabs");
const menu = document.querySelector("[data-browser-menu]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const backButton = document.querySelector("[data-browser-back]");
const forwardButton = document.querySelector("[data-browser-forward]");
const reloadButton = document.querySelector("[data-browser-reload]");
let transport;
let tabCount = 1;
let activeTab = "tab-1";
const tabFrames = new Map();

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "https://example.com";
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
function withTimeout(promise, message, ms = 8000) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);
}
async function registerUltraviolet() {
  if (!navigator.serviceWorker) throw new Error("Service workers are not supported.");
  const registration = await withTimeout(navigator.serviceWorker.register("/search/sw.js", { scope: "/search/" }), "UV service worker registration timed out.");
  await withTimeout(registration.update(), "UV service worker update timed out.");
  if (!navigator.serviceWorker.controller) await Promise.race([new Promise(resolve => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true })), new Promise(resolve => setTimeout(resolve, 5000))]);
  if (!navigator.serviceWorker.controller) throw new Error("UV service worker did not activate. Reload and try again.");
  if (!transport) transport = new BareMuxConnection("/search/baremux/worker.js");
  const bareUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/search/service/`;
  await withTimeout(transport.setTransport("/search/libcurl/index.mjs", [{ websocket: bareUrl }]), "UV transport connection timed out.");
  self.__uv$config = { prefix: "/search/service/", encodeUrl: Ultraviolet.codec.xor.encode, decodeUrl: Ultraviolet.codec.xor.decode, handler: "/search/uv/uv.handler.js", bundle: "/search/uv/uv.bundle.js", config: "/search/uv/uv.config.js", sw: "/search/uv/uv.sw.js" };
}
function activeFrame() { return tabFrames.get(activeTab); }
function selectTab(id) {
  const tab = tabs.querySelector(`[data-tab-id="${id}"]`);
  if (!tab) return;
  activeTab = id;
  tabs.querySelectorAll(".browser-tab").forEach(item => item.classList.toggle("active", item === tab));
  const frame = activeFrame();
  frameHost.replaceChildren(frame || document.createElement("div"));
  address.value = tab.dataset.url || "";
  status.textContent = frame ? "Connected through Ultraviolet" : "Ready — enter a URL to browse";
}
function createTab() {
  tabCount += 1;
  const id = `tab-${tabCount}`;
  const tab = document.createElement("button");
  tab.className = "browser-tab active";
  tab.type = "button";
  tab.dataset.tabId = id;
  tab.innerHTML = `<strong>UV</strong><span class="tab-label">New Tab</span><span class="tab-close" aria-label="Close tab">×</span>`;
  tabs.insertBefore(tab, tabs.querySelector("[data-new-tab]"));
  selectTab(id);
}
function closeTab(id) {
  const tab = tabs.querySelector(`[data-tab-id="${id}"]`);
  tabFrames.get(id)?.remove(); tabFrames.delete(id); tab?.remove();
  const next = tabs.querySelector(".browser-tab");
  if (!next) { createTab(); return; }
  if (activeTab === id) selectTab(next.dataset.tabId);
}
async function browse(event) {
  event.preventDefault();
  const target = normalizeUrl(address.value);
  goButton.disabled = true; status.textContent = "Starting Ultraviolet…";
  try {
    await registerUltraviolet();
    const frame = document.createElement("iframe");
    frame.className = "scramjet-frame"; frame.title = "Ultraviolet proxy view";
    frame.addEventListener("load", () => { status.textContent = "Connected through Ultraviolet"; goButton.disabled = false; }, { once: true });
    frame.addEventListener("error", () => { status.textContent = "UV could not load this address."; goButton.disabled = false; }, { once: true });
    frame.src = `${self.__uv$config.prefix}${self.__uv$config.encodeUrl(target)}`;
    tabFrames.get(activeTab)?.remove(); tabFrames.set(activeTab, frame); frameHost.replaceChildren(frame);
    const tab = tabs.querySelector(`[data-tab-id="${activeTab}"]`); tab.dataset.url = target; tab.querySelector(".tab-label").textContent = new URL(target).hostname;
    address.value = target; status.textContent = "Loading through Ultraviolet…";
  } catch (error) { status.textContent = error instanceof Error ? error.message : "Unable to start Ultraviolet."; }
  finally { goButton.disabled = false; }
}
form.addEventListener("submit", browse);
tabs.addEventListener("click", event => { const tab = event.target.closest(".browser-tab"); if (!tab) return; if (event.target.closest(".tab-close")) closeTab(tab.dataset.tabId); else selectTab(tab.dataset.tabId); });
document.querySelector("[data-new-tab]").addEventListener("click", createTab);
menuToggle.addEventListener("click", () => { menu.hidden = !menu.hidden; });
menu.addEventListener("click", event => {
  const action = event.target.closest("[data-menu-action]")?.dataset.menuAction; if (!action) return;
  menu.hidden = true;
  if (action === "clear") { tabs.querySelectorAll(".browser-tab").forEach(tab => closeTab(tab.dataset.tabId)); }
  if (action === "fullscreen") { document.querySelector(".scramjet-panel")?.requestFullscreen?.(); }
  if (action === "new-window") { window.open(activeFrame()?.src || "about:blank", "_blank", "noopener,noreferrer"); }
  if (action === "desktop") { const blob = new Blob([`XYZ-YA! OS shortcut\n${location.href}`], { type: "text/plain" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "xyz-ya-os.url.txt"; link.click(); URL.revokeObjectURL(link.href); }
});
backButton.addEventListener("click", () => { try { activeFrame()?.contentWindow.history.back(); } catch { status.textContent = "Back is unavailable."; } });
forwardButton.addEventListener("click", () => { try { activeFrame()?.contentWindow.history.forward(); } catch { status.textContent = "Forward is unavailable."; } });
reloadButton.addEventListener("click", () => activeFrame()?.contentWindow.location.reload());
status.textContent = "Ready — enter a URL to browse";
