import fs from "fs";
import path from "path";

/**
 * حذف فیزیکی فایل از سرور با تبدیل URL به مسیر در فولدر public
 */
export const removeFileIfExists = (fileUrl?: string | null): void => {
  if (!fileUrl) return;

  try {
    const uploadsIndex = fileUrl.indexOf("/uploads/");
    if (uploadsIndex === -1) return;

    const relativePath = fileUrl.substring(uploadsIndex); // /uploads/projects/xxx.png
    const fullPath = path.join(process.cwd(), "public", relativePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log("✅ فایل حذف شد:", fullPath);
    }
  } catch (err) {
    console.error("❌ خطا در حذف فایل:", err);
  }
};
