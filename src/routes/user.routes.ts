import { Router } from "express";
import { authenticate } from "../middleware/auth";
import multer from "multer";
import {
  subscribePackage,
  unsubscribePackage,
  getSubscriptionHistory,
  getSubscriptionStatus,
  createFolder,
  createSubFolder,
  getFolders,
  deleteFolder,
  renameFolder,
  moveFolder,
  uploadFile,
  getFilesByFolder,
  renameFile,
  moveFile,
  deleteFile,
} from "../controllers/user.contoller";

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, "uploads/");
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage });

const router = Router();

// ── Subscription 
router.post("/subscribe", authenticate, subscribePackage);
router.post("/unsubscribe", authenticate, unsubscribePackage);
router.get("/subscription-history", authenticate, getSubscriptionHistory);
router.get("/subscription-status", authenticate, getSubscriptionStatus);

// ── Folders ─────
router.post("/folders", authenticate, createFolder);
router.post("/folders/sub", authenticate, createSubFolder);
router.get("/folders", authenticate, getFolders);
router.delete("/folders/:id", authenticate, deleteFolder);
router.patch("/folders/:id/rename", authenticate, renameFolder);
router.patch("/folders/:id/move", authenticate, moveFolder);

// ── Files ───────
router.post("/files/upload", authenticate, upload.single("file"), uploadFile);
router.get("/files/folder/:folderId", authenticate, getFilesByFolder);
router.patch("/files/:id/rename", authenticate, renameFile);
router.patch("/files/:id/move", authenticate, moveFile);
router.delete("/files/:id", authenticate, deleteFile);

export default router;
