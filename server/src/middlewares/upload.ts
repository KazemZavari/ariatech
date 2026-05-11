import multer from "multer";
import path from "path";
import fs from "fs";

const createUploader = (folder: string) => {
  const uploadPath = path.join(__dirname, "..", "public", "uploads", folder);

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });

  const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  // انواع MIME مجاز
  const allowedImages = ["image/jpeg", "image/png", "image/jpg", "image/webp", "image/gif"];
  const allowedVideos = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm"];
  const allowedPDF = ["application/pdf"];
  const allowedWord = [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];

  // بررسی فیلدهای مختلف
  switch (file.fieldname) {
    case "file":
      // فایل عمومی (certificate یا هر فایل اصلی)
      if ([...allowedImages, ...allowedVideos, ...allowedPDF].includes(file.mimetype)) cb(null, true);
      else cb(new Error("فرمت فایل پشتیبانی نمی‌شود"));
      break;

    case "cover_image":
      // فقط تصاویر
      if (allowedImages.includes(file.mimetype)) cb(null, true);
      else cb(new Error("فرمت تصویر پشتیبانی نمی‌شود"));
      break;

    case "attachment_file":
      // اجازه هر فایل
      cb(null, true);
      break;

    case "resume":
      // فقط PDF یا Word
      if ([...allowedPDF, ...allowedWord].includes(file.mimetype)) cb(null, true);
      else cb(new Error("فرمت رزومه پشتیبانی نمی‌شود"));
      break;

    default:
      // اگر فیلد مشخص نشده یا نامعتبر است
      if (file.mimetype.startsWith("image/")) cb(null, true); // تصاویر عمومی
      else cb(new Error("فایل نامعتبر"));
      break;
  }
};

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 70 * 1024 * 1024, // 50MB
    },
  });
};

export default createUploader;
