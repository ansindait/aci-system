"use client";

import React from 'react';
import Sidebar from '@/app/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaRegCalendarAlt } from 'react-icons/fa';

const ticketData = [
  {
    date: '15/07/2025',
    nik: '12345678',
    name: 'Ryan',
    position: 'PERMIT',
    ticketDate: '25/07/2025',
    ticketReason: 'Visiting Another Region',
    ticketPrice: '3,000,000',
  },
  // Repeat for demo purposes
  {
    date: '15/07/2025', nik: '12345678', name: 'Ryan', position: 'PERMIT', ticketDate: '25/07/2025', ticketReason: 'Visiting Another Region', ticketPrice: '3,000,000',
  },
  {
    date: '15/07/2025', nik: '12345678', name: 'Ryan', position: 'PERMIT', ticketDate: '25/07/2025', ticketReason: 'Visiting Another Region', ticketPrice: '3,000,000',
  },
  {
    date: '15/07/2025', nik: '12345678', name: 'Ryan', position: 'PERMIT', ticketDate: '25/07/2025', ticketReason: 'Visiting Another Region', ticketPrice: '3,000,000',
  },
  {
    date: '15/07/2025', nik: '12345678', name: 'Ryan', position: 'PERMIT', ticketDate: '25/07/2025', ticketReason: 'Visiting Another Region', ticketPrice: '3,000,000',
  },
  {
    date: '15/07/2025', nik: '12345678', name: 'Ryan', position: 'PERMIT', ticketDate: '25/07/2025', ticketReason: 'Visiting Another Region', ticketPrice: '3,000,000',
  },
  {
    date: '15/07/2025', nik: '12345678', name: 'Ryan', position: 'PERMIT', ticketDate: '25/07/2025', ticketReason: 'Visiting Another Region', ticketPrice: '3,000,000',
  },
  {
    date: '15/07/2025', nik: '12345678', name: 'Ryan', position: 'PERMIT', ticketDate: '25/07/2025', ticketReason: 'Visiting Another Region', ticketPrice: '3,000,000',
  },
];

const filterOptions = [
  { label: 'Site ID' },
  { label: 'Region' },
  { label: 'City' },
  { label: 'RPM' },
  { label: 'Site Name' },
  { label: 'PIC' },
  { label: 'Date' },
];

type TicketRow = typeof ticketData[number] & { 
  id?: string, 
  status?: string,
  approvedBy?: string,
  approvedDate?: any,
  rejectedBy?: string,
  rejectedDate?: any
};
type TicketHistoryRow = TicketRow & { status: 'Approved' | 'Rejected' };

type DateInputProps = {
  value?: string;
  onClick?: () => void;
  placeholder?: string;
};
const DateInput = React.forwardRef<HTMLDivElement, DateInputProps>(({ value, onClick, placeholder }, ref) => (
  <div
    className="relative w-full"
    onClick={onClick}
    ref={ref}
    tabIndex={0}
    style={{ cursor: "pointer" }}
  >
    <input
      type="text"
      value={value || ''}
      readOnly
      placeholder={placeholder}
      className="border border-black text-black rounded px-2 py-1 text-sm min-w-[160px] w-full pr-8"
      style={{ background: "" }}
    />
    <FaRegCalendarAlt className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
  </div>
));
DateInput.displayName = 'DateInput';

