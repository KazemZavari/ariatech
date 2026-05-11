import { Router, Request, Response, NextFunction } from "express";
import * as controller from "../controllers/eventsController";
import createUploader from "../middlewares/upload";
import multer from "multer";

const router = Router();
const upload = createUploader("events");


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
// router.post("/", handleUpload(), controller.createEvent);
router.post("/", handleUpload(), controller.createEvent);

/* -------- Read -------- */
router.get("/", controller.getEvents);
router.get("/with-blocks", controller.getEventsWhitBlocks);
router.get("/published", controller.getPublishedEventsForSite);
// 🔴 MUST be before :id
router.get("/slug/:slug", controller.getEventBySlug);

router.get("/:id", controller.getEvent);

/* -------- Update -------- */
router.put("/:id", handleUpload(), controller.updateEvent);

/* -------- Delete -------- */
router.delete("/:id", controller.deleteEvent);

export default router;
