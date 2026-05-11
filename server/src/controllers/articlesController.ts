import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../config/db";
export interface Article extends RowDataPacket {
  id: number;
  title: string;
  slug: string; 
  excerpt?: string | null;
  status: "draft" | "published";
  cover_image?: string | null;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface ArticleBlock extends RowDataPacket {
  id?: number;
  article_id: number;
  type: string;
  order_index: number;
  content: any;
}
const buildFileUrl = (req: Request, filePath: string) =>
  `${req.protocol}://${req.get("host")}/${filePath.replace(/\\/g, "/")}`;

const removeFileIfExists = (src?: string | null) => {
  if (!src) return;

  // اگر URL بود → تبدیل به path
  if (src.startsWith("http")) {
    src = src.replace(/^https?:\/\/[^/]+\/?/, "");
  }

  const filePath = path.resolve(__dirname, "..", "public", src);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const normalizeSrc = (src: string): string => {
  // اگر URL کامل است → تبدیل به relative path
  if (src.startsWith("http")) {
    return src.replace(/^https?:\/\/[^/]+\/?/, "");
  }

  // اگر absolute path اشتباهی ارسال شد → فقط بخش uploads را نگه دار
  const uploadsIndex = src.indexOf("uploads/");
  if (uploadsIndex !== -1) {
    return src.slice(uploadsIndex);
  }

  return src;
};

export const getArticles = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [rows] = await db.execute<Article[]>(
      `SELECT
        id,
        title,
        slug,
        excerpt,
        status,
        cover_image,
        createdAt,
        updatedAt
      FROM articles
      ORDER BY createdAt DESC`,
    );

    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getArticlesWhitBlocks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // دریافت تمام مقالات
    const [articles] = await db.execute<Article[]>(
      `SELECT
        id,
        title,
        slug,
        excerpt,
        status,
        cover_image,
        createdAt,
        updatedAt
      FROM articles
      ORDER BY createdAt DESC`,
    );


    if (!articles.length) {
      return res.status(200).json([]);
    }

    // دریافت بلاک‌ها برای هر مقاله
    const articlesWithBlocks = await Promise.all(
      articles.map(async (article) => {
        const [blocks] = await db.execute<ArticleBlock[]>(
          `SELECT *
           FROM article_blocks
           WHERE article_id = ?
           ORDER BY order_index ASC`,
          [article.id],
        );


        // اطمینان از اینکه content همیشه به صورت object برگردد
        const safeBlocks = blocks.map((block) => {
          let content;
          try {
            content =
              typeof block.content === "string"
                ? JSON.parse(block.content)
                : block.content;
          } catch (err) {
            console.warn(
              `Warning: could not parse block content for block ID ${block.id}. Returning raw content.`,
            );
            content = block.content; // اگر parse نشد، همان content خام برگردد
          }

          return {
            ...block,
            content,
          };
        });

        return {
          ...article,
          blocks: safeBlocks,
        };
      }),
    );

    res.status(200).json(articlesWithBlocks);
  } catch (error) {
    console.error("Error in getArticlesWhitBlocks:", error);
    next(error);
  }
};

/**
 * کنترلر مخصوص سایت اصلی برای گرفتن لیست مقالات منتشر شده
 */
