"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  BarChart3,
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



interface TicketData {
  id: string;
  date: string;
  nik: string;
  name: string;
  role: string;
  ticketDate: string;
  ticketReason: string;
  ticketPrice: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvedBy?: string;
  approvedDate?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  completedBy?: string;
  completedDate?: string;
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

// Ticket Table Component with Pagination
function TicketTable({ data, onComplete, userRole, showActions = false }: { 
  data: TicketData[], 
  onComplete?: (id: string) => void, 
  userRole?: string, 
  showActions?: boolean 
}) {
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
            <th className="px-3 py-3 text-center">Date</th>
            <th className="px-3 py-3 text-center">NIK</th>
            <th className="px-3 py-3 text-center">Name</th>
            <th className="px-3 py-3 text-center">Role</th>
            <th className="px-3 py-3 text-center">Ticket Date</th>
            <th className="px-3 py-3 text-center">Ticket Reason</th>
            <th className="px-3 py-3 text-center">Ticket Price</th>
            <th className="px-3 py-3 text-center">Status</th>
            {showActions && userRole === 'hr' && <th className="px-3 py-3 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {currentItems.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-300 hover:bg-gray-50">
              <td className="px-3 py-3 text-center">{formatDateSafely(item.date)}</td>
              <td className="px-3 py-3 text-center font-medium">{item.nik}</td>
              <td className="px-3 py-3 text-center">{item.name}</td>
              <td className="px-3 py-3 text-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                  {item.role}
                </span>
              </td>
              <td className="px-3 py-3 text-center">{formatDateSafely(item.ticketDate)}</td>
              <td className="px-3 py-3 text-center max-w-[200px] truncate" title={item.ticketReason}>{item.ticketReason}</td>
              <td className="px-3 py-3 text-center font-semibold">{item.ticketPrice}</td>
              <td className="px-3 py-3 text-center min-w-[110px]">
                {item.status === 'pending' ? (
                  <span className="bg-yellow-500 text-white px-4 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">Pending</span>
                ) : item.status === 'approved' ? (
                  <span className="bg-green-500 text-white px-4 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">Approved</span>
                ) : item.status === 'completed' ? (
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">Completed</span>
                ) : (
                  <span className="bg-red-500 text-white px-4 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">Rejected</span>
                )}
              </td>
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

const TICKET_CATEGORIES = [
  'Pending Tickets',
  'Approved Tickets',
  'Completed Tickets',
  'Rejected Tickets',
  'This Month Tickets'
];

const TicketPage: React.FC = () => {
  const { isSidebarOpen } = useSidebar();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allTickets, setAllTickets] = useState<TicketData[]>([]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(TICKET_CATEGORIES));
  const router = useRouter();

  // Mock ticket data based on Firestore structure
  const mockTickets: TicketData[] = [
    {
      id: '1',
      date: '2025-07-25',
      nik: '12333211',
      name: 'Budiman',
      role: '', // Will be populated from users collection if exists
      ticketDate: '2025-07-22',
      ticketReason: 'aku mau terbang',
      ticketPrice: 'Rp 3.000.000',
      status: 'rejected'
    },
    {
      id: '2',
      date: '2025-07-25',
      nik: '20220810100',
      name: 'Indra',
      role: '', // Will be populated from users collection if exists
      ticketDate: '2025-07-10',
      ticketReason: 'mau ke jepang',
      ticketPrice: 'Rp 5.954.999',
      status: 'approved',
      approvedBy: 'HR Manager'
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

  // Fetch ticket data from Firebase
  const fetchTicketData = async () => {
    setLoading(true);
    try {
      const ticketsSnapshot = await getDocs(collection(db, 'ticket_request'));
      const tickets: TicketData[] = [];
      
      // Fetch user roles for validation
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userRoles: { [key: string]: string } = {};
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.name && userData.role) {
          userRoles[userData.name.toLowerCase()] = userData.role;
        }
      });
      
      ticketsSnapshot.forEach((doc) => {
        const data = doc.data();
        const userName = data.name || '';
        const userRole = userRoles[userName.toLowerCase()] || '';
        
        tickets.push({
          id: doc.id,
          date: data.date || '',
          nik: data.nik || '',
          name: data.name || '',
          role: userRole || '', // Empty if user not found in database
          ticketDate: data.ticketDate || '',
          ticketReason: data.ticketReason || '',
          ticketPrice: data.ticketPrice || '',
          status: data.status || 'pending',
          approvedBy: data.approvedBy || '',
          approvedDate: data.approvedDate || '',
          rejectedBy: data.rejectedBy || '',
          rejectedDate: data.rejectedDate || '',
          completedBy: data.completedBy || '',
          completedDate: data.completedDate || ''
        });
      });

      // Apply role validation to mock data as well
      const validatedMockTickets = mockTickets.map(ticket => ({
        ...ticket,
        role: userRoles[ticket.name.toLowerCase()] || ''
      }));

      setAllTickets([...tickets, ...validatedMockTickets]);
    } catch (error) {
      console.error('Error fetching ticket data:', error);
      setAllTickets(mockTickets);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTicketData();
  }, []);



  // Filter tickets based on criteria
  const filteredTickets = allTickets.filter(ticket => {
    const matchesDate = !filterDate || ticket.date.includes(filterDate);
    const matchesDepartment = !filterDepartment || ticket.role.toLowerCase().includes(filterDepartment.toLowerCase());
    const matchesSearch = !searchQuery || 
      ticket.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.nik.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketReason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDate && matchesDepartment && matchesSearch;
  });

  // Group tickets by category
  const groupedData = {
    'Pending Tickets': filteredTickets.filter(ticket => ticket.status === 'pending'),
    'Approved Tickets': filteredTickets.filter(ticket => ticket.status === 'approved'),
    'Completed Tickets': filteredTickets.filter(ticket => ticket.status === 'completed'),
    'Rejected Tickets': filteredTickets.filter(ticket => ticket.status === 'rejected'),
    'This Month Tickets': filteredTickets.filter(ticket => {
      const requestDate = new Date(ticket.date);
      const currentDate = new Date();
      return requestDate.getMonth() === currentDate.getMonth() && 
             requestDate.getFullYear() === currentDate.getFullYear();
    })
  };

  const totalTickets = filteredTickets.length;
  const pendingCount = filteredTickets.filter(ticket => ticket.status === 'pending').length;

  // Collapse All function
  const handleCollapseAll = () => {
    setOpenSections(new Set());
  };

  // Open All function
  const handleOpenAll = () => {
    setOpenSections(new Set(TICKET_CATEGORIES));
  };

  // Complete ticket function
  const handleComplete = async (id: string) => {
    try {
      const ticketRef = doc(db, 'ticket_request', id);
      const currentDate = new Date().toISOString();
      
      await updateDoc(ticketRef, {
        status: 'completed',
        completedBy: userData?.name || 'HR User',
        completedDate: currentDate
      });

      // Refresh the data
      fetchTicketData();
    } catch (error) {
      console.error('Error completing ticket:', error);
    }
  };

  // Export Excel function
  const handleExportExcel = () => {
    const formattedData = filteredTickets.map(item => ({
      'Date': formatDateSafely(item.date),
      'NIK': item.nik,
      'Name': item.name,
      'Role': item.role,
      'Ticket Date': formatDateSafely(item.ticketDate),
      'Ticket Reason': item.ticketReason,
      'Ticket Price': item.ticketPrice,
      'Status': item.status,
      'Approved By': item.approvedBy || '-',
      'Approved Date': formatDateSafely(item.approvedDate),
      'Rejected By': item.rejectedBy || '-',
      'Rejected Date': formatDateSafely(item.rejectedDate),
      'Completed By': item.completedBy || '-',
      'Completed Date': formatDateSafely(item.completedDate)
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ticket Requests');
    
    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Date
      { wch: 15 }, // NIK
      { wch: 20 }, // Name
      { wch: 15 }, // Position
      { wch: 15 }, // Ticket Date
      { wch: 30 }, // Ticket Reason
      { wch: 20 }, // Ticket Price
      { wch: 15 }, // Status
      { wch: 20 }, // Approved By
      { wch: 15 }, // Approved Date
      { wch: 20 }, // Rejected By
      { wch: 15 }, // Rejected Date
      { wch: 20 }, // Completed By
      { wch: 15 }  // Completed Date
    ];
    worksheet['!cols'] = columnWidths;
    
    XLSX.writeFile(workbook, 'ticket_requests.xlsx');
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
            <h2 className="text-3xl font-bold text-black text-center">HR Ticket Request Management</h2>
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
                  value={filterDepartment}
                  onChange={e => setFilterDepartment(e.target.value)}
                >
                  <option value="">All Roles</option>
                  {Array.from(new Set(allTickets.map(ticket => ticket.role).filter(role => role))).map(role => (
                    <option key={role} value={role}>
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
              <span className="text-gray-500 text-sm">Total Tickets</span>
              <span className="text-lg text-black font-semibold ml-4">{totalTickets}</span>
            </div>
            {searchQuery && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 font-medium text-sm text-blue-800 flex flex-row justify-between items-center shadow-sm w-full lg:w-auto">
                <span className="text-blue-600 text-sm">Search Results</span>
                <span className="text-lg text-blue-900 font-semibold ml-4">{filteredTickets.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Search Results or Accordion Sections */}
        {searchQuery && filteredTickets.length === 0 ? (
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
                Search Results for "{searchQuery}" ({filteredTickets.length} results)
              </h3>
            </div>
            <TicketTable 
              data={filteredTickets} 
              onComplete={handleComplete}
              userRole={userData?.role}
              showActions={true}
            />
          </div>
        ) : (
          /* Accordion Sections */
          TICKET_CATEGORIES.map(cat => (
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
              <TicketTable 
                data={groupedData[cat as keyof typeof groupedData] || []} 
                onComplete={handleComplete}
                userRole={userData?.role}
                showActions={cat === 'Approved Tickets'}
              />
            </AccordionSection>
          ))
        )}
      </div>
    </div>
  );
};

export default TicketPage; 