/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Request, Response } from "express";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// پوشه موقت برای فایل‌ها
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 25 * 1024 * 1024 }, // حداکثر 25
  fileFilter: (req, file, cb) => {
    const allowedExt = [
      ".jpg",
      ".jpeg",
      ".png",
      ".pdf",
      ".doc",
      ".docx",
      ".zip",
      ".rar",
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExt.includes(ext)) {
      return cb(new Error("فرمت فایل مجاز نیست."));
    }
    cb(null, true);
  },
});

// POST /contact
router.post(
  "/",
  upload.single("attachment"),
  async (req: Request, res: Response) => {
    try {
      const { name, email, phone, subject, message } = req.body;

      if (!name || !email || !message) {
        return res
          .status(400)
          .json({ error: "لطفاً فیلدهای ضروری را پر کنید." });
      }

      // کانفیگ Nodemailer
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions: any = {
        from: `"Contact Form" <${process.env.SMTP_USER}>`,
        to: process.env.CONTACT_RECEIVER,
        replyTo: email,
        subject: subject || "پیام از فرم تماس",
        html: `
        <p><b>نام:</b> ${name}</p>
        <p><b>ایمیل:</b> ${email}</p>
        <p><b>شماره تماس:</b> ${phone || "ندارد"}</p>
        <p><b>موضوع:</b> ${subject || "بدون موضوع"}</p>
        <p><b>پیام:</b><br/>${message}</p>
      `,
      };

      if (req.file) {
        mailOptions.attachments = [
          {
            filename: req.file.originalname,
            path: req.file.path,
          },
        ];
      }

      await transporter.sendMail(mailOptions);

      // حذف فایل موقت بعد از ارسال ایمیل
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("خطا در حذف فایل موقت:", err);
        });
      }

      return res.json({ success: true, message: "پیام با موفقیت ارسال شد." });
    } catch (error: any) {
      console.error(error);
      return res
        .status(500)
        .json({ error: error.message || "ارسال پیام با خطا مواجه شد." });
    }
  },
);

export default router;
