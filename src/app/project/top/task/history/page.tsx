"use client";

import React, { useEffect, useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

interface TaskData {
  no: number;
  docId?: string; // Document ID for CRUD operations
  city: string;
  siteId: string;
  siteName: string;
  hp: number;
  status: string;
  rpm: string;
  pic: string;
  lastActivity: string;
  division?: string;
}

const TaskHistoryPage = () => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [taskData, setTaskData] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  
  // CRUD states
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRowNo, setSelectedRowNo] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [formData, setFormData] = useState<Partial<TaskData>>({});
  const [deleting, setDeleting] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    rpm: '',
    status: '',
    date: ''
  });
  
  // Sorting states
  const [sortConfig, setSortConfig] = useState<{
    key: keyof TaskData;
    direction: 'asc' | 'desc';
  } | null>(null);
  
  // Filter options from database
  const [rpmOptions, setRpmOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [dateOptions, setDateOptions] = useState<string[]>([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Sort data function
  const sortData = (data: TaskData[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  };

  // Function to get last activity from sections
  const getLastActivity = (sections: any[]): string => {
    if (!sections || sections.length === 0) return '-';
    
    // Sort sections by uploadedAt timestamp
    const sortedSections = sections.sort((a, b) => {
      const timeA = a.uploadedAt?.toDate?.() || new Date(a.uploadedAt || 0);
      const timeB = b.uploadedAt?.toDate?.() || new Date(b.uploadedAt || 0);
      return timeB.getTime() - timeA.getTime();
    });
    
    const latestSection = sortedSections[0];
    if (!latestSection.uploadedAt) return '-';
    
    const uploadedAt = latestSection.uploadedAt.toDate?.() || new Date(latestSection.uploadedAt);
    const day = uploadedAt.getDate().toString().padStart(2, '0');
    const month = (uploadedAt.getMonth() + 1).toString().padStart(2, '0');
    const year = uploadedAt.getFullYear().toString().slice(-2);
    const hours = uploadedAt.getHours().toString().padStart(2, '0');
    const minutes = uploadedAt.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year}, ${hours}.${minutes}`;
  };

  // Function to get status based on division
  const getStatusByDivision = (sections: any[], division: string): string => {
    if (!sections || sections.length === 0) return '-';
    
    const divisionSections = sections.filter(s => 
      (s.division || '').toUpperCase() === division.toUpperCase()
    );
    
    if (divisionSections.length === 0) return '-';
    
    // Get the latest section for this division
    const sortedSections = divisionSections.sort((a, b) => {
      const timeA = a.uploadedAt?.toDate?.() || new Date(a.uploadedAt || 0);
      const timeB = b.uploadedAt?.toDate?.() || new Date(b.uploadedAt || 0);
      return timeB.getTime() - timeA.getTime();
    });
    
    return sortedSections[0].section || '-';
  };

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError(null);
      try {
        const querySnapshot = await getDocs(collection(db, 'tasks'));
        const data: TaskData[] = querySnapshot.docs.map((doc, idx) => {
          const d = doc.data();
          const sections = d.sections || [];
          
          return {
            no: idx + 1,
            docId: doc.id, // Store document ID for CRUD operations
            city: d.city || '',
            siteId: d.siteId || '',
            siteName: d.siteName || '',
            hp: d.hp || 0,
            status: getStatusByDivision(sections, d.division || ''),
            rpm: d.rpm || '',
            pic: d.pic || '',
            lastActivity: getLastActivity(sections),
            division: d.division || '',
          };
        });
        
        setTaskData(data);
        
        // Extract filter options from data
        const rpms = Array.from(new Set(data.map(item => item.rpm).filter(Boolean)));
        const statuses = Array.from(new Set(data.map(item => item.status).filter(Boolean)));
        const dates = Array.from(new Set(data.map(item => item.lastActivity).filter(item => item !== '-')));
        
        setRpmOptions(rpms.sort());
        setStatusOptions(statuses.sort());
        setDateOptions(dates.sort().reverse());
        
      } catch (err: any) {
        setError('Gagal mengambil data dari Firestore: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  // Filter data based on selected filters
  const filteredData = sortData(taskData.filter(task => {
    if (filters.rpm && task.rpm !== filters.rpm) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.date && task.lastActivity !== filters.date) return false;
    return true;
  }));

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.rpm, filters.status, filters.date]);

  // CRUD Functions
  const handleEdit = () => {
    if (selectedRowNo === null) {
      alert("Please select a row to edit.");
      return;
    }
    const selectedRow = taskData.find((row) => row.no === selectedRowNo);
    if (selectedRow) {
      setIsEditing(true);
      setFormData({ ...selectedRow });
    }
  };

  const handleSave = async () => {
    if (selectedRowNo !== null) {
      const row = taskData.find((item) => item.no === selectedRowNo);
      if (row && row.docId) {
        try {
          setLoading(true);
          const updateFields = {
            city: formData.city || "",
            siteId: formData.siteId || "",
            siteName: formData.siteName || "",
            hp: formData.hp || 0,
            rpm: formData.rpm || "",
            pic: formData.pic || "",
          };
          
          console.log("Updating document:", row.docId, "with fields:", updateFields);
          await updateDoc(doc(db, "tasks", row.docId), updateFields);
          
          alert("Data berhasil diupdate!");
          // Refresh data
          window.location.reload();
        } catch (err) {
          console.error("Error updating document:", err);
          alert("Gagal update data: " + err);
        } finally {
          setLoading(false);
        }
      } else {
        console.warn("No docId found for row:", row);
        alert("Tidak dapat menemukan ID dokumen untuk update. Silakan coba lagi.");
      }
    }
    setIsEditing(false);
    setSelectedRowNo(null);
    setFormData({});
  };

  const handleDelete = async () => {
    if (selectedRowNo === null && selectedRows.length === 0) {
      alert("Please select a row to delete.");
      return;
    }
    
    // Handle single row deletion
    if (selectedRowNo !== null) {
      const row = taskData.find((item) => item.no === selectedRowNo);
      if (!row || !row.docId) {
        alert("Tidak dapat menemukan data untuk dihapus.");
        return;
      }

      const confirmDelete = window.confirm(
        `Apakah Anda yakin ingin menghapus task:\nSite: ${row.siteName}\nSite ID: ${row.siteId}`
      );

      if (!confirmDelete) return;

      setDeleting(true);
      try {
        console.log("Deleting document:", row.docId);
        await deleteDoc(doc(db, "tasks", row.docId));
        
        alert("Data berhasil dihapus!");
        // Refresh data
        window.location.reload();
      } catch (err) {
        console.error("Error deleting document:", err);
        alert("Gagal menghapus data: " + err);
      } finally {
        setDeleting(false);
      }
      return;
    }

    // Handle multiple rows deletion
    if (selectedRows.length > 0) {
      const rowsToDelete = taskData.filter((item) => selectedRows.includes(item.no));
      const validRows = rowsToDelete.filter(row => row.docId);
      
      if (validRows.length === 0) {
        alert("Tidak dapat menemukan data untuk dihapus.");
        return;
      }

      const confirmDelete = window.confirm(
        `Apakah Anda yakin ingin menghapus ${validRows.length} task?\n\nSites:\n${validRows.map(row => `- ${row.siteName} (${row.siteId})`).join('\n')}`
      );

      if (!confirmDelete) return;

      setDeleting(true);
      try {
        const deletePromises = validRows.map(row => 
          deleteDoc(doc(db, "tasks", row.docId!))
        );
        
        await Promise.all(deletePromises);
        
        alert(`${validRows.length} data berhasil dihapus!`);
        // Refresh data
        window.location.reload();
      } catch (err) {
        console.error("Error deleting documents:", err);
        alert("Gagal menghapus data: " + err);
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedRowNo(null);
    setSelectedRows([]);
    setFormData({});
  };

  const handleInputChange = (field: keyof TaskData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (rowNo: number) => {
    setSelectedRowNo((prev) => (prev === rowNo ? null : rowNo));
  };

  const handleMultiCheckboxChange = (rowNo: number) => {
    setSelectedRows((prev) => {
      if (prev.includes(rowNo)) {
        return prev.filter(id => id !== rowNo);
      } else {
        return [...prev, rowNo];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(task => task.no));
    }
  };

  // Sorting function
  const handleSort = (key: keyof TaskData) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  // Function to export data to Excel
  const handleExportExcel = async () => {
    if (filteredData.length === 0) {
      alert("Tidak ada data untuk diexport.");
      return;
    }

    setExporting(true);
    try {
      console.log("Exporting Task History to Excel...");
      
      // Prepare data for export
      const exportData = filteredData.map((task, index) => ({
        'No': index + 1,
        'City': task.city || '-',
        'Site ID': task.siteId || '-',
        'Site Name': task.siteName || '-',
        'HP': task.hp || '-',
        'Status': task.status || '-',
        'RPM': task.rpm || '-',
        'PIC': task.pic || '-',
        'Last Activity': task.lastActivity || '-',
        'Division': task.division || '-'
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const columnWidths = [
        { wch: 5 },   // No
        { wch: 15 },  // City
        { wch: 15 },  // Site ID
        { wch: 25 },  // Site Name
        { wch: 10 },  // HP
        { wch: 20 },  // Status
        { wch: 15 },  // RPM
        { wch: 15 },  // PIC
        { wch: 20 },  // Last Activity
        { wch: 15 }   // Division
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Task History');

      // Generate filename with current date and time
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
      const filename = `Task_History_${dateStr}_${timeStr}.xlsx`;

      // Save the file
      XLSX.writeFile(workbook, filename);
      
      console.log(`Excel file exported: ${filename}`);
      
      // Show success message
      alert(`Data berhasil diexport ke file: ${filename}\nTotal data: ${filteredData.length} records`);
    } catch (error) {
      console.error("Error exporting Excel:", error);
      alert("Gagal mengexport data ke Excel. Silakan coba lagi.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1920px] mx-auto">
        <div className="rounded-xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start w-full sm:w-auto mb-4 sm:mb-0">
                <img
                  src="/logo.jpeg"
                  alt="Ansinda Logo"
                  className="h-20 w-auto"
                />
              </div>
              <div className="flex-1 flex justify-center sm:justify-center">
                <h2 className="text-3xl font-bold text-black">
                 History Task
                </h2>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <div className="flex space-x-4 mb-2 sm:mb-0">
                {!isEditing && (
                  <>
                    <button
                      onClick={handleEdit}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-sm"
                      disabled={selectedRowNo === null}
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-all duration-200 text-sm font-medium shadow-sm"
                      disabled={deleting || (selectedRowNo === null && selectedRows.length === 0)}
                    >
                      {deleting ? 'Deleting...' : `Delete ${selectedRows.length > 0 ? `(${selectedRows.length})` : ''}`}
                    </button>
                  </>
                )}
                <select 
                  className="border p-2 rounded text-black"
                  value={filters.rpm}
                  onChange={(e) => setFilters({...filters, rpm: e.target.value})}
                >
                  <option value="">Filter by RPM</option>
                  {rpmOptions.map((rpm) => (
                    <option key={rpm} value={rpm}>{rpm}</option>
                  ))}
                </select>
                <select 
                  className="border p-2 rounded text-black"
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="">Filter by Status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <select 
                  className="border p-2 rounded text-black"
                  value={filters.date}
                  onChange={(e) => setFilters({...filters, date: e.target.value})}
                >
                  <option value="">Filter by Date</option>
                  {dateOptions.map((date) => (
                    <option key={date} value={date}>{date}</option>
                  ))}
                </select>
                <button 
                  className={`px-4 py-2 rounded transition-colors duration-200 ${
                    exporting || filteredData.length === 0
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                  onClick={handleExportExcel}
                  disabled={exporting || filteredData.length === 0}
                >
                  {exporting ? 'Exporting...' : 'Export Excel'}
                </button>
                {sortConfig && (
                  <button 
                    className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600 transition-colors duration-200 text-sm"
                    onClick={() => setSortConfig(null)}
                  >
                    Clear Sort
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-600 font-medium">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} records (Page {currentPage} of {totalPages})
                {selectedRows.length > 0 && (
                  <span className="ml-2 text-red-600">
                    (Selected: {selectedRows.length} items)
                  </span>
                )}
                {filteredData.length > 0 && (
                  <span className="ml-2 text-blue-600">
                    (Ready to export: {filteredData.length} records)
                  </span>
                )}
              </div>
            </div>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : error ? (
              <div className="text-center text-red-600 py-8">{error}</div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="p-2 border">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="p-2 border cursor-pointer hover:bg-blue-800" onClick={() => handleSort('no')}>
                      No {sortConfig?.key === 'no' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-2 border cursor-pointer hover:bg-blue-800" onClick={() => handleSort('city')}>
                      City {sortConfig?.key === 'city' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-2 border cursor-pointer hover:bg-blue-800" onClick={() => handleSort('siteId')}>
                      Site ID {sortConfig?.key === 'siteId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-2 border cursor-pointer hover:bg-blue-800" onClick={() => handleSort('siteName')}>
                      Site Name {sortConfig?.key === 'siteName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-2 border cursor-pointer hover:bg-blue-800" onClick={() => handleSort('hp')}>
                      HP {sortConfig?.key === 'hp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-2 border cursor-pointer hover:bg-blue-800" onClick={() => handleSort('status')}>
                      Status {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-2 border cursor-pointer hover:bg-blue-800" onClick={() => handleSort('rpm')}>
                      RPM {sortConfig?.key === 'rpm' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-2 border cursor-pointer hover:bg-blue-800" onClick={() => handleSort('pic')}>
                      PIC {sortConfig?.key === 'pic' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-2 border cursor-pointer hover:bg-blue-800" onClick={() => handleSort('lastActivity')}>
                      Last Activity {sortConfig?.key === 'lastActivity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((task, index) => (
                    <tr key={task.no} className="text-center text-black hover:bg-gray-50">
                      <td className="p-2 border">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(task.no)}
                          onChange={() => handleMultiCheckboxChange(task.no)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={isEditing}
                        />
                      </td>
                      <td className="p-2 border">{startIndex + index + 1}</td>
                      <td className="p-2 border">{task.city || '-'}</td>
                      <td className="p-2 border">{task.siteId || '-'}</td>
                      <td className="p-2 border">{task.siteName || '-'}</td>
                      <td className="p-2 border">{task.hp || '-'}</td>
                      <td className="p-2 border">{task.status || '-'}</td>
                      <td className="p-2 border">{task.rpm || '-'}</td>
                      <td className="p-2 border">{task.pic || '-'}</td>
                      <td className="p-2 border">{task.lastActivity || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && !error && filteredData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Tidak ada data yang ditemukan
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && !error && filteredData.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} entries
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm rounded ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    Last
                  </button>
                </div>
              </div>
            )}

            {/* Edit Form */}
            {isEditing && selectedRowNo !== null && (
              <div className="mt-6 bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Edit Task: {taskData.find((row) => row.no === selectedRowNo)?.siteName}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      value={formData.city || ""}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Site ID</label>
                    <input
                      type="text"
                      value={formData.siteId || ""}
                      onChange={(e) => handleInputChange("siteId", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Site Name</label>
                    <input
                      type="text"
                      value={formData.siteName || ""}
                      onChange={(e) => handleInputChange("siteName", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">HP</label>
                    <input
                      type="number"
                      value={formData.hp || ""}
                      onChange={(e) => handleInputChange("hp", Number(e.target.value))}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">RPM</label>
                    <input
                      type="text"
                      value={formData.rpm || ""}
                      onChange={(e) => handleInputChange("rpm", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIC</label>
                    <input
                      type="text"
                      value={formData.pic || ""}
                      onChange={(e) => handleInputChange("pic", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    />
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-end space-x-3">
                  <button
                    onClick={handleSave}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-sm"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-200 text-sm font-medium shadow-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskHistoryPage;