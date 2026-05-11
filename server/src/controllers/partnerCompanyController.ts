import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../config/db";

/** PartnerCompany interface */
export interface PartnerCompany extends RowDataPacket {
  id: number;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  is_active: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Upload Company Logo */
export const uploadPartnerLogo = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "فایلی آپلود نشد" });
  }

  const logoUrl = `${req.protocol}://${req.get("host")}/uploads/partnerLogos/${req.file.filename}`;
  return res.status(200).json({ logoUrl, filename: req.file.filename });
};

/** Create Partner Company */
export const createPartnerCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description, is_active } = req.body;

    if (!req.file)
      return res.status(400).json({ error: "لوگوی شرکت الزامی است" });
    if (!name) return res.status(400).json({ error: "نام شرکت الزامی است" });

    const logoUrl = `${req.protocol}://${req.get("host")}/uploads/partnerLogos/${req.file.filename}`;
    const active = is_active === "false" || is_active === "0" ? 0 : 1;

    await db.execute<ResultSetHeader>(
      "INSERT INTO partner_companies (name, description, logoUrl, is_active) VALUES (?, ?, ?, ?)",
      [name, description || null, logoUrl, active]
    );

    res.status(201).json({ message: "شرکت همکار با موفقیت ایجاد شد" });
  } catch (error) {
    next(error);
  }
};

/** Get All Partner Companies */
export const getPartnerCompanies = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [companies] = await db.execute<PartnerCompany[]>(
      "SELECT * FROM partner_companies ORDER BY id DESC"
    );
    res.status(200).json(companies);
  } catch (error) {
    next(error);
  }
};

/** Get Single Partner Company */
export const getPartnerCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute<PartnerCompany[]>(
      "SELECT * FROM partner_companies WHERE id = ?",
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "شرکت پیدا نشد" });
    res.status(200).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

/** Update Partner Company */
export const updatePartnerCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const [rows] = await db.execute<PartnerCompany[]>(
      "SELECT * FROM partner_companies WHERE id = ?",
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "شرکت یافت نشد" });

    const current = rows[0];
    let newLogoUrl = current.logoUrl;

    if (req.file) {
      newLogoUrl = `${req.protocol}://${req.get("host")}/uploads/partnerLogos/${req.file.filename}`;

      // حذف لوگوی قدیمی
      if (current.logoUrl) {
        const oldFilePath = path.join(
          __dirname,
          "..",
          "public",
          current.logoUrl
            .replace(`${req.protocol}://${req.get("host")}`, "")
            .replace(/^\/+/, "")
        );
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
    }

    const active = is_active === "false" || is_active === "0" ? 0 : 1;

    await db.execute<ResultSetHeader>(
      `UPDATE partner_companies 
       SET name = ?, description = ?, logoUrl = ?, is_active = ?, updatedAt = NOW()
       WHERE id = ?`,
      [name ?? current.name, description ?? current.description, newLogoUrl, active, id]
    );

    res.status(200).json({ message: "شرکت با موفقیت بروزرسانی شد" });
  } catch (error) {
    next(error);
  }
};

/** Delete Partner Company */
export const deletePartnerCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute<PartnerCompany[]>(
      "SELECT * FROM partner_companies WHERE id = ?",
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "شرکت پیدا نشد" });

    const current = rows[0];

    if (current.logoUrl) {
      const filePath = path.join(
        __dirname,
        "..",
        "public",
        current.logoUrl
          .replace(`${req.protocol}://${req.get("host")}`, "")
          .replace(/^\/+/, "")
      );
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.execute<ResultSetHeader>(
      "DELETE FROM partner_companies WHERE id = ?",
      [id]
    );
    res.status(200).json({ message: "شرکت با موفقیت حذف شد" });
  } catch (error) {
    next(error);
  }
};