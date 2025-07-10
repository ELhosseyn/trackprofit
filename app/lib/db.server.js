import { PrismaClient } from "@prisma/client";

/**
 * Database connection manager with connection pooling, error handling, and logging
 */
class DatabaseManager {
  constructor() {
    this.prisma = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 3000; // 3 seconds
  }

  /**
   * Create a Prisma client instance with appropriate logging based on environment
   */
  createPrismaClient() {
    const logLevels = process.env.NODE_ENV === "production" 
      ? ['error'] 
      : ['query', 'error', 'warn'];
    
    return new PrismaClient({
      log: logLevels,
      errorFormat: 'pretty',
      // Connection pooling settings for high availability
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
          // These pool settings improve handling of many concurrent requests
          poolTimeout: 30, // 30 seconds
          connectionLimit: process.env.NODE_ENV === "production" ? 20 : 10,
        },
      },
    });
  }

  /**
   * Get the Prisma client, creating a new one if necessary
   */
  getPrismaClient() {
    if (this.prisma) {
      return this.prisma;
    }

    if (process.env.NODE_ENV === "production") {
      this.prisma = this.createPrismaClient();
    } else {
      // In development, use a global variable to prevent multiple instances during hot reloading
      if (!global.__db__) {
        global.__db__ = this.createPrismaClient();
      }
      this.prisma = global.__db__;
    }

    // Ensure client is initialized
    if (!this.prisma) {
      console.error('❌ Prisma client not initialized');
      this.prisma = this.createPrismaClient();
    }

    return this.prisma;
  }

  /**
   * Connect to the database with retry logic
   */
  async connect() {
    if (this.isConnected) return this.prisma;

    const client = this.getPrismaClient();
    
    try {
      await client.$connect();
      this.isConnected = true;
      this.connectionAttempts = 0;
      console.log('✅ Database connected successfully');
      return client;
    } catch (error) {
      this.connectionAttempts++;
      
      if (this.connectionAttempts <= this.maxRetries) {
        console.warn(`❗ Database connection attempt ${this.connectionAttempts} failed. Retrying in ${this.retryDelay/1000}s...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connect();
      }
      
      console.error('❌ Failed to connect to database after multiple attempts:', error);
      throw error;
    }
  }

  /**
   * Safely disconnect from the database
   */
  async disconnect() {
    if (!this.prisma) return;
    
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
    }
  }
}

// Create a singleton instance
const dbManager = new DatabaseManager();
// Alias for Prisma client for legacy imports
export const db = dbManager.getPrismaClient();

// Connect to the database
dbManager.connect()
  .catch(error => {
    console.error('Initial database connection failed:', error);
  });

// Get the Prisma client
const prisma = dbManager.getPrismaClient();

// Export the Prisma client and database manager
export { prisma, dbManager };
export default prisma;
