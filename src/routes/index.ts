import { Router } from "express";
import authRoutes from "./auth.routes";
import adminRoutes from "./admin.routes";
import { getPublicPackages } from "../controllers/admin.controller";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
// mount user routes (requires login for all endpoints)
import userRoutes from "./user.routes";
router.use("/user", userRoutes);

// Public routes (no authentication required)
router.get("/packages", getPublicPackages);

export default router;
