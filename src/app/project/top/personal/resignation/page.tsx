"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase config
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

const ResignationPage = () => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, user, loading } = useSidebar();
  const [isOpen, setIsOpen] = useState(true);
  const [resignations, setResignations] = useState<any[]>([]);
  const [loadingResignations, setLoadingResignations] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
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

  // Fetch all resignations
  const fetchResignations = async () => {
    setLoadingResignations(true);
    const q = query(collection(db, 'resignations'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    setResignations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoadingResignations(false);
  };

  useEffect(() => {
    fetchResignations();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (user?.uid) {
      (async () => {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // setForm(f => ({ // This line was not in the edit_specification, so it's removed.
          //   ...f,
          //   nik: userData.nik || '',
          //   name: userData.name || '',
          // }));
        }
      })();
    }
  }, []);

  // Approve/Reject handlers
  const handleStatusChange = async (id: string, status: 'Approved' | 'Rejected') => {
    setUpdating(id);
    try {
      const update: any = {
        status,
        updatedAt: Timestamp.now(),
      };
      
      if (status === 'Approved') {
        update.approvedBy = user?.name || 'admin';
        update.rejectedBy = '';
        update.approvedDate = Timestamp.now();
      } else {
        update.rejectedBy = user?.name || 'admin';
        update.approvedBy = '';
        update.rejectedDate = Timestamp.now();
      }
      
      await updateDoc(doc(db, 'resignations', id), update);
      fetchResignations();
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setUpdating(null);
    }
  };

  // Split resignations by status
  const pending = resignations.filter(r => !r.status || r.status === 'Pending');
  const history = resignations.filter(r => r.status === 'Approved' || r.status === 'Rejected');

  // Pagination logic for pending
  const pendingIndexOfLastItem = currentPage * itemsPerPage;
  const pendingIndexOfFirstItem = pendingIndexOfLastItem - itemsPerPage;
  const currentPendingItems = pending.slice(pendingIndexOfFirstItem, pendingIndexOfLastItem);
  const pendingTotalPages = Math.ceil(pending.length / itemsPerPage);

  // Pagination logic for history
  const historyIndexOfLastItem = currentHistoryPage * itemsPerPage;
  const historyIndexOfFirstItem = historyIndexOfLastItem - itemsPerPage;
  const currentHistoryItems = history.slice(historyIndexOfFirstItem, historyIndexOfLastItem);
  const historyTotalPages = Math.ceil(history.length / itemsPerPage);

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
                  Resignation
                </h2>
              </div>
            </div>
          </div>

          {/* Pending Table */}
          <div className="bg-white rounded-lg shadow-md mb-8">
            <button
              className="w-full flex items-center px-6 py-3 bg-blue-900 text-white rounded-t-lg focus:outline-none"
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="mr-2">{isOpen ? '▼' : '▶'}</span>
              <span className="font-semibold text-lg">Pending Resignations</span>
            </button>
            {isOpen && (
              <div className="overflow-x-auto p-4">
                <table className="min-w-full border-t border-b border-gray-300 rounded-lg">
                  <thead>
                    <tr className="bg-gray-100 text-xs text-gray-700">
                      <th className="px-3 py-2 border-b border-t border-gray-300">Date</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">NIK</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">Name</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">Position</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">Resign Date</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">Category Resign</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">Resign Reason</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">File</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingResignations ? (
                      <tr><td colSpan={9} className="text-center py-4">Loading...</td></tr>
                    ) : currentPendingItems.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-4">No pending resignations.</td></tr>
                    ) : (
                      currentPendingItems.map((row, idx) => (
                        <tr key={row.id || idx} className="text-sm text-center text-black">
                          <td className="px-3 py-2 border-b border-gray-300">{row.date}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.nik}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.name}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.position}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.resignDate}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.category}</td>
                          <td className="px-3 py-2 border-b border-gray-300 text-center max-w-xs whitespace-pre-line">{row.reason}</td>
                          <td className="px-3 py-2 border-b border-gray-300">
                            {row.fileUrl ? (
                              <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">File</a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 border-b border-gray-300">
                            <div className="flex gap-2 justify-center w-full">
                              <button
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded w-24 disabled:opacity-50"
                                onClick={() => handleStatusChange(row.id, 'Approved')}
                                disabled={updating === row.id}
                              >Approve</button>
                              <button
                                className="bg-red-400 hover:bg-red-500 text-white px-3 py-1 rounded w-24 disabled:opacity-50"
                                onClick={() => handleStatusChange(row.id, 'Rejected')}
                                disabled={updating === row.id}
                              >Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                
                {/* Pagination Controls for Pending */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-700">
                    <span>
                      Showing {pending.length > 0 ? pendingIndexOfFirstItem + 1 : 0} to {Math.min(pendingIndexOfLastItem, pending.length)} of {pending.length} pending entries
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

          {/* History Table */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="w-full flex items-center px-6 py-3 bg-blue-900 text-white rounded-t-lg">
              <span className="font-semibold text-lg">Resignation History</span>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="min-w-full border-t border-b border-gray-300 rounded-lg">
                <thead>
                  <tr className="bg-gray-100 text-xs text-gray-700">
                    <th className="px-3 py-2 border-b border-t border-gray-300">Date</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">NIK</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">Name</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">Position</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">Resign Date</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">Category Resign</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">Resign Reason</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">File</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">Status</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">Approved Date</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">Rejected Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingResignations ? (
                    <tr><td colSpan={11} className="text-center py-4">Loading...</td></tr>
                  ) : history.length === 0 ? (
                    <tr><td colSpan={11} className="text-center text-black py-4">No history yet.</td></tr>
                  ) : (
                    currentHistoryItems.map((row, idx) => (
                      <tr key={row.id || idx} className="text-sm text-center text-black">
                        <td className="px-3 py-2 border-b border-gray-300">{row.date}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.nik}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.name}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.position}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.resignDate}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.category}</td>
                        <td className="px-3 py-2 border-b border-gray-300 text-center max-w-xs whitespace-pre-line">{row.reason}</td>
                        <td className="px-3 py-2 border-b border-gray-300">
                          {row.fileUrl ? (
                            <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">File</a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className={`px-3 py-2 border-b border-gray-300 font-bold ${row.status === 'Approved' ? 'text-green-600' : 'text-red-500'}`}>{row.status}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.status === 'Approved' ? formatDate(row.approvedDate) : '-'}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.status === 'Rejected' ? formatDate(row.rejectedDate) : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
              {/* Pagination Controls for History */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Showing {history.length > 0 ? historyIndexOfFirstItem + 1 : 0} to {Math.min(historyIndexOfLastItem, history.length)} of {history.length} history entries
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

export default ResignationPage;