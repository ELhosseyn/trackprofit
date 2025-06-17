import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  prisma.$connect().then(() => {
    console.log('Database connected successfully');
  }).catch((error) => {
    console.error('Failed to connect to database:', error);
  });
}

export { prisma };
export default prisma;
