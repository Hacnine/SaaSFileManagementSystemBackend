import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";

// Public endpoint – no auth required
export const getPublicPackages = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const packages = await prisma.subscriptionPackage.findMany();
    res.json(packages);
  } catch (error) {
    next(new AppError("Failed to retrieve packages", 500));
  }
};


export const createPackage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      name,
      maxFolders,
      maxNestingLevel,
      allowedFileTypes,
      maxFileSize,
      totalFileLimit,
      filesPerFolder,
    } = req.body;
    if (
      !name ||
      !maxFolders ||
      !maxNestingLevel ||
      !allowedFileTypes ||
      !maxFileSize ||
      !totalFileLimit ||
      !filesPerFolder
    ) {
      throw new AppError("All fields are required", 400);
    }
    const newPackage = await prisma.subscriptionPackage.create({
      data: {
        name,
        maxFolders,
        maxNestingLevel,
        allowedFileTypes,
        maxFileSize,
        totalFileLimit,
        filesPerFolder,
      },
    });
    res.status(201).json(newPackage);
  } catch (error) {
    next(new AppError("Failed to create package", 500));
  }
};

export const getPackages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const packages = await prisma.subscriptionPackage.findMany();
    res.json(packages);
  } catch (error) {
    next(new AppError("Failed to retrieve packages", 500));
  }
};

export const updatePackage = async (
  req: AuthRequest,
  res: Response,
    next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const {
      name,
      maxFolders,
      maxNestingLevel,
      allowedFileTypes,
      maxFileSize,
      totalFileLimit,
      filesPerFolder,
    } = req.body;

    const updatedPackage = await prisma.subscriptionPackage.update({
      where: { id: String(id) },
      data: {
        name,
        maxFolders,
        maxNestingLevel,
        allowedFileTypes,
        maxFileSize,
        totalFileLimit,
        filesPerFolder,
      },
    });

    res.json(updatedPackage);
  } catch (error) {
    next(new AppError("Failed to update package", 500));
  }
};

export const deletePackage = async (
  req: AuthRequest,
  res: Response,
    next: NextFunction,
) => {
  try {
    const { id } = req.params;
    await prisma.subscriptionPackage.delete({
      where: { id: String(id) },
    });
    res.status(204).send();
  } catch (error) {
    next(new AppError("Failed to delete package", 500));
  }
};
