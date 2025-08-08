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

interface EmployeeData {
  id: string;
  nik?: string;
  name: string;
  position: string;
  joinDate: string;
  phone: string;
  email: string;
  division: string;
  project: string;
  region: string;
  status?: 'active' | 'inactive' | 'resigned';
  salary?: string;
  employeeId?: string;
  address?: string;
  emergencyContact?: string;
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

// Employee Table Component with Pagination
function EmployeeTable({ data, onStatusUpdate }: { data: EmployeeData[], onStatusUpdate?: (id: string, newStatus: 'active' | 'inactive') => void }) {
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
      <table className="w-full text-sm text-left text-gray-600 min-w-[1200px]">
        <thead className="bg-gray-50 text-gray-500 font-bold">
          <tr>
            <th className="px-2 py-2">NO</th>
            <th className="px-2 py-2">NIK</th>
            <th className="px-2 py-2">NAME</th>
            <th className="px-2 py-2">POSITION</th>
            <th className="px-2 py-2">JOIN DATE</th>
            <th className="px-2 py-2">PHONE</th>
            <th className="px-2 py-2">EMAIL</th>
            <th className="px-2 py-2">DIVISION</th>
            <th className="px-2 py-2">PROJECT</th>
            <th className="px-2 py-2">REGION</th>
            <th className="px-2 py-2">STATUS</th>
            <th className="px-2 py-2">OPERATION</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-300 hover:bg-gray-50">
              <td className="px-2 py-2">{indexOfFirstItem + idx + 1}</td>
              <td className="px-2 py-2">{item.nik || '-'}</td>
              <td className="px-2 py-2 font-medium">{item.name}</td>
              <td className="px-2 py-2">{item.position}</td>
              <td className="px-2 py-2">{item.joinDate}</td>
              <td className="px-2 py-2">{item.phone}</td>
              <td className="px-2 py-2">
                <a href={`mailto:${item.email}`} className="text-blue-600 hover:underline">
                  {item.email}
                </a>
              </td>
              <td className="px-2 py-2">{item.division}</td>
              <td className="px-2 py-2">{item.project}</td>
              <td className="px-2 py-2">{item.region}</td>
              <td className="px-2 py-2 min-w-[100px]">
                {item.status && item.status.toLowerCase() === 'active' ? (
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">Active</span>
                ) : item.status && item.status.toLowerCase() === 'inactive' ? (
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">Inactive</span>
                ) : (
                  <span className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">{item.status || 'Unknown'}</span>
                )}
              </td>
              <td className="px-2 py-2 min-w-[120px]">
                {item.status && item.status.toLowerCase() === 'active' ? (
                  <button
                    onClick={() => onStatusUpdate && onStatusUpdate(item.id, 'inactive')}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors focus:ring-2 focus:ring-red-500"
                    title="Deactivate Employee"
                  >
                    Deactivate
                  </button>
                ) : item.status && item.status.toLowerCase() === 'inactive' ? (
                  <button
                    onClick={() => onStatusUpdate && onStatusUpdate(item.id, 'active')}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors focus:ring-2 focus:ring-green-500"
                    title="Activate Employee"
                  >
                    Activate
                  </button>
                ) : (
                  <span className="text-gray-400 text-xs">No Action</span>
                )}
              </td>
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

const HR_CATEGORIES = [
  'Active Employees',
  'Inactive Employees'
];

const EmployeeDataPage: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allEmployees, setAllEmployees] = useState<EmployeeData[]>([]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(HR_CATEGORIES));
  const [divisions, setDivisions] = useState<string[]>([]);
  const router = useRouter();

  // Handle status update function
  const handleStatusUpdate = async (id: string, newStatus: 'active' | 'inactive') => {
    try {
      // Update in Firebase
      const employeeRef = doc(db, 'users', id);
      await updateDoc(employeeRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setAllEmployees(prevEmployees => 
        prevEmployees.map(emp => 
          emp.id === id ? { ...emp, status: newStatus } : emp
        )
      );

    } catch (error) {
      console.error('Error updating employee status:', error);
      alert('Failed to update employee status. Please try again.');
    }
  };

  // Mock employee data - replace with Firebase data
  const mockEmployees: EmployeeData[] = [
    {
      id: '1',
      nik: '-',
      name: 'Indra',
      position: '-',
      joinDate: '-',
      phone: '-',
      email: 'hr@aci.com',
      division: '-',
      project: '-',
      region: '-',
      status: 'active'
    },
    {
      id: '2',
      nik: '-',
      name: 'Ryan',
      position: 'Permit',
      joinDate: '-',
      phone: '-',
      email: 'permit@aci.com',
      division: 'permit',
      project: '-',
      region: '-',
      status: 'active'
    },
    {
      id: '3',
      nik: '-',
      name: 'TOP',
      position: '-',
      joinDate: '-',
      phone: '-',
      email: 'top@aci.com',
      division: '-',
      project: '-',
      region: '-',
      status: 'active'
    },
    {
      id: '4',
      nik: '-',
      name: 'Indra',
      position: '-',
      joinDate: '-',
      phone: '-',
      email: 'rpm@aci.com',
      division: '-',
      project: '-',
      region: '-',
      status: 'active'
    },
    {
      id: '5',
      nik: '-',
      name: 'QC',
      position: '-',
      joinDate: '-',
      phone: '-',
      email: 'qc@aci.com',
      division: '-',
      project: '-',
      region: '-',
      status: 'active'
    },
    {
      id: '6',
      nik: '-',
      name: 'Ghiffari',
      position: '-',
      joinDate: '-',
      phone: '-',
      email: 'ghiffarirs@gmail.com',
      division: '-',
      project: '-',
      region: '-',
      status: 'active'
    },
    {
      id: '7',
      nik: '-',
      name: 'Ghiffari',
      position: '-',
      joinDate: '-',
      phone: '-',
      email: 'grs@aci.com',
      division: '-',
      project: '-',
      region: '-',
      status: 'active'
    },
    {
      id: '8',
      nik: '-',
      name: 'Ananda',
      position: '-',
      joinDate: '-',
      phone: '-',
      email: 'cw@aci.com',
      division: 'cw',
      project: '-',
      region: '-',
      status: 'active'
    },
    {
      id: '9',
      nik: '-',
      name: 'Ghiffari',
      position: '-',
      joinDate: '-',
      phone: '-',
      email: 'dc@aci.com',
      division: 'dc',
      project: '-',
      region: '-',
      status: 'active'
    },
    {
      id: '10',
      nik: '-',
      name: 'ops',
      position: '-',
      joinDate: '-',
      phone: '-',
      email: 'ops@aci.com',
      division: '-',
      project: '-',
      region: '-',
      status: 'active'
    },
    {
      id: '11',
      nik: '-',
      name: 'Adit',
      position: '-',
      joinDate: '-',
      phone: '-',
      email: 'el@aci.com',
      division: 'el',
      project: '-',
      region: '-',
      status: 'active'
    },
    {
      id: '12',
      nik: '-',
      name: 'Nando',
      position: '-',
      joinDate: '-',
      phone: '-',
      email: 'snd@aci.com',
      division: 'snd',
      project: '-',
      region: '-',
      status: 'active'
    },
    {
      id: '13',
      nik: '-',
      name: 'John Doe',
      position: 'Manager',
      joinDate: '2023-01-15',
      phone: '08123456789',
      email: 'john.doe@aci.com',
      division: 'IT',
      project: 'Project A',
      region: 'Jakarta',
      status: 'inactive'
    },
    {
      id: '14',
      nik: '-',
      name: 'Jane Smith',
      position: 'Developer',
      joinDate: '2023-03-20',
      phone: '08987654321',
      email: 'jane.smith@aci.com',
      division: 'IT',
      project: 'Project B',
      region: 'Bandung',
      status: 'inactive'
    },
    {
      id: '15',
      nik: '-',
      name: 'Bob Wilson',
      position: 'Analyst',
      joinDate: '2023-06-10',
      phone: '08111222333',
      email: 'bob.wilson@aci.com',
      division: 'Finance',
      project: 'Project C',
      region: 'Surabaya',
      status: 'inactive'
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

  // Fetch employee data from Firebase
  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      // Fetch from users collection
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const employees: EmployeeData[] = [];
      const divisionSet = new Set<string>();
      
      // Helper function to convert Firestore timestamp to string
      const convertTimestampToString = (timestamp: any): string => {
        if (!timestamp) return '-';
        if (typeof timestamp === 'string') return timestamp;
        if (timestamp.seconds) {
          // Convert Firestore timestamp to date string
          const date = new Date(timestamp.seconds * 1000);
          return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
        return '-';
      };
      
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role && data.name) {
          const division = data.division || data.department || data.role || '-';
          divisionSet.add(division);
          
          employees.push({
            id: doc.id,
            nik: data.nik || data.employeeId || '-',
            name: data.name,
            position: data.position || data.jobTitle || '-',
            joinDate: convertTimestampToString(data.joinDate || data.hireDate || data.createdAt),
            phone: data.phone || data.phoneNumber || '-',
            email: data.email || '',
            division: division,
            project: data.project || data.currentProject || '-',
            region: data.region || data.location || '-',
            status: data.status || data.employeeStatus || 'active'
          });
        }
      });

      // Set divisions for dropdown
      setDivisions(Array.from(divisionSet).sort());

      // Use Firebase data as primary, add mock data only if no Firebase data exists
      if (employees.length > 0) {
        setAllEmployees(employees);
      } else {
        // Add mock data only if no data from Firebase
        setAllEmployees(mockEmployees);
        // Set divisions from mock data
        const mockDivisions = [...new Set(mockEmployees.map(emp => emp.division))].sort();
        setDivisions(mockDivisions);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      // Use mock data as fallback
      setAllEmployees(mockEmployees);
      // Set divisions from mock data
      const mockDivisions = [...new Set(mockEmployees.map(emp => emp.division))].sort();
      setDivisions(mockDivisions);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  // Filter employees based on criteria
  const filteredEmployees = allEmployees.filter(employee => {
    const matchesDate = !filterDate || employee.joinDate.includes(filterDate);
    const matchesDivision = !filterDepartment || employee.division.toLowerCase().includes(filterDepartment.toLowerCase());
    const matchesSearch = !searchQuery || 
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.division.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (employee.nik && typeof employee.nik === 'string' && employee.nik.toLowerCase().includes(searchQuery.toLowerCase())) ||
      employee.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.region.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDate && matchesDivision && matchesSearch;
  });

  // Group employees by category
  const groupedData = {
    'Active Employees': filteredEmployees.filter(emp => 
      emp.status && emp.status.toLowerCase() === 'active'
    ),
    'Inactive Employees': filteredEmployees.filter(emp => 
      emp.status && emp.status.toLowerCase() === 'inactive'
    )
  };

  const totalEmployees = filteredEmployees.filter(emp => emp.status && emp.status.toLowerCase() === 'active').length;
  const totalSalary = filteredEmployees.reduce((sum, emp) => sum + Number(emp.salary || 0), 0);

  // Export Excel function
  const handleExportExcel = () => {
    const formattedData = filteredEmployees.map(item => ({
      'NO': item.id,
      'NIK': item.nik || '-',
      'Name': item.name,
      'Position': item.position,
      'Join Date': item.joinDate,
      'Phone': item.phone,
      'Email': item.email,
      'Division': item.division,
      'Project': item.project,
      'Region': item.region,
      'Status': item.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Data');
    
    // Set column widths
    const columnWidths = [
      { wch: 5 },  // NO
      { wch: 15 }, // NIK
      { wch: 25 }, // Name
      { wch: 20 }, // Position
      { wch: 15 }, // Join Date
      { wch: 15 }, // Phone
      { wch: 30 }, // Email
      { wch: 20 }, // Division
      { wch: 20 }, // Project
      { wch: 15 }, // Region
      { wch: 15 }  // Status
    ];
    worksheet['!cols'] = columnWidths;
    
    XLSX.writeFile(workbook, 'employee_data.xlsx');
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
            <h2 className="text-3xl font-bold text-black text-center">HR Employee Data</h2>
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
                  placeholder="Search "
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
                />
              </div>
              <div className="flex flex-col w-full sm:max-w-xs">
                <label className="block text-gray-400 text-sm mb-2 font-medium">Division</label>
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-900 w-full"
                  value={filterDepartment}
                  onChange={e => setFilterDepartment(e.target.value)}
                >
                  <option value="">All Divisions</option>
                  {divisions.map((division, index) => (
                    <option key={index} value={division}>
                      {division}
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
              <span className="text-gray-500 text-sm">Total Employees</span>
              <span className="text-lg text-black font-semibold ml-4">{totalEmployees}</span>
            </div>
            {searchQuery && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 font-medium text-sm text-blue-800 flex flex-row justify-between items-center shadow-sm w-full lg:w-auto">
                <span className="text-blue-600 text-sm">Search Results</span>
                <span className="text-lg text-blue-900 font-semibold ml-4">{filteredEmployees.filter(emp => emp.status && emp.status.toLowerCase() === 'active').length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Search Results or Accordion Sections */}
        {searchQuery && filteredEmployees.length === 0 ? (
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
                Search Results for "{searchQuery}" ({filteredEmployees.filter(emp => emp.status && emp.status.toLowerCase() === 'active').length} active results)
              </h3>
            </div>
            <EmployeeTable data={filteredEmployees} onStatusUpdate={handleStatusUpdate} />
          </div>
        ) : (
          /* Accordion Sections */
          HR_CATEGORIES.map(cat => (
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
              <EmployeeTable data={groupedData[cat as keyof typeof groupedData] || []} onStatusUpdate={handleStatusUpdate} />
            </AccordionSection>
          ))
        )}
      </div>
    </div>
  );
};

export default EmployeeDataPage; 