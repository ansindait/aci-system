"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  data: any[];
  currentPage: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  data,
  currentPage,
  onPageChange,
  itemsPerPage = 25,
  className = "",
}) => {
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Calculate the range of items being displayed
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  // Handle page navigation
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };
  
  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };
  
  // If no data or only one page, don't render pagination
  if (totalItems === 0 || totalPages <= 1) {
    return null;
  }
  
  return (
    <div className={`flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 ${className}`}>
      {/* Records info */}
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-700">
          Showing {startItem}-{endItem} of {totalItems} records
        </div>
        <div className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </div>
      </div>
      
      {/* Navigation controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
            currentPage === 1
              ? "text-gray-400 cursor-not-allowed bg-gray-100"
              : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>
        
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
            currentPage === totalPages
              ? "text-gray-400 cursor-not-allowed bg-gray-100"
              : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default Pagination; 