import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import prisma from "../config/database";
import { AppError } from "./errorHandler";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Access denied. No token provided.", 401);
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new AppError("Access denied. No token provided.", 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new AppError("User not found.", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError("Invalid token.", 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError("Token expired.", 401));
    }
    next(error);
  }
};

export const authorizeAdmin = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return next(new AppError("Access denied. Admin only.", 403));
  }
  next();
};
