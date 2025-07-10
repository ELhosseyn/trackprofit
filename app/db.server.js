import { PrismaClient } from "@prisma/client";

// Create a singleton instance to avoid multiple connections
let prisma;

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ['error'] : ['query', 'error', 'warn'],
  });
  
  // Ensure the client is properly connected
  client.$connect().catch((error) => {
    console.error('❌ Failed to connect to database:', error);
  });
  
  return client;
}

if (process.env.NODE_ENV === "production") {
  prisma = createPrismaClient();
} else {
  if (!global.__db__) {
    global.__db__ = createPrismaClient();
  }
  prisma = global.__db__;
}

// Ensure prisma is defined before exporting
if (!prisma) {
  console.error('❌ Prisma client not initialized');
  prisma = createPrismaClient();
}

// Test the connection and log the result
prisma.$connect()
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to connect to database:', error);
  });

export { prisma };
export default prisma;