const TicketRequestPage = () => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, user } = useSidebar();
  const [isOpen, setIsOpen] = React.useState(true);
  const [pending, setPending] = React.useState<TicketRow[]>([]);
  const [history, setHistory] = React.useState<TicketHistoryRow[]>([]);
  const [siteIdOptions, setSiteIdOptions] = React.useState<string[]>([]);
  const [regionOptions, setRegionOptions] = React.useState<string[]>([]);
  const [cityOptions, setCityOptions] = React.useState<string[]>([]);
  const [rpmOptions, setRpmOptions] = React.useState<string[]>([]);
  const [siteNameOptions, setSiteNameOptions] = React.useState<string[]>([]);
  const [siteStatusOptions, setSiteStatusOptions] = React.useState<string[]>([]);
  const [picOptions, setPicOptions] = React.useState<string[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [currentHistoryPage, setCurrentHistoryPage] = React.useState(1);
  const [itemsPerPage] = React.useState(25);

  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'ticket_request'), (snapshot) => {
      setPending(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketRow)));
    });
    return () => unsub();
  }, []);

  // Helper function to format timestamp to readable date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    if (typeof timestamp === 'object' && 'toDate' in timestamp) {
      return timestamp.toDate().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter data
  const filteredPending = pending.filter(row => !row.status);
  const filteredHistory = pending.filter(row => row.status);

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
      update.approvedBy = user?.name || 'admin';
      update.rejectedBy = '';
      update.approvedDate = Timestamp.now();
    } else {
      update.rejectedBy = user?.name || 'admin';
      update.approvedBy = '';
      update.rejectedDate = Timestamp.now();
    }
    
    await updateDoc(doc(db, 'ticket_request', id), update);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1920px] mx-auto">
          {/* Header */}
          <div className="flex items-center mb-6">
            <img src="/logo.jpeg" alt="Ansinda Logo" className="h-20 mr-95" />
            <h1 className='ml-6 text-black text-3xl font-bold'>Ticket Approval</h1>
          </div>

          {/* Filters/Search */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 max-w-4xl">
            <select className="border border-black text-black rounded px-2 py-1 text-sm min-w-[160px]">
              <option value="">Site ID</option>
              {siteIdOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <select className="border border-black text-black rounded px-2 py-1 text-sm min-w-[160px]">
              <option value="">Region</option>
              {regionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <select className="border border-black text-black rounded px-2 py-1 text-sm min-w-[160px]">
              <option value="">City</option>
              {cityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <select className="border border-black text-black rounded px-2 py-1 text-sm min-w-[160px]">
              <option value="">RPM</option>
              {rpmOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <select className="border border-black text-black rounded px-2 py-1 text-sm min-w-[160px]">
              <option value="">Site Name</option>
              {siteNameOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <select className="border border-black text-black rounded px-2 py-1 text-sm min-w-[160px]">
              <option value="">PIC</option>
              {picOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <DatePicker
              selected={selectedDate}
              onChange={date => setSelectedDate(date)}
              customInput={<DateInput placeholder="Date" />}
              dateFormat="dd/MM/yyyy"
              isClearable
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
            />
          </div>

          {/* Collapsible Table Section */}
          <div className="bg-white rounded-lg shadow-md mb-8">
            <button
              className="w-full flex items-center px-6 py-3 bg-blue-900 text-white rounded-t-lg focus:outline-none"
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="mr-2">{isOpen ? '▼' : '▶'}</span>
              <span className="font-semibold text-lg">Approval Ticket Request</span>
            </button>
            {isOpen && (
              <div className="overflow-x-auto p-4">
                <table className="min-w-full border-t border-b border-gray-300 rounded-lg">
                  <thead>
                    <tr className="bg-gray-100 text-xs text-gray-700">
                      <th className="px-3 py-2 border-b border-t border-gray-300">DATE</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">NIK</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">NAME</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">POSITION</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">TICKET DATE</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300 text-center">TICKET REASON</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">TICKET PRICE</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPendingItems.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-4">No pending requests.</td></tr>
                    ) : (
                      currentPendingItems.map((row, idx) => (
                        <tr key={row.id || idx} className="text-sm text-center text-black">
                          <td className="px-3 py-2 border-b border-gray-300">{row.date}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.nik}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.name}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.position}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.ticketDate}</td>
                          <td className="px-3 py-2 border-b border-gray-300 text-center max-w-xs whitespace-pre-line">{row.ticketReason}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.ticketPrice}</td>
                          <td className="px-3 py-2 border-b border-gray-300">
                            <div className="flex gap-2 justify-center w-full">
                              <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded w-24" onClick={() => handleAction(row.id!, 'approve')}>Approve</button>
                              <button className="bg-red-400 hover:bg-red-500 text-white px-3 py-1 rounded w-24" onClick={() => handleAction(row.id!, 'reject')}>Reject</button>
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
              <span className="font-semibold text-lg">Ticket Request History</span>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="min-w-full border-t border-b border-gray-300 rounded-lg">
                <thead>
                  <tr className="bg-gray-100 text-xs text-gray-700">
                    <th className="px-3 py-2 border-b border-t border-gray-300">DATE</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">NIK</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">NAME</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">POSITION</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">TICKET DATE</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300 text-center">TICKET REASON</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">TICKET PRICE</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">APPROVED BY</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">APPROVED DATE</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">REJECTED BY</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">REJECTED DATE</th>
                    <th className="px-3 py-2 border-b border-t border-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentHistoryItems.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-4">No history yet.</td></tr>
                  ) : (
                    currentHistoryItems.map((row, idx) => (
                      <tr key={row.id || idx} className="text-sm text-center text-black">
                        <td className="px-3 py-2 border-b border-gray-300">{row.date}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.nik}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.name}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.position}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.ticketDate}</td>
                        <td className="px-3 py-2 border-b border-gray-300 text-center max-w-xs whitespace-pre-line">{row.ticketReason}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.ticketPrice}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.approvedBy || '-'}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{formatDate(row.approvedDate)}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.rejectedBy || '-'}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{formatDate(row.rejectedDate)}</td>
                        <td className={`px-3 py-2 border-b border-gray-300 font-bold ${row.status === 'approved' ? 'text-green-600' : 'text-red-500'}`}>{row.status === 'approved' ? 'Approved' : 'Rejected'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
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

export default TicketRequestPage;