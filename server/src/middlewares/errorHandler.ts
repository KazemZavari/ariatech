import { Request, Response, NextFunction } from "express";
import multer from "multer";

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err.stack);

  // هندل MulterError
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          message: "حجم فایل بیش از حد مجاز است (حداکثر 50MB)",
        });
      default:
        return res.status(400).json({ success: false, message: err.message });
    }
  }

  // هندل خطاهای عادی
  if (err instanceof Error) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // خطای پیش‌بینی نشده
  res.status(500).json({ success: false, message: "Server Error" });
};

export default errorHandler;
