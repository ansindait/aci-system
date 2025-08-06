"use client";

import React, { useEffect, useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserProfile {
  name: string;
  nik: string;
  email: string;
  division: string;
  position: string;
  city: string;
  bank: string;
  bankNo: string;
}

const ProfileSettingsPage = () => {
  const [profile, setProfile] = useState<UserProfile>({
    name: '', nik: '', email: '', division: '', position: '', city: '', bank: '', bankNo: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfile({
              name: data.name || '',
              nik: data.nik || '',
              email: data.email || user.email || '',
              division: data.division || '',
              position: data.position || '',
              city: data.city || '',
              bank: data.bank || '',
              bankNo: data.bankNo || '',
            });
          } else {
            setError('User data not found.');
          }
        } catch (err: any) {
          setError('Failed to fetch user data.');
        }
      } else {
        setError('No user is logged in.');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setError(''); setSuccess('');
    if (!uid) { setError('User not found.'); return; }
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        name: profile.name,
        nik: profile.nik,
        email: profile.email,
        division: profile.division,
        position: profile.position,
        city: profile.city,
        bank: profile.bank,
        bankNo: profile.bankNo,
      });
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError('Failed to update profile.');
    }
  };

  const handleResetPassword = async () => {
    setError(''); setSuccess('');
    if (!profile.email) { setError('Email tidak ditemukan.'); return; }
    try {
      await sendPasswordResetEmail(auth, profile.email);
      setSuccess('Link reset password telah dikirim ke email Anda.');
    } catch (err: any) {
      setError('Gagal mengirim email reset password.');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1920px] mx-auto">
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
                  Profile Settings
                </h2>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-600 mb-4">Profile</h2>
            {loading ? (
              <div>Loading...</div>
            ) : error ? (
              <div className="text-red-600 mb-4">{error}</div>
            ) : (
              <>
                {success && <div className="text-green-600 mb-4">{success}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
                    <input name="name" value={profile.name} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">NIK</label>
                    <input name="nik" value={profile.nik} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                    <input name="email" value={profile.email} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="email" />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Division</label>
                    <input name="division" value={profile.division} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Position</label>
                    <input name="position" value={profile.position} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">City</label>
                    <input name="city" value={profile.city} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Bank</label>
                    <input name="bank" value={profile.bank} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">No. Bank</label>
                    <input name="bankNo" value={profile.bankNo} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" />
                  </div>
                </div>
                <div className="mt-6 flex space-x-4">
                  <button onClick={handleSave} className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800">Save Changes</button>
                  <button onClick={handleResetPassword} className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800">Reset Password</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;