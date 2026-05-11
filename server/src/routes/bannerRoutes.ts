import { Router, Request, Response, NextFunction } from "express";
import * as bannerController from "../controllers/bannerController";
import createUploader from "../middlewares/upload";
import multer from "multer";

const router = Router();
const upload = createUploader("bannerImages");

// Wrapper برای هندل MulterError
const handleUpload = (singleFile: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(singleFile)(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        // خطاهای Multer
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "حجم فایل بیش از حد مجاز است (حداکثر 50MB)",
          });
        }
        return res.status(400).json({ success: false, message: err.message });
      }
      if (err) {
        // خطای دیگر فایل
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  };
};

// مسیرها
router.post(
  "/upload",
  handleUpload("file"),
  bannerController.uploadBannerImage
);

router.post("/", handleUpload("file"), bannerController.createBanner);
router.get("/", bannerController.getBanners);
router.get("/type/:display_type", bannerController.getBannersByType);
router.get("/:id", bannerController.getBanner);
router.put("/:id", handleUpload("file"), bannerController.updateBanner);
router.delete("/:id", bannerController.deleteBanner);

export default router;
