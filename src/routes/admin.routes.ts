import { Router } from "express";
import { authenticate, authorizeAdmin } from "../middleware/auth";
import { createPackage, getPackages, updatePackage, deletePackage } from "../controllers/admin.controller";

const router = Router();

router.post("/create-package", authenticate, authorizeAdmin, createPackage);
router.get("/packages", authenticate, getPackages);

// admin CRUD for packages
router.put("/packages/:id", authenticate, authorizeAdmin, updatePackage);
router.delete("/packages/:id", authenticate, authorizeAdmin, deletePackage);

export default router;