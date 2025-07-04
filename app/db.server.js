import { PrismaClient } from "@prisma/client";

// Create a new Prisma client instance with custom configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:/Users/elhosseyn/Desktop/app/trackprofit/prisma/dev.sqlite`
    }
  },
  // Log queries in development
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== "production") {
  prisma.$connect().then(() => {
    console.log('Database connected successfully');
  }).catch((error) => {
    console.error('Failed to connect to database:', error);
  });
}

export { prisma };
export default prisma;
