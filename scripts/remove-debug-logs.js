#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

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

console.log('🧹 Removing console logs from JS files...');
walk('./build', removeConsoleLogs);
console.log('✅ Console log cleanup complete.');
