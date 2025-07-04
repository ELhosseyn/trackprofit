/**
 * Asset optimization script for production builds
 * 
 * This script:
 * 1. Minifies JavaScript and CSS files
 * 2. Compresses images
 * 3. Generates asset manifests
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildDir = path.resolve(__dirname, '../build');
const publicDir = path.resolve(__dirname, '../public');

// Helper to check if dependencies are installed
async function checkDependencies() {
  const dependencies = [
    'terser',
    'csso',
    'sharp',
    'gzip-size',
    'brotli-size'
  ];
  
  try {
    for (const dep of dependencies) {
      execSync(`npm list ${dep} || npm install -D ${dep}`, { stdio: 'inherit' });
    }
  } catch (error) {
    console.error('Error installing dependencies:', error);
    process.exit(1);
  }
}

// Minify JS files
async function minifyJs(filePath) {
  try {
    const { minify } = await import('terser');
    const content = await fs.readFile(filePath, 'utf8');
    const result = await minify(content, {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true
      },
      mangle: true
    });
    await fs.writeFile(filePath, result.code);
    return { 
      path: filePath,
      originalSize: content.length,
      newSize: result.code.length
    };
  } catch (error) {
    console.error(`Error minifying JS file: ${filePath}`, error);
    return null;
  }
}

// Minify CSS files
async function minifyCss(filePath) {
  try {
    const { minify } = await import('csso');
    const content = await fs.readFile(filePath, 'utf8');
    const result = minify(content, { restructure: true }).css;
    await fs.writeFile(filePath, result);
    return {
      path: filePath,
      originalSize: content.length,
      newSize: result.length
    };
  } catch (error) {
    console.error(`Error minifying CSS file: ${filePath}`, error);
    return null;
  }
}

// Compress images
async function compressImage(filePath) {
  try {
    const sharp = (await import('sharp')).default;
    const originalSize = (await fs.stat(filePath)).size;
    
    if (filePath.endsWith('.png')) {
      await sharp(filePath)
        .png({ quality: 80, compressionLevel: 9 })
        .toFile(`${filePath}.temp`);
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      await sharp(filePath)
        .jpeg({ quality: 80 })
        .toFile(`${filePath}.temp`);
    } else {
      return null; // Skip unsupported formats
    }
    
    await fs.rename(`${filePath}.temp`, filePath);
    const newSize = (await fs.stat(filePath)).size;
    
    return {
      path: filePath,
      originalSize,
      newSize
    };
  } catch (error) {
    console.error(`Error compressing image: ${filePath}`, error);
    return null;
  }
}

// Process all files in a directory recursively
async function processDirectory(dir) {
  const results = {
    js: [],
    css: [],
    images: []
  };
  
  async function traverse(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else if (entry.isFile()) {
        if (fullPath.endsWith('.js') && !fullPath.includes('.min.js')) {
          const result = await minifyJs(fullPath);
          if (result) results.js.push(result);
        } else if (fullPath.endsWith('.css') && !fullPath.includes('.min.css')) {
          const result = await minifyCss(fullPath);
          if (result) results.css.push(result);
        } else if (/\.(jpg|jpeg|png)$/i.test(fullPath)) {
          const result = await compressImage(fullPath);
          if (result) results.images.push(result);
        }
      }
    }
  }
  
  await traverse(dir);
  return results;
}

// Generate asset manifest
async function generateManifest(results) {
  const manifest = {
    timestamp: new Date().toISOString(),
    totalSavings: {
      js: results.js.reduce((acc, item) => acc + (item.originalSize - item.newSize), 0),
      css: results.css.reduce((acc, item) => acc + (item.originalSize - item.newSize), 0),
      images: results.images.reduce((acc, item) => acc + (item.originalSize - item.newSize), 0)
    },
    files: {
      js: results.js.map(item => ({
        path: path.relative(buildDir, item.path),
        savings: Math.round((1 - item.newSize / item.originalSize) * 100) + '%'
      })),
      css: results.css.map(item => ({
        path: path.relative(buildDir, item.path),
        savings: Math.round((1 - item.newSize / item.originalSize) * 100) + '%'
      })),
      images: results.images.map(item => ({
        path: path.relative(publicDir, item.path),
        savings: Math.round((1 - item.newSize / item.originalSize) * 100) + '%'
      }))
    }
  };
  
  await fs.writeFile(
    path.join(buildDir, 'asset-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  return manifest;
}

// Optimize React components
async function optimizeJsxComponents() {
  console.log('⚙️ Optimizing React components...');
  
  // Run the ZRExpress optimization script
  try {
    console.log('Optimizing ZRExpress component...');
    execSync('node scripts/optimize-zrexpress.js', { stdio: 'inherit' });
    
    // Make a backup of the original file (if needed)
    const zrExpressPath = path.join(__dirname, '../app/routes/app.zrexpress.jsx');
    const backupDir = path.join(__dirname, '../backups');
    const backupPath = path.join(backupDir, 'app.zrexpress.jsx.backup');
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create backup if it doesn't exist
    if (!await fileExists(backupPath)) {
      const originalContent = await fs.readFile(zrExpressPath, 'utf8');
      await fs.writeFile(backupPath, originalContent);
    }
    
    // Check if the optimized file exists
    const optimizedPath = path.join(__dirname, '../build/app.zrexpress.optimized.jsx');
    if (await fileExists(optimizedPath)) {
      // Copy optimized file to routes directory
      const optimizedContent = await fs.readFile(optimizedPath, 'utf8');
      await fs.writeFile(zrExpressPath, optimizedContent);
      console.log('✅ ZRExpress component optimized successfully!');
    }
  } catch (error) {
    console.error('❌ Error optimizing ZRExpress component:', error.message);
  }
}

// Main function
async function main() {
  console.log('🚀 Starting asset optimization...');
  
  try {
    await checkDependencies();
    
    console.log('📦 Processing build directory...');
    const buildResults = await processDirectory(buildDir);
    
    console.log('📦 Processing public directory...');
    const publicResults = await processDirectory(publicDir);
    
    console.log('📦 Optimizing React components...');
    await optimizeJsxComponents();
    
    // Combine results
    const combinedResults = {
      js: [...buildResults.js],
      css: [...buildResults.css],
      images: [...buildResults.images, ...publicResults.images]
    };
    
    console.log('📝 Generating asset manifest...');
    const manifest = await generateManifest(combinedResults);
    
    // Log summary
    console.log('\n✅ Optimization complete!');
    console.log('📊 Summary:');
    console.log(`  JS files: ${combinedResults.js.length} files optimized (saved ${formatBytes(manifest.totalSavings.js)})`);
    console.log(`  CSS files: ${combinedResults.css.length} files optimized (saved ${formatBytes(manifest.totalSavings.css)})`);
    console.log(`  Images: ${combinedResults.images.length} files optimized (saved ${formatBytes(manifest.totalSavings.images)})`);
    console.log(`  Total savings: ${formatBytes(manifest.totalSavings.js + manifest.totalSavings.css + manifest.totalSavings.images)}`);
    console.log('\nAsset manifest generated at build/asset-manifest.json');
    
  } catch (error) {
    console.error('❌ Error during optimization:', error);
    process.exit(1);
  }
}

// Format bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper function to check if a file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Run the script
main();