export const getPublishedArticlesForSite = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // دریافت مقالات منتشر شده
    const [articles] = await db.execute<Article[]>(`
      SELECT
        id,
        title,
        slug,
        excerpt,
        status,
        cover_image,
        createdAt,
        updatedAt
      FROM articles
      WHERE status = 'published'
      ORDER BY createdAt DESC
    `);

    if (!articles.length) {
      return res.status(200).json([]);
    }

    // دریافت بلاک‌ها برای هر مقاله
    const articlesWithBlocks = await Promise.all(
      articles.map(async (article) => {
        const [blocks] = await db.execute<ArticleBlock[]>(
          `
          SELECT *
          FROM article_blocks
          WHERE article_id = ?
          ORDER BY order_index ASC
        `,
          [article.id],
        );

        return {
          ...article,
          blocks: blocks.map((block) => {
            let contentParsed;
            if (typeof block.content === "string") {
              try {
                contentParsed = JSON.parse(block.content);
              } catch {
                contentParsed = block.content; // fallback اگر JSON نبود
              }
            } else {
              contentParsed = block.content; // اگر object است مستقیم برگردان
            }

            return {
              ...block,
              content: contentParsed,
            };
          }),
        };
      }),
    );

    res.status(200).json(articlesWithBlocks);
  } catch (error) {
    next(error);
  }
};
export const getArticleBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { slug } = req.params;

    const [articles] = await db.execute<Article[]>(
      `SELECT *
       FROM articles
       WHERE slug = ? AND status = 'published'
       LIMIT 1`,
      [slug],
    );

    if (!articles.length)
      return res.status(404).json({ error: "مقاله یافت نشد" });

    const article = articles[0];

    const [blocks] = await db.execute<ArticleBlock[]>(
      `SELECT *
       FROM article_blocks
       WHERE article_id = ?
       ORDER BY order_index ASC`,
      [article.id],
    );

    const parsedBlocks = blocks.map((block) => {
      let contentParsed;
      if (typeof block.content === "string") {
        try {
          contentParsed = JSON.parse(block.content);
        } catch {
          contentParsed = block.content;
        }
      } else {
        contentParsed = block.content;
      }

      return {
        ...block,
        content: contentParsed,
      };
    });

    res.status(200).json({
      ...article,
      blocks: parsedBlocks,
    });
  } catch (error) {
    next(error);
  }
};

