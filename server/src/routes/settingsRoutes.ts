import { Router } from "express";
import * as settingsController from "../controllers/settingsController";
import createUploader from "../middlewares/upload";

const router = Router();

// multer uploader (icons)
const upload = createUploader("icons");

router.get("/", settingsController.getAllSettings);
router.patch(
  "/",
  upload.fields([
    { name: "instagram", maxCount: 1 },
    { name: "telegram", maxCount: 1 },
    { name: "whatsapp", maxCount: 1 },
    { name: "twitter", maxCount: 1 },
    { name: "youtube", maxCount: 1 },
    { name: "ita", maxCount: 1 },
    { name: "bale", maxCount: 1 },
    { name: "rubika", maxCount: 1 },
    { name: "enamad", maxCount: 1 },
    { name: "samandehi", maxCount: 1 },
    { name: "resume", maxCount: 1 }, // ← فیلد رزومه اضافه شد
  ]),
  settingsController.updateSettings,
);
router.get("/dashboard/stats", settingsController.getDashboardStats);

export default router;
