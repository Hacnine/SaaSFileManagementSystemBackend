import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const generateAccessToken = (payload: {
  id: string;
  email: string;
  role: string;
}): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
};

export const generateRefreshToken = (payload: {
  id: string;
  email: string;
  role: string;
}): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as {
    id: string;
    email: string;
    role: string;
  };
};
