"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

// Firebase config (same as other pages)
const firebaseConfig = {
  apiKey: "AIzaSyB0gOJUmBNCh4yAxdLbVASjgadYsUCay0Y",
  authDomain: "portal-ansinda.firebaseapp.com",
  projectId: "portal-ansinda",
  storageBucket: "portal-ansinda.firebasestorage.app",
  messagingSenderId: "310332831418",
  appId: "1:310332831418:web:96a0b7e144353c59b17483"
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

const AdjustmentSalaryPage = () => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, user, loading } = useSidebar();
  const [open, setOpen] = useState(true);
  const [pending, setPending] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [loadingAdjustments, setLoadingAdjustments] = useState(true);
  const [filterName, setFilterName] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1);
  const [itemsPerPage] = useState(25);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchAdjustments = async () => {
    setLoadingAdjustments(true);
    const snapshot = await getDocs(collection(db, 'salary_adjustments'));
    const all = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    
    const pendingData = all.filter((row: any) => row.status === 'pending');
    const historyData = all; // Show all data without filter
    
    console.log('All data:', all.length);
    console.log('Pending data:', pendingData.length);
    console.log('History data:', historyData.length);
    console.log('History statuses:', historyData.map((row: any) => row.status));
    
    setPending(pendingData);
    setHistory(historyData);
    setLoadingAdjustments(false);
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  // Filter data
  const filteredPending = pending.filter(row =>
    (!filterName || row.fullName?.toLowerCase().includes(filterName.toLowerCase())) &&
    (!filterPosition || row.position?.toLowerCase().includes(filterPosition.toLowerCase()))
  );

  const filteredHistory = history.filter(row =>
    (!filterName || row.fullName?.toLowerCase().includes(filterName.toLowerCase())) &&
    (!filterPosition || row.position?.toLowerCase().includes(filterPosition.toLowerCase()))
  );

  // Pagination logic for pending
  const pendingIndexOfLastItem = currentPage * itemsPerPage;
  const pendingIndexOfFirstItem = pendingIndexOfLastItem - itemsPerPage;
  const currentPendingItems = filteredPending.slice(pendingIndexOfFirstItem, pendingIndexOfLastItem);
  const pendingTotalPages = Math.ceil(filteredPending.length / itemsPerPage);

  // Pagination logic for history
  const historyIndexOfLastItem = currentHistoryPage * itemsPerPage;
  const historyIndexOfFirstItem = historyIndexOfLastItem - itemsPerPage;
  const currentHistoryItems = filteredHistory.slice(historyIndexOfFirstItem, historyIndexOfLastItem);
  const historyTotalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  // Handle page change for pending
  const handlePendingPageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Handle page change for history
  const handleHistoryPageChange = (pageNumber: number) => {
    setCurrentHistoryPage(pageNumber);
  };

  // Generate page numbers for pagination
  const getPageNumbers = (totalPages: number, currentPage: number) => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (!id) return;
    const update: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      updatedAt: Timestamp.now(),
    };
    if (action === 'approve') {
      update.approvedBy = user?.name || adminUser?.displayName || adminUser?.email || 'admin';
      update.rejectedBy = '';
      update.approvedDate = Timestamp.now();
    } else {
      update.rejectedBy = user?.name || adminUser?.displayName || adminUser?.email || 'admin';
      update.approvedBy = '';
      update.rejectedDate = Timestamp.now();
    }
    await updateDoc(doc(db, 'salary_adjustments', id), update);
    fetchAdjustments();
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
      />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1920px] mx-auto">
          {/* Header Section */}
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
                  Adjustment Salary
                </h2>
              </div>
            </div>
          </div>

          {/* Filters/Search */}
          <div className="flex flex-col gap-2 mb-4 max-w-xs">
            <input
              type="text"
              placeholder="Name"
              className="border border-black text-black rounded px-2 py-1 text-sm w-full"
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Position"
              className="border border-black text-black rounded px-2 py-1 text-sm w-full"
              value={filterPosition}
              onChange={e => setFilterPosition(e.target.value)}
            />
          </div>

          {/* Collapsible Table Section */}
          <div className="bg-white rounded-lg shadow-md mb-8">
            <button
              className="w-full flex items-center px-6 py-3 bg-blue-900 text-white rounded-t-lg focus:outline-none"
              onClick={() => setOpen((o) => !o)}
            >
              <span className="mr-2">{open ? '▼' : '▶'}</span>
              <span className="font-semibold text-lg">Approval Adjustment Salary</span>
            </button>
            {open && (
              <div className="overflow-x-auto p-4">
                {loadingAdjustments ? (
                  <div className="text-center py-4">Loading...</div>
                ) : (
                  <table className="min-w-full border-t border-b border-gray-300 rounded-lg">
                    <thead>
                      <tr className="bg-gray-100 text-xs text-gray-700">
                        <th className="px-3 py-2 border-b border-t border-gray-300">NAME</th>
                        <th className="px-3 py-2 border-b border-t border-gray-300">POSITION</th>
                        <th className="px-3 py-2 border-b border-t border-gray-300">LATEST SALARY</th>
                        <th className="px-3 py-2 border-b border-t border-gray-300">SALARY SUBMISSION</th>
                        <th className="px-3 py-2 border-b border-t border-gray-300 text-center">REASON</th>
                        <th className="px-3 py-2 border-b border-t border-gray-300">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPendingItems.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-4 text-black">No pending requests.</td></tr>
                      ) : (
                        currentPendingItems.map((row, idx) => (
                          <tr key={row.id || idx} className="text-sm text-center text-black">
                            <td className="px-3 py-2 border-b border-gray-300">{row.fullName}</td>
                            <td className="px-3 py-2 border-b border-gray-300">{row.position}</td>
                            <td className="px-3 py-2 border-b border-gray-300">{row.latestSalary}</td>
                            <td className="px-3 py-2 border-b border-gray-300">{row.salarySubmission}</td>
                            <td className="px-3 py-2 border-b border-gray-300 text-center max-w-xs whitespace-pre-line">{row.reason}</td>
                            <td className="px-3 py-2 border-b border-gray-300">
                              <div className="flex gap-2 justify-center w-full">
                                <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded w-24" onClick={() => handleAction(row.id, 'approve')}>Approve</button>
                                <button className="bg-red-400 hover:bg-red-500 text-white px-3 py-1 rounded w-24" onClick={() => handleAction(row.id, 'reject')}>Reject</button>
                              </div>
                            </td>
                            <td className="px-3 py-2 border-b border-gray-300">-</td>
                            <td className="px-3 py-2 border-b border-gray-300">-</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
                
                {/* Pagination Controls for Pending */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-700">
                    <span>
                      Showing {filteredPending.length > 0 ? pendingIndexOfFirstItem + 1 : 0} to {Math.min(pendingIndexOfLastItem, filteredPending.length)} of {filteredPending.length} pending entries
                    </span>
                  </div>
                  {pendingTotalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      {/* Previous Button */}
                      <button
                        onClick={() => handlePendingPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 text-sm font-medium rounded-md ${
                          currentPage === 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {getPageNumbers(pendingTotalPages, currentPage).map((pageNumber, index) => (
                          <button
                            key={index}
                            onClick={() => typeof pageNumber === 'number' && handlePendingPageChange(pageNumber)}
                            disabled={pageNumber === '...'}
                            className={`px-3 py-1 text-sm font-medium rounded-md ${
                              pageNumber === currentPage
                                ? 'bg-blue-600 text-white'
                                : pageNumber === '...'
                                ? 'text-gray-400 cursor-default'
                                : 'text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        ))}
                      </div>
                      
                      {/* Next Button */}
                      <button
                        onClick={() => handlePendingPageChange(currentPage + 1)}
                        disabled={currentPage === pendingTotalPages}
                        className={`px-3 py-1 text-sm font-medium rounded-md ${
                          currentPage === pendingTotalPages
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* History Table Section */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="w-full flex items-center px-6 py-3 bg-blue-900 text-white rounded-t-lg">
              <span className="font-semibold text-lg">Adjustment Salary History</span>
            </div>
            <div className="overflow-x-auto p-4">
              {loadingAdjustments ? (
                <div className="text-center py-4">Loading...</div>
              ) : (
                <table className="min-w-full border-t border-b border-gray-300 rounded-lg">
                                      <thead>
                      <tr className="bg-gray-100 text-xs text-gray-700">
                        <th className="px-3 py-2 border-b border-t border-gray-300">NAME</th>
                        <th className="px-3 py-2 border-b border-t border-gray-300">POSITION</th>
                        <th className="px-3 py-2 border-b border-t border-gray-300">LATEST SALARY</th>
                        <th className="px-3 py-2 border-b border-t border-gray-300">SALARY SUBMISSION</th>
                        <th className="px-3 py-2 border-b border-t border-gray-300 text-center">REASON</th>
                        <th className="px-3 py-2 border-b border-t border-gray-300">Status</th>
                        <th className="px-3 py-2 border-b border-t border-gray-300">Approved Date</th>
                        <th className="px-3 py-2 border-b border-t border-gray-300">Rejected Date</th>
                      </tr>
                    </thead>
                  <tbody>
                    {currentHistoryItems.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-4">No history yet.</td></tr>
                    ) : (
                      currentHistoryItems.map((row, idx) => (
                        <tr key={row.id || idx} className="text-sm text-center text-black">
                          <td className="px-3 py-2 border-b border-gray-300">{row.fullName}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.position}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.latestSalary}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.salarySubmission}</td>
                          <td className="px-3 py-2 border-b border-gray-300 text-center max-w-xs whitespace-pre-line">{row.reason}</td>
                          <td className={`px-3 py-2 border-b border-gray-300 font-bold ${
                            row.status === 'approved' ? 'text-green-600' : 
                            row.status === 'rejected' ? 'text-red-500' : 
                            row.status === 'completed' ? 'text-blue-600' : 
                            'text-gray-600'
                          }`}>{row.status.charAt(0).toUpperCase() + row.status.slice(1)}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.status === 'approved' ? formatDate(row.approvedDate) : '-'}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.status === 'rejected' ? formatDate(row.rejectedDate) : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
              
              {/* Pagination Controls for History */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Showing {filteredHistory.length > 0 ? historyIndexOfFirstItem + 1 : 0} to {Math.min(historyIndexOfLastItem, filteredHistory.length)} of {filteredHistory.length} history entries
                  </span>
                </div>
                {historyTotalPages > 1 && (
                  <div className="flex items-center space-x-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => handleHistoryPageChange(currentHistoryPage - 1)}
                      disabled={currentHistoryPage === 1}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        currentHistoryPage === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Previous
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {getPageNumbers(historyTotalPages, currentHistoryPage).map((pageNumber, index) => (
                        <button
                          key={index}
                          onClick={() => typeof pageNumber === 'number' && handleHistoryPageChange(pageNumber)}
                          disabled={pageNumber === '...'}
                          className={`px-3 py-1 text-sm font-medium rounded-md ${
                            pageNumber === currentHistoryPage
                              ? 'bg-blue-600 text-white'
                              : pageNumber === '...'
                              ? 'text-gray-400 cursor-default'
                              : 'text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      ))}
                    </div>
                    
                    {/* Next Button */}
                    <button
                      onClick={() => handleHistoryPageChange(currentHistoryPage + 1)}
                      disabled={currentHistoryPage === historyTotalPages}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        currentHistoryPage === historyTotalPages
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdjustmentSalaryPage;