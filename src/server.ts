import app from "./app";
import { env } from "./config/env";
import prisma from "./config/database";

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log("Database connected successfully");

    try {
      const { seedDatabase } = await import("./seed");
      await seedDatabase();
    } catch (seedError) {
      console.error("Seeding failed (non-fatal):", seedError);
    }

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
