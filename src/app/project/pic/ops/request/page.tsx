"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar'; // Assuming Sidebar component exists
import { db } from '@/lib/firebase';
import { collection, getDocs, query, doc, getDoc, where, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Define the data structure for the history table
interface HistoryData {
  date: string;
  activityId: string;
  siteName: string;
  city: string;
  division: string;
  detailPlan: string;
  picName: string;
  ops: string;
  requestType: string;
  nota: boolean;
  notaUrl?: string;
  status_ops?: string; // Added for status_ops
  bank?: string;
  bankNo?: string;
}

// Icons for the table and form
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const CrossIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const PlusCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// Pagination component
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void; 
  totalItems: number;
}) => {
  const startItem = (currentPage - 1) * 25 + 1;
  const endItem = Math.min(currentPage * 25, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center text-sm text-gray-700">
        <span>
          Showing {startItem} to {endItem} of {totalItems} entries
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 text-sm rounded-md flex items-center space-x-1 ${
            currentPage === 1
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
          }`}
        >
          <span>‹</span>
          <span>Previous</span>
        </button>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 text-sm rounded-md flex items-center space-x-1 ${
            currentPage === totalPages
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
          }`}
        >
          <span>Next</span>
          <span>›</span>
        </button>
      </div>
    </div>
  );
};


