import { Router } from "express";
import { adminLogin, logout } from "../controllers/authController";
import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "تعداد تلاش بیش از حد مجاز" },
});

const router = Router();

router.post("/admin-login", loginLimiter, adminLogin);
router.post("/logout", logout);

export default router;