export const createArticle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const connection = await db.getConnection();

  try {
    const { title, slug, excerpt, status } = req.body;

    // parse blocks
    let blocks: any[] = [];
    // console.log("===== FILES RECEIVED IN CREATE =====");
    // console.log(req.files);

    if (req.body.blocks) {
      if (typeof req.body.blocks === "string") {
        blocks = JSON.parse(req.body.blocks);
      } else if (Array.isArray(req.body.blocks)) {
        blocks = req.body.blocks;
      } else {
        return res.status(400).json({ error: "فرمت بلاک‌ها نامعتبر است" });
      }
    }
    // validations
    if (!title) return res.status(400).json({ error: "عنوان الزامی است" });
    if (!slug) return res.status(400).json({ error: "اسلاگ الزامی است" });
    if (!blocks.length)
      return res.status(400).json({ error: "حداقل یک بلاک لازم است" });

    // دریافت فایل‌ها از multer
    const files = req.files as {
      cover_image?: Express.Multer.File[];
      file?: Express.Multer.File[];
      attachment_file?: Express.Multer.File[];
    };

    /* ---------- cover image ---------- */
    let cover_image: string | null = null;
    if (files?.cover_image?.[0]) {
      cover_image = buildFileUrl(
        req,
        `uploads/articles/${files.cover_image[0].filename}`,
      );
    }

    await connection.beginTransaction();

    /* ---------- insert article ---------- */
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO articles (title, slug, excerpt, status, cover_image)
       VALUES (?, ?, ?, ?, ?)`,
      [title, slug, excerpt ?? null, status ?? "draft", cover_image],
    );

    const articleId = result.insertId;

    /* ---------- insert blocks ---------- */
    for (const [index, block] of blocks.entries()) {
      const content = { ...(block.content ?? {}) };

      // اگر بلاک فایل دارد، مسیر سرور جایگزین blob شود
      if (
        ["image", "video", "file"].includes(block.type) &&
        block.fileIndex !== undefined
      ) {
        const file = files?.file?.[block.fileIndex]; // مطابقت با index فایل در frontend
        if (file) {
          // مسیر ذخیره جداگانه برای بلاک‌ها
          content.src = buildFileUrl(req, `uploads/articles/${file.filename}`);

          // اگر فایل نوع file است، نام و سایز را هم ذخیره کن
          if (block.type === "file") {
            content.name = file.originalname;
            content.size = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
          }
        }
      }

      await connection.execute(
        `INSERT INTO article_blocks
         (article_id, type, order_index, content)
         VALUES (?, ?, ?, ?)`,
        [articleId, block.type, block.order_index, JSON.stringify(content)],
      );
    }

    await connection.commit();

    res.status(201).json({ message: "مقاله با موفقیت ایجاد شد", articleId });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
export const getArticle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const [articles] = await db.execute<Article[]>(
      "SELECT * FROM articles WHERE id = ?",
      [id],
    );

    if (!articles.length)
      return res.status(404).json({ error: "مقاله یافت نشد" });

    const [blocks] = await db.execute<ArticleBlock[]>(
      "SELECT * FROM article_blocks WHERE article_id = ? ORDER BY order_index",
      [id],
    );

    const parsedBlocks = blocks.map((b) => {
      let contentParsed;
      if (typeof b.content === "string") {
        try {
          contentParsed = JSON.parse(b.content);
        } catch {
          contentParsed = b.content;
        }
      } else {
        contentParsed = b.content;
      }

      return {
        ...b,
        content: contentParsed,
      };
    });

    res.status(200).json({
      ...articles[0],
      blocks: parsedBlocks,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------- helpers ---------- */
const safeJsonParse = (value: any, fallback: any = {}) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : (value ?? fallback);
  } catch {
    return fallback;
  }
};

/* ---------- controller ---------- */
export const updateArticle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const connection = await db.getConnection();

  try {
    const articleId = Number(req.params.id);
    if (!articleId) {
      return res.status(400).json({ error: "آیدی مقاله الزامی است" });
    }

    const { title, slug, excerpt, status } = req.body;

    /* ---------- parse blocks safely ---------- */
    let blocks: any[] = [];
    // console.log("===== FILES RECEIVED =====");
    // console.log(req.files);
    if (req.body.blocks) {
      if (typeof req.body.blocks === "string") {
        blocks = JSON.parse(req.body.blocks);
      } else if (Array.isArray(req.body.blocks)) {
        blocks = req.body.blocks;
      } else {
        return res.status(400).json({ error: "فرمت blocks نامعتبر است" });
      }
    }

    if (!title) return res.status(400).json({ error: "عنوان الزامی است" });
    if (!slug) return res.status(400).json({ error: "اسلاگ الزامی است" });
    if (!blocks.length) {
      return res.status(400).json({ error: "حداقل یک بلاک لازم است" });
    }

    const files = req.files as {
      cover_image?: Express.Multer.File[];
      file?: Express.Multer.File[];
    };

    await connection.beginTransaction();

    /* ---------- update article ---------- */
    let newCoverImage: string | null = null;

    if (files?.cover_image?.[0]) {
      const [rows] = await connection.execute<any[]>(
        "SELECT cover_image FROM articles WHERE id = ?",
        [articleId],
      );

      const oldCover = rows[0]?.cover_image;
      if (oldCover) {
        removeFileIfExists(oldCover);
      }

      newCoverImage = buildFileUrl(
        req,
        `uploads/articles/${files.cover_image[0].filename}`,
      );
    }

    await connection.execute(
      `UPDATE articles
       SET title = ?, slug = ?, excerpt = ?, status = ?, cover_image = COALESCE(?, cover_image)
       WHERE id = ?`,
      [
        title,
        slug,
        excerpt ?? null,
        status ?? "draft",
        newCoverImage,
        articleId,
      ],
    );

    /* ---------- fetch existing blocks ---------- */
    const [existingBlocks] = await connection.execute<any[]>(
      "SELECT id, type, content FROM article_blocks WHERE article_id = ?",
      [articleId],
    );

    const existingBlockMap = new Map<number, any>();
    existingBlocks.forEach((b) => existingBlockMap.set(b.id, b));

    /* ---------- delete removed blocks ---------- */
    const incomingBlockIds = blocks.filter((b) => b.id).map((b) => b.id);

    for (const oldBlock of existingBlocks) {
      if (!incomingBlockIds.includes(oldBlock.id)) {
        const content = safeJsonParse(oldBlock.content, {});
        if (["image", "video", "file"].includes(oldBlock.type)) {
          removeFileIfExists(content?.src);
        }

        await connection.execute("DELETE FROM article_blocks WHERE id = ?", [
          oldBlock.id,
        ]);
      }
    }

    /* ---------- insert / update blocks ---------- */
    for (const block of blocks) {
      let content = { ...(block.content ?? {}) };

      let fileOnServer: Express.Multer.File | undefined;
      if (
        typeof block.fileIndex === "number" &&
        files?.file?.[block.fileIndex]
      ) {
        fileOnServer = files.file[block.fileIndex];
      }

      if (fileOnServer) {
        if (block.id && existingBlockMap.has(block.id)) {
          const oldContent = safeJsonParse(
            existingBlockMap.get(block.id).content,
          );

          if (oldContent?.src) {
            removeFileIfExists(oldContent.src);
          }
        }

        content.src = buildFileUrl(
          req,
          `uploads/articles/${fileOnServer.filename}`,
        );

        if (block.type === "file") {
          content.name = fileOnServer.originalname;
          content.size = `${(fileOnServer.size / 1024 / 1024).toFixed(2)} MB`;
        }
      } else if (block.id && existingBlockMap.has(block.id)) {
        const oldContent = safeJsonParse(
          existingBlockMap.get(block.id).content,
        );
        content.src = oldContent.src;
      }

      // 🚫 هرگز blob را ذخیره نکن
      if (typeof content.src === "string" && content.src.startsWith("blob:")) {
        delete content.src;
      }

      if (block.id) {
        await connection.execute(
          `UPDATE article_blocks
       SET type = ?, order_index = ?, content = ?
       WHERE id = ?`,
          [block.type, block.order_index, JSON.stringify(content), block.id],
        );
      } else {
        await connection.execute(
          `INSERT INTO article_blocks
       (article_id, type, order_index, content)
       VALUES (?, ?, ?, ?)`,
          [articleId, block.type, block.order_index, JSON.stringify(content)],
        );
      }
    }
    await connection.commit();
    res.status(200).json({ message: "مقاله با موفقیت آپدیت شد" });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const deleteArticle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const connection = await db.getConnection();

  try {
    const articleId = Number(req.params.id);
    if (!articleId) {
      return res.status(400).json({ error: "آیدی مقاله نامعتبر است" });
    }

    /* ---------- دریافت مقاله ---------- */
    const [articles] = await connection.execute<Article[]>(
      "SELECT * FROM articles WHERE id = ?",
      [articleId],
    );

    if (!articles.length) {
      return res.status(404).json({ error: "مقاله یافت نشد" });
    }

    const article = articles[0];

    /* ---------- دریافت بلاک‌ها ---------- */
    const [blocks] = await connection.execute<ArticleBlock[]>(
      "SELECT type, content FROM article_blocks WHERE article_id = ?",
      [articleId],
    );

    /* ---------- حذف کاور مقاله ---------- */
    if (article.cover_image) {
      removeFileIfExists(normalizeSrc(article.cover_image));
    }

    /* ---------- حذف فایل‌های بلاک‌ها ---------- */
    for (const block of blocks) {
      if (!block.content) continue;

      let content: any;
      try {
        content =
          typeof block.content === "string"
            ? JSON.parse(block.content)
            : block.content;
      } catch {
        continue; // محتوای خراب → نادیده بگیر
      }

      if (["image", "video", "file"].includes(block.type) && content?.src) {
        removeFileIfExists(normalizeSrc(content.src));
      }
    }

    /* ---------- حذف از دیتابیس ---------- */
    await connection.beginTransaction();

    await connection.execute(
      "DELETE FROM article_blocks WHERE article_id = ?",
      [articleId],
    );

    await connection.execute("DELETE FROM articles WHERE id = ?", [articleId]);

    await connection.commit();

    res.status(200).json({
      message: "مقاله و تمامی فایل‌های مرتبط با آن با موفقیت حذف شدند",
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
