import { Router } from "express";
import { authenticate, authorizeAdmin } from "../middleware/auth";
import { getPublicPackages, createPackage, getPackages, getPackageById, updatePackage, deletePackage } from "../controllers/admin.controller";

const router = Router();

router.get("/packages/public", getPublicPackages);

// Admin-only endpoints
router.post("/packages", authenticate, authorizeAdmin, createPackage);
router.get("/packages", authenticate, authorizeAdmin, getPackages);
router.get("/packages/:id", authenticate, authorizeAdmin, getPackageById);
router.put("/packages/:id", authenticate, authorizeAdmin, updatePackage);
router.delete("/packages/:id", authenticate, authorizeAdmin, deletePackage);

export default router;