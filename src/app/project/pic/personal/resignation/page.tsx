"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import dynamic from 'next/dynamic';

// Firebase imports
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  Timestamp,
  query,
  where,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';

// Firebase config
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
const storage = getStorage(app);
const auth = getAuth(app);

const Select = dynamic(() => import('react-select'), { ssr: false });

const categoryOptions = [
  { value: 'Sick', label: 'Sick' },
  { value: 'Other Companies', label: 'Other Companies' },
  { value: 'Studies', label: 'Studies' },
  { value: 'Other', label: 'Other' },
];

const ResignationPage = () => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, user: sidebarUser, loading } = useSidebar();
  const [isOpen, setIsOpen] = useState(true);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0], // Auto fill with today's date
    nik: '',
    name: '',
    position: '',
    resignDate: '',
    category: '',
    reason: '',
    file: null as File | null,
  });
  const [resignDateValue, setResignDateValue] = useState<Date | null>(null);
  const [resignationData, setResignationData] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Auth state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch resignations from Firestore (only for logged-in user and type rpm)
  const fetchResignations = async (userEmail?: string) => {
    if (!userEmail) return setResignationData([]);
    const q = query(
      collection(db, 'resignations'),
      where('userEmail', '==', userEmail),
      where('type', '==', 'rpm')
    );
    const snapshot = await getDocs(q);
    setResignationData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    if (authUser?.email) {
      fetchResignations(authUser.email);
    } else {
      setResignationData([]);
    }
  }, [authUser]);

  useEffect(() => {
    if (authUser?.uid) {
      (async () => {
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setForm(f => ({
            ...f,
            nik: userData.nik || '',
            name: userData.name || '',
            position: userData.division || '',
          }));
        }
      })();
    }
  }, [authUser]);

  // Auth handlers
  const handleAuthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAuthForm({ ...authForm, [e.target.name]: e.target.value });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
      } else {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Form handlers
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setForm({ ...form, file: e.target.files[0] });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setForm({ ...form, file: e.dataTransfer.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.email) return;
    setSubmitting(true);
    let fileUrl = '';
    try {
      if (form.file) {
        const storageRef = ref(storage, `resignation_files/${Date.now()}_${form.file.name}`);
        await uploadBytes(storageRef, form.file);
        fileUrl = await getDownloadURL(storageRef);
      }
      // Get user's RPM supervisor from user document
      const userDoc = await getDoc(doc(db, 'users', authUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const rpmSupervisor = userData.rpm || '';
      
      const resignationDoc = {
        date: form.date,
        nik: form.nik,
        name: form.name,
        position: form.position,
        resignDate: form.resignDate,
        category: form.category,
        reason: form.reason,
        fileUrl,
        userEmail: authUser.email,
        rpm: rpmSupervisor, // Add RPM supervisor field
        createdAt: Timestamp.now(),
        type: 'pic', // Mark as pic resignation
        status: 'Pending', // Default status
        approvedBy: '',
        rejectedBy: '',
      };
      await addDoc(collection(db, 'resignations'), resignationDoc);
      
      // Reset form using the user data we already fetched
      setForm({
        date: new Date().toISOString().split('T')[0], 
        nik: userData.nik || '', 
        name: userData.name || '', 
        position: userData.division || '', 
        resignDate: '', 
        category: '', 
        reason: '', 
        file: null,
      });
        setResignDateValue(null);
      fetchResignations(authUser.email);
    } catch (err) {
      alert('Failed to submit resignation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'Approved' | 'Rejected') => {
    setUpdating(id);
    try {
      const user = auth.currentUser;
      const updateData: any = { status };
      if (status === 'Approved') {
        updateData.approvedBy = user?.email || user?.displayName || 'Admin';
        updateData.rejectedBy = '';
      } else {
        updateData.rejectedBy = user?.email || user?.displayName || 'Admin';
        updateData.approvedBy = '';
      }
      await updateDoc(doc(db, 'resignations', id), updateData);
      fetchResignations();
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setUpdating(null);
    }
  };

  // UI
  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!authUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <form
          onSubmit={handleAuthSubmit}
          className="bg-white p-8 rounded shadow-md w-full max-w-sm"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">
            {isRegister ? 'Register' : 'Login'}
          </h2>
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            value={authForm.email}
            onChange={handleAuthChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            value={authForm.password}
            onChange={handleAuthChange}
            required
          />
          {authError && (
            <div className="text-red-500 text-sm mb-4">{authError}</div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-900 text-white py-2 rounded font-semibold mb-2"
            disabled={authLoading}
          >
            {isRegister ? 'Register' : 'Login'}
          </button>
          <button
            type="button"
            className="w-full text-blue-700 underline text-sm"
            onClick={() => setIsRegister(!isRegister)}
            disabled={authLoading}
          >
            {isRegister
              ? 'Already have an account? Login'
              : "Don't have an account? Register"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
      />
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
                  Employee Resignation Submission
                </h2>
              </div>
            </div>
          </div>

          {/* Card Section */}
          <div className="bg-white rounded-lg shadow-md mb-8">
            {/* Card Header */}
            <div className="flex items-center justify-center px-8 py-4 bg-blue-900 rounded-t-lg">
              <h2 className="text-2xl font-semibold text-white text-center w-full">
                Resignation List
              </h2>
            </div>
            {/* Form */}
            <form className="p-8" onSubmit={handleSubmit}>
              <div className="grid grid-cols-3 gap-6 mb-6">
                {/* Left column */}
                <div className="col-span-2 grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-black font-medium mb-1">
                      Date
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded text-black bg-gray-50">
                      {form.date}
                    </div>
                  </div>
                  <div>
                    <label className="block text-black font-medium mb-1">
                      Position
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded text-black bg-gray-50">
                      {form.position}
                    </div>
                  </div>
                  <div>
                    <label className="block text-black font-medium mb-1">
                      NIK
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded text-black bg-gray-50">
                      {form.nik}
                    </div>
                  </div>
                  <div>
                    <label className="block text-black font-medium mb-1">
                      Resign Date
                    </label>
                    <DatePicker
                      selected={resignDateValue}
                      onChange={(date) => {
                        setResignDateValue(date);
                        setForm({
                          ...form,
                          resignDate: date
                            ? (date as Date).toISOString().split('T')[0]
                            : '',
                        });
                      }}
                      placeholderText="Resign Date"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-black focus:outline-none placeholder:text-gray-400"
                      wrapperClassName="w-full"
                      dateFormat="yyyy-MM-dd"
                      isClearable
                    />
                  </div>
                  <div>
                    <label className="block text-black font-medium mb-1">
                      Name
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded text-black bg-gray-50">
                      {form.name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-black font-medium mb-1">
                      Category Resign
                    </label>
                    <Select
                      options={categoryOptions}
                      value={
                        categoryOptions.find(option => option.value === (selectedCategory || form.category)) || null
                      }
                      onChange={(option) => {
                        const value = (option as { value: string; label: string } | null)?.value || '';
                        setSelectedCategory(value);
                        if (value === 'Other') {
                          setForm({ ...form, category: '' });
                          setCustomCategory('');
                        } else {
                          setForm({ ...form, category: value });
                          setCustomCategory('');
                        }
                      }}
                      placeholder="Select Category"
                      classNamePrefix="react-select"
                      isClearable
                      styles={{
                        control: (provided) => ({
                          ...provided,
                          minHeight: '40px',
                          borderColor: '#d1d5db',
                          borderRadius: '0.375rem',
                          boxShadow: 'none',
                          paddingLeft: '0.75rem',
                          paddingRight: '0.75rem',
                        }),
                        valueContainer: (provided) => ({
                          ...provided,
                          paddingTop: '0.5rem',
                          paddingBottom: '0.5rem',
                        }),
                        input: (provided) => ({
                          ...provided,
                          color: '#000',
                        }),
                        singleValue: (provided) => ({
                          ...provided,
                          color: '#000',
                        }),
                        placeholder: (provided) => ({
                          ...provided,
                          color: '#9ca3af',
                        }),
                        option: (provided, state) => ({
                          ...provided,
                          color: '#000',
                          backgroundColor: state.isSelected
                            ? '#e0e7ff'
                            : state.isFocused
                            ? '#f3f4f6'
                            : '#fff',
                        }),
                      }}
                    />
                    {/* Show custom input only if Other is selected */}
                    {selectedCategory === 'Other' && (
                      <input
                        type="text"
                        className="mt-2 w-full border border-gray-300 rounded px-3 py-2 text-black focus:outline-none placeholder:text-gray-400"
                        placeholder="Enter other category"
                        value={customCategory}
                        onChange={e => {
                          setCustomCategory(e.target.value);
                          setForm({ ...form, category: e.target.value });
                        }}
                        required
                      />
                    )}
                  </div>
                  <div className="col-span-2 mt-6">
                    <label className="block text-black font-medium mb-1">
                      Resignation Reason
                    </label>
                    <textarea
                      name="reason"
                      placeholder="Reason"
                      className="w-full border border-gray-300 rounded px-3 py-4 text-black focus:outline-none min-h-[80px] resize-y placeholder:text-gray-400"
                      value={form.reason}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                {/* Right column: File upload */}
                <div className="flex flex-col items-center justify-start">
                  <label className="block text-black font-medium mb-2">
                    Upload Supporting File
                  </label>
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center border-2 border-gray-300 border-dashed rounded-lg w-full h-32 cursor-pointer transition hover:border-blue-400"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <span className="text-5xl text-blue-700 mb-2">+</span>
                    <span className="text-blue-700">
                      Tap or Drag file to upload
                    </span>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                  {form.file && (
                    <div className="mt-4 w-full flex flex-col items-center">
                      <span className="mb-2 text-gray-700 font-medium">Preview:</span>
                      <div className="relative bg-gray-50 rounded-lg p-3 flex flex-col items-center shadow-sm border border-gray-200">
                        <button
                          type="button"
                          className="absolute top-1 right-1 text-gray-400 hover:text-red-500 text-lg font-bold focus:outline-none"
                          onClick={() => {
                            setForm({ ...form, file: null });
                          }}
                          aria-label="Remove file"
                        >
                          ×
                        </button>
                        {form.file.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(form.file)}
                            alt="Preview"
                            className="h-24 w-24 rounded object-cover border border-gray-300 transition-transform duration-200 hover:scale-105"
                          />
                        ) : form.file.type === 'application/pdf' ? (
                          <div className="flex flex-col items-center justify-center h-24 w-24">
                            {/* PDF Icon SVG */}
                            <svg className="h-16 w-16 text-red-500 mb-2" fill="none" viewBox="0 0 48 48" stroke="currentColor">
                              <rect x="8" y="4" width="32" height="40" rx="4" fill="#fff" stroke="#e53e3e" strokeWidth="2"/>
                              <path d="M16 20h16M16 28h16" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round"/>
                              <text x="24" y="40" textAnchor="middle" fontSize="12" fill="#e53e3e" fontWeight="bold">PDF</text>
                            </svg>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-24 w-24">
                            {/* Generic File Icon SVG */}
                            <svg className="h-16 w-16 text-gray-400 mb-2" fill="none" viewBox="0 0 48 48" stroke="currentColor">
                              <rect x="8" y="4" width="32" height="40" rx="4" fill="#fff" stroke="#a0aec0" strokeWidth="2"/>
                              <path d="M16 20h16M16 28h16" stroke="#a0aec0" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </div>
                        )}
                        {form.file.type !== '' && (
                          <a
                            href={URL.createObjectURL(form.file)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline mt-2 text-sm text-center break-all"
                          >
                            {form.file.name}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="submit"
                className="bg-blue-900 text-white px-6 py-2 rounded font-semibold mt-4 hover:bg-blue-800 disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Resignation'}
              </button>
            </form>
          </div>


        </div>
      </div>
    </div>
  );
};

export default ResignationPage;