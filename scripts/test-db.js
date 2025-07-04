import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    // Try to create a test record
    const testRecord = await prisma.session.upsert({
      where: { id: 'test-session-id' },
      update: { 
        shop: 'test-shop',
        state: 'test-state',
        accessToken: 'test-token'
      },
      create: {
        id: 'test-session-id',
        shop: 'test-shop',
        state: 'test-state',
        accessToken: 'test-token'
      }
    });
    
    console.log('Successfully wrote to database:', testRecord);
    
    // Clean up
    await prisma.session.delete({
      where: { id: 'test-session-id' }
    });
    
    console.log('Successfully deleted test record');
    
  } catch (error) {
    console.error('Error writing to database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
