import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
});

// تابع تست اتصال
async function testConnection() {
  try {
    const connection = await pool.getConnection(); // گرفتن یک اتصال از pool
    console.log("✅ Connected to ariatech_db successfully!");
    connection.release(); // آزاد کردن اتصال به pool
  } catch (err) {
    console.error("❌ MySQL connection failed:", err);
  }
}

// اجرای تست هنگام بارگذاری فایل
testConnection();

export default pool;
