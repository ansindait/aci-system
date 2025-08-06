"use client";

import React, { useState, useEffect } from 'react';
import { useSidebar } from '@/context/SidebarContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import Sidebar from '@/app/components/Sidebar';

interface UserProfile {
  name: string;
  nik: string;
  email: string;
  division: string;
  position: string;
  city: string;
  bank: string;
  bankNumber: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
}

const ProfileSettingsPage = () => {
  const { user } = useSidebar();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    nik: '',
    email: '',
    division: '',
    position: '',
    city: '',
    bank: '',
    bankNumber: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Fetch user profile data from Firebase
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfile({
            name: userData.name || '',
            nik: userData.nik || userData.employeeId || '',
            email: userData.email || '',
            division: userData.division || userData.department || '',
            position: userData.position || userData.jobTitle || '',
            city: userData.city || userData.location || '',
            bank: userData.bank || '',
            bankNumber: userData.bankNumber || userData.bankAccount || '',
            phone: userData.phone || userData.phoneNumber || '',
            address: userData.address || '',
            emergencyContact: userData.emergencyContact || ''
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setMessage({ type: 'error', text: 'Failed to load profile data' });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Handle input changes
  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save changes to Firebase
  const handleSaveChanges = async () => {
    if (!auth.currentUser) {
      setMessage({ type: 'error', text: 'User not authenticated' });
      return;
    }

    setSaving(true);
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, {
        name: profile.name,
        nik: profile.nik,
        email: profile.email,
        division: profile.division,
        position: profile.position,
        city: profile.city,
        bank: profile.bank,
        bankNumber: profile.bankNumber,
        phone: profile.phone,
        address: profile.address,
        emergencyContact: profile.emergencyContact,
        updatedAt: new Date()
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  // Reset password functionality
  const handleResetPassword = async () => {
    if (!auth.currentUser) {
      setMessage({ type: 'error', text: 'User not authenticated' });
      return;
    }

    try {
      // Import Firebase Auth functions
      const { sendPasswordResetEmail } = await import('firebase/auth');
      
      await sendPasswordResetEmail(auth, auth.currentUser.email!);
      setMessage({ type: 'success', text: 'Password reset email sent!' });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setMessage({ type: 'error', text: 'Failed to send password reset email' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-[1920px] mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1920px] mx-auto">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center sm:justify-start">
                <img
                  src="/logo.jpeg"
                  alt="Ansinda Logo"
                  className="h-16 w-auto"
                />
              </div>
              <div className="flex-1 flex justify-center items-center">
                <h2 className="text-3xl font-bold text-black text-center">Profile Settings</h2>
              </div>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <div className="flex items-center">
                {message.type === 'success' ? (
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                )}
                {message.text}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-600 mb-4">Profile</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
                <input 
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                  type="text" 
                  value={profile.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">NIK</label>
                <input 
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                  type="text" 
                  value={profile.nik}
                  onChange={(e) => handleInputChange('nik', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input 
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                  type="email" 
                  value={profile.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Division</label>
                <input 
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                  type="text" 
                  value={profile.division}
                  onChange={(e) => handleInputChange('division', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Position</label>
                <input 
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                  type="text" 
                  value={profile.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">City</label>
                <input 
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                  type="text" 
                  value={profile.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Bank</label>
                <input 
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                  type="text" 
                  value={profile.bank}
                  onChange={(e) => handleInputChange('bank', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">No. Bank</label>
                <input 
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                  type="text" 
                  value={profile.bankNumber}
                  onChange={(e) => handleInputChange('bankNumber', e.target.value)}
                />
              </div>
            </div>
            <div className="mt-6 flex space-x-4">
              <button 
                className={`px-4 py-2 rounded font-medium transition duration-200 ${
                  saving 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-blue-700 text-white hover:bg-blue-800'
                }`}
                onClick={handleSaveChanges}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 transition duration-200"
                onClick={handleResetPassword}
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;