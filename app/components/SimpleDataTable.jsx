import { DataTable } from '@shopify/polaris';

/**
 * A simple fallback component that uses standard Shopify DataTable
 * This is a simplified version without virtualization to avoid
 * server/client hydration issues
 */
const SimpleDataTable = ({
  columnContentTypes = [],
  headings = [],
  rows = [],
  footerContent = null,
}) => {
  // Ensure data is properly formatted for server-side rendering
  const safeRows = rows.map(row => 
    Array.isArray(row) ? row : []
  );
  
  const safeHeadings = headings.map(heading => 
    typeof heading === 'string' ? heading : String(heading)
  );

  return (
    <div className="SimpleDataTable">
      <DataTable
        columnContentTypes={columnContentTypes}
        headings={safeHeadings}
        rows={safeRows}
        footerContent={footerContent}
        increasedTableDensity
        hasZebraStriping={false}
      />
    </div>
  );
}

// Export as both default and named export for better compatibility
export { SimpleDataTable };
export default SimpleDataTable;
