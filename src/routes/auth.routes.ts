import { Router } from "express";
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logout,
  getProfile,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.get("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshAccessToken);

// Protected routes
router.post("/logout", authenticate, logout);
router.get("/profile", authenticate, getProfile);

export default router;
