import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// declare global {
//   namespace Express {
//     interface Request {
//       user?: { id: number; role: string };
//     }
//   }
// } 

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "توکن لازم است" });
  }
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET مقداردهی نشده");

    // const decoded = jwt.verify(token, secret) as {
    //   id: number;
    //   [key: string]: any;
    // };
    const decoded = jwt.verify(token, secret) as {
      id: number;
      role: string;
    };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "توکن نامعتبر" });
  }
};
