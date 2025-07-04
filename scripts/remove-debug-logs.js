#!/usr/bin/env node

/**
 * Remove Debug Logs Script
 * 
 * This script removes debug logging and console statements from production builds
 * to improve performance and security.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

console.log('🧹 Starting debug log cleanup for production...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_DIR = path.resolve(__dirname, '../app');

// Files to process
const filesToProcess = [
  'app/routes/app.orders.jsx',
  'app/routes/app.zrexpress.jsx',
  'app/routes/app.zrexpress.new.jsx',
  'app/routes/app._index.jsx',
  'app/routes/app.products.jsx',
  'app/services/zrexpress.server.js',
  'app/utils/performance.js',
  'app/db.server.js',
  'vite.config.js'
];

// Patterns to remove/replace
const patterns = [
  {
    // Remove standalone console.log statements
    pattern: /^\s*console\.log\([^;]*\);\s*$/gm,
    replacement: '',
    description: 'Remove standalone console.log statements'
  },
  {
    // Remove console.debug statements
    pattern: /^\s*console\.debug\([^;]*\);\s*$/gm,
    replacement: '',
    description: 'Remove console.debug statements'
  },
  {
    // Remove debug useEffect statements
    pattern: /^\s*\/\/ Debug state changes[\s\S]*?useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);\s*$/gm,
    replacement: '',
    description: 'Remove debug useEffect statements'
  },
  {
    // Wrap remaining console statements with production check
    pattern: /(\s*)(console\.(log|debug|warn)\([^)]*\));/g,
    replacement: '$1if (process.env.NODE_ENV !== "production") { $2 }',
    description: 'Wrap console statements with production check'
  }
];

// Performance-specific patterns
const performancePatterns = [
  {
    // Remove performance logging in production
    pattern: /if \(process\.env\.NODE_ENV !== 'production'\) \{\s*console\.log\([^}]*\}\s*/g,
    replacement: '',
    description: 'Remove performance console logs'
  },
  {
    // Update performance.js to be production-safe
    pattern: /console\.log\(`Performance Mark: \$\{name\} at \$\{performance\.now\(\)\.toFixed\(2\)\}ms`\);/g,
    replacement: '',
    description: 'Remove performance mark logging'
  }
];

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const originalLength = content.length;

  console.log(`📝 Processing: ${filePath}`);

  // Apply general patterns
  patterns.forEach(({ pattern, replacement, description }) => {
    const beforeLength = content.length;
    content = content.replace(pattern, replacement);
    if (content.length !== beforeLength) {
      console.log(`   ✓ ${description}`);
      modified = true;
    }
  });

  // Apply performance-specific patterns
  if (filePath.includes('performance.js')) {
    performancePatterns.forEach(({ pattern, replacement, description }) => {
      const beforeLength = content.length;
      content = content.replace(pattern, replacement);
      if (content.length !== beforeLength) {
        console.log(`   ✓ ${description}`);
        modified = true;
      }
    });
  }

  // Special handling for specific files
  if (filePath.includes('zrexpress.server.js')) {
    // Remove extensive debug logging
    content = content.replace(/console\.log\('Getting shipment statuses for shop:', shop\);/g, '');
    content = content.replace(/console\.log\('Date range:', dateRange\);/g, '');
    content = content.replace(/console\.log\('Sending status request to ZRExpress:'[^;]*\);/g, '');
    content = content.replace(/console\.log\('ZRExpress status response:'[^;]*\);/g, '');
    content = content.replace(/console\.log\('Shipment dates:'[^;]*\);/g, '');
    modified = true;
  }

  if (filePath.includes('app.orders.jsx')) {
    // Remove debug state logging
    content = content.replace(/\/\/ Debug state changes[\s\S]*?useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);\s*/g, '');
    content = content.replace(/useEffect\(\(\) => \{[\s\S]*?console\.log\('State changed:'[\s\S]*?\}, \[[^\]]*\]\);\s*/g, '');
    modified = true;
  }

  if (filePath.includes('vite.config.js')) {
    // Remove source maps in production
    content = content.replace(/sourcemap: true,/, 'sourcemap: process.env.NODE_ENV !== "production",');
    modified = true;
  }

  if (modified) {
    // Create backup before modifying
    const backupPath = filePath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
    }

    fs.writeFileSync(filePath, content);
    const savedBytes = originalLength - content.length;
    console.log(`   💾 Saved ${savedBytes} bytes`);
    return true;
  }

  return false;
}

// Process all files
let totalProcessed = 0;
let totalModified = 0;

filesToProcess.forEach(file => {
  const fullPath = path.resolve(__dirname, '..', file);
  totalProcessed++;
  if (processFile(fullPath)) {
    totalModified++;
  }
});

// Update package.json scripts for production
const packageJsonPath = path.resolve(__dirname, '../package.json');
if (fs.existsSync(packageJsonPath)) {
  console.log('📝 Updating package.json scripts...');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add production build script that removes debug logs
  packageJson.scripts['build:prod'] = 'npm run remove-debug && npm run build';
  packageJson.scripts['remove-debug'] = 'node scripts/remove-debug-logs.js';
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('   ✓ Added production build scripts');
}

// Update Dockerfile to disable debug
const dockerfilePath = path.resolve(__dirname, '../Dockerfile');
if (fs.existsSync(dockerfilePath)) {
  console.log('📝 Updating Dockerfile...');
  let dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
  
  // Ensure NODE_ENV is set to production
  if (!dockerfile.includes('ENV NODE_ENV=production')) {
    dockerfile = dockerfile.replace(/ENV NODE_ENV=production/, 'ENV NODE_ENV=production\nENV DEBUG=false');
  } else {
    dockerfile = dockerfile.replace(/ENV NODE_ENV=production/, 'ENV NODE_ENV=production\nENV DEBUG=false');
  }
  
  fs.writeFileSync(dockerfilePath, dockerfile);
  console.log('   ✓ Updated Dockerfile to disable debug');
}

console.log('\n📊 Summary:');
console.log(`   Files processed: ${totalProcessed}`);
console.log(`   Files modified: ${totalModified}`);
console.log('\n✅ Debug log cleanup complete!');
console.log('\n📚 To restore original files, use the .backup files created.');
console.log('🚀 Your app is now optimized for production deployment.');
