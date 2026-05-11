import { Router } from "express";
import {
  getTotalViews,
  getTodayViews,
  getDailyViews
} from "../controllers/viewController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

// فقط ادمین
router.get("/total", authMiddleware, getTotalViews);
router.get("/today", authMiddleware, getTodayViews);
router.get("/daily", authMiddleware, getDailyViews);

export default router;