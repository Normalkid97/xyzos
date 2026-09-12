import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import { createBareServer } from "@tomphttp/bare-server-node";

const root = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);

const bare = createBareServer("/search/service/", { logErrors: true });

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});
app.use("/search/uv/sw.js", (_req, res, next) => {
  res.setHeader("Service-Worker-Allowed", "/search/");
  next();
});
app.use(express.static(root));

const server = createServer((req, res) => {
  if (bare.shouldRoute(req)) {
    void bare.routeRequest(req, res);
    return;
  }
  app(req, res);
});
server.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/search/service/")) bare.upgrade(req, socket, head);
  else socket.end();
});
server.listen(port, "0.0.0.0", () => {
  console.log(`Ultraviolet proxy app listening on http://localhost:${port}`);
});
