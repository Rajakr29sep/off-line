import express from "express";
import cors from "cors";
import emergencyRoutes from "./routes/emergency.routes.js";
import ragRoutes from "./routes/rag.routes.js";
import healthRoutes from "./routes/health.routes.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/api/health", healthRoutes);
app.use("/api/emergencies", emergencyRoutes);
app.use("/api/rag", ragRoutes);

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log(`Express API listening on ${port}`));
