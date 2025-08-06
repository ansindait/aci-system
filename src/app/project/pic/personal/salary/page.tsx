"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase config (replace with your actual config if different)
const firebaseConfig = {
  apiKey: "AIzaSyB0gOJUmBNCh4yAxdLbVASjgadYsUCay0Y",
  authDomain: "portal-ansinda.firebaseapp.com",
  projectId: "portal-ansinda",
  storageBucket: "portal-ansinda.firebasestorage.app",
  messagingSenderId: "310332831418",
  appId: "1:310332831418:web:96a0b7e144353c59b17483"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const SalaryAdjustmentPage = () => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, user, loading } = useSidebar();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    position: "",
    latestSalary: "",
    salarySubmission: "",
    reason: "",
  });

  // Fetch user data and populate form
  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('User data fetched:', userData);
          console.log('User role:', userData.role);
          console.log('User division:', userData.division);
          
          // Map role/division to position display name
          const getPositionDisplay = (roleOrDivision: string) => {
            if (!roleOrDivision) return 'Unknown';
            
            switch (roleOrDivision.toLowerCase()) {
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
                return roleOrDivision || 'Unknown';
            }
          };
          
          // For PIC, try to get position from division first, then role
          const positionValue = userData.division || userData.role || 'Unknown';
          console.log('Final position value:', positionValue);
          
          setForm(prevForm => ({
            ...prevForm,
            fullName: userData.name || '',
            position: getPositionDisplay(positionValue),
          }));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
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

  // Custom handler for salary fields
  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Only allow numbers, auto-format to Rupiah
    const formatted = formatRupiah(value);
    setForm({ ...form, [name]: formatted });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCancel = () => {
    // Keep fullName and position, only reset editable fields
    setForm(prevForm => ({
      ...prevForm,
      latestSalary: "",
      salarySubmission: "",
      reason: "",
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate required fields
    if (!form.fullName || !form.position || !form.latestSalary || !form.salarySubmission || !form.reason) {
      alert('Please fill in all fields.');
      return;
    }
    try {
      await addDoc(collection(db, 'salary_adjustments'), {
        ...form,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      alert('Saved!');
      // Keep fullName and position, only reset editable fields
      setForm(prevForm => ({
        ...prevForm,
        latestSalary: '',
        salarySubmission: '',
        reason: '',
      }));
    } catch (err) {
      alert('Failed to save.');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
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

          {/* Card */}
          <div className="bg-white rounded-lg shadow-md">
            {/* Card Header */}
            <div className="relative flex items-center px-8 py-4 bg-blue-900 rounded-t-lg min-h-[64px]">
              <h2 className="text-2xl font-semibold text-white w-full text-center absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">Adjustment Salary</h2>
            </div>
            {/* Form */}
            <form className="p-8" onSubmit={handleSave}>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-black font-medium mb-1">Full Name</label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded text-black bg-gray-50">
                    {form.fullName}
                  </div>
                </div>
                <div>
                  <label className="block text-black font-medium mb-1">Position</label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded text-black bg-gray-50">
                    {form.position}
                  </div>
                </div>
                <div>
                  <label className="block text-black font-medium mb-1">Latest Salary</label>
                  <input
                    type="text"
                    name="latestSalary"
                    placeholder="Latest Salary"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.latestSalary}
                    onChange={handleSalaryChange}
                  />
                </div>
                <div>
                  <label className="block text-black font-medium mb-1">Salary Submission</label>
                  <input
                    type="text"
                    name="salarySubmission"
                    placeholder="Salary Submission"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.salarySubmission}
                    onChange={handleSalaryChange}
                  />
                </div>
              </div>
              <div className="mb-8">
                <label className="block text-black font-medium mb-1">Reason</label>
                <textarea
                  name="reason"
                  placeholder="Reason"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-black min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.reason}
                  onChange={handleChange}
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-10 py-2 rounded"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold px-10 py-2 rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryAdjustmentPage;