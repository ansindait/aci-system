import { useState, useMemo } from "react";

interface UsePaginationProps {
  data: any[];
  itemsPerPage?: number;
}

interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  paginatedData: any[];
  startItem: number;
  endItem: number;
  totalItems: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
}

export const usePagination = ({
  data,
  itemsPerPage = 25,
}: UsePaginationProps): UsePaginationReturn => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Calculate the slice of data to display
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);
  
  // Calculate the range of items being displayed
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  // Navigation functions
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const goToFirstPage = () => {
    setCurrentPage(1);
  };
  
  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };
  
  // Reset to first page when data changes
  useMemo(() => {
    setCurrentPage(1);
  }, [data.length]);
  
  return {
    currentPage,
    totalPages,
    paginatedData,
    startItem,
    endItem,
    totalItems,
    goToPage,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
  };
}; 