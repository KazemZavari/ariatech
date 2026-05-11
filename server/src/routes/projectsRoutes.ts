import { Router, Request, Response, NextFunction } from "express";
import * as controller from "../controllers/projectsController";
import createUploader from "../middlewares/upload";
import multer from "multer";

const router = Router();

/* ==========================================
   Multer Setup (Projects)
========================================== */
 
const upload = createUploader("projects");

// چون فقط یک فایل داریم → thumbnail
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ])(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "حجم فایل بیش از حد مجاز است",
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

/* ==========================================
   Routes
========================================== */

// Create
router.post("/", handleUpload, controller.createProject);

// Read
router.get("/", controller.getProjects);
router.get("/active", controller.getActiveProjects);

// 🔴 حتماً قبل از :id باشد
router.get("/slug/:slug", controller.getProjectBySlug);

router.get("/:id", controller.getProject);

// Update
router.put("/:id", handleUpload, controller.updateProject);

// Delete
router.delete("/:id", controller.deleteProject);

export default router;
