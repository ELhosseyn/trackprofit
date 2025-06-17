#!/usr/bin/env node

/**
 * ZRExpress Fix Script
 * This script fixes syntax issues in the ZRExpress component file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('🔧 Starting ZRExpress fix process...');

// Set up paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_DIR = path.resolve(__dirname, '../app');
const BACKUP_DIR = path.resolve(__dirname, '../backups');
const ZREXPRESS_PATH = path.join(APP_DIR, 'routes/app.zrexpress.jsx');
const BACKUP_PATH = path.join(BACKUP_DIR, 'app.zrexpress.jsx.backup');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Create a backup if it doesn't already exist
if (!fs.existsSync(BACKUP_PATH)) {
  console.log('📦 Creating backup of original file...');
  fs.copyFileSync(ZREXPRESS_PATH, BACKUP_PATH);
}

// Get the original file content
let fileContent = fs.readFileSync(ZREXPRESS_PATH, 'utf8');

// 1. Remove duplicate loader code
console.log('🔍 Fixing duplicate loader code...');
const loaderStartRegex = /export const loader = async \(\{ request \}\) => \{/g;
const loaderMatches = [...fileContent.matchAll(loaderStartRegex)];

if (loaderMatches.length > 1) {
  console.log(`Found ${loaderMatches.length} loader functions - removing duplicates`);
  
  // Keep only the first instance of the loader function
  const firstLoaderStart = loaderMatches[0].index;
  const secondLoaderStart = loaderMatches[1].index;
  
  // Find the end of the first loader function (matching closing brace)
  let braceCount = 1;
  let endIndex = firstLoaderStart + 'export const loader = async ({ request }) => {'.length;
  
  while (braceCount > 0 && endIndex < secondLoaderStart) {
    if (fileContent[endIndex] === '{') braceCount++;
    else if (fileContent[endIndex] === '}') braceCount--;
    endIndex++;
  }
  
  // Only keep the first loader function
  fileContent = fileContent.substring(0, endIndex) + fileContent.substring(secondLoaderStart);
}

// 2. Fix variable redeclarations
console.log('🔍 Fixing variable redeclarations...');
const redeclarationFixes = [
  {
    pattern: /const handleCityChange\s*=\s*useCallback\([\s\S]*?\);\s*[\s\S]*?const handleCityChange\s*=\s*\(value\)/g,
    replacement: 'const handleCityChange = useCallback('
  },
  {
    pattern: /const handleFileSelect\s*=\s*useCallback\([\s\S]*?\);\s*[\s\S]*?const handleFileSelect\s*=\s*\(e\)/g,
    replacement: 'const handleFileSelect = useCallback('
  },
  {
    pattern: /const handleFileUpload\s*=\s*useCallback\([\s\S]*?\);\s*[\s\S]*?const handleFileUpload\s*=\s*\(\)/g,
    replacement: 'const handleFileUpload = useCallback('
  },
  {
    pattern: /const handleCustomDateApply\s*=\s*useCallback\([\s\S]*?\);\s*[\s\S]*?const handleCustomDateApply\s*=\s*\(\{/g,
    replacement: 'const handleCustomDateApply = useCallback(({'
  }
];

redeclarationFixes.forEach(fix => {
  if (fileContent.match(fix.pattern)) {
    console.log(`Fixing redeclaration for ${fix.pattern.toString().substring(0, 30)}...`);
    fileContent = fileContent.replace(fix.pattern, fix.replacement);
  }
});

// 3. Add missing handleShipmentSubmit function if not present
console.log('🔍 Checking for missing functions...');
if (!fileContent.includes('handleShipmentSubmit')) {
  console.log('Adding missing handleShipmentSubmit function');
  
  // Find a good place to insert the function
  const insertPosition = fileContent.indexOf('const handleCredentialsSubmit = useCallback(');
  if (insertPosition !== -1) {
    const shipmentSubmitFunction = `
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
    fileContent = fileContent.slice(0, insertPosition) + shipmentSubmitFunction + fileContent.slice(insertPosition);
  }
}

// 4. Standardize toast message handling
console.log('🔍 Standardizing toast message handling...');
fileContent = fileContent.replace(
  /setToastMessage\(t\('zrExpress\.dataUpdatedSuccess'\)\);/g, 
  `setToastMessage({
    content: t('zrExpress.dataUpdatedSuccess'),
    error: false
  });`
);

fileContent = fileContent.replace(
  /setToastMessage\(actionData\.error\);/g, 
  `setToastMessage({
    content: actionData.error,
    error: true
  });`
);

// 5. Add cache headers to json responses
console.log('🔍 Adding cache headers to responses...');
fileContent = fileContent.replace(
  /return json\((.*?)\);/g,
  'return json($1, {\n    headers: {\n      "Cache-Control": "private, max-age=30"\n    }\n  });'
);

// Save the fixed file
fs.writeFileSync(ZREXPRESS_PATH, fileContent);

console.log('✅ ZRExpress component has been fixed successfully!');
console.log('🚀 You can now run the development server.');
