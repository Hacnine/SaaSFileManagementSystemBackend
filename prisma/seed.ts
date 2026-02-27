import bcrypt from "bcryptjs";

import prisma from "../src/config/database";

async function main() {
  console.log("Seeding database...");

  // Create default admin
  const adminEmail = "admin@saasfilemanager.com";
  const adminPassword = "Admin@123";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: "System",
        lastName: "Admin",
        role: "ADMIN",
        isEmailVerified: true,
      },
    });

    console.log("Default admin created:");
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
  } else {
    console.log("Default admin already exists.");
  }

  // Create default subscription packages
  const packages = [
    {
      name: "Free",
      maxFolders: 5,
      maxNestingLevel: 2,
      allowedFileTypes: ["IMAGE", "PDF"] as any,
      maxFileSize: 5, // 5 MB
      totalFileLimit: 20,
      filesPerFolder: 5,
    },
    {
      name: "Silver",
      maxFolders: 15,
      maxNestingLevel: 3,
      allowedFileTypes: ["IMAGE", "PDF", "AUDIO"] as any,
      maxFileSize: 20, // 20 MB
      totalFileLimit: 100,
      filesPerFolder: 15,
    },
    {
      name: "Gold",
      maxFolders: 50,
      maxNestingLevel: 5,
      allowedFileTypes: ["IMAGE", "VIDEO", "PDF", "AUDIO"] as any,
      maxFileSize: 100, // 100 MB
      totalFileLimit: 500,
      filesPerFolder: 50,
    },
    {
      name: "Diamond",
      maxFolders: 200,
      maxNestingLevel: 10,
      allowedFileTypes: ["IMAGE", "VIDEO", "PDF", "AUDIO"] as any,
      maxFileSize: 500, // 500 MB
      totalFileLimit: 2000,
      filesPerFolder: 200,
    },
  ];

  for (const pkg of packages) {
    const existing = await prisma.subscriptionPackage.findUnique({
      where: { name: pkg.name },
    });

    if (!existing) {
      await prisma.subscriptionPackage.create({ data: pkg });
      console.log(`Package "${pkg.name}" created.`);
    } else {
      console.log(`Package "${pkg.name}" already exists.`);
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
