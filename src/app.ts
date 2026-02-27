import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import routes from "./routes";

const app = express();

// Middleware
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Server is running" });
});

// API Routes
app.use("/api", routes);

// Error handling
app.use(errorHandler);

export default app;
