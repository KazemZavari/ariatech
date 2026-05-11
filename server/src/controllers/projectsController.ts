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
  gallery: string[];
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

// const removeFileIfExists = (fileUrl?: string | null): void => {
//   if (!fileUrl) return;

//   try {
//     const uploadsIndex = fileUrl.indexOf("/uploads/");
//     if (uploadsIndex === -1) return;

//     const relativePath = fileUrl.substring(uploadsIndex); // /uploads/projects/xxx.png
//     // process.cwd() مسیر ریشه پروژه شماست (جایی که پوشه public قرار دارد)
//     const fullPath = path.join(process.cwd(), "public", relativePath);

//     if (fs.existsSync(fullPath)) {
//       fs.unlinkSync(fullPath);
//       console.log("✅ فایل فیزیکی حذف شد:", fullPath);
//     } else {
//       console.log("⚠️ فایل پیدا نشد:", fullPath);
//     }
//   } catch (err) {
//     console.error("❌ خطا در عملیات حذف فایل:", err);
//   }
// };

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

    const files = req.files as {
      thumbnail?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    };

    const required = ["title", "slug"];
    for (const f of required) {
      if (!body[f]) return res.status(400).json({ error: `${f} الزامی است` });
    }

    // فایل thumbnail اگر موجود بود
    let thumbnail: string | null = null;
    if (files?.thumbnail?.[0]) {
      thumbnail = buildFileUrl(
        req,
        `uploads/projects/${files.thumbnail[0].filename}`,
      );
    }
    let gallery: string[] = [];

    if (files?.gallery) {
      gallery = files.gallery.map((file) =>
        buildFileUrl(req, `uploads/projects/${file.filename}`),
      );
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
      (title, slug, short_description, description, project_type, thumbnail, gallery,
       video_url, demo_url, github_url,
       technologies, features, challenges,
       role, duration, status, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        body.title,
        slug,
        body.short_description ?? null,
        body.description ?? null,
        body.project_type ?? null,
        thumbnail,
        JSON.stringify(gallery),
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
    const files = req.files as {
      thumbnail?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    };

    if (rows.length === 0)
      return res.status(404).json({ error: "پروژه یافت نشد" });

    const current = rows[0];
    const body = req.body;

    // اگر thumbnail جدید آپلود شده
    let thumbnail = current.thumbnail;
    const file = files?.thumbnail?.[0];

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

    let gallery: string[] = [];
    if (current.gallery) {
      // اگر درایور دیتابیس خودش پارس کرده باشد آرایه است، وگرنه باید پارس شود
      gallery = Array.isArray(current.gallery)
        ? current.gallery
        : JSON.parse(current.gallery as any);
    }

    if (body.gallery_urls) {
      try {
        // چون از فرانت JSON.stringify شده می‌آید، حتماً نیاز به پارس دارد
        const keepUrls: string[] =
          typeof body.gallery_urls === "string"
            ? JSON.parse(body.gallery_urls)
            : body.gallery_urls;

        // پیدا کردن و حذف فایل‌های حذف شده از سرور
        const removed = gallery.filter((g) => !keepUrls.includes(g));
        console.log("تصاویر برای حذف:", removed); // برای دیباگ در کنسول بک‌اندر ببین
        removed.forEach(removeFileIfExists);

        gallery = keepUrls;
      } catch (err) {
        console.error("خطا در پردازش gallery_urls:", err);
      }
    }
    const newGalleryFiles = files?.gallery || [];

    if (newGalleryFiles.length > 0) {
      const newUrls = newGalleryFiles.map((file) =>
        buildFileUrl(req, `uploads/projects/${file.filename}`),
      );

      gallery = [...gallery, ...newUrls];
    }
    await db.execute<ResultSetHeader>(
      `
      UPDATE projects SET
        title = ?, slug = ?, short_description = ?, description = ?, project_type = ?,
        thumbnail = ?, gallery = ?, video_url = ?, demo_url = ?, github_url = ?,
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
        JSON.stringify(gallery),
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
// export const deleteProject = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//     const [rows] = await db.execute<Project[]>(
//       "SELECT * FROM projects WHERE id = ?",
//       [req.params.id],
//     );

//     if (rows.length === 0)
//       return res.status(404).json({ error: "پروژه یافت نشد" });

//     const current = rows[0];

//     removeFileIfExists(current.thumbnail);
//     if (current.gallery) {
//       try {
//         const gallery: string[] = JSON.parse(current.gallery as any);
//         gallery.forEach(removeFileIfExists);
//       } catch {}
//     }

//     await db.execute("DELETE FROM projects WHERE id = ?", [req.params.id]);

//     res.json({ message: "پروژه با موفقیت حذف شد" });
//   } catch (err) {
//     next(err);
//   }
// };

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

    // 1. حذف تصویر شاخص
    removeFileIfExists(current.thumbnail);

    // 2. حذف تصاویر گالری
    if (current.gallery) {
      try {
        const gallery: string[] = Array.isArray(current.gallery)
          ? current.gallery
          : JSON.parse(current.gallery as any);

        gallery.forEach((url) => removeFileIfExists(url));
      } catch (err) {
        console.error("خطا در پارس گالری هنگام حذف کل پروژه:", err);
      }
    }

    await db.execute("DELETE FROM projects WHERE id = ?", [req.params.id]);
    res.json({ message: "پروژه و تمام تصاویر آن با موفقیت حذف شدند" });
  } catch (err) {
    next(err);
  }
};