const RequestOpsPage = () => {
  const [requireReceipt, setRequireReceipt] = useState(false);
  const [opsValue, setOpsValue] = useState('');
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    date: '',
    city: '',
    division: '',
    siteName: '',
    picName: '',
    requestType: '',
    detailPlan: '',
    ops: '',
    nota: false,
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [siteNameOptions, setSiteNameOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [picOptions, setPicOptions] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [fileNota, setFileNota] = useState<File | null>(null);
  const [userName, setUserName] = useState('');
  const [userDivision, setUserDivision] = useState('');
  const [notaPreview, setNotaPreview] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Listen for auth state changes and fetch user name & division from Firestore
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserName(userDoc.data().name || '');
          setUserDivision(userDoc.data().division || '');
        } else {
          setUserName('');
          setUserDivision('');
        }
      } else {
        setUserName('');
        setUserDivision('');
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch city options hanya untuk tasks yang pic = userName
  useEffect(() => {
    const fetchCities = async () => {
      if (!userName) {
        setCityOptions([]);
        return;
      }
      const snapshot = await getDocs(query(collection(db, 'tasks'), where('pic', '==', userName)));
      const cities = Array.from(new Set(snapshot.docs.map(doc => doc.data().city).filter(Boolean)));
      setCityOptions(cities);
    };
    fetchCities();
  }, [userName]);

  // Fetch siteName options setiap kali city, picName, atau division berubah
  useEffect(() => {
    const fetchSiteNames = async () => {
      if (!form.city || !form.picName || !form.division) {
        setSiteNameOptions([]);
        return;
      }
      const q = query(
        collection(db, 'tasks'),
        where('city', '==', form.city),
        where('pic', '==', form.picName),
        where('division', '==', form.division)
      );
      const snapshot = await getDocs(q);
      const names = Array.from(new Set(snapshot.docs.map(doc => doc.data().siteName).filter(Boolean)));
      setSiteNameOptions(names);
    };
    fetchSiteNames();
  }, [form.city, form.picName, form.division]);

  // Fetch PIC options setiap kali city atau division berubah
  useEffect(() => {
    const fetchPics = async () => {
      if (!form.city || !form.division) {
        setPicOptions([]);
        return;
      }
      const q = query(
        collection(db, 'tasks'),
        where('city', '==', form.city),
        where('division', '==', form.division)
      );
      const snapshot = await getDocs(q);
      const pics = Array.from(new Set(snapshot.docs.map(doc => doc.data().pic).filter(Boolean)));
      setPicOptions(pics);
    };
    fetchPics();
  }, [form.city, form.division]);

  useEffect(() => {
    const fetchAllRequestOps = async () => {
      setLoading(true);
      try {
        const tasksSnapshot = await getDocs(collection(db, 'tasks'));
        let allRequestOps: HistoryData[] = [];
        for (const taskDoc of tasksSnapshot.docs) {
          const requestOpsSnapshot = await getDocs(collection(db, 'tasks', taskDoc.id, 'request_ops'));
          requestOpsSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.picName === userName) {
            allRequestOps.push({
              date: data.date || '',
              activityId: data.activityId || '',
              siteName: data.siteName || '',
              city: data.city || '',
              division: data.division || '',
              detailPlan: data.detailPlan || '',
              picName: data.picName || '',
              ops: data.ops || '',
              requestType: data.requestType || '',
              nota: data.nota || false,
              notaUrl: data.notaUrl || '',
                status_ops: data.status_ops || '', // Added status_ops
              bank: data.bank || '',
              bankNo: data.bankNo || '',
            });
            }
          });
        }
        setHistoryData(allRequestOps);
      } catch (error) {
        console.error('Error fetching request_ops:', error);
      } finally {
        setLoading(false);
      }
    };
    if (userName) fetchAllRequestOps();
  }, [userName]);

  // Opsi division otomatis terisi sesuai user login
  useEffect(() => {
    if (userDivision) {
      setForm((prev) => ({ ...prev, division: userDivision }));
    }
  }, [userDivision]);
  // Opsi picName otomatis terisi sesuai user login
  useEffect(() => {
    if (userName) {
      setForm((prev) => ({ ...prev, picName: userName }));
    }
  }, [userName]);

  const handleOpsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Hapus semua karakter non-digit untuk mendapatkan angka mentah
    const rawValue = e.target.value.replace(/[^0-9]/g, '');

    // 2. Jika ada nilai, format sebagai mata uang IDR. Jika tidak, kosongkan.
    if (rawValue) {
      // Gunakan Intl.NumberFormat untuk format mata uang yang akurat
      const formattedValue = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0, // Tanpa angka desimal
      }).format(Number(rawValue));
      setForm((prev) => ({ ...prev, ops: formattedValue })); // Save formatted value
      setOpsValue(formattedValue);
    } else {
      setForm((prev) => ({ ...prev, ops: '' })); // Clear ops
      setOpsValue('');
    }
  };

  // Handler untuk input form
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
      setForm((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleNotaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFileNota(file);
      // Create preview URL for image files and PDFs
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setNotaPreview(URL.createObjectURL(file));
      } else {
        setNotaPreview('');
      }
    } else {
      setFileNota(null);
      setNotaPreview('');
    }
  };

  // Handler submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitLoading(true);
    // Validasi field wajib
    if (!form.date || !form.city || !form.siteName || !form.requestType || !form.detailPlan || !opsValue) {
      setSubmitError('Semua field wajib diisi: Date, City, Site Name, Request Type, Detail Plan, dan OPS.');
      setSubmitLoading(false);
      return;
    }
    try {
      // Query dokumen tasks dengan siteName dan division
      const q = query(
        collection(db, 'tasks'),
        where('siteName', '==', form.siteName),
        where('division', '==', form.division)
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setSubmitError('Task tidak ditemukan. Pastikan Site Name dan Division sudah benar.');
        setSubmitLoading(false);
        return;
      }
      // Ambil dokumen pertama yang cocok
      const taskDoc = querySnapshot.docs[0];

      // --- Generate activityId sesuai template ---
      // 1. 3 huruf awal city, uppercase, tanpa spasi
      const cityCode = (form.city.replace(/\s+/g, '').substring(0, 3) || 'XXX').toUpperCase();
      // 2. Ambil tanggal, bulan, tahun dari waktu submit (bukan dari form.date)
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear());
      // 3. Hitung total dokumen di bulan & tahun yang sama (reset tiap bulan)
      const rpmSnapshotAll = await getDocs(collection(db, 'request_ops_rpm'));
      const tasksSnapshotAll = await getDocs(collection(db, 'tasks'));
      function isSameMonthYear(ts: any) {
        if (!ts) return false;
        if (typeof ts === 'object' && typeof ts.toDate === 'function') {
          const d = ts.toDate();
          return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year);
        }
        try {
          const d = new Date(ts);
          if (isNaN(d.getTime())) return false;
          return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year);
        } catch {
          return false;
        }
      }
      let totalCount = 0;
      rpmSnapshotAll.forEach(docSnap => {
        const data = docSnap.data();
        if (isSameMonthYear(data.createdAt)) totalCount++;
      });
      for (const taskDocAll of tasksSnapshotAll.docs) {
        const requestOpsSnapshot = await getDocs(collection(db, 'tasks', taskDocAll.id, 'request_ops'));
        requestOpsSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (isSameMonthYear(data.createdAt)) totalCount++;
        });
      }
      const orderNum = (totalCount + 1).toString().padStart(3, '0');
      // 4. Gabungkan
      const activityId = `EZA${cityCode}${day}${month}${year}${orderNum}`;
      // --- End generate activityId ---

      // Ambil bank dan bankNo dari collection users
      let bank = '';
      let bankNo = '';
      if (form.picName) {
        const usersQuery = query(collection(db, 'users'), where('name', '==', form.picName));
        const usersSnapshot = await getDocs(usersQuery);
        if (!usersSnapshot.empty) {
          const userData = usersSnapshot.docs[0].data();
          bank = userData.bank || '';
          bankNo = userData.bankNo || '';
        }
      }

      // Tambahkan data ke subcollection request_ops
      let notaUrl = '';
      let nota = false;
      if (fileNota) {
        const storage = getStorage();
        const storageRef = ref(storage, `request_ops/${activityId}_${fileNota.name}`);
        await uploadBytes(storageRef, fileNota);
        notaUrl = await getDownloadURL(storageRef);
        nota = true;
      } else {
        nota = false;
        notaUrl = '';
      }
      const requestOpsRef = collection(db, 'tasks', taskDoc.id, 'request_ops');
      await setDoc(doc(requestOpsRef, activityId), {
        date: form.date,
        activityId,
        siteName: form.siteName,
        city: form.city,
        division: form.division,
        detailPlan: form.detailPlan,
        picName: form.picName,
        ops: opsValue,
        requestType: form.requestType,
        nota,
        notaUrl,
        status_ops: 'pending_rpm',
        createdAt: serverTimestamp(),
        bank,
        bankNo,
      });
      setSubmitSuccess('Request OPS berhasil disimpan!');
      // Refresh tabel history
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      let allRequestOps: HistoryData[] = [];
      for (const taskDoc of tasksSnapshot.docs) {
        const requestOpsSnapshot = await getDocs(collection(db, 'tasks', taskDoc.id, 'request_ops'));
        requestOpsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          allRequestOps.push({
            date: data.date || '',
            activityId: data.activityId || '',
            siteName: data.siteName || '',
            city: data.city || '',
            division: data.division || '',
            detailPlan: data.detailPlan || '',
            picName: data.picName || '',
            ops: data.ops || '',
            requestType: data.requestType || '',
            nota: data.nota || false,
            notaUrl: data.notaUrl || '',
            status_ops: data.status_ops || '', // Added status_ops
            bank: data.bank || '',
            bankNo: data.bankNo || '',
          });
        });
      }
      setHistoryData(allRequestOps);
      setForm({
        date: '',
        city: '',
        division: '',
        siteName: '',
        picName: '',
        requestType: '',
        detailPlan: '',
        ops: '',
        nota: false,
      });
      setOpsValue('');
      setRequireReceipt(false);
      setFileNota(null);
      setNotaPreview('');
    } catch (error) {
      setSubmitError('Gagal menyimpan request OPS.');
      console.error(error);
    } finally {
      setSubmitLoading(false);
    }
  };


  const FormInput = ({ label, placeholder, type = 'text' }: { label: string, placeholder: string, type?: string }) => (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      <input type={type} placeholder={placeholder} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
    </div>
  );

  const FormSelect = ({ label, children }: { label: string, children: React.ReactNode }) => (
     <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      <select className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white">
        {children}
      </select>
    </div>
  );

  // Pagination logic
  const filteredHistoryData = historyData.filter(item => !filterDate || item.date === filterDate);
  const totalPages = Math.ceil(filteredHistoryData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentHistoryData = filteredHistoryData.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="flex h-screen bg-white font-sans">
      <Sidebar />
      
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          
          {/* Page Header */}
          <div className="flex flex-col items-center mb-8">
            <img src="/logo.jpeg" alt="Ansinda Logo" className="h-20 mb-4" />
            <h1 className='text-black text-4xl font-bold'>REQUEST OPS</h1>
          </div>
          
          {/* Form Section */}
          <form className="bg-white p-6 mb-8" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 text-black gap-x-12 gap-y-6">
              {/* Left Column */}
              <div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleFormChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">City</label>
                  <select
                    name="city"
                    value={form.city}
                    onChange={handleFormChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">--City--</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Division</label>
                  <input
                    type="text"
                    name="division"
                    value={form.division}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">PIC/RPM</label>
                  <input
                    type="text"
                    name="picName"
                    value={form.picName}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>
                <div className="mt-6">
                  <label htmlFor="require-receipt" className="flex items-center cursor-pointer">
                    <span className="block text-sm font-bold text-gray-700 mr-4">Require Receipt</span>
                    <div className="relative">
                        <input id="require-receipt" type="checkbox" className="sr-only" checked={requireReceipt} onChange={() => setRequireReceipt(!requireReceipt)} />
                        <div className={`block w-14 h-8 rounded-full transition ${requireReceipt ? 'bg-blue-900' : 'bg-gray-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${requireReceipt ? 'transform translate-x-6' : ''}`}></div>
                    </div>
                  </label>
                </div>
                {requireReceipt && (
                  <div className="mt-6">
                    <label className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleNotaFileChange}
                        accept="image/*,application/pdf"
                      />
                      <PlusCircleIcon />
                      <span className="text-gray-500 font-medium">{fileNota ? fileNota.name : 'Tap to upload receipt'}</span>
                    </label>
                    {notaPreview && (
                      <div className="mt-4">
                        <h3 className="text-sm font-bold text-gray-700 mb-2">Nota Preview:</h3>
                        {fileNota && fileNota.name.toLowerCase().endsWith('.pdf') ? (
                          <iframe 
                            src={notaPreview} 
                            className="w-full h-64 border border-gray-300 rounded-md" 
                            title="Nota Preview"
                          />
                        ) : (
                          <img 
                            src={notaPreview} 
                            alt="Nota Preview" 
                            className="w-full h-64 object-contain border border-gray-300 rounded-md" 
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setFileNota(null);
                            setNotaPreview('');
                          }}
                          className="mt-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          Remove File
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Site Name</label>
                <select
                  name="siteName"
                  value={form.siteName}
                  onChange={handleFormChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                  disabled={siteNameOptions.length === 0}
                >
                  <option value="">--Site Name--</option>
                  {siteNameOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <div className="mt-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Request Type</label>
                  <select
                    name="requestType"
                    value={form.requestType}
                    onChange={handleFormChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">--Select Request Type--</option>
                    <option value="Wifi">Wifi</option>
                    <option value="HB Tokens">HB Tokens</option>
                    <option value="SOSWAR">SOSWAR</option>
                    <option value="BBM">BBM</option>
                    <option value="ATP">ATP</option>
                    <option value="Entertaiment">Entertaiment</option>
                    <option value="Express">Express</option>
                    <option value="Month Meeting">Month Meeting</option>
                    <option value="Pilox">Pilox</option>
                    <option value="Stamp Duty">Stamp Duty</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Detail Plan</label>
                  <input
                    type="text"
                    name="detailPlan"
                    value={form.detailPlan}
                    onChange={handleFormChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="mt-6">
                  {/* Ganti FormInput dengan input terkontrol untuk format mata uang */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">OPS</label>
                    <input
                      type="text"
                      placeholder="Enter OPS (IDR)"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={opsValue}
                      onChange={handleOpsChange}
                    />
                  </div>
                </div>
              </div>
            </div>
            {submitError && <div className="text-red-600 mt-4 text-center">{submitError}</div>}
            {submitSuccess && <div className="text-green-600 mt-4 text-center">{submitSuccess}</div>}
            <div className="flex justify-end mt-8">
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-10 rounded-md transition-colors disabled:opacity-50"
                  disabled={submitLoading}
                >
                    {submitLoading ? 'Submitting...' : 'Submit'}
                </button>
            </div>
          </form>

          {/* History OPS Section */}
          <div className="bg-white p-6">
              <div className="mb-4">
                <div>
                    <label className="text-sm font-bold text-gray-700 mb-2 block">Filter by date</label>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                        className="border border-gray-300 rounded-md p-2 text-sm bg-white text-gray-500"
                    />
                </div>
                <h2 className="text-2xl font-bold text-black mt-4">History OPS</h2>
              </div>

              {/* History Table */}
              <div>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : (
                <table className="w-full text-sm text-left text-gray-800">
                  <thead className="text-xs text-white uppercase bg-blue-900 font-bold">
                    <tr>
                      <th scope="col" className="px-4 py-3">Date</th>
                      <th scope="col" className="px-4 py-3">Activity ID</th>
                      <th scope="col" className="px-4 py-3">Site Name</th>
                      <th scope="col" className="px-4 py-3">City</th>
                      <th scope="col" className="px-4 py-3">Division</th>
                      <th scope="col" className="px-4 py-3">Detail Plan</th>
                      <th scope="col" className="px-4 py-3">PIC Name</th>
                      <th scope="col" className="px-4 py-3">Nominal</th>
                      <th scope="col" className="px-4 py-3">Request Type</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="px-4 py-3">Bank</th>
                      <th scope="col" className="px-4 py-3">Bank No</th>
                      <th scope="col" className="px-4 py-3">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentHistoryData.map((item, index) => (
                        <tr key={index} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-4 py-4">{item.date}</td>
                          <td className="px-4 py-4">{item.activityId}</td>
                          <td className="px-4 py-4">{item.siteName}</td>
                          <td className="px-4 py-4">{item.city}</td>
                          <td className="px-4 py-4">{item.division}</td>
                          <td className="px-4 py-4">{item.detailPlan}</td>
                          <td className="px-4 py-4">{item.picName}</td>
                          <td className="px-4 py-4">{item.ops}</td>
                          <td className="px-4 py-4">{item.requestType}</td>
                          <td className="px-4 py-4">{item.status_ops || '-'}</td>
                          <td className="px-4 py-4">{item.bank || '-'}</td>
                          <td className="px-4 py-4">{item.bankNo || '-'}</td>
                          <td className="px-4 py-4 text-center">
                            {item.nota ? (
                              item.notaUrl ? <a href={item.notaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">✔️</a> : '✔️'
                            ) : '❌'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                )}
              </div>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={filteredHistoryData.length}
                />
              )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RequestOpsPage;