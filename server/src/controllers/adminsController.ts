import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import bcrypt from "bcrypt";
// =================  get me =================
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "توکن لازم است" });

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, fullName, mobile, role, is_active, created_at, updated_at
   FROM admins
   WHERE id = ?`,
      [userId],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "کاربر یافت نشد" });

    res.json(rows[0]);
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ error: "خطا در دریافت اطلاعات" });
  }
};

// ================= get all =================
export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id, fullName, mobile, role, is_active, created_at, updated_at FROM admins",
    );
    res.json({ admins: rows });
  } catch (err) {
    console.error("getAllAdmins error:", err);
    res.status(500).json({ error: "خطا در دریافت ادمین‌ها" });
  }
};

// ================= get one =================
export const getAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id, fullName, mobile, role, is_active, created_at, updated_at FROM admins WHERE id = ?",
      [id],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "ادمین یافت نشد" });

    res.json({ admin: rows[0] });
  } catch (err) {
    console.error("getAdmin error:", err);
    res.status(500).json({ error: "خطا در دریافت ادمین" });
  }
};

// ================= create =================
export const createAdmin = async (req: Request, res: Response) => {
  const { fullName, mobile, password, role, is_active } = req.body;
  // console.log(fullName, mobile, password, role, is_active )
  if (!mobile || !password) {
    return res.status(400).json({ error: "موبایل و رمز عبور الزامی است" });
  }
  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO admins (fullName, mobile, password, role, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        fullName ?? null,
        mobile,
        hashedPassword,
        role ?? "editor",
        is_active ?? 1,
      ],
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id, fullName, mobile, role, is_active, created_at, updated_at FROM admins WHERE id = ?",
      [result.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createAdmin error:", err);
    res.status(500).json({ error: "خطا در ایجاد ادمین" });
  }
};

// ================= update =================

export const updateAdmin = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { fullName, mobile, password, role, is_active } = req.body;

  try {
    // بررسی وجود کاربر
    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM admins WHERE id = ?",
      [id],
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "ادمین یافت نشد" });
    }

    // ساخت داینامیک کوئری
    let query = `
      UPDATE admins
      SET fullName = ?, mobile = ?, role = ?, is_active = ?
    `;

    const params: (string | number | boolean)[] = [
      fullName ?? null,
      mobile ?? null,
      role ?? "editor",
      is_active ?? 1,
    ];

    // اگر پسورد ارسال شده باشد → هش شود
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 12);
      query += `, password = ?`;
      params.push(hashedPassword);
    }

    query += ` WHERE id = ?`;
    params.push(Number(id));

    await pool.execute(query, params);

    // دریافت نسخه نهایی بدون پسورد
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, fullName, mobile, role, is_active, created_at, updated_at
       FROM admins
       WHERE id = ?`,
      [id],
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("updateAdmin error:", err);
    res.status(500).json({ error: "خطا در بروزرسانی ادمین" });
  }
};
// ================= delete =================
export const deleteAdmin = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await pool.execute("DELETE FROM admins WHERE id=?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteAdmin error:", err);
    res.status(500).json({ error: "خطا در حذف ادمین" });
  }
};
