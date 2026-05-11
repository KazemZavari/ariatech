import { Request, Response, NextFunction } from "express";
import db from "../config/db"; // pool mysql2/promise

export const viewMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";

    // جلوگیری از ثبت تکراری در همان روز
    const [rows] = await db.execute(
      `SELECT id FROM site_views
       WHERE ip = ? AND DATE(created_at) = CURDATE()
       LIMIT 1`,
      [ip]
    );

    if ((rows as any[]).length === 0) {
      await db.execute(
        `INSERT INTO site_views (ip, user_agent)
         VALUES (?, ?)`,
        [ip, req.headers["user-agent"]]
      );
    }
  } catch (err) {
    // لاگ می‌گیریم ولی سایت نباید بخوابد
    console.error("View middleware error:", err);
  }

  next();
};