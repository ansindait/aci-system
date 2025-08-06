"use client";

import React, { useState } from "react";
import Pagination from "./Pagination";
import { usePagination } from "../hooks/usePagination";

// Example site data structure based on your image
interface SiteData {
  no: number;
  poPermit: string;
  poSnd: string;
  poImp: string;
  poSf: string;
  poAdd: string;
  siteId: string;
  siteName: string;
  permit: string;
  snd: string;
  cw: string;
  el: string;
  document: string;
  siteType: string;
  region: string;
  city: string;
}

// Example data based on the image
const exampleData: SiteData[] = [
  {
    no: 1,
    poPermit: "-",
    poSnd: "-",
    poImp: "-",
    poSf: "-",
    poAdd: "-",
    siteId: "CLR82-99-013",
    siteName: "LOLU UTARA RW 09 PALU",
    permit: "0/15",
    snd: "0/9",
    cw: "0/168",
    el: "0/5",
    document: "0/10",
    siteType: "LAST MILES/CLUSTER",
    region: "SULAWESI",
    city: "PALU"
  },
  {
    no: 2,
    poPermit: "-",
    poSnd: "-",
    poImp: "-",
    poSf: "-",
    poAdd: "-",
    siteId: "CLR82-99-009",
    siteName: "LOLU UTARA RW 04 PALU",
    permit: "2/15",
    snd: "1/9",
    cw: "1/168",
    el: "1/5",
    document: "1/10",
    siteType: "LAST MILES/CLUSTER",
    region: "SULAWESI",
    city: "PALU"
  },
  {
    no: 3,
    poPermit: "-",
    poSnd: "-",
    poImp: "-",
    poSf: "-",
    poAdd: "-",
    siteId: "CLR82-99-020",
    siteName: "TANAMODINDI RW 03 SAMPAI 06 PALU",
    permit: "0/15",
    snd: "0/9",
    cw: "0/306",
    el: "0/5",
    document: "0/10",
    siteType: "LAST MILES/CLUSTER",
    region: "SULAWESI",
    city: "PALU"
  }
];

// Add more example data to demonstrate pagination
const generateMoreData = (): SiteData[] => {
  const data: SiteData[] = [];
  for (let i = 4; i <= 50; i++) {
    data.push({
      no: i,
      poPermit: "-",
      poSnd: "-",
      poImp: "-",
      poSf: "-",
      poAdd: "-",
      siteId: `CLR82-99-${String(i).padStart(3, '0')}`,
      siteName: `SITE ${i} PALU`,
      permit: `${Math.floor(Math.random() * 15)}/15`,
      snd: `${Math.floor(Math.random() * 9)}/9`,
      cw: `${Math.floor(Math.random() * 168)}/168`,
      el: `${Math.floor(Math.random() * 5)}/5`,
      document: `${Math.floor(Math.random() * 10)}/10`,
      siteType: "LAST MILES/CLUSTER",
      region: "SULAWESI",
      city: "PALU"
    });
  }
  return data;
};

const allData = [...exampleData, ...generateMoreData()];

const PaginatedTableExample: React.FC = () => {
  const [filters, setFilters] = useState({
    siteName: "",
    region: "",
    city: "",
    status: "",
  });

  // Apply filters
  const filteredData = allData.filter(row => {
    if (filters.siteName && !row.siteName.toLowerCase().includes(filters.siteName.toLowerCase())) {
      return false;
    }
    if (filters.region && row.region !== filters.region) {
      return false;
    }
    if (filters.city && row.city !== filters.city) {
      return false;
    }
    if (filters.status) {
      const hasMatchingStatus = [
        row.permit,
        row.snd,
        row.cw,
        row.el,
        row.document
      ].some(status => status.includes(filters.status));
      
      if (!hasMatchingStatus) {
        return false;
      }
    }
    return true;
  });

  // Use pagination hook
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
    itemsPerPage: 25,
  });

  // Get unique values for filter options
  const regionOptions = Array.from(new Set(allData.map(row => row.region))).sort();
  const cityOptions = Array.from(new Set(allData.map(row => row.city))).sort();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Site Management with Pagination</h1>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Site Name"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={filters.siteName}
            onChange={(e) => setFilters({ ...filters, siteName: e.target.value })}
          />
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={filters.region}
            onChange={(e) => setFilters({ ...filters, region: e.target.value })}
          >
            <option value="">Select Region</option>
            {regionOptions.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          >
            <option value="">Select City</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Status (e.g., 0/15)"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          />
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          Showing {startItem}-{endItem} of {totalItems} records
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-indigo-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">PO Permit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">PO SND</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">PO Imp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">PO SF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">PO Add</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Site ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Site Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Permit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">SND</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">CW</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">EL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Document</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Site Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Region</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">City</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((row, index) => (
                <tr key={row.no} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.no}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.poPermit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.poSnd}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.poImp}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.poSf}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.poAdd}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.siteId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.siteName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.permit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.snd}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.cw}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.el}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.document}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.siteType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.region}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.city}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Component */}
        <Pagination
          data={filteredData}
          currentPage={currentPage}
          onPageChange={goToPage}
          itemsPerPage={25}
        />
      </div>
    </div>
  );
};

export default PaginatedTableExample; 