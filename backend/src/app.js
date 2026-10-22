import express from "express";
import cors from "cors";
import { PORT } from "./config/env.js";
import emergencyRoutes from "./routes/emergency.routes.js";
import ragRoutes from "./routes/rag.routes.js";
import healthRoutes from "./routes/health.routes.js";
import mapRoutes, { tilesRouter } from "./routes/map.routes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Route mounting
app.use("/api/health", healthRoutes);
app.use("/api/emergencies", emergencyRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/tiles", tilesRouter);

// Root API info endpoint
app.get("/api", (_req, res) => {
  res.json({
    ok: true,
    name: "Kiwix Emergency API Gateway",
    version: "1.0.0",
    routes: [
      "/api/health",
      "/api/emergencies",
      "/api/rag/ask",
      "/api/map/status",
      "/api/map/facilities",
      "/api/map/route",
      "/api/tiles/:z/:x/:y.png",
    ],
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    error: "Not Found",
    message: "Endpoint does not exist on this API gateway.",
  });
});

// Central error handler
app.use((err, _req, res, _next) => {
  console.error("[Express Error]", err);
  res.status(500).json({
    ok: false,
    error: "Internal Server Error",
    message: err.message || "An unexpected error occurred in Express API.",
  });
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Express] Kiwix Emergency API listening on port ${PORT}`);
});

export default app;
export { server };
