import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { ResultSetHeader, RowDataPacket } from "mysql2";

import db from "../config/db";

/** ActivityDomain interface */ 
export interface ActivityDomain extends RowDataPacket {
  id: number;
  title: string;
  slug: string;
  short_description?: string | null;
  full_description?: string | null;
  cover_image?: string | null;
  is_active: number;
  attachment_title?: string | null;
  file_url?: string | null;
  attachment_type?: string | null;
  createdAt?: Date;
  updatedAt?: Date | null;
}

/* ======================
   Helpers
====================== */

const buildFileUrl = (req: Request, filePath: string) =>
  `${req.protocol}://${req.get("host")}/${filePath.replace(/\\/g, "/")}`;

const removeFileIfExists = (fileUrl?: string | null) => {
  if (!fileUrl) return;

  const localPath = path.join(
    __dirname,
    "..",
    "public",
    fileUrl.replace(/^https?:\/\/[^/]+\/+/, ""),
  );

  if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
};

/* ======================
   Create
====================== */
export const createActivityDomain = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      title,
      slug,
      short_description,
      full_description,
      is_active,
      attachment_title,
      attachment_type,
    } = req.body;

    if (!title) return res.status(400).json({ error: "عنوان الزامی است" });
    if (!slug) return res.status(400).json({ error: "اسلاگ الزامی است" });

    const active = is_active === "0" || is_active === "false" ? 0 : 1;

    let cover_image: string | null = null;
    let file_url: string | null = null;

    const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    if (files?.cover_image?.[0]) {
      cover_image = buildFileUrl(
        req,
        `uploads/activityDomains/${files.cover_image[0].filename}`,
      );
    }

    if (files?.attachment_file?.[0]) {
      file_url = buildFileUrl(
        req,
        `uploads/activityDomains/${files.attachment_file[0].filename}`,
      );
    }

    await db.execute<ResultSetHeader>(
      `INSERT INTO activity_domains
      (title, slug, short_description, full_description, cover_image,
       is_active, attachment_title, file_url, attachment_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        slug,
        short_description ?? null,
        full_description ?? null,
        cover_image,
        active,
        attachment_title ?? null,
        file_url,
        attachment_type ?? null,
      ],
    );

    res.status(201).json({ message: "حوزه فعالیت با موفقیت ایجاد شد" });
  } catch (error) {
    next(error);
  }
};

/* ======================
   Get All
====================== */
export const getActivityDomains = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [rows] = await db.execute<ActivityDomain[]>(
      "SELECT * FROM activity_domains",
    );
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

/* ======================
   Get Single By Slug (Frontend)
====================== */
export const getActivityDomainBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { slug } = req.params;

    const [rows] = await db.execute<ActivityDomain[]>(
      "SELECT * FROM activity_domains WHERE slug = ? AND is_active = 1 LIMIT 1",
      [slug],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "حوزه فعالیت یافت نشد" });

    res.status(200).json(rows[0]);
  } catch (error) {
    next(error);
  }
};
/* ======================
   Get Active (Frontend)
====================== */
export const getActiveActivityDomains = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [rows] = await db.execute<ActivityDomain[]>(
      "SELECT * FROM activity_domains WHERE is_active = 1 ORDER BY `order` ASC",
    );
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

/* ======================
   Get Single
====================== */
export const getActivityDomain = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute<ActivityDomain[]>(
      "SELECT * FROM activity_domains WHERE id = ?",
      [id],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "حوزه فعالیت یافت نشد" });

    res.status(200).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

/* ======================
   Update
====================== */
export const updateActivityDomain = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const {
      title,
      slug,
      short_description,
      full_description,
      is_active,
      attachment_title,
      attachment_type,
    } = req.body;

    const [rows] = await db.execute<ActivityDomain[]>(
      "SELECT * FROM activity_domains WHERE id = ?",
      [id],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "حوزه فعالیت یافت نشد" });

    const current = rows[0];
    const active = is_active === "0" || is_active === "false" ? 0 : 1;
    let cover_image = current.cover_image;
    let file_url = current.file_url;
    const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    if (files?.cover_image?.[0]) {
      removeFileIfExists(current.cover_image);
      cover_image = buildFileUrl(
        req,
        `uploads/activityDomains/${files.cover_image[0].filename}`,
      );
    }

    if (files?.attachment_file?.[0]) {
      removeFileIfExists(current.file_url);
      file_url = buildFileUrl(
        req,
        `uploads/activityDomains/${files.attachment_file[0].filename}`,
      );
    }

    await db.execute<ResultSetHeader>(
      `UPDATE activity_domains SET
        title = ?,
        slug = ?,
        short_description = ?,
        full_description = ?,
        cover_image = ?,
        file_url = ?,
        attachment_title = ?,
        attachment_type = ?,
        is_active = ?,
        updatedAt = NOW()
      WHERE id = ?`,
      [
        title ?? current.title,
        slug ?? current.slug,
        short_description ?? current.short_description,
        full_description ?? current.full_description,
        cover_image,
        file_url,
        attachment_title ?? current.attachment_title,
        attachment_type ?? current.attachment_type,
        active,
        id,
      ],
    );

    res.status(200).json({ message: "حوزه فعالیت با موفقیت بروزرسانی شد" });
  } catch (error) {
    next(error);
  }
};

/* ======================
   Delete
====================== */
export const deleteActivityDomain = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute<ActivityDomain[]>(
      "SELECT * FROM activity_domains WHERE id = ?",
      [id],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "حوزه فعالیت یافت نشد" });

    const current = rows[0];

    removeFileIfExists(current.cover_image);
    removeFileIfExists(current.file_url);

    await db.execute<ResultSetHeader>(
      "DELETE FROM activity_domains WHERE id = ?",
      [id],
    );

    res.status(200).json({ message: "حوزه فعالیت با موفقیت حذف شد" });
  } catch (error) {
    next(error);
  }
};
