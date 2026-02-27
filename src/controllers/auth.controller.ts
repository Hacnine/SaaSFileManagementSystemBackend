import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { generateToken, hashToken } from "../utils/crypto";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../utils/email";

// Register a new user
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      throw new AppError("All fields are required.", 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError("User with this email already exists.", 409);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate email verification token
    const verifyToken = generateToken();
    const hashedVerifyToken = hashToken(verifyToken);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        emailVerifyToken: hashedVerifyToken,
        emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send verification email (non-blocking)
    sendVerificationEmail(email, verifyToken).catch((err) => {
      console.error("Failed to send verification email:", err);
    });

    res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email to verify your account.",
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required.", 400);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError("Invalid email or password.", 401);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid email or password.", 401);
    }

    // Generate tokens
    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Verify Email
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      throw new AppError("Verification token is required.", 400);
    }

    const hashedToken = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: hashedToken,
        emailVerifyExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AppError("Invalid or expired verification token.", 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal whether user exists
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    const resetToken = generateToken();
    const hashedResetToken = hashToken(resetToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedResetToken,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    sendPasswordResetEmail(email, resetToken).catch((err) => {
      console.error("Failed to send password reset email:", err);
    });

    res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.query;
    const { password } = req.body;

    if (!token || typeof token !== "string") {
      throw new AppError("Reset token is required.", 400);
    }

    if (!password) {
      throw new AppError("New password is required.", 400);
    }

    const hashedToken = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AppError("Invalid or expired reset token.", 400);
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        refreshToken: null, // Invalidate existing sessions
      },
    });

    res.status(200).json({
      success: true,
      message: "Password reset successful. Please login with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

// Refresh Token
export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError("Refresh token is required.", 400);
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user with this refresh token
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.id,
        refreshToken: refreshToken,
      },
    });

    if (!user) {
      throw new AppError("Invalid refresh token.", 401);
    }

    // Generate new tokens
    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Update refresh token in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Logout
export const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError("Not authenticated.", 401);
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// Get Current User Profile
export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError("Not authenticated.", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isEmailVerified: true,
        activePackage: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError("User not found.", 404);
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
