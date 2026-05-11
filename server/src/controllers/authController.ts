// import { Request, Response } from "express";
// import pool from "../config/db";
// import jwt from "jsonwebtoken";

// // ورود ادمین با پسورد ساده (بدون هش)
// export const adminLogin = async (req: Request, res: Response) => {
//   const { fullName, password } = req.body;

//   if (!fullName || !password)
//     return res.status(400).json({ error: "نام کاربری و رمز عبور لازم است" });

//   const [adminRows] = await pool.query(
//     `SELECT * FROM admins WHERE (fullName=? OR mobile=?) AND password=?`,
//     [fullName, fullName, password]
//   );

//   if ((adminRows as any[]).length === 0)
//     return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است" });

//   const admin = (adminRows as any)[0];

//   // ساخت JWT
//   const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET || "secret", {
//     expiresIn: "7d",
//   });

//   res.cookie("token", token, {
//     httpOnly: true,
//     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 روز
//   });

//   res.json({
//     success: true,
//     user: { id: admin.id, mobile: admin.mobile, fullName: admin.fullName },
//   });
// };

// // خروج
// export const logout = (req: Request, res: Response) => {
//   res.clearCookie("token");
//   res.json({ success: true });
// };

import { Request, Response } from "express";
import pool from "../config/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { RowDataPacket } from "mysql2";

export const adminLogin = async (req: Request, res: Response) => {
  const { fullName, password } = req.body;

  if (!fullName || !password) {
    return res.status(400).json({ error: "نام کاربری و رمز عبور لازم است" });
  }

  try {
    // فقط فیلدهای لازم را بگیر
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, fullName, mobile, password, role, is_active
       FROM admins
       WHERE fullName = ? OR mobile = ?`,
      [fullName, fullName],
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ error: "نام کاربری یا رمز عبور اشتباه است" });
    }

    const admin = rows[0];

    // اگر اکانت غیرفعال است
    if (!admin.is_active) {
      return res.status(403).json({ error: "حساب کاربری غیرفعال است" });
    }

    // مقایسه bcrypt
    const isValid = await bcrypt.compare(password, admin.password);

    if (!isValid) {
      return res
        .status(401)
        .json({ error: "نام کاربری یا رمز عبور اشتباه است" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET تنظیم نشده");
    }

    // اضافه کردن role داخل توکن (مهم برای RBAC)
    const token = jwt.sign({ id: admin.id, role: admin.role }, secret, {
      expiresIn: "1d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: {
        id: admin.id,
        fullName: admin.fullName,
        mobile: admin.mobile,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("adminLogin error:", err);
    res.status(500).json({ error: "خطا در ورود" });
  }
};

// logout امن
export const logout = (req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.json({ success: true });
};
