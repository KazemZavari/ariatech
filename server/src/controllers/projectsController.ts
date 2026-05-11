import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import db from "../config/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/* ==========================================
   Model Type
========================================== */

export interface Project extends RowDataPacket {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  project_type: string | null;
  thumbnail: string | null;
  video_url: string | null;
  demo_url: string | null;
  github_url: string | null;
  technologies: string[];
  features: string[];
  challenges: string[];
  role: string | null;
  duration: string | null;
  status: "draft" | "published" | "archived";
  is_featured: number;
  created_at: Date;
  updated_at: Date;
}

/* ==========================================
   Helpers
========================================== */

const buildFileUrl = (req: Request, filePath: string) =>
  `${req.protocol}://${req.get("host")}/${filePath.replace(/\\/g, "/")}`;

const removeFileIfExists = (fileUrl: string | null) => {
  if (!fileUrl) return;
  const localPath = path.join(
    __dirname,
    "..",
    "public",
    fileUrl.replace(/^https?:\/\/[^/]+\/+/, ""),
  );
  if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
};

const generateSlug = (text: string): string => {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // حذف کاراکترهای خاص
    .replace(/\s+/g, "-") // فاصله → dash
    .replace(/-+/g, "-"); // حذف dash اضافی
};

const ensureUniqueSlug = async (slug: string, id?: number): Promise<string> => {
  let newSlug = slug;
  let counter = 1;

  while (true) {
    const [rows] = await db.execute<RowDataPacket[]>(
      id
        ? "SELECT id FROM projects WHERE slug = ? AND id != ?"
        : "SELECT id FROM projects WHERE slug = ?",
      id ? [newSlug, id] : [newSlug],
    );

    if (rows.length === 0) break;

    newSlug = `${slug}-${counter}`;
    counter++;
  }

  return newSlug;
};

/* ==========================================
   CREATE PROJECT
========================================== */
export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body;

    const required = ["title", "slug"];
    for (const f of required) {
      if (!body[f]) return res.status(400).json({ error: `${f} الزامی است` });
    }

    // فایل thumbnail اگر موجود بود
    let thumbnail: string | null = null;
    const file = req.file as Express.Multer.File | undefined;

    if (file) {
      thumbnail = buildFileUrl(req, `uploads/projects/${file.filename}`);
    }

    // آرایه‌ها را از JSON به آرایه تبدیل می‌کنیم
    const parseArray = (val: any) => (val ? JSON.parse(val) : []);

    const technologies = parseArray(body.technologies);
    const features = parseArray(body.features);
    const challenges = parseArray(body.challenges);

    const baseSlug = body.slug || generateSlug(body.title);
    const slug = await ensureUniqueSlug(baseSlug);

    await db.execute<ResultSetHeader>(
      `
      INSERT INTO projects 
      (title, slug, short_description, description, project_type, thumbnail,
       video_url, demo_url, github_url,
       technologies, features, challenges,
       role, duration, status, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        body.title,
        slug,
        body.short_description ?? null,
        body.description ?? null,
        body.project_type ?? null,
        thumbnail,
        body.video_url ?? null,
        body.demo_url ?? null,
        body.github_url ?? null,
        JSON.stringify(technologies),
        JSON.stringify(features),
        JSON.stringify(challenges),
        body.role ?? null,
        body.duration ?? null,
        body.status ?? "draft",
        body.is_featured === "true" || body.is_featured === "1" ? 1 : 0,
      ],
    );

    res.status(201).json({ message: "پروژه با موفقیت ایجاد شد" });
  } catch (err) {
    next(err);
  }
};

/* ==========================================
   GET ALL PROJECTS
========================================== */
export const getProjects = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [rows] = await db.execute<Project[]>(
      "SELECT * FROM projects ORDER BY created_at DESC",
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/* ==========================================
   GET ACTIVE PROJECTS
========================================== */
export const getActiveProjects = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [rows] = await db.execute<Project[]>(
      "SELECT * FROM projects WHERE status = 'published' ORDER BY is_featured DESC, created_at DESC",
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/* ==========================================
   GET PROJECT BY ID
========================================== */
export const getProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [rows] = await db.execute<Project[]>(
      "SELECT * FROM projects WHERE id = ?",
      [req.params.id],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "پروژه یافت نشد" });

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ==========================================
   GET PROJECT BY SLUG
========================================== */
export const getProjectBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [rows] = await db.execute<Project[]>(
      "SELECT * FROM projects WHERE slug = ? LIMIT 1",
      [req.params.slug],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "پروژه یافت نشد" });

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ==========================================
   UPDATE PROJECT
========================================== */
export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);

    const [rows] = await db.execute<Project[]>(
      "SELECT * FROM projects WHERE id = ?",
      [id],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "پروژه یافت نشد" });

    const current = rows[0];
    const body = req.body;

    // اگر thumbnail جدید آپلود شده
    let thumbnail = current.thumbnail;
    const file = req.file as Express.Multer.File | undefined;

    if (file) {
      removeFileIfExists(current.thumbnail);
      thumbnail = buildFileUrl(req, `uploads/projects/${file.filename}`);
    }

    const parseArray = (val: any, fallback: any) => {
      if (!val) return fallback;

      if (Array.isArray(val)) return val;

      try {
        return JSON.parse(val);
      } catch {
        return fallback;
      }
    };

    let slug = current.slug;

    if (body.slug || body.title) {
      const baseSlug = body.slug || generateSlug(body.title);
      slug = await ensureUniqueSlug(baseSlug, current.id);
    }

    await db.execute<ResultSetHeader>(
      `
      UPDATE projects SET
        title = ?, slug = ?, short_description = ?, description = ?, project_type = ?,
        thumbnail = ?, video_url = ?, demo_url = ?, github_url = ?,
        technologies = ?, features = ?, challenges = ?,
        role = ?, duration = ?, status = ?, is_featured = ?, updated_at = NOW()
      WHERE id = ?
      `,
      [
        body.title ?? current.title,
        slug,
        body.short_description ?? current.short_description,
        body.description ?? current.description,
        body.project_type ?? current.project_type,
        thumbnail,
        body.video_url ?? current.video_url,
        body.demo_url ?? current.demo_url,
        body.github_url ?? current.github_url,
        JSON.stringify(parseArray(body.technologies, current.technologies)),
        JSON.stringify(parseArray(body.features, current.features)),
        JSON.stringify(parseArray(body.challenges, current.challenges)),
        body.role ?? current.role,
        body.duration ?? current.duration,
        body.status ?? current.status,
        body.is_featured === undefined
          ? current.is_featured
          : body.is_featured === "true" || body.is_featured === "1"
            ? 1
            : 0,
        id,
      ],
    );

    res.json({ message: "پروژه با موفقیت بروزرسانی شد" });
  } catch (err) {
    next(err);
  }
};

/* ==========================================
   DELETE PROJECT
========================================== */
export const deleteProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [rows] = await db.execute<Project[]>(
      "SELECT * FROM projects WHERE id = ?",
      [req.params.id],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "پروژه یافت نشد" });

    const current = rows[0];

    removeFileIfExists(current.thumbnail);

    await db.execute("DELETE FROM projects WHERE id = ?", [req.params.id]);

    res.json({ message: "پروژه با موفقیت حذف شد" });
  } catch (err) {
    next(err);
  }
};
