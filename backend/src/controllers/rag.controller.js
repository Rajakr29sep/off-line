// The request validation and forwarding logic is implemented in routes/rag.routes.js.
// Keep this controller module for later logging, rate limits and audit metadata.
export function controllerStatus(_req, res) {
  res.json({ ok: true });
}
