"use client";

import React, { useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const PersonalInfoPage = () => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [isOpen, setIsOpen] = useState(true);
  const [division, setDivision] = useState('');
  const [region, setRegion] = useState('');
  const [search, setSearch] = useState('');
  const [usersData, setUsersData] = useState<any[]>([]);

  // Fetch users from Firestore
  React.useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      setUsersData(snapshot.docs.map(doc => doc.data()));
    };
    fetchUsers();
  }, []);

  // Generate unique division options from usersData
  const divisionOptions = Array.from(new Set(usersData.map(user => user.division).filter(Boolean)));

  // Filter logic
  const filteredData = usersData.filter((row) => {
    const matchesDivision = division ? row.division === division : true;
    const matchesRegion = region ? row.region === region : true;
    const matchesSearch = search
      ? Object.values(row).some((val) =>
          String(val).toLowerCase().includes(search.toLowerCase())
        )
      : true;
    return matchesDivision && matchesRegion && matchesSearch;
  });

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
      />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1920px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <img src="/logo.jpeg" alt="Ansinda Logo" className="h-20 mr-6" />
            <h1 className="text-5xl font-bold text-black text-center">Personal Information</h1>
          </div>

          {/* Filters/Search */}
          <div className="flex flex-col gap-2 mb-4 max-w-2xl">
            <div className="flex flex-wrap gap-2">
              <select className="border border-black text-black rounded px-2 py-1 text-sm min-w-[160px]" value={division} onChange={e => setDivision(e.target.value)}>
                <option value="">Division</option>
                {divisionOptions.map((div) => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
              <select className="border border-black text-black rounded px-2 py-1 text-sm min-w-[160px]" value={region} onChange={e => setRegion(e.target.value)}>
                <option value="">Region</option>
                <option value="JABO">JABO</option>
                {/* Add more regions as needed */}
              </select>
            </div>
            <input
              type="text"
              placeholder="Search"
              className="border border-black text-black rounded px-2 py-1 text-sm w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Collapsible Table Section */}
          <div className="bg-white rounded-lg shadow-md">
            <button
              className="w-full flex items-center px-6 py-3 bg-blue-900 text-white rounded-t-lg focus:outline-none"
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="mr-2">{isOpen ? '▼' : '▶'}</span>
              <span className="font-semibold text-lg">Personal Information</span>
            </button>
            {isOpen && (
              <div className="overflow-x-auto p-4">
                <table className="min-w-full border-t border-b border-gray-300 rounded-lg">
                  <thead>
                    <tr className="bg-gray-100 text-xs text-gray-700">
                      <th className="px-3 py-2 border-b border-t border-gray-300">NO</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">NIK</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">NAME</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">POSITION</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">JOIN DATE</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">PHONE</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">EMAIL</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">DIVISION</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">PROJECT</th>
                      <th className="px-3 py-2 border-b border-t border-gray-300">REGION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-4">No data found.</td>
                      </tr>
                    ) : (
                      filteredData.map((row, idx) => (
                        <tr key={idx} className="text-sm text-center text-black">
                          <td className="px-3 py-2 border-b border-gray-300 text-black">{row.no || idx + 1}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.employeeId || '-'}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.name || '-'}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.position || '-'}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.joinDate || '-'}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.phone || '-'}</td>
                          <td className="px-3 py-2 border-b border-gray-300 underline text-blue-700 cursor-pointer">{row.email || '-'}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.division || '-'}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.project || '-'}</td>
                          <td className="px-3 py-2 border-b border-gray-300">{row.region || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoPage; 