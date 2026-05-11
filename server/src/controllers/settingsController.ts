import { Request, Response, NextFunction } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import path from "path";
import fs from "fs";

import db from "../config/db";

/**
 * Interface for settings table
 */
interface SettingRow extends RowDataPacket {
  id: number;
  slug: string;
  value: any; 
  created_at?: Date;
  updated_at?: Date;
}

export const getAllSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [results] = await db.execute<SettingRow[]>("SELECT * FROM settings");

    res.status(200).json({ allSettings: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching settings" });
  }
};

export const updateSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const slug: string | undefined = req.body.slug;
    if (!slug) {
      res.status(400).json({ error: "slug is required" });
      return;
    }

    let updates: Record<string, any> = req.body.updates;
    console.log("updates", updates);
    // Parse updates if string
    if (typeof updates === "string") {
      try {
        updates = JSON.parse(updates);
      } catch (err: any) {
        console.error("JSON parse error:", err.message, "updates:", updates);
        res.status(400).json({ error: "Invalid updates JSON" });
        return;
      }
    }

    if (!updates || typeof updates !== "object") {
      res.status(400).json({ error: "Invalid updates format" });
      return;
    }

    // Fetch current settings
    const [rows] = await db.execute<SettingRow[]>(
      "SELECT value FROM settings WHERE slug = ?",
      [slug],
    );
    if (rows.length === 0) {
      await db.execute(
        "INSERT INTO settings (slug, `key`, value) VALUES (?, ?, ?)",
        [slug, slug, JSON.stringify(updates)],
      );
      res.status(200).json({ message: "Settings created successfully" });
      return;
    }

    let currentSettings: Record<string, any> = {};

    if (rows[0]?.value) {
      if (typeof rows[0].value === "string") {
        try {
          currentSettings = JSON.parse(rows[0].value);
        } catch (err) {
          console.error("Error parsing current settings JSON:", err);
          currentSettings = {};
        }
      } else if (typeof rows[0].value === "object") {
        currentSettings = rows[0].value;
      }
    }
    const processFile = (file: Express.Multer.File, key: string): void => {
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/icons/${file.filename}`;

      const oldEntry = currentSettings[key];
      const oldUrl: string | undefined =
        typeof oldEntry === "string" ? oldEntry : oldEntry?.iconUrl;

      if (oldUrl) {
        const oldPath = path.join(
          __dirname,
          "..",
          "public",
          oldUrl
            .replace(`${req.protocol}://${req.get("host")}`, "")
            .replace(/^\/+/, ""),
        );

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // ← تغییر این بخش
      if (key === "resume") {
        updates[key] = fileUrl; // فقط URL ذخیره شود
      } else {
        updates[key] = {
          ...(updates[key] || {}),
          iconUrl: fileUrl,
        };
      }
    };
    // Single file
    if (req.file) {
      processFile(req.file, req.file.fieldname);
    }

    // Multiple files
    if (req.files && !Array.isArray(req.files)) {
      for (const key of Object.keys(req.files)) {
        const fileArray = req.files[key];

        if (fileArray && fileArray.length > 0) {
          processFile(fileArray[0], key);
        }
      }
    }

    // Build JSON_SET query
    const jsonSetParts: string[] = [];
    const queryValues: any[] = [];

    // for (const key in updates) {
    //   jsonSetParts.push(`'$.${key}', ?`);
    //   queryValues.push(JSON.stringify(updates[key]));
    // }
    for (const key in updates) {
      const value = updates[key];
      // اگر value رشته یا عدد یا بولین است، مستقیم ذخیره شود، وگرنه JSON.stringify شود
      const valueToStore =
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
          ? value
          : JSON.stringify(value);

      jsonSetParts.push(`'$.${key}', ?`);
      queryValues.push(valueToStore);
    }
    queryValues.push(slug);

    const sql = `
      UPDATE settings
      SET value = JSON_SET(value, ${jsonSetParts.join(", ")}),
          updated_at = CURRENT_TIMESTAMP
      WHERE slug = ?;
    `;

    const [result] = await db.execute<ResultSetHeader>(sql, queryValues);

    res.status(200).json({
      message: "Settings updated successfully",
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Error updating settings" });
  }
};

export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [rows] = await db.execute<RowDataPacket[]>(`
      SELECT
        (SELECT COUNT(*) FROM plans_projects) AS plans,
        (SELECT COUNT(*) FROM board_members) AS members,
        (SELECT COUNT(*) FROM admins) AS admins,
        (SELECT COUNT(*) FROM articles) AS articles,
        (SELECT COUNT(*) FROM events) AS events,
        (SELECT COUNT(*) FROM partner_companies) AS partners,
        (SELECT COUNT(*) FROM activity_domains) AS activities,
        (SELECT COUNT(*) FROM branches) AS branches,
        (SELECT COUNT(*) FROM certificates) AS certificates
    `);

    const stats = rows[0];

    res.status(200).json({
      stats: {
        plans: stats.plans,
        members: stats.members,
        admins: stats.admins,
        articles: stats.articles,
        events: stats.events,
        partners: stats.partners,
        activities: stats.activities,
        branches: stats.branches,
        certificates: stats.certificates,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Error fetching dashboard stats" });
  }
};
