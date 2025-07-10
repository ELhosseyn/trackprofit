#!/usr/bin/env node
/**
 * COGS Backfill Script
 * Usage: node scripts/backfill-cogs.js [shop] [--dry-run] [--days=30]
 */

import { PrismaClient } from '@prisma/client';
import { OrderCOGSService } from '../app/models/OrderCOGS.server.js';

const prisma = new PrismaClient();

const options = {
  shop: process.argv[2] || null,
  dryRun: process.argv.includes('--dry-run'),
  days: parseInt(process.argv.find(arg => arg.startsWith('--days='))?.split('=')[1] || '30'),
  help: process.argv.includes('--help') || process.argv.includes('-h')
};

function showHelp() {
  console.log(`
COGS Backfill Script

Usage: node scripts/backfill-cogs.js [shop] [options]

Arguments:
  shop            The shop domain to backfill COGS for (required)

Options:
  --dry-run       Preview what would be updated without making changes
  --days=30       Number of days to look back for orders (default: 30)
  --help, -h      Show this help message

Examples:
  node scripts/backfill-cogs.js myshop.myshopify.com --dry-run
  node scripts/backfill-cogs.js myshop.myshopify.com --days=60
  node scripts/backfill-cogs.js myshop.myshopify.com --dry-run --days=7
`);
}

async function getShopifyOrdersWithCosts(shop, days) {
  // This is a placeholder function. In a real implementation, you would:
  // 1. Get the shop's session/admin API
  // 2. Query Shopify for orders from the last X days
  // 3. For each order, get the variant costs from Shopify's inventory API
  // 4. Return the orders with cost data
  
  console.log(`📊 In a real implementation, this would fetch Shopify orders for ${shop} from the last ${days} days`);
  console.log(`⚠️  This script requires Shopify API integration to fetch actual order and cost data`);
  
  // Return mock data for demonstration
  return [
    {
      id: "12345",
      name: "#1001",
      total_price: "100.00",
      created_at: new Date().toISOString(),
      line_items: [
        {
          product_id: "prod_123",
          variant_id: "var_456",
          title: "Test Product",
          quantity: 2,
          price: "50.00",
          unitCost: 25.00 // This would come from Shopify's inventory API
        }
      ]
    }
  ];
}

async function backfillCOGS() {
  try {
    if (options.help) {
      showHelp();
      return;
    }

    if (!options.shop) {
      console.log('❌ Shop domain is required. Use --help for usage information.');
      return;
    }

    console.log(`🚀 Starting COGS backfill for ${options.shop}`);
    console.log(`📅 Looking back ${options.days} days`);
    console.log(`🔍 Dry run: ${options.dryRun}`);
    console.log('');

    const orderCOGSService = new OrderCOGSService();
    
    // Check if shop exists in sessions
    const session = await prisma.session.findFirst({
      where: { shop: options.shop }
    });

    if (!session) {
      console.log(`❌ No session found for shop: ${options.shop}`);
      console.log(`Available shops:`);
      const sessions = await prisma.session.findMany({
        select: { shop: true },
        distinct: ['shop']
      });
      sessions.forEach(s => console.log(`  - ${s.shop}`));
      return;
    }

    // Get existing COGS records to avoid duplicates
    const existingCOGS = await prisma.orderCOGS.findMany({
      where: { shop: options.shop },
      select: { orderId: true }
    });
    const existingOrderIds = new Set(existingCOGS.map(o => o.orderId));
    
    console.log(`📋 Found ${existingCOGS.length} existing COGS records`);

    // Get orders from Shopify (this would require actual Shopify API integration)
    const orders = await getShopifyOrdersWithCosts(options.shop, options.days);
    console.log(`📦 Found ${orders.length} orders to process`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const order of orders) {
      const orderId = order.id.toString();
      
      if (existingOrderIds.has(orderId)) {
        console.log(`⏭️  Skipping order ${order.name} - COGS already calculated`);
        skipped++;
        continue;
      }

      try {
        if (options.dryRun) {
          console.log(`🔍 [DRY RUN] Would calculate COGS for order ${order.name}`);
          console.log(`   Revenue: $${order.total_price}`);
          
          let totalCost = 0;
          order.line_items.forEach(item => {
            const itemCost = (item.unitCost || 0) * item.quantity;
            totalCost += itemCost;
            console.log(`   Item: ${item.title} - Qty: ${item.quantity}, Cost: $${itemCost}`);
          });
          
          console.log(`   Total Cost: $${totalCost}`);
          console.log(`   Profit: $${parseFloat(order.total_price) - totalCost}`);
          console.log('');
        } else {
          const lineItems = order.line_items.map(item => ({
            productId: item.product_id?.toString() || '',
            variantId: item.variant_id?.toString() || '',
            title: item.title || '',
            quantity: parseInt(item.quantity || 0),
            price: parseFloat(item.price || 0),
            unitCost: parseFloat(item.unitCost || 0)
          }));

          const result = await orderCOGSService.calculateAndStoreCOGS(
            options.shop,
            orderId,
            order.name,
            lineItems,
            parseFloat(order.total_price)
          );

          console.log(`✅ Processed order ${order.name} - Profit: $${result.profit.toFixed(2)}`);
        }
        
        processed++;
      } catch (error) {
        console.error(`❌ Error processing order ${order.name}:`, error.message);
        errors++;
      }
    }

    console.log('');
    console.log('📊 Summary:');
    console.log(`   Processed: ${processed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    
    if (options.dryRun) {
      console.log('');
      console.log('💡 This was a dry run. Run without --dry-run to apply changes.');
    }

  } catch (error) {
    console.error('❌ Error during COGS backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backfillCOGS();
