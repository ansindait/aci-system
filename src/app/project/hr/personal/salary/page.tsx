"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { collection, getDocs, doc, updateDoc, Timestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  UserCheck,
  UserX,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc as docRef, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import Sidebar from '@/app/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';

interface UserData {
  name: string;
  role: string;
  email?: string;
}

interface SalaryData {
  id: string;
  employeeId?: string;
  employeeName: string;
  position: string;
  role?: string;
  department?: string;
  currentSalary: string;
  proposedSalary: string;
  adjustmentAmount: string;
  adjustmentType: 'increase' | 'decrease' | 'bonus';
  reason: string;
  requestDate: string;
  effectiveDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvedBy?: string;
  approvedDate?: any; // Changed to any to handle both Timestamp and string
  rejectedBy?: string;
  rejectedDate?: any; // Changed to any to handle both Timestamp and string
  completedBy?: string;
  completedDate?: any; // Changed to any to handle both Timestamp and string
  notes?: string;
  submittedBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

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

// Salary Table Component with Complete Action and Pagination
function SalaryTable({ data, onComplete, userRole, showActions = false }: { data: SalaryData[], onComplete?: (id: string) => void, userRole?: string, showActions?: boolean }) {
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
      <table className="w-full text-sm text-gray-600 min-w-[1000px]">
        <thead className="bg-gray-50 text-gray-700 font-semibold">
          <tr>
            <th className="px-3 py-3 text-center">Employee ID</th>
            <th className="px-3 py-3 text-center">Name</th>
            <th className="px-3 py-3 text-center">Position</th>
            <th className="px-3 py-3 text-center">Role</th>
            <th className="px-3 py-3 text-center">Current Salary</th>
            <th className="px-3 py-3 text-center">Proposed Salary</th>
            <th className="px-3 py-3 text-center">Adjustment</th>
            <th className="px-3 py-3 text-center">Type</th>
            <th className="px-3 py-3 text-center">Status</th>
            <th className="px-3 py-3 text-center">Request Date</th>
            <th className="px-3 py-3 text-center">Effective Date</th>
            {showActions && userRole === 'hr' && <th className="px-3 py-3 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {currentItems.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
              <td className="px-3 py-3 text-center">{item.employeeId || '-'}</td>
              <td className="px-3 py-3 text-center font-medium">{item.employeeName}</td>
              <td className="px-3 py-3 text-center">{item.position}</td>
              <td className="px-3 py-3 text-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                  {item.role || '-'}
                </span>
              </td>
              <td className="px-3 py-3 text-center">
                {item.currentSalary.includes('Rp') ? item.currentSalary : `Rp. ${Number(item.currentSalary.replace(/[^\d]/g, '') || 0).toLocaleString('id-ID')}`}
              </td>
              <td className="px-3 py-3 text-center">
                {item.proposedSalary.includes('Rp') ? item.proposedSalary : `Rp. ${Number(item.proposedSalary.replace(/[^\d]/g, '') || 0).toLocaleString('id-ID')}`}
              </td>
              <td className="px-3 py-3 text-center">
                <span className={`font-bold ${Number(item.adjustmentAmount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(item.adjustmentAmount) >= 0 ? '+' : ''}Rp. {Number(item.adjustmentAmount).toLocaleString('id-ID')}
                </span>
              </td>
              <td className="px-3 py-3 text-center">
                {item.adjustmentType === 'increase' ? (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">Increase</span>
                ) : item.adjustmentType === 'decrease' ? (
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-semibold">Decrease</span>
                ) : (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">Bonus</span>
                )}
              </td>
              <td className="px-3 py-3 text-center">
                {item.status === 'pending' ? (
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold inline-block text-center whitespace-nowrap">Pending</span>
                ) : item.status === 'approved' ? (
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold inline-block text-center whitespace-nowrap">Approved</span>
                ) : item.status === 'rejected' ? (
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold inline-block text-center whitespace-nowrap">Rejected</span>
                ) : (
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold inline-block text-center whitespace-nowrap">Completed</span>
                )}
              </td>
              <td className="px-3 py-3 text-center">{new Date(item.requestDate).toLocaleDateString()}</td>
              <td className="px-3 py-3 text-center">{new Date(item.effectiveDate).toLocaleDateString()}</td>
              {showActions && userRole === 'hr' && item.status === 'approved' && (
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => onComplete && onComplete(item.id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 mx-auto transition-colors focus:ring-2 focus:ring-blue-500"
                  >
                    <CheckCircle size={12} />
                    Complete
                  </button>
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

const SALARY_CATEGORIES = [
  'Pending Adjustments',
  'Approved Adjustments',
  'Completed Adjustments',
  'Rejected Adjustments',
  'This Month Adjustments'
];

const SalaryPage: React.FC = () => {
  const { isSidebarOpen } = useSidebar();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allSalaryAdjustments, setAllSalaryAdjustments] = useState<SalaryData[]>([]);
  const [userRoles, setUserRoles] = useState<{ [key: string]: string }>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(SALARY_CATEGORIES));
  const router = useRouter();

  // Fetch user roles from Firestore
  useEffect(() => {
    const fetchUserRoles = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const roles: { [key: string]: string } = {};
        
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.name && userData.role) {
            // Store role by name (case-insensitive for matching)
            roles[userData.name.toLowerCase()] = userData.role;
          }
        });
        
        setUserRoles(roles);
      } catch (error) {
        console.error('Error fetching user roles:', error);
      }
    };

    fetchUserRoles();
  }, []);

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

  // Real-time listener for salary adjustments
  useEffect(() => {
    if (!userData) return;

    const q = query(collection(db, 'salary_adjustments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adjustments: SalaryData[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Determine submitted by - use the employee name as submitted by since that's who requested it
        let submittedBy = data.submittedBy || '';
        if (!submittedBy) {
          // If no submittedBy field, use the employee name as the person who submitted the request
          submittedBy = data.fullName || data.employeeName || '';
        }
        
        // Get employee name for role matching
        const employeeName = data.fullName || data.employeeName || '';
        
        // Find role by matching employee name with users collection
        let role = '';
        if (employeeName) {
          // Try exact match first
          role = userRoles[employeeName.toLowerCase()] || '';
          
          // If no exact match, try partial matching (for cases like "Ryan" vs "Ryan Ganteng")
          if (!role) {
            const nameParts = employeeName.toLowerCase().split(' ');
            for (const userName in userRoles) {
              if (nameParts.some((part: string) => userName.includes(part)) || userName.includes(employeeName.toLowerCase())) {
                role = userRoles[userName];
                break;
              }
            }
          }
        }
        
        const adjustment: SalaryData = {
          id: doc.id,
          employeeId: data.employeeId || '',
          employeeName: employeeName,
          position: data.position || '',
          role: role,
          department: data.department || '',
          currentSalary: data.latestSalary || data.currentSalary || '0',
          proposedSalary: data.salarySubmission || data.proposedSalary || '0',
          adjustmentAmount: data.adjustmentAmount || '0',
          adjustmentType: data.adjustmentType || 'increase',
          reason: data.reason || '',
          requestDate: data.requestDate || (data.createdAt ? data.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          effectiveDate: data.effectiveDate || (data.createdAt ? data.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          status: data.status === 'implemented' ? 'completed' : (data.status || 'pending'),
          approvedBy: data.approvedBy || '',
          approvedDate: data.approvedDate || null,
          rejectedBy: data.rejectedBy || '',
          rejectedDate: data.rejectedDate || null,
          completedBy: data.completedBy || data.implementedBy || '',
          completedDate: data.completedDate || data.implementedDate || null,
          notes: data.notes || '',
          submittedBy: submittedBy,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };
        
        // Calculate adjustment amount if not provided
        if (!adjustment.adjustmentAmount || adjustment.adjustmentAmount === '0') {
          // Extract numbers from salary strings (remove "Rp " and commas)
          const currentStr = adjustment.currentSalary.replace(/[^\d]/g, '');
          const proposedStr = adjustment.proposedSalary.replace(/[^\d]/g, '');
          const current = parseFloat(currentStr) || 0;
          const proposed = parseFloat(proposedStr) || 0;
          adjustment.adjustmentAmount = (proposed - current).toString();
        }
        
        adjustments.push(adjustment);
      });

      setAllSalaryAdjustments(adjustments);
    }, (error) => {
      console.error('Error fetching salary adjustments:', error);
      setError('Failed to load salary adjustments');
    });

    return () => unsubscribe();
  }, [userData, userRoles]);

  // Handle complete action for HR
  const handleComplete = async (id: string) => {
    if (!userData || userData.role !== 'hr') return;
    
    try {
      await updateDoc(doc(db, 'salary_adjustments', id), {
        status: 'completed',
        completedBy: userData.name,
        completedDate: new Date().toISOString(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error completing adjustment:', error);
      alert('Failed to complete adjustment');
    }
  };

  // Collapse all sections
  const handleCollapseAll = () => {
    setOpenSections(new Set());
  };

  // Open all sections
  const handleOpenAll = () => {
    setOpenSections(new Set(SALARY_CATEGORIES));
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilterDate('');
    setFilterRole('');
  };

  // Filter salary adjustments based on criteria
  const filteredSalaryAdjustments = allSalaryAdjustments.filter(adjustment => {
    const matchesDate = !filterDate || adjustment.requestDate.includes(filterDate);
    const matchesRole = !filterRole || filterRole === 'All Roles' || 
      (adjustment.role && adjustment.role.toLowerCase() === filterRole.toLowerCase());
    const matchesSearch = !searchQuery || 
      adjustment.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adjustment.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adjustment.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adjustment.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adjustment.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adjustment.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDate && matchesRole && matchesSearch;
  });

  // Group salary adjustments by category
  const groupedData = {
    'Pending Adjustments': filteredSalaryAdjustments.filter(adj => adj.status === 'pending'),
    'Approved Adjustments': filteredSalaryAdjustments.filter(adj => adj.status === 'approved'),
    'Completed Adjustments': filteredSalaryAdjustments.filter(adj => adj.status === 'completed'),
    'Rejected Adjustments': filteredSalaryAdjustments.filter(adj => adj.status === 'rejected'),
    'This Month Adjustments': filteredSalaryAdjustments.filter(adj => {
      const requestDate = new Date(adj.requestDate);
      const currentDate = new Date();
      return requestDate.getMonth() === currentDate.getMonth() && 
             requestDate.getFullYear() === currentDate.getFullYear();
    })
  };

  // Get unique roles from the data for dynamic filter options
  const uniqueRoles = Array.from(new Set(allSalaryAdjustments
    .map(adj => adj.role)
    .filter((role): role is string => role !== undefined && role.trim() !== '')
  )).sort();

  const totalAdjustments = filteredSalaryAdjustments.length;
  const pendingCount = filteredSalaryAdjustments.filter(adj => adj.status === 'pending').length;
  const totalAdjustmentAmount = filteredSalaryAdjustments.reduce((sum, adj) => sum + Number(adj.adjustmentAmount), 0);

  // Export Excel function
  const handleExportExcel = () => {
    const formattedData = filteredSalaryAdjustments.map(item => ({
      'Employee ID': item.employeeId || '-',
      'Employee Name': item.employeeName,
      'Position': item.position,
      'Role': item.role || '-',
      'Current Salary': item.currentSalary.includes('Rp') ? item.currentSalary : `Rp. ${Number(item.currentSalary.replace(/[^\d]/g, '') || 0).toLocaleString('id-ID')}`,
      'Proposed Salary': item.proposedSalary.includes('Rp') ? item.proposedSalary : `Rp. ${Number(item.proposedSalary.replace(/[^\d]/g, '') || 0).toLocaleString('id-ID')}`,
      'Adjustment Amount': `Rp. ${Number(item.adjustmentAmount).toLocaleString('id-ID')}`,
      'Adjustment Type': item.adjustmentType,
      'Reason': item.reason,
      'Request Date': new Date(item.requestDate).toLocaleDateString(),
      'Effective Date': new Date(item.effectiveDate).toLocaleDateString(),
      'Status': item.status,
      'Approved By': item.approvedBy || '-',
      'Approved Date': item.approvedDate ? (typeof item.approvedDate === 'object' && 'toDate' in item.approvedDate ? (item.approvedDate as any).toDate().toLocaleDateString() : new Date(item.approvedDate).toLocaleDateString()) : '-',
      'Rejected By': item.rejectedBy || '-',
      'Rejected Date': item.rejectedDate ? (typeof item.rejectedDate === 'object' && 'toDate' in item.rejectedDate ? (item.rejectedDate as any).toDate().toLocaleDateString() : new Date(item.rejectedDate).toLocaleDateString()) : '-',
      'Completed By': item.completedBy || '-',
      'Completed Date': item.completedDate ? (typeof item.completedDate === 'object' && 'toDate' in item.completedDate ? (item.completedDate as any).toDate().toLocaleDateString() : new Date(item.completedDate).toLocaleDateString()) : '-',
      'Notes': item.notes || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Adjustments');
    
    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Employee ID
      { wch: 25 }, // Employee Name
      { wch: 20 }, // Position
      { wch: 15 }, // Role
      { wch: 20 }, // Current Salary
      { wch: 20 }, // Proposed Salary
      { wch: 20 }, // Adjustment Amount
      { wch: 15 }, // Adjustment Type
      { wch: 30 }, // Reason
      { wch: 15 }, // Request Date
      { wch: 15 }, // Effective Date
      { wch: 15 }, // Status
      { wch: 20 }, // Approved By
      { wch: 15 }, // Approved Date
      { wch: 20 }, // Rejected By
      { wch: 15 }, // Rejected Date
      { wch: 20 }, // Completed By
      { wch: 15 }, // Completed Date
      { wch: 30 }  // Notes
    ];
    worksheet['!cols'] = columnWidths;
    
    XLSX.writeFile(workbook, 'salary_adjustments.xlsx');
  };

  const userInitial = userData?.name?.charAt(0).toUpperCase() || 'U';

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
    <div className="min-h-screen bg-[#F8F9FA]">
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
            <h2 className="text-3xl font-bold text-black text-center">HR Salary Adjustment Management</h2>
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
                <label className="block text-gray-400 text-sm mb-2 font-medium">Request Date</label>
                <input
                  type="date"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-900 w-full"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col w-full sm:max-w-xs">
                <label className="block text-gray-400 text-sm mb-2 font-medium">Role</label>
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-900 w-full"
                  value={filterRole}
                  onChange={e => setFilterRole(e.target.value)}
                >
                  <option value="">All Roles</option>
                  {uniqueRoles.map(role => (
                    <option key={role} value={role.toLowerCase()}>
                      {role}
                    </option>
                  ))}
                </select>
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
              <span className="text-gray-500 text-sm">Total Adjustments</span>
              <span className="text-lg text-black font-semibold ml-4">{totalAdjustments}</span>
            </div>
            {searchQuery && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 font-medium text-sm text-blue-800 flex flex-row justify-between items-center shadow-sm w-full lg:w-auto">
                <span className="text-blue-600 text-sm">Search Results</span>
                <span className="text-lg text-blue-900 font-semibold ml-4">{filteredSalaryAdjustments.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Search Results or Accordion Sections */}
        {searchQuery && filteredSalaryAdjustments.length === 0 ? (
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
                Search Results for "{searchQuery}" ({filteredSalaryAdjustments.length} results)
              </h3>
            </div>
            <SalaryTable 
              data={filteredSalaryAdjustments} 
              onComplete={handleComplete}
              userRole={userData?.role}
              showActions={true}
            />
          </div>
        ) : (
          /* Accordion Sections */
          SALARY_CATEGORIES.map(cat => (
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
              <SalaryTable 
                data={groupedData[cat as keyof typeof groupedData] || []} 
                onComplete={handleComplete}
                userRole={userData?.role}
                showActions={cat === 'Approved Adjustments'}
              />
            </AccordionSection>
          ))
        )}
      </div>
    </div>
  );
};

export default SalaryPage; 