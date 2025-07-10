#!/usr/bin/env node

/**
 * Production Build Optimizer
 *
 * 1. Build the app
 * 2. Remove console logs from build output
 * 3. Optimize assets (optional)
 * 4. Write .env.production
 * 5. Ensure production start script exists
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting production build optimization...');

process.env.NODE_ENV = 'production';

try {
  // Step 1: Build the app
  console.log('🔨 Step 1: Building application...');
  process.env.SOURCE_MAP = 'false';
  execSync('npm run build', { stdio: 'inherit' });

  // Step 2: Clean debug logs
  console.log('📝 Step 2: Cleaning debug logs...');
  execSync('node scripts/remove-debug-logs.js', { stdio: 'inherit' });

  // Step 3: Optimize assets
  console.log('⚡ Step 3: Optimizing assets...');
  try {
    execSync('node scripts/optimize-assets.js', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  Asset optimization skipped (optional script missing)');
  }

  // Step 4: Set environment
  console.log('🔧 Step 4: Creating .env.production file...');
  const envContent = `NODE_ENV=production
DEBUG=false
SHOPIFY_APP_ENV=production
VITE_NODE_ENV=production
GENERATE_SOURCEMAP=false`;

  fs.writeFileSync('.env.production', envContent);
  console.log('   ✓ .env.production created');

  // Step 5: Ensure start:prod exists
  const pkgPath = './package.json';
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  if (!pkg.scripts['start:prod']) {
    pkg.scripts['start:prod'] = 'NODE_ENV=production npm run start';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log('   ✓ Added start:prod script to package.json');
  }

  console.log('\n✅ Production build complete and optimized!');
} catch (error) {
  console.error('❌ Production build failed:', error.message);
  process.exit(1);
}
