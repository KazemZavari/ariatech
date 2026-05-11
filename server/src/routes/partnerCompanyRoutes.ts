import { Router, Request, Response, NextFunction } from "express";
import * as partnerController from "../controllers/partnerCompanyController";
import createUploader from "../middlewares/upload";
import multer from "multer";

const router = Router();
const upload = createUploader("partnerLogos"); // مسیر آپلود لوگو

// Wrapper برای هندل MulterError
const handleUpload = (singleFile: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(singleFile)(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        // خطاهای Multer
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "حجم فایل بیش از حد مجاز است (حداکثر 10MB)",
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
  handleUpload("logo"),
  partnerController.uploadPartnerLogo,
);

router.post("/", handleUpload("logo"), partnerController.createPartnerCompany);
router.get("/", partnerController.getPartnerCompanies);
router.get("/:id", partnerController.getPartnerCompany);
router.put(
  "/:id",
  handleUpload("logo"),
  partnerController.updatePartnerCompany,
);
router.delete("/:id", partnerController.deletePartnerCompany);

export default router;
