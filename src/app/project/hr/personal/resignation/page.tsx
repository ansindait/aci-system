"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc as docRef, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

interface UserData {
  name: string;
  role: string;
  email?: string;
}

interface ResignationData {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  resignationDate: string;
  lastWorkingDay: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvedBy?: string;
  approvedDate?: any; // Changed to any to handle both Timestamp and string
  rejectedBy?: string;
  rejectedDate?: any; // Changed to any to handle both Timestamp and string
  exitInterview?: string;
  handoverStatus?: string;
  finalSalary?: string;
}

// Helper function to safely format dates
const formatDateSafely = (dateInput: string | any | undefined): string => {
  if (!dateInput) return '-';
  
  try {
    let date: Date;
    
    // Handle Firestore Timestamp objects
    if (typeof dateInput === 'object' && 'toDate' in dateInput) {
      date = dateInput.toDate();
    } else {
      // Handle string dates
      date = new Date(dateInput);
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return String(dateInput); // Return original value as string if invalid date
    }
    return date.toLocaleDateString();
  } catch (error) {
    return String(dateInput); // Return original value as string if parsing fails
  }
};

// Accordion Section Component
function AccordionSection({ title, children, open, onClick }: { title: string, children: React.ReactNode, open: boolean, onClick: () => void }) {
  return (
    <div className="mb-2">
      <button
        className={`w-full flex items-center p-3 bg-blue-900 text-white font-bold rounded-t ${open ? '' : 'rounded-b'} transition-all`}
        onClick={onClick}
      >
        <svg className={`w-4 h-4 mr-2 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        {title}
      </button>
      {open && <div className="bg-white rounded-b shadow p-2">{children}</div>}
    </div>
  );
}

// Resignation Table Component with Pagination
function ResignationTable({ data, onComplete, showActions = false }: { data: ResignationData[], onComplete?: (id: string) => void, showActions?: boolean }) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(25);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
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

  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  return (
    <div className="overflow-x-auto max-w-full">
      <table className="w-full text-sm text-left text-gray-600 min-w-[1000px]">
        <thead className="bg-gray-50 text-gray-500 font-bold">
          <tr>
            <th className="px-4 py-3 text-center">Employee ID</th>
            <th className="px-4 py-3 text-center">Name</th>
            <th className="px-4 py-3 text-center">Position</th>
            <th className="px-4 py-3 text-center">Resignation Date</th>
            <th className="px-4 py-3 text-center">Reason</th>
            <th className="px-4 py-3 text-center">Status</th>
            {showActions && <th className="px-4 py-3 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {currentItems.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-300 hover:bg-gray-50">
              <td className="px-4 py-3 text-center">{item.employeeId}</td>
              <td className="px-4 py-3 text-center font-medium">{item.employeeName}</td>
              <td className="px-4 py-3 text-center">{item.position}</td>
              <td className="px-4 py-3 text-center">{formatDateSafely(item.resignationDate)}</td>
              <td className="px-4 py-3 text-center max-w-[200px] truncate" title={item.reason}>{item.reason}</td>
              <td className="px-4 py-3 text-center min-w-[110px]">
                {item.status.toLowerCase() === 'pending' ? (
                  <span className="bg-yellow-500 text-white px-4 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">Pending</span>
                ) : item.status.toLowerCase() === 'approved' ? (
                  <span className="bg-green-500 text-white px-4 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">Approved</span>
                ) : item.status.toLowerCase() === 'rejected' ? (
                  <span className="bg-red-500 text-white px-4 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">Rejected</span>
                ) : item.status.toLowerCase() === 'completed' ? (
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">Completed</span>
                ) : (
                  <span className="bg-gray-500 text-white px-4 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">{item.status}</span>
                )}
              </td>
              {showActions && (
                <td className="px-4 py-3 text-center min-w-[120px]">
                  {item.status.toLowerCase() === 'approved' && onComplete && (
                    <button
                      onClick={() => onComplete(item.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
                    >
                      Complete
                    </button>
                  )}
                  {item.status.toLowerCase() === 'completed' && (
                    <span className="text-gray-400 text-xs">Already Completed</span>
                  )}
                  {item.status.toLowerCase() === 'pending' && (
                    <span className="text-gray-400 text-xs">Pending Approval</span>
                  )}
                  {item.status.toLowerCase() === 'rejected' && (
                    <span className="text-gray-400 text-xs">Rejected</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-700">
          <span>
            Showing {data.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, data.length)} of {data.length} entries
          </span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
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
              {getPageNumbers().map((pageNumber, index) => (
                <button
                  key={index}
                  onClick={() => typeof pageNumber === 'number' && handlePageChange(pageNumber)}
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
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                currentPage === totalPages
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
  );
}

const RESIGNATION_CATEGORIES = [
  'Pending Resignations',
  'Approved Resignations',
  'Completed Resignations',
  'Rejected Resignations',
  'This Month Resignations'
];

const ResignationPage: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allResignations, setAllResignations] = useState<ResignationData[]>([]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(RESIGNATION_CATEGORIES));
  const router = useRouter();

  // Mock resignation data - replace with Firebase data
  const mockResignations: ResignationData[] = [
    {
      id: '1',
      employeeId: 'EMP003',
      employeeName: 'Mike Johnson',
      position: 'Project Manager',
      department: 'Operations',
      resignationDate: '2024-01-15',
      lastWorkingDay: '2024-02-15',
      reason: 'Career growth opportunity at another company',
      status: 'completed',
      approvedBy: 'HR Manager',
      approvedDate: '2024-01-20',
      exitInterview: 'Completed',
      handoverStatus: 'Completed',
      finalSalary: '18000000'
    },
    {
      id: '2',
      employeeId: 'EMP006',
      employeeName: 'Lisa Anderson',
      position: 'Marketing Specialist',
      department: 'Marketing',
      resignationDate: '2024-02-01',
      lastWorkingDay: '2024-03-01',
      reason: 'Relocating to another city',
      status: 'approved',
      approvedBy: 'HR Manager',
      approvedDate: '2024-02-05',
      exitInterview: 'Scheduled',
      handoverStatus: 'In Progress',
      finalSalary: '12000000'
    },
    {
      id: '3',
      employeeId: 'EMP007',
      employeeName: 'Robert Chen',
      position: 'Sales Executive',
      department: 'Sales',
      resignationDate: '2024-02-10',
      lastWorkingDay: '2024-03-10',
      reason: 'Starting own business',
      status: 'pending',
      approvedBy: '',
      approvedDate: '',
      exitInterview: 'Not Scheduled',
      handoverStatus: 'Not Started',
      finalSalary: ''
    },
    {
      id: '4',
      employeeId: 'EMP008',
      employeeName: 'Maria Garcia',
      position: 'Customer Support',
      department: 'Support',
      resignationDate: '2024-01-20',
      lastWorkingDay: '2024-02-20',
      reason: 'Health issues',
      status: 'rejected',
      approvedBy: 'HR Manager',
      approvedDate: '2024-01-25',
      exitInterview: 'Not Required',
      handoverStatus: 'Not Required',
      finalSalary: ''
    },
    {
      id: '5',
      employeeId: 'EMP009',
      employeeName: 'John Smith',
      position: 'Software Developer',
      department: 'IT',
      resignationDate: '2024-02-15',
      lastWorkingDay: '2024-03-15',
      reason: 'Better opportunity at tech company',
      status: 'approved',
      approvedBy: 'HR Manager',
      approvedDate: '2024-02-18',
      exitInterview: 'Scheduled',
      handoverStatus: 'In Progress',
      finalSalary: '15000000'
    },
    {
      id: '6',
      employeeId: 'EMP010',
      employeeName: 'Sarah Wilson',
      position: 'HR Assistant',
      department: 'HR',
      resignationDate: '2024-02-20',
      lastWorkingDay: '2024-03-20',
      reason: 'Moving to another city',
      status: 'approved',
      approvedBy: 'HR Manager',
      approvedDate: '2024-02-22',
      exitInterview: 'Scheduled',
      handoverStatus: 'In Progress',
      finalSalary: '8000000'
    }
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = docRef(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({ name: data.name || 'User', role: data.role || 'Unknown Role', email: user.email || 'No email provided' });
          } else {
            setError('User data not found in Firestore.');
          }
        } catch (err: any) {
          setError(`Failed to load user data: ${err.message}`);
        }
      } else {
        setError('No user is logged in.');
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch resignation data from Firebase
  const fetchResignationData = async () => {
    setLoading(true);
    try {
      // Fetch from resignations collection
      const resignationsSnapshot = await getDocs(collection(db, 'resignations'));
      const resignations: ResignationData[] = [];
      
      resignationsSnapshot.forEach((doc) => {
        const data = doc.data();
        resignations.push({
          id: doc.id,
          employeeId: data.employeeId || data.nik || '',
          employeeName: data.employeeName || data.name || '',
          position: data.position || '',
          department: data.department || data.division || '',
          resignationDate: data.resignationDate || data.date || '',
          lastWorkingDay: data.lastWorkingDay || data.endDate || '',
          reason: data.reason || data.description || '',
          status: data.status || 'pending',
          approvedBy: data.approvedBy || data.approvedByUser || '',
          approvedDate: data.approvedDate || null,
          rejectedBy: data.rejectedBy || '',
          rejectedDate: data.rejectedDate || null,
          exitInterview: data.exitInterview || data.interviewStatus || '',
          handoverStatus: data.handoverStatus || data.handover || '',
          finalSalary: data.finalSalary || data.salary || ''
        });
      });

      // Use Firebase data as primary, add mock data only if no Firebase data exists
      if (resignations.length > 0) {
        console.log('Firebase resignations data:', resignations);
        setAllResignations(resignations);
      } else {
        // Add mock data only if no data from Firebase
        console.log('No Firebase data found, using mock data');
        setAllResignations(mockResignations);
      }
    } catch (error) {
      console.error('Error fetching resignation data:', error);
      // Use mock data as fallback
      setAllResignations(mockResignations);
    }
    setLoading(false);
  };



  useEffect(() => {
    fetchResignationData();
  }, []);

  // Filter resignations based on criteria
  const filteredResignations = allResignations.filter(resignation => {
    const matchesDate = !filterDate || resignation.resignationDate.includes(filterDate);
    const matchesSearch = !searchQuery || 
      resignation.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resignation.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resignation.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resignation.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resignation.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resignation.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDate && matchesSearch;
  });

  // Group resignations by category
  const groupedData = {
    'Pending Resignations': filteredResignations.filter(res => 
      res.status.toLowerCase() === 'pending'
    ),
    'Approved Resignations': filteredResignations.filter(res => 
      res.status.toLowerCase() === 'approved'
    ),
    'Completed Resignations': filteredResignations.filter(res => 
      res.status.toLowerCase() === 'completed'
    ),
    'Rejected Resignations': filteredResignations.filter(res => 
      res.status.toLowerCase() === 'rejected'
    ),
    'This Month Resignations': filteredResignations.filter(res => {
      if (!res.resignationDate || res.resignationDate === '') return false;
      try {
      const resignationDate = new Date(res.resignationDate);
      const currentDate = new Date();
      return resignationDate.getMonth() === currentDate.getMonth() && 
             resignationDate.getFullYear() === currentDate.getFullYear();
      } catch (error) {
        return false;
      }
    })
  };

  const totalResignations = filteredResignations.length;
  const pendingCount = filteredResignations.filter(res => res.status.toLowerCase() === 'pending').length;

  // Handle completing a resignation
  const handleCompleteResignation = async (resignationId: string) => {
    try {
      // Update the resignation status in Firebase
      const resignationRef = doc(db, 'resignations', resignationId);
      await updateDoc(resignationRef, {
        status: 'completed',
        completedDate: new Date().toISOString(),
        completedBy: userData?.name || 'HR User'
      });

      // Update local state
      setAllResignations(prev => 
        prev.map(res => 
          res.id === resignationId 
            ? { ...res, status: 'completed' as const }
            : res
        )
      );

      console.log('Resignation marked as completed:', resignationId);
    } catch (error) {
      console.error('Error completing resignation:', error);
      alert('Failed to complete resignation. Please try again.');
    }
  };

  // Export Excel function
  const handleExportExcel = () => {
    const formattedData = filteredResignations.map(item => ({
      'Employee ID': item.employeeId,
      'Employee Name': item.employeeName,
      'Position': item.position,
      'Resignation Date': formatDateSafely(item.resignationDate),
      'Reason': item.reason,
      'Approved By': item.approvedBy || '-',
      'Approved Date': formatDateSafely(item.approvedDate),
      'Rejected By': item.rejectedBy || '-',
      'Rejected Date': formatDateSafely(item.rejectedDate),
      'Status': item.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resignation Data');
    
    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Employee ID
      { wch: 25 }, // Employee Name
      { wch: 20 }, // Position
      { wch: 15 }, // Resignation Date
      { wch: 30 }, // Reason
      { wch: 20 }, // Approved By
      { wch: 15 }, // Approved Date
      { wch: 20 }, // Rejected By
      { wch: 15 }, // Rejected Date
      { wch: 15 }  // Status
    ];
    worksheet['!cols'] = columnWidths;
    
    XLSX.writeFile(workbook, 'resignation_data.xlsx');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans">
        {/* Header */}
        <div className="rounded-xl p-4 mb-6 bg-white shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center justify-center sm:justify-start">
              <img
                src="/logo.jpeg"
                alt="Ansinda Logo"
                className="h-16 w-auto"
              />
            </div>
            <div className="flex-1 flex justify-center items-center">
              <h2 className="text-3xl font-bold text-black text-center">HR Resignation Management</h2>
            </div>
            <div className="hidden sm:block w-32" />
          </div>
        </div>

        {/* Controls */}
        <div className="w-full px-2 sm:px-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6 bg-white border border-gray-200 rounded-xl shadow py-4 px-6">
          {/* Left Side - Search and Filters */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 flex-1">
            {/* Search Bar */}
            <div className="flex flex-col w-full lg:max-w-md">
              <label className="block text-gray-400 text-sm mb-2 font-medium">Search Employee</label>
              <div className="relative">
                <input
                  type="text"
                  className="border border-gray-200 rounded-lg pl-10 pr-10 py-2 text-sm bg-white shadow-sm text-gray-900 w-full"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search"
                />
                <svg 
                  className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 hover:text-gray-600"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col w-full sm:max-w-xs">
                <label className="block text-gray-400 text-sm mb-2 font-medium">Join Date</label>
                <input
                  type="date"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-900 w-full"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  placeholder="mm/dd/yyyy"
                />
              </div>
            </div>
            </div>
            
          {/* Right Side - Export and Total */}
          <div className="flex flex-col items-center lg:items-end gap-3">
              <button
              className="bg-blue-900 text-white px-6 py-2 rounded-lg font-medium text-sm shadow-sm w-full lg:w-auto transition hover:bg-blue-800"
                onClick={handleExportExcel}
              >
                Export Excel
              </button>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 font-medium text-sm text-gray-800 flex flex-row justify-between items-center shadow-sm w-full lg:w-auto">
              <span className="text-gray-500 text-sm">Total Employees</span>
              <span className="text-lg text-black font-semibold ml-4">{totalResignations}</span>
            </div>
            {searchQuery && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 font-medium text-sm text-blue-800 flex flex-row justify-between items-center shadow-sm w-full lg:w-auto">
                <span className="text-blue-600 text-sm">Search Results</span>
                <span className="text-lg text-blue-900 font-semibold ml-4">{filteredResignations.length}</span>
              </div>
            )}
          </div>
        </div>



        {/* Search Results or Accordion Sections */}
        {searchQuery && filteredResignations.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400 mb-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500">Try adjusting your search terms or filters.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 transition-colors"
            >
              Clear Search
            </button>
          </div>
        ) : searchQuery ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Search Results for "{searchQuery}" ({filteredResignations.length} results)
              </h3>
            </div>
            <ResignationTable data={filteredResignations} onComplete={handleCompleteResignation} showActions={true} />
          </div>
        ) : (
          /* Accordion Sections */
          RESIGNATION_CATEGORIES.map(cat => (
            <AccordionSection
              key={cat}
              title={`${cat} (${groupedData[cat as keyof typeof groupedData]?.length || 0})`}
              open={openSections.has(cat)}
              onClick={() => {
                const newOpenSections = new Set(openSections);
                if (newOpenSections.has(cat)) {
                  newOpenSections.delete(cat);
                } else {
                  newOpenSections.add(cat);
                }
                setOpenSections(newOpenSections);
              }}
            >
              <ResignationTable 
                data={groupedData[cat as keyof typeof groupedData] || []} 
                onComplete={handleCompleteResignation} 
                showActions={cat === 'Approved Resignations'}
              />
            </AccordionSection>
          ))
        )}
      </div>
    </div>
  );
};

export default ResignationPage; 