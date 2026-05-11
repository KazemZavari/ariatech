import { Router, Request, Response, NextFunction } from "express";
import * as controller from "../controllers/articlesController";
import createUploader from "../middlewares/upload";
import multer from "multer";

const router = Router();
const upload = createUploader("articles");


const handleUpload = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.fields([
      { name: "cover_image", maxCount: 1 },
      { name: "file", maxCount: 50 },
      { name: "attachment_file", maxCount: 50 }, // اگر استفاده میشه
    ])(req, res, (err: any) => {
      if (err instanceof multer.MulterError)
        return res.status(400).json({ message: err.message });
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  };
};
/* =========================
   Routes
========================= */

/* -------- Create -------- */
// router.post("/", handleUpload(), controller.createArticle);
router.post("/", handleUpload(), controller.createArticle);

/* -------- Read -------- */
router.get("/", controller.getArticles);
router.get("/with-blocks", controller.getArticlesWhitBlocks);
router.get("/published", controller.getPublishedArticlesForSite);
// 🔴 MUST be before :id
router.get("/slug/:slug", controller.getArticleBySlug);

router.get("/:id", controller.getArticle);

/* -------- Update -------- */
router.put("/:id", handleUpload(), controller.updateArticle);

/* -------- Delete -------- */
router.delete("/:id", controller.deleteArticle);

export default router;
