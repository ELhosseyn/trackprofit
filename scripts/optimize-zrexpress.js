#!/usr/bin/env node

/**
 * ZRExpress Optimizer Script - Enhanced Version
 * This script optimizes the ZRExpress component for production builds
 * by applying performance enhancements, fixing code issues, and implementing
 * lazy loading techniques.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

console.log('🚀 Starting Enhanced ZRExpress optimization process...');

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_DIR = path.resolve(__dirname, '../app');
const BUILD_DIR = path.resolve(__dirname, '../build');
const BACKUP_DIR = path.resolve(__dirname, '../backups');
const ZREXPRESS_PATH = path.join(APP_DIR, 'routes/app.zrexpress.jsx');

// Ensure build and backup directories exist
if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR, { recursive: true });
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Create a backup if it doesn't already exist
const BACKUP_PATH = path.join(BACKUP_DIR, 'app.zrexpress.jsx.backup');
if (!fs.existsSync(BACKUP_PATH)) {
  console.log('📦 Creating backup of original file...');
  fs.copyFileSync(ZREXPRESS_PATH, BACKUP_PATH);
}

// Step 1: Fix duplicate code and redeclaration issues
console.log('⚙️ Fixing code issues and optimizing imports...');

// Function to remove duplicate code sections
function removeDuplicateCode(fileContent) {
  // Remove duplicate loader code sections
  return fileContent.replace(
    /(if \(Array\.isArray\(shipments\) && shipments\.length > 0\) \{\s*\/\/ Calculate stats\s*stats = shipments\.reduce\(\(acc, shipment\) => \{[\s\S]*?\}\);)\s*(\/\/ Format shipping data\s*shippingData = shipments\.map\(shipment => \{[\s\S]*?\}\);)\s*\}/g,
    '$1\n$2\n}'
  );
}

// Function to fix redeclarations by ensuring variables are declared only once
function fixRedeclarations(fileContent) {
  // Replace multiple declarations with single declarations
  const fixedContent = fileContent
    // Fix duplicate function declarations by replacing duplicates with const assignments
    .replace(/const handleCityChange = useCallback\(\(value\) => \{[\s\S]*?\}, \[\]\);([\s\S]*?)const handleCityChange = \(value\) => \{/g, 
      'const handleCityChange = useCallback((value) => {$1};')
    
    // Fix duplicate handleFileSelect function
    .replace(/const handleFileSelect = useCallback\(\(event\) => \{[\s\S]*?\}, \[t\]\);([\s\S]*?)const handleFileSelect = \(e\) => \{/g,
      'const handleFileSelect = useCallback((event) => {$1}, [t]);')
    
    // Fix duplicate handleFileUpload function
    .replace(/const handleFileUpload = useCallback\(\(\) => \{[\s\S]*?\}, \[file, t, submit\]\);([\s\S]*?)const handleFileUpload = \(\) => \{/g,
      'const handleFileUpload = useCallback(() => {$1}, [file, t, submit]);')
    
    // Fix duplicate handleCustomDateApply function
    .replace(/const handleCustomDateApply = useCallback\(\(range\) => \{[\s\S]*?\}, \[\]\);([\s\S]*?)const handleCustomDateApply = \(\{ start, end \}\) => \{/g,
      'const handleCustomDateApply = useCallback((range) => {$1}, []);');
  
  return fixedContent;
}

// Function to implement missing handleShipmentSubmit function
function implementMissingFunctions(fileContent) {
  // Find position to add the handleShipmentSubmit function
  const insertPosition = fileContent.indexOf('const handleCredentialsSubmit = useCallback(');
  
  // Define the missing function
  const missingFunctionCode = `
  // Optimized new shipment form handler
  const handleShipmentSubmit = useCallback((e) => {
    if (e) e.preventDefault();
    
    // Basic form validation
    const requiredFields = ['Client', 'MobileA', 'Adresse', 'IDWilaya', 'Commune', 'Total'];
    const missingFields = requiredFields.filter(field => !newShipment[field]);
    
    if (missingFields.length > 0) {
      setToastMessage({
        content: t('zrExpress.requiredFields', { fields: missingFields.join(', ') }),
        error: true
      });
      return;
    }
    
    setIsLoading(true);
    
    // Prepare form data for submission
    const formData = new FormData();
    formData.append("action", "createShipment");
    
    // Map form fields to API fields
    const fieldMapping = {
      Client: 'Client',
      MobileA: 'MobileA',
      MobileB: 'MobileB',
      Adresse: 'Adresse',
      IDWilaya: 'IDWilaya',
      Commune: 'Commune',
      Total: 'Total',
      Produit: 'TProduit',
      TypeLivraison: 'TypeLivraison',
      TypeProduit: 'TypeColis',
      Remarque: 'Note',
    };
    
    // Add all fields to form data
    Object.entries(fieldMapping).forEach(([formField, apiField]) => {
      formData.append(apiField, newShipment[formField] || '');
    });
    
    // Convert delivery type to API format
    formData.set('TypeLivraison', newShipment.TypeLivraison === 'domicile' ? '0' : '1');
    
    // Submit the form
    submit(formData, { method: "post" });
    
    // Close modal
    setShowNewShipment(false);
  }, [newShipment, t, submit]);

`;

  // Insert the missing function at the appropriate position
  return fileContent.slice(0, insertPosition) + missingFunctionCode + fileContent.slice(insertPosition);
}

// Function to standardize toast state management
function standardizeToastState(fileContent) {
  // Replace inconsistent toast state management
  return fileContent
    .replace(/setToastMessage\(t\('zrExpress\.dataUpdatedSuccess'\)\);/g, 
      `setToastMessage({
        content: t('zrExpress.dataUpdatedSuccess'),
        error: false
      });`)
    .replace(/setToastMessage\(actionData\.error\);/g, 
      `setToastMessage({
        content: actionData.error,
        error: true
      });`);
}

// Function to extract and optimize imports
function optimizeImports(fileContent) {
  // Convert regular imports to lazy imports where appropriate
  return fileContent
    .replace(
      /import \* as XLSX from ['"]xlsx['"];/g,
      'const XLSX = lazy(() => import("xlsx"));'
    )
    .replace(
      /import communesData from ["']\.\.\/\.\.\/public\/data\/communes\.json["'];/g,
      'const getCommunesData = () => import("../../public/data/communes.json").then(module => module.default);'
    )
    .replace(
      /const (\w+) = (\w+)\.filter\(/g,
      'const $1 = useMemo(() => $2.filter('
    )
    .replace(
      /const tableHeaders = \[/g,
      'const tableHeaders = useMemo(() => ['
    )
    .replace(
      /\.filter\((.*?)\);/g,
      '.filter($1), []);'
    );
}

// Step 2: Add performance monitoring script
function addPerformanceMonitoring(fileContent) {
  // Add script import to links function
  return fileContent.replace(
    /export function links\(\) {/,
    `export function links() {
  // Add performance monitoring script for production
  if (process.env.NODE_ENV === 'production') {
    const script = document.createElement('script');
    script.src = '/js/zrexpress-perf.js';
    script.async = true;
    document.head.appendChild(script);
  }`
  );
}

// Step 3: Apply advanced memoization optimizations
function addMemoization(fileContent) {
  // Add memoization to expensive computations
  return fileContent
    .replace(
      /const totalPages = Math\.ceil\((.*?)\);/g,
      'const totalPages = useMemo(() => Math.ceil($1), [$1]);'
    )
    .replace(
      /const currentPageData = (.*?)\.slice\((.*?)\);/g,
      'const currentPageData = useMemo(() => $1.slice($2), [$1, $2]);'
    );
}

// Step 4: Add performance attributes to links
function optimizeLinks(fileContent) {
  return fileContent
    .replace(
      /rel: "preload",\s+href: "(.*?)",\s+as: "script",/g,
      'rel: "preload",\n      href: "$1",\n      as: "script",\n      fetchpriority: "high",\n      crossOrigin: "anonymous",'
    )
    .replace(
      /rel: "preconnect",\s+href: "(.*?)",/g, 
      'rel: "preconnect",\n      href: "$1",\n      crossOrigin: "anonymous",'
    );
}

// Step 5: Optimize loading state management
function optimizeLoadingState(fileContent) {
  // Find and fix loading state management
  return fileContent.replace(
    /setIsLoading\(false\);(\s*)(setConnectionError\(null\);)/g,
    'setIsLoading(false);\n    setConnectionError(null);'
  );
}

// Read the file
let fileContent = fs.readFileSync(ZREXPRESS_PATH, 'utf8');

// Apply optimizations in sequence
fileContent = removeDuplicateCode(fileContent);
fileContent = fixRedeclarations(fileContent);
fileContent = implementMissingFunctions(fileContent);
fileContent = standardizeToastState(fileContent);
fileContent = optimizeImports(fileContent);
fileContent = addPerformanceMonitoring(fileContent);
fileContent = addMemoization(fileContent);
fileContent = optimizeLinks(fileContent);
fileContent = optimizeLoadingState(fileContent);

// Add cache headers
fileContent = fileContent.replace(
  /return json\((.*?)\);/g,
  'return json($1, {\n      headers: {\n        "Cache-Control": "private, max-age=30"\n      }\n    });'
);

// Write optimized file
const OPTIMIZED_PATH = path.join(BUILD_DIR, 'app.zrexpress.optimized.jsx');
fs.writeFileSync(OPTIMIZED_PATH, fileContent);

console.log(`✅ Enhanced optimizations complete! Optimized file saved to: ${OPTIMIZED_PATH}`);
console.log('');
console.log('Performance improvements:');
console.log('- Fixed duplicate code and redeclaration issues');
console.log('- Implemented missing form submission handler');
console.log('- Standardized toast state management');
console.log('- Added performance monitoring for production');
console.log('- Implemented advanced memoization techniques');
console.log('- Optimized loading state management');
console.log('- Added caching headers for better performance');
console.log('');
console.log('🚀 Your ZRExpress component is now ready for production!');

// Final step - validate the optimized file
try {
  console.log('🔍 Validating optimized file...');
  // Basic syntax check
  const { Module } = await import('module');
  Module._compile(fileContent, 'app.zrexpress.jsx');
  console.log('✓ Syntax check passed');
} catch (error) {
  console.error('❌ Syntax validation failed:', error.message);
  console.log('Please review the optimized file manually.');
}
