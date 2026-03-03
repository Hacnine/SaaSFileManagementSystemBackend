import prisma from "../config/database";
import { AppError } from "../middleware/errorHandler";

export interface SubscriptionLimits {
  maxFolders: number;
  maxNestingLevel: number;
  allowedFileTypes: string[];
  maxFileSize: number; // in MB
  totalFileLimit: number;
  filesPerFolder: number;
}

// simple helper to determine if a user is an admin
const isAdminUser = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "ADMIN";
};

/**
 * Get user's active subscription limits
 */
export const getUserSubscriptionLimits = async (
  userId: string
): Promise<SubscriptionLimits | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activePackage: {
        select: {
          maxFolders: true,
          maxNestingLevel: true,
          allowedFileTypes: true,
          maxFileSize: true,
          totalFileLimit: true,
          filesPerFolder: true,
        },
      },
    },
  });

  if (!user || !user.activePackage) {
    return null;
  }

  return user.activePackage;
};

/**
 * Validate folder creation against subscription limits
 */
export const validateFolderCreation = async (
  userId: string,
  parentFolderId?: string
): Promise<void> => {
  // admins bypass all restrictions
  if (await isAdminUser(userId)) {
    return;
  }

  const limits = await getUserSubscriptionLimits(userId);

  if (!limits) {
    throw new AppError(
      "No active subscription package. Please subscribe to a package first.",
      403
    );
  }

  // Check max folders limit
  const folderCount = await prisma.folder.count({
    where: { userId },
  });

  if (folderCount >= limits.maxFolders) {
    throw new AppError(
      `You have reached the maximum number of folders (${limits.maxFolders}) for your subscription.`,
      403
    );
  }

  // Check nesting level if parent folder is provided
  if (parentFolderId) {
    const parent = await prisma.folder.findUnique({
      where: { id: parentFolderId },
      select: { nestingLevel: true },
    });

    if (!parent) {
      throw new AppError("Parent folder not found.", 404);
    }

    const newNestingLevel = parent.nestingLevel + 1;
    if (newNestingLevel > limits.maxNestingLevel) {
      throw new AppError(
        `Maximum nesting level (${limits.maxNestingLevel}) exceeded. Parent folder is at level ${parent.nestingLevel}.`,
        403
      );
    }
  }
};

/**
 * Validate file upload against subscription limits
 */
export const validateFileUpload = async (
  userId: string,
  fileSize: number,
  mimeType: string,
  folderId: string
): Promise<{
  fileType: "IMAGE" | "VIDEO" | "PDF" | "AUDIO";
}> => {
  // admins are free to upload; only worry about file type validity
  if (await isAdminUser(userId)) {
    let fileType: "IMAGE" | "VIDEO" | "PDF" | "AUDIO";
    if (mimeType.startsWith("image/")) fileType = "IMAGE";
    else if (mimeType.startsWith("video/")) fileType = "VIDEO";
    else if (mimeType.startsWith("audio/")) fileType = "AUDIO";
    else if (mimeType === "application/pdf") fileType = "PDF";
    else {
      throw new AppError(
        "Unsupported file type. Allowed types depend on your subscription.",
        400
      );
    }
    return { fileType };
  }

  const limits = await getUserSubscriptionLimits(userId);

  if (!limits) {
    throw new AppError(
      "No active subscription package. Please subscribe to a package first.",
      403
    );
  }

  // Validate file type
  let fileType: "IMAGE" | "VIDEO" | "PDF" | "AUDIO";
  if (mimeType.startsWith("image/")) fileType = "IMAGE";
  else if (mimeType.startsWith("video/")) fileType = "VIDEO";
  else if (mimeType.startsWith("audio/")) fileType = "AUDIO";
  else if (
    mimeType === "application/pdf"
  )
    fileType = "PDF";
  else {
    throw new AppError(
      "Unsupported file type. Allowed types depend on your subscription.",
      400
    );
  }

  if (!limits.allowedFileTypes.includes(fileType)) {
    throw new AppError(
      `File type ${fileType} is not allowed in your subscription package. Allowed types: ${limits.allowedFileTypes.join(", ")}`,
      403
    );
  }

  // Validate file size
  const fileSizeInMB = fileSize / (1024 * 1024);
  if (fileSizeInMB > limits.maxFileSize) {
    throw new AppError(
      `File size (${fileSizeInMB.toFixed(2)} MB) exceeds the maximum allowed size (${limits.maxFileSize} MB) for your subscription.`,
      413
    );
  }

  // Check total file count
  const totalFileCount = await prisma.file.count({
    where: { userId },
  });

  if (totalFileCount >= limits.totalFileLimit) {
    throw new AppError(
      `You have reached the maximum number of files (${limits.totalFileLimit}) for your subscription.`,
      403
    );
  }

  // Check files per folder limit
  const filesInFolder = await prisma.file.count({
    where: { folderId, userId },
  });

  if (filesInFolder >= limits.filesPerFolder) {
    throw new AppError(
      `This folder has reached its maximum file capacity (${limits.filesPerFolder} files) for your subscription.`,
      403
    );
  }

  return { fileType };
};

/**
 * Calculate nesting level for a folder
 */
export const calculateNestingLevel = async (
  parentFolderId?: string
): Promise<number> => {
  if (!parentFolderId) {
    return 1; // Root level
  }

  const parent = await prisma.folder.findUnique({
    where: { id: parentFolderId },
    select: { nestingLevel: true },
  });

  return (parent?.nestingLevel || 0) + 1;
};

/**
 * Get formatted subscription info for user
 */
export const getSubscriptionInfo = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activePackage: {
        select: {
          id: true,
          name: true,
          maxFolders: true,
          maxNestingLevel: true,
          allowedFileTypes: true,
          maxFileSize: true,
          totalFileLimit: true,
          filesPerFolder: true,
        },
      },
    },
  });

  if (!user?.activePackage) {
    return null;
  }

  // Get current usage
  const [folderCount, fileCount] = await Promise.all([
    prisma.folder.count({ where: { userId } }),
    prisma.file.count({ where: { userId } }),
  ]);

  return {
    package: user.activePackage,
    usage: {
      folders: folderCount,
      files: fileCount,
    },
  };
};
