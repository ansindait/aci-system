# Pagination Components Documentation

This document explains how to use the pagination components in your application.

## Components Overview

### 1. Pagination Component (`Pagination.tsx`)

A reusable pagination component that provides navigation controls and status information.

### 2. usePagination Hook (`usePagination.ts`)

A custom React hook that manages pagination state and data slicing logic.

## Features

- **Row Limit**: Displays 25 rows per page (configurable)
- **Navigation Controls**: Previous/Next buttons with proper disabled states
- **Page Indicators**: Shows current page range and total records
- **Responsive Design**: Works on all screen sizes
- **TypeScript Support**: Fully typed for better development experience

## Usage

### Basic Implementation

```tsx
import React, { useState } from "react";
import Pagination from "@/app/components/Pagination";
import { usePagination } from "@/app/hooks/usePagination";

const MyTableComponent = () => {
  const [data, setData] = useState<YourDataType[]>([]);

  // Apply any filters to your data
  const filteredData = data.filter(/* your filter logic */);

  // Use the pagination hook
  const {
    currentPage,
    totalPages,
    paginatedData,
    startItem,
    endItem,
    totalItems,
    goToPage,
  } = usePagination({
    data: filteredData,
    itemsPerPage: 25, // Optional, defaults to 25
  });

  return (
    <div>
      {/* Your table */}
      <table>
        <thead>{/* Your table headers */}</thead>
        <tbody>
          {paginatedData.map((row, index) => (
            <tr key={row.id}>{/* Your table cells */}</tr>
          ))}
        </tbody>
      </table>

      {/* Pagination component */}
      <Pagination
        data={filteredData}
        currentPage={currentPage}
        onPageChange={goToPage}
        itemsPerPage={25}
      />
    </div>
  );
};
```

### Advanced Implementation with Filters

```tsx
const AdvancedTableComponent = () => {
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
  });

  // Apply filters
  const filteredData = data.filter((row) => {
    if (
      filters.search &&
      !row.name.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }
    if (filters.category && row.category !== filters.category) {
      return false;
    }
    if (filters.status && row.status !== filters.status) {
      return false;
    }
    return true;
  });

  // Use pagination
  const {
    currentPage,
    paginatedData,
    startItem,
    endItem,
    totalItems,
    goToPage,
  } = usePagination({
    data: filteredData,
    itemsPerPage: 25,
  });

  return (
    <div>
      {/* Filters */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        {/* Other filters */}
      </div>

      {/* Record count */}
      <div className="text-sm text-gray-600 mb-4">
        Showing {startItem}-{endItem} of {totalItems} records
      </div>

      {/* Table */}
      <table>{/* Your table content using paginatedData */}</table>

      {/* Pagination */}
      <Pagination
        data={filteredData}
        currentPage={currentPage}
        onPageChange={goToPage}
        itemsPerPage={25}
      />
    </div>
  );
};
```

## Props

### Pagination Component Props

| Prop           | Type                     | Required | Default | Description                  |
| -------------- | ------------------------ | -------- | ------- | ---------------------------- |
| `data`         | `any[]`                  | Yes      | -       | The full dataset to paginate |
| `currentPage`  | `number`                 | Yes      | -       | Current page number          |
| `onPageChange` | `(page: number) => void` | Yes      | -       | Callback when page changes   |
| `itemsPerPage` | `number`                 | No       | `25`    | Number of items per page     |
| `className`    | `string`                 | No       | `""`    | Additional CSS classes       |

### usePagination Hook Return Values

| Property        | Type                     | Description                           |
| --------------- | ------------------------ | ------------------------------------- |
| `currentPage`   | `number`                 | Current page number                   |
| `totalPages`    | `number`                 | Total number of pages                 |
| `paginatedData` | `any[]`                  | Data for current page                 |
| `startItem`     | `number`                 | First item number on current page     |
| `endItem`       | `number`                 | Last item number on current page      |
| `totalItems`    | `number`                 | Total number of items                 |
| `goToPage`      | `(page: number) => void` | Function to navigate to specific page |
| `nextPage`      | `() => void`             | Function to go to next page           |
| `previousPage`  | `() => void`             | Function to go to previous page       |
| `goToFirstPage` | `() => void`             | Function to go to first page          |
| `goToLastPage`  | `() => void`             | Function to go to last page           |

## Styling

The pagination component uses Tailwind CSS classes and can be customized by:

1. **Adding custom classes** via the `className` prop
2. **Modifying the component** directly in `Pagination.tsx`
3. **Using CSS overrides** for specific styling needs

## Best Practices

1. **Always use the hook**: The `usePagination` hook handles all the complex logic
2. **Filter before paginating**: Apply filters to your full dataset, then paginate
3. **Reset pagination on filter changes**: The hook automatically resets to page 1 when data changes
4. **Export all filtered data**: When exporting, use the filtered data, not just the current page
5. **Show loading states**: Display loading indicators while data is being fetched

## Example Files

- `PaginatedTableExample.tsx` - Complete example with filters and pagination
- `page.tsx` (site details) - Real implementation in your existing codebase

## Integration with Existing Code

The pagination has been integrated into your existing site details page (`src/app/project/rpm/site/details/page.tsx`). Key changes:

1. Imported the pagination components
2. Added the `usePagination` hook
3. Updated the table to use `paginatedData`
4. Added the pagination component at the bottom
5. Updated the record count display

The pagination will automatically work with your existing filters and maintain all current functionality.
