import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../config/db";

/** Banner interface */
export interface Banner extends RowDataPacket {
  id: number;
  altText?: string | null;
  link?: string | null;
  imageUrl?: string | null;
  display_type: string;
  is_active: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Upload Banner Image */
export const uploadBannerImage = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "فایلی آپلود نشد" });
  }

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/bannerImages/${
    req.file.filename
  }`;
  return res.status(200).json({ imageUrl, filename: req.file.filename });
};

/** Create Banner */
export const createBanner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { altText, link, display_type, is_active } = req.body;

    if (!req.file)
      return res.status(400).json({ error: "تصویر بنر الزامی است" });
    if (!display_type)
      return res.status(400).json({ error: "نوع نمایش بنر الزامی است" });

    const imageUrl = `${req.protocol}://${req.get(
      "host"
    )}/uploads/bannerImages/${req.file.filename}`;
    const active = is_active === "false" || is_active === "0" ? 0 : 1;

    await db.execute<ResultSetHeader>(
      "INSERT INTO banners (altText, link, imageUrl, display_type, is_active) VALUES (?, ?, ?, ?, ?)",
      [altText || null, link || null, imageUrl, display_type, active]
    );

    res.status(201).json({ message: "بنر با موفقیت ایجاد شد" });
  } catch (error) {
    next(error);
  }
};

/** Get All Banners */
export const getBanners = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [banners] = await db.execute<Banner[]>(
      "SELECT * FROM banners ORDER BY id DESC"
    );
    res.status(200).json(banners);
  } catch (error) {
    next(error);
  }
};

/** Get Single Banner */
export const getBanner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute<Banner[]>(
      "SELECT * FROM banners WHERE id = ?",
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "بنر پیدا نشد" });
    res.status(200).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const getBannersByType = async (
  req: Request,
  res: Response, 
  next: NextFunction
) => {
  try {
    const { display_type } = req.params;

    const [rows] = await db.execute<Banner[]>(
      "SELECT * FROM banners WHERE display_type = ? AND is_active = 1 ",
      [display_type]
    );

    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

/** Update Banner */
export const updateBanner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { altText, link, display_type, is_active } = req.body;

    const [rows] = await db.execute<Banner[]>(
      "SELECT * FROM banners WHERE id = ?",
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "بنر یافت نشد" });

    const current = rows[0];
    let newImageUrl = current.imageUrl;

    if (req.file) {
      newImageUrl = `${req.protocol}://${req.get(
        "host"
      )}/uploads/bannerImages/${req.file.filename}`;

      // حذف تصویر قدیمی
      if (current.imageUrl) {
        const oldImagePath = path.join(
          __dirname,
          "..",
          "public",
          current.imageUrl
            .replace(`${req.protocol}://${req.get("host")}`, "")
            .replace(/^\/+/, "")
        );
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }
    }

    const active = is_active === "false" || is_active === "0" ? 0 : 1;

    await db.execute<ResultSetHeader>(
      `UPDATE banners 
       SET altText = ?, link = ?, imageUrl = ?, display_type = ?, is_active = ?, updatedAt = NOW()
       WHERE id = ?`,
      [
        altText ?? current.altText,
        link ?? current.link,
        newImageUrl,
        display_type ?? current.display_type,
        active,
        id,
      ]
    );

    res.status(200).json({ message: "بنر با موفقیت بروزرسانی شد" });
  } catch (error) {
    next(error);
  }
};

/** Delete Banner */
export const deleteBanner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute<Banner[]>(
      "SELECT * FROM banners WHERE id = ?",
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "بنر پیدا نشد" });

    const current = rows[0];

    if (current.imageUrl) {
      const filePath = path.join(
        __dirname,
        "..",
        "public",
        current.imageUrl
          .replace(`${req.protocol}://${req.get("host")}`, "")
          .replace(/^\/+/, "")
      );
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.execute<ResultSetHeader>("DELETE FROM banners WHERE id = ?", [id]);
    res.status(200).json({ message: "بنر با موفقیت حذف شد" });
  } catch (error) {
    next(error);
  }
};
