import { Request, Response, NextFunction } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import path from "path";
import fs from "fs";

import db from "../config/db";

interface SocialSetting extends RowDataPacket {
  id: number;
  title: string;
  link: string | null;
  icon_url: string | null;
  type: string;
  is_active: number;
  created_at?: Date;
  updated_at?: Date;
}

export const uploadIcon = (req: Request, res: Response): Response => {
  if (!req.file) {
    return res.status(400).json({ error: "فایلی آپلود نشد" });
  }

  const iconUrl = `${req.protocol}://${req.get("host")}/uploads/socialIcons/${
    req.file.filename
  }`;

  return res.status(200).json({
    iconUrl,
    filename: req.file.filename,
  });
};

export const createSocialSetting = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { title, link, type, is_active } = req.body;

    if (!title || !type) {
      res.status(400).json({ error: "عنوان و نوع تنظیم الزامی هستند" });
      return;
    }

    let iconUrl: string | null = null;
    if (req.file) {
      iconUrl = `${req.protocol}://${req.get("host")}/uploads/socialIcons/${
        req.file.filename
      }`;
    }

    const active: number = is_active === "false" || is_active === "0" ? 0 : 1;

    await db.execute<ResultSetHeader>(
      `INSERT INTO social_settings 
       (title, link, icon_url, type, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [title, link || null, iconUrl, type, active],
    );

    res.status(201).json({ message: "تنظیم با موفقیت ایجاد شد" });
  } catch (error) {
    next(error);
  }
};

export const getSocialSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [settings] = await db.execute<SocialSetting[]>(
      "SELECT * FROM social_settings ORDER BY id DESC",
    );

    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};

export const getSocialSetting = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute<SocialSetting[]>(
      "SELECT * FROM social_settings WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "تنظیم پیدا نشد" });
      return;
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const getSocialSettingsByType = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { type } = req.query; // type="social" یا "trust"

    if (
      !type ||
      (type !== "social" &&
        type !== "trust" &&
        type !== "logo" &&
        type !== "favicon")
    ) {
      res.status(400).json({ error: "نوع معتبر وارد کنید " });
      return;
    }

    const [settings] = await db.execute<SocialSetting[]>(
      "SELECT * FROM social_settings WHERE type = ? AND is_active = 1 ORDER BY id DESC",
      [type],
    );

    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSocialSetting = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, link, type, is_active } = req.body;

    const [rows] = await db.execute<SocialSetting[]>(
      "SELECT * FROM social_settings WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "تنظیم یافت نشد" });
      return;
    }

    const current = rows[0];
    let newIconUrl: string | null = current.icon_url;

    if (req.file) {
      newIconUrl = `${req.protocol}://${req.get("host")}/uploads/socialIcons/${
        req.file.filename
      }`;

      if (current.icon_url) {
        const oldIconPath = path.join(
          __dirname,
          "..",
          "public",
          current.icon_url
            .replace(`${req.protocol}://${req.get("host")}`, "")
            .replace(/^\/+/, ""),
        );

        if (fs.existsSync(oldIconPath)) {
          fs.unlinkSync(oldIconPath);
        }
      }
    }

    const active: number =
      is_active === "false" || is_active === "0"
        ? 0
        : is_active === undefined
          ? current.is_active
          : 1;

    await db.execute<ResultSetHeader>(
      `UPDATE social_settings
       SET title = ?, link = ?, icon_url = ?, type = ?, is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        title ?? current.title,
        link ?? current.link,
        newIconUrl,
        type ?? current.type,
        active,
        id,
      ],
    );

    res.status(200).json({ message: "تنظیم با موفقیت بروزرسانی شد" });
  } catch (error) {
    next(error);
  }
};

export const deleteSocialSetting = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute<SocialSetting[]>(
      "SELECT * FROM social_settings WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "تنظیم پیدا نشد" });
      return;
    }

    const current = rows[0];

    if (current.icon_url) {
      const filePath = path.join(
        __dirname,
        "..",
        "public",
        current.icon_url
          .replace(`${req.protocol}://${req.get("host")}`, "")
          .replace(/^\/+/, ""),
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await db.execute<ResultSetHeader>(
      "DELETE FROM social_settings WHERE id = ?",
      [id],
    );

    res.status(200).json({ message: "تنظیم با موفقیت حذف شد" });
  } catch (error) {
    next(error);
  }
};
