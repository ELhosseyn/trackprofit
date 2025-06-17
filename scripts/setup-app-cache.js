// Helper script to set up the AppCache table if it doesn't exist

/**
 * This script creates the AppCache table if it doesn't exist
 * It's meant to be run once to set up the database without requiring a full migration
 */

import { prisma } from "../app/db.server.js";

async function setupAppCache() {
  try {
    console.log('Checking if AppCache table exists...');
    
    // Try to access the appCache model
    try {
      await prisma.appCache.findFirst();
      console.log('AppCache table already exists.');
      return;
    } catch (e) {
      // Error means table likely doesn't exist
      console.log('AppCache table does not exist. Creating it now...');
    }
    
    // For SQLite, we can create the table directly
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "AppCache" (
        "key" TEXT NOT NULL PRIMARY KEY,
        "value" TEXT NOT NULL DEFAULT '',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "AppCache_updatedAt_idx" ON "AppCache"("updatedAt");
    `;
    
    console.log('AppCache table created successfully.');
    
  } catch (error) {
    console.error('Failed to set up AppCache table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAppCache().catch(console.error);
