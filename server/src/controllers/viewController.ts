import { Request, Response } from "express";
import pool from "../config/db";

// کل بازدید
export const getTotalViews = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM site_views`);
    res.json({ total: (rows as any)[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطا در دریافت آمار" });
  }
};

// بازدید امروز
export const getTodayViews = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM site_views WHERE DATE(created_at) = CURDATE()`
    );
    res.json({ total: (rows as any)[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطا در دریافت آمار امروز" });
  }
};

// بازدید روزانه 30 روز اخیر (گزارش)
export const getDailyViews = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS total
       FROM site_views
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 30`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطا در دریافت گزارش روزانه" });
  }
};