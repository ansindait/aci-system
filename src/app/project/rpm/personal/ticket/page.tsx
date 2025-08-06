"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const TicketRequestPage = () => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [isOpen, setIsOpen] = useState(true);
  const [form, setForm] = useState({
    date: '', // Remove auto-filled date
    position: '',
    nik: '',
    ticketDate: '',
    name: '',
    ticketPrice: '',
    ticketReason: '',
  });
  const [ticketDateValue, setTicketDateValue] = useState<Date | null>(null);
  const [ticketList, setTicketList] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      setTicketList([]);
      return;
    }

    const unsub = onSnapshot(collection(db, 'ticket_request'), (snapshot) => {
      // Filter tickets to show only tickets from PICs under this RPM's supervision
      const allTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Get tickets where rpm field matches the current user's name
      const supervisedTickets = allTickets.filter((ticket: any) => 
        ticket.rpm === form.name || ticket.userEmail === user.email
      );
      
      setTicketList(supervisedTickets);
    });
    return () => unsub();
  }, [form.name]);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('User data fetched:', userData);
          
          // Map role to position display name (RPM uses role only)
          const getPositionDisplay = (role: string) => {
            switch (role?.toLowerCase()) {
              case 'pic':
                return 'PIC';
              case 'rpm':
                return 'RPM';
              case 'top':
                return 'TOP';
              case 'hr':
                return 'HR';
              case 'qc':
                return 'QC';
              case 'ops':
                return 'OPS';
              case 'permit':
                return 'Permit';
              default:
                return role || 'Unknown';
            }
          };
          
          setForm(prevForm => ({
            ...prevForm,
            nik: userData.nik || '',
            name: userData.name || '',
            position: getPositionDisplay(userData.role),
          }));
        } else {
          console.log('User document does not exist');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, []);

  // Additional useEffect to ensure data is populated after initial load
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    
    const checkAndPopulateData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Map role to position display name
          const getPositionDisplay = (role: string) => {
            switch (role?.toLowerCase()) {
              case 'pic':
                return 'PIC';
              case 'rpm':
                return 'RPM';
              case 'top':
                return 'TOP';
              case 'hr':
                return 'HR';
              case 'qc':
                return 'QC';
              case 'ops':
                return 'OPS';
              case 'permit':
                return 'Permit';
              default:
                return role || 'Unknown';
            }
          };
          
          // Only update if current values are empty
          setForm(prevForm => ({
            ...prevForm,
            nik: prevForm.nik || userData.nik || '',
            name: prevForm.name || userData.name || '',
            position: prevForm.position || getPositionDisplay(userData.role),
          }));
        }
      } catch (error) {
        console.error('Error checking user data:', error);
      }
    };
    
    // Small delay to ensure initial load is complete
    const timer = setTimeout(checkAndPopulateData, 500);
    return () => clearTimeout(timer);
  }, []);

  // Helper to format number to Indonesian Rupiah
  const formatRupiah = (value: string) => {
    const numberString = value.replace(/[^\d]/g, "");
    if (!numberString) return "";
    return (
      "Rp " +
      parseInt(numberString, 10).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    );
  };

  // Custom handler for ticket price
  const handleTicketPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const formatted = formatRupiah(value);
    setForm({ ...form, ticketPrice: formatted });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      alert('Please login to submit ticket request');
      return;
    }
    
    try {
      const ticketData = {
        ...form,
        userEmail: user.email,
        rpm: form.name, // RPM user's own name as rpm field
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'ticket_request'), ticketData);
      alert('Ticket request submitted!');
      // Get current user data for reset
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        // Map role to position display name
        const getPositionDisplay = (role: string) => {
          switch (role?.toLowerCase()) {
            case 'pic':
              return 'PIC';
            case 'rpm':
              return 'RPM';
            case 'top':
              return 'TOP';
            case 'hr':
              return 'HR';
            case 'qc':
              return 'QC';
            case 'ops':
              return 'OPS';
            case 'permit':
              return 'Permit';
            default:
              return role || 'Unknown';
          }
        };
        
        setForm({
          date: new Date().toISOString().split('T')[0], // Reset to today's date
          position: getPositionDisplay(userData.role),
          nik: userData.nik || '',
          ticketDate: '',
          name: userData.name || '',
          ticketPrice: '',
          ticketReason: '',
        });
      } else {
        setForm({
          date: new Date().toISOString().split('T')[0],
          position: '',
          nik: '',
          ticketDate: '',
          name: '',
          ticketPrice: '',
          ticketReason: '',
        });
      }
      setTicketDateValue(null);
    } catch (err) {
      alert('Failed to submit: ' + err);
    }
  };

  // Validasi: hanya field yang bisa diedit yang perlu divalidasi
  const isFormValid = form.ticketDate && form.ticketDate.trim() !== '' && 
                     form.ticketPrice && form.ticketPrice.trim() !== '' && 
                     form.ticketReason && form.ticketReason.trim() !== '';

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = ticketList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(ticketList.length / itemsPerPage);

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

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <h1 className="text-5xl font-bold text-black text-left mb-8 mt-8">Ticket History</h1>

          {/* Card Section */}
          <div className="bg-white rounded-lg shadow-md mb-8 relative">
            {/* Card Header */}
            <div className="flex items-center justify-center px-8 py-4 bg-blue-900 rounded-t-lg">
              <h2 className="text-2xl font-semibold text-white text-center w-full">Ticket Request Form</h2>
            </div>
            {/* Form */}
            <form className="p-8 pb-6" onSubmit={handleSubmit}> {/* Tambah pb-20 agar tidak ketutup button */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-black font-medium mb-1">Date</label>
                  <DatePicker
                    selected={form.date ? new Date(form.date) : null}
                    onChange={(date) => {
                      setForm({ ...form, date: date ? (date as Date).toISOString().split('T')[0] : '' });
                    }}
                    placeholderText="Select Date"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-black focus:outline-none placeholder:text-gray-400"
                    wrapperClassName="w-full"
                    dateFormat="yyyy-MM-dd"
                    isClearable
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-black font-medium mb-1">Position</label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded text-black bg-gray-50">
                    {form.position}
                  </div>
                </div>
                <div>
                  <label className="block text-black font-medium mb-1">NIK</label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded text-black bg-gray-50">
                    {form.nik}
                  </div>
                </div>
                <div>
                  <label className="block text-black font-medium mb-1">Ticket Date</label>
                  <DatePicker
                    selected={ticketDateValue}
                    onChange={(date) => {
                      setTicketDateValue(date);
                      setForm({ ...form, ticketDate: date ? (date as Date).toISOString().split('T')[0] : '' });
                    }}
                    placeholderText="Ticket Date"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-black focus:outline-none placeholder:text-gray-400"
                    wrapperClassName="w-full"
                    dateFormat="yyyy-MM-dd"
                    isClearable
                  />
                </div>
                <div>
                  <label className="block text-black font-medium mb-1">Name</label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded text-black bg-gray-50">
                    {form.name}
                  </div>
                </div>
                <div>
                  <label className="block text-black font-medium mb-1">Ticket Price</label>
                  <input
                    type="text"
                    name="ticketPrice"
                    placeholder="Ticket Price"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-black focus:outline-none placeholder:text-gray-400"
                    value={form.ticketPrice}
                    onChange={handleTicketPriceChange}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-black font-medium mb-1">Ticket Reason</label>
                  <textarea
                    name="ticketReason"
                    placeholder="Ticket Reason"
                    className="w-full border border-gray-300 rounded px-3 py-4 text-black focus:outline-none min-h-[80px] resize-y placeholder:text-gray-400"
                    value={form.ticketReason}
                    onChange={e => setForm({ ...form, ticketReason: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-8">
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors text-lg ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>

          {/* Collapsible Table Section */}
          <div className="bg-white rounded-lg shadow-md">
            <button
              className="w-full flex items-center px-6 py-3 bg-blue-900 text-white rounded-t-lg focus:outline-none"
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="mr-2">{isOpen ? '▼' : '▶'}</span>
              <span className="font-semibold text-lg">Ticket History (PIC Submissions)</span>
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
                      <th className="px-3 py-2 border-b border-t border-gray-300">Ticket Reason</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">Ticket Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((row, idx) => (
                      <tr key={row.id || idx} className="text-sm text-center text-black">
                        <td className="px-3 py-2 border-b border-gray-300">{row.date}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.nik}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.name}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.position}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.ticketDate}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.ticketReason}</td>
                        <td className="px-3 py-2 border-b border-gray-300">{row.ticketPrice}</td>
                      </tr>
                    ))}
                    {currentItems.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-gray-500 py-4">
                          No tickets found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-700">
                    <span>
                      Showing {ticketList.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, ticketList.length)} of {ticketList.length} entries
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketRequestPage;