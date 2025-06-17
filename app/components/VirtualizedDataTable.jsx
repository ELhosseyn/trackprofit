import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Text, Spinner } from '@shopify/polaris';

/**
 * VirtualizedDataTable component for efficiently rendering large datasets
 * This is an optimized alternative to the standard DataTable for large datasets
 */
export default function VirtualizedDataTable({
  columnContentTypes = [],
  headings = [],
  rows = [],
  rowHeight = 48,
  footerContent = null,
  emptyState = null,
  visibleRowCount = 20,
  overscanRowCount = 10,
  virtualized = true,
  sortable = false,
  defaultSortDirection = 'asc',
  defaultSortColumnIndex = null,
  onSort = null,
}) {
  const [sortedRows, setSortedRows] = useState(rows);
  const [sortColumnIndex, setSortColumnIndex] = useState(defaultSortColumnIndex);
  const [sortDirection, setSortDirection] = useState(defaultSortDirection);
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: visibleRowCount });
  const containerRef = useRef(null);
  const tableBodyRef = useRef(null);
  
  // Calculate visible rows based on scroll position
  const updateVisibleRange = useCallback(() => {
    if (!virtualized || !containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscanRowCount);
    const endIndex = Math.min(
      sortedRows.length - 1,
      Math.ceil((scrollTop + containerRef.current.clientHeight) / rowHeight) + overscanRowCount
    );
    
    setVisibleRange({ startIndex, endIndex });
  }, [virtualized, rowHeight, overscanRowCount, sortedRows.length]);
  
  // Handle sorting when column header is clicked
  const handleSort = useCallback((columnIndex) => {
    if (!sortable || !onSort) return;
    
    const newDirection = 
      sortColumnIndex === columnIndex && sortDirection === 'asc' ? 'desc' : 'asc';
    
    setSortColumnIndex(columnIndex);
    setSortDirection(newDirection);
    
    // Call the onSort callback to let parent component handle sorting
    onSort(columnIndex, newDirection);
  }, [sortable, onSort, sortColumnIndex, sortDirection]);
  
  // Update sorted rows when props change
  useEffect(() => {
    setSortedRows(rows);
  }, [rows]);
  
  // Add scroll event listener
  useEffect(() => {
    const container = containerRef.current;
    if (container && virtualized) {
      updateVisibleRange();
      container.addEventListener('scroll', updateVisibleRange);
      window.addEventListener('resize', updateVisibleRange);
      
      return () => {
        container.removeEventListener('scroll', updateVisibleRange);
        window.removeEventListener('resize', updateVisibleRange);
      };
    }
  }, [updateVisibleRange, virtualized]);
  
  // Render visible rows for virtualized table
  const renderRows = () => {
    if (!sortedRows.length) {
      return (
        <tr>
          <td colSpan={headings.length} style={{ textAlign: 'center', padding: '16px' }}>
            {emptyState || <Text variant="bodyMd">No items to display</Text>}
          </td>
        </tr>
      );
    }
    
    if (!virtualized) {
      // Render all rows for non-virtualized mode
      return sortedRows.map((row, rowIndex) => (
        <tr key={rowIndex}>
          {row.map((cell, cellIndex) => (
            <td key={cellIndex} className={getColumnClassName(columnContentTypes[cellIndex])}>
              {cell}
            </td>
          ))}
        </tr>
      ));
    }
    
    // For virtualized mode, we render only visible rows
    const { startIndex, endIndex } = visibleRange;
    const visibleRows = [];
    
    // Add spacer before visible rows
    if (startIndex > 0) {
      visibleRows.push(
        <tr key="spacer-top" style={{ height: `${startIndex * rowHeight}px` }} />
      );
    }
    
    // Add visible rows
    for (let i = startIndex; i <= endIndex && i < sortedRows.length; i++) {
      visibleRows.push(
        <tr key={i} style={{ height: `${rowHeight}px` }}>
          {sortedRows[i].map((cell, cellIndex) => (
            <td key={cellIndex} className={getColumnClassName(columnContentTypes[cellIndex])}>
              {cell}
            </td>
          ))}
        </tr>
      );
    }
    
    // Add spacer after visible rows
    if (endIndex < sortedRows.length - 1) {
      visibleRows.push(
        <tr 
          key="spacer-bottom" 
          style={{ height: `${(sortedRows.length - endIndex - 1) * rowHeight}px` }} 
        />
      );
    }
    
    return visibleRows;
  };
  
  // Helper function to get CSS class for column based on content type
  const getColumnClassName = (contentType) => {
    switch (contentType) {
      case 'text':
        return 'text-column';
      case 'numeric':
        return 'numeric-column';
      default:
        return '';
    }
  };
  
  // Render column headers
  const renderHeaders = () => {
    return headings.map((heading, index) => (
      <th 
        key={index}
        className={`${getColumnClassName(columnContentTypes[index])} ${sortable ? 'sortable-column' : ''}`}
        onClick={sortable ? () => handleSort(index) : undefined}
      >
        <div className="heading-container">
          {heading}
          {sortable && sortColumnIndex === index && (
            <span className={`sort-icon ${sortDirection}`}>
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </div>
      </th>
    ));
  };
  
  return (
    <Card>
      <div 
        className="virtualized-table-container" 
        ref={containerRef}
        style={{ 
          maxHeight: virtualized ? `${rowHeight * visibleRowCount + 50}px` : 'auto',
          overflow: 'auto'
        }}
      >
        <table className="virtualized-data-table">
          <thead>
            <tr>{renderHeaders()}</tr>
          </thead>
          <tbody ref={tableBodyRef}>
            {renderRows()}
          </tbody>
        </table>
      </div>
      
      {footerContent && (
        <div className="virtualized-table-footer">
          {footerContent}
        </div>
      )}
      
      <style jsx>{`
        .virtualized-table-container {
          width: 100%;
          position: relative;
        }
        
        .virtualized-data-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        
        .virtualized-data-table th, 
        .virtualized-data-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f1f1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .virtualized-data-table th {
          background-color: #f9fafb;
          font-weight: 600;
          text-align: left;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        
        .virtualized-data-table .text-column {
          text-align: left;
        }
        
        .virtualized-data-table .numeric-column {
          text-align: right;
        }
        
        .virtualized-table-footer {
          padding: 12px 16px;
          border-top: 1px solid #f1f1f1;
        }
        
        .sortable-column {
          cursor: pointer;
        }
        
        .sortable-column:hover {
          background-color: #f4f6f8;
        }
        
        .heading-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .sort-icon {
          margin-left: 8px;
          font-size: 10px;
        }
        
        .sort-icon.asc {
          color: #5c6ac4;
        }
        
        .sort-icon.desc {
          color: #5c6ac4;
        }
      `}</style>
    </Card>
  );
}
