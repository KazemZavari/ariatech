import { Router, Request, Response, NextFunction } from "express";
import * as controller from "../controllers/activityDomainController";
import createUploader from "../middlewares/upload";
import multer from "multer";

const router = Router();
const upload = createUploader("activityDomains");

/* =========================
   Multer Wrapper (Fields)
========================= */
const handleUpload = (fields: { name: string; maxCount?: number }[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.fields(fields)(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "حجم فایل بیش از حد مجاز است (حداکثر 50MB)",
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      next();
    });
  };
};

/* =========================
   Upload Fields Config
========================= */
const activityDomainFiles = [
  { name: "cover_image", maxCount: 1 },
  { name: "attachment_file", maxCount: 1 },
];

/* =========================
   Routes
========================= */

// Create
router.post(
  "/",
  handleUpload(activityDomainFiles),
  controller.createActivityDomain,
);

// Read
router.get("/", controller.getActivityDomains);
router.get("/active", controller.getActiveActivityDomains);
// 🔴 Single by slug (MUST be before :id)
router.get("/slug/:slug", controller.getActivityDomainBySlug);
router.get("/:id", controller.getActivityDomain);

// Update
router.put(
  "/:id",
  handleUpload(activityDomainFiles),
  controller.updateActivityDomain,
);

// Delete
router.delete("/:id", controller.deleteActivityDomain);

export default router;
