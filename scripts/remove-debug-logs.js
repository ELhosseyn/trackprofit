#!/usr/bin/env node

/**
 * Removes all console.log/debug/warn/error from compiled JS output
 * Intended to run after build step in production.
 */

import fs from 'fs';
import path from 'path';

const buildPath = './build/server'; // Update this if your output is elsewhere

if (!fs.existsSync(buildPath)) {
  console.warn(`⚠️  Skipping debug log removal: '${buildPath}' not found.`);
  process.exit(0); // Don’t treat as error
}

const walk = (dir, callback) => {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, callback);
    } else if (file.endsWith('.js')) {
      callback(fullPath);
    }
  });
};

const removeConsoleLogs = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  const newContent = content.replace(/console\.(log|debug|warn|error)\(.*?\);?/g, '');
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`🧹 Cleaned console logs in: ${filePath}`);
  }
};

console.log('🧹 Removing console logs from built JS files...');
walk(buildPath, removeConsoleLogs);
console.log('✅ Log cleanup complete.');
