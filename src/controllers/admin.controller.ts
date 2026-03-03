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

/**
 * Get all subscription packages (Admin only)
 */
export const getPackages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return next(new AppError("Only admins can view all packages", 403));
  }

  try {
    const packages = await prisma.subscriptionPackage.findMany({
      include: {
        _count: {
          select: { activeUsers: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(packages);
  } catch (error) {
    next(new AppError("Failed to retrieve packages", 500));
  }
};

/**
 * Get a single package by ID (Admin only)
 */
export const getPackageById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return next(new AppError("Only admins can view package details", 403));
  }

  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) return next(new AppError("Package ID is required", 400));

    const pkg = await prisma.subscriptionPackage.findUnique({
      where: { id },
      include: {
        _count: {
          select: { activeUsers: true },
        },
      },
    });

    if (!pkg) {
      return next(new AppError("Package not found", 404));
    }

    res.status(200).json(pkg);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new subscription package (Admin only)
 */
export const createPackage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return next(new AppError("Only admins can create packages", 403));
  }

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

    // Validate inputs
    if (!name || typeof name !== "string" || name.trim() === "") {
      return next(
        new AppError("Package name is required and must be valid", 400)
      );
    }

    if (
      maxFolders === undefined ||
      maxNestingLevel === undefined ||
      !allowedFileTypes ||
      maxFileSize === undefined ||
      totalFileLimit === undefined ||
      filesPerFolder === undefined
    ) {
      return next(
        new AppError("All package limits and settings are required", 400)
      );
    }

    if (!Array.isArray(allowedFileTypes) || allowedFileTypes.length === 0) {
      return next(
        new AppError("Allowed file types must be a non-empty array", 400)
      );
    }

    const validFileTypes = ["IMAGE", "VIDEO", "PDF", "AUDIO"];
    for (const type of allowedFileTypes) {
      if (!validFileTypes.includes(type)) {
        return next(
          new AppError(
            `Invalid file type: ${type}. Allowed types: ${validFileTypes.join(", ")}`,
            400
          )
        );
      }
    }

    // Check if package name already exists
    const existing = await prisma.subscriptionPackage.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return next(new AppError("Package name already exists", 409));
    }

    const newPackage = await prisma.subscriptionPackage.create({
      data: {
        name: name.trim(),
        maxFolders: parseInt(maxFolders),
        maxNestingLevel: parseInt(maxNestingLevel),
        allowedFileTypes,
        maxFileSize: parseInt(maxFileSize),
        totalFileLimit: parseInt(totalFileLimit),
        filesPerFolder: parseInt(filesPerFolder),
      },
    });
    res.status(201).json(newPackage);
  } catch (error) {
    next(new AppError("Failed to create package", 500));
  }
};

/**
 * Update a subscription package (Admin only)
 */
export const updatePackage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return next(new AppError("Only admins can update packages", 403));
  }

  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) return next(new AppError("Package ID is required", 400));

    const {
      name,
      maxFolders,
      maxNestingLevel,
      allowedFileTypes,
      maxFileSize,
      totalFileLimit,
      filesPerFolder,
    } = req.body;

    const existing = await prisma.subscriptionPackage.findUnique({
      where: { id: String(id) },
    });

    if (!existing) {
      return next(new AppError("Package not found", 404));
    }

    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return next(
          new AppError("Package name must be a non-empty string", 400)
        );
      }
      // Check uniqueness (excluding current package)
      const duplicate = await prisma.subscriptionPackage.findFirst({
        where: { name: name.trim(), NOT: { id: String(id) } },
      });
      if (duplicate) {
        return next(new AppError("Package name already exists", 409));
      }
      updateData.name = name.trim();
    }

    if (maxFolders !== undefined) {
      updateData.maxFolders = parseInt(maxFolders);
    }
    if (maxNestingLevel !== undefined) {
      updateData.maxNestingLevel = parseInt(maxNestingLevel);
    }
    if (allowedFileTypes !== undefined) {
      if (!Array.isArray(allowedFileTypes) || allowedFileTypes.length === 0) {
        return next(
          new AppError("Allowed file types must be a non-empty array", 400)
        );
      }
      const validFileTypes = ["IMAGE", "VIDEO", "PDF", "AUDIO"];
      for (const type of allowedFileTypes) {
        if (!validFileTypes.includes(type)) {
          return next(
            new AppError(
              `Invalid file type: ${type}. Allowed types: ${validFileTypes.join(", ")}`,
              400
            )
          );
        }
      }
      updateData.allowedFileTypes = allowedFileTypes;
    }
    if (maxFileSize !== undefined) {
      updateData.maxFileSize = parseInt(maxFileSize);
    }
    if (totalFileLimit !== undefined) {
      updateData.totalFileLimit = parseInt(totalFileLimit);
    }
    if (filesPerFolder !== undefined) {
      updateData.filesPerFolder = parseInt(filesPerFolder);
    }

    const updated = await prisma.subscriptionPackage.update({
      where: { id: String(id) },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    next(new AppError("Failed to update package", 500));
  }
};

/**
 * Delete a subscription package (Admin only)
 */
export const deletePackage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return next(new AppError("Only admins can delete packages", 403));
  }

  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) return next(new AppError("Package ID is required", 400));

    const pkg = await prisma.subscriptionPackage.findUnique({
      where: { id: String(id) },
      select: { _count: { select: { activeUsers: true } } },
    });

    if (!pkg) {
      return next(new AppError("Package not found", 404));
    }

    if (pkg._count.activeUsers > 0) {
      return next(
        new AppError(
          "Cannot delete a package that has active users. Please reassign or unsubscribe all users first.",
          409
        )
      );
    }

    await prisma.subscriptionPackage.delete({
      where: { id: String(id) },
    });

    res.status(204).send();
  } catch (error) {
    next(new AppError("Failed to delete package", 500));
  }
};
