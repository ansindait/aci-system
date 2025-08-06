"use client";

import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar'; // Assuming Sidebar component exists
import { useSidebar } from '@/context/SidebarContext'; // Assuming SidebarContext exists
import { db } from '@/lib/firebase';
import { collection, onSnapshot, collectionGroup, getDoc, DocumentData, updateDoc, doc, getDocs, query, where } from 'firebase/firestore';
import Select from 'react-select';

// Define the data structure for the approval table
interface ApprovalData {
  id: string;
  parentTaskId: string;
  date: string;
  activityId: string;
  siteName: string;
  picName: string;
  rpmName: string;
  division: string;
  detailPlan: string;
  requestType: string;
  total: string;
  status_ops: string;
  region: string;
  city: string;
  rpm: string;
  source: string; // Added for source tracking
  nik: string; // Added NIK field
}

// Helper untuk opsi react-select
const toSelectOptions = (arr: string[]) => arr.map(opt => ({ value: opt, label: opt }));

// Tambahkan customStyles untuk React Select agar text dropdown hitam
const selectStyles = {
  option: (provided: any) => ({
    ...provided,
    color: '#000',
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: '#000',
  }),
  input: (provided: any) => ({
    ...provided,
    color: '#000',
  }),
};

// Function to get NIK by name from users collection
const getNikByName = async (name: string): Promise<string> => {
  try {
    console.log('🔍 Fetching NIK for name:', name);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('name', '==', name));
    const querySnapshot = await getDocs(q);
    
    console.log('📊 Query result for name:', name, 'Found documents:', querySnapshot.size);
    
    if (!querySnapshot.empty) {
      // Check all documents and find the first one with a non-empty NIK
      for (const userDoc of querySnapshot.docs) {
        const userData = userDoc.data();
        const nik = userData.nik || '';
        console.log('🔍 Checking user document:', userDoc.id, 'NIK:', nik);
        if (nik) {
          console.log('✅ Found NIK for name:', name, 'NIK:', nik, 'from document:', userDoc.id);
          return nik;
        }
      }
      console.log('❌ No user with NIK found for name:', name);
      return '';
    }
    console.log('❌ No user found for name:', name);
    return '';
  } catch (error) {
    console.error('❌ Error fetching NIK for name:', name, error);
    return '';
  }
};

const ApprovalOpsPage = () => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, user } = useSidebar();

  // State untuk unique options filter
  const [activityIdOptions, setActivityIdOptions] = useState<string[]>([]);
  const [siteNameOptions, setSiteNameOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [picOptions, setPicOptions] = useState<string[]>([]);
  const [rpmOptions, setRpmOptions] = useState<string[]>([]);
  // HAPUS: const [dateOptions, setDateOptions] = useState<string[]>([]);

  // State untuk value filter terpilih
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [selectedSiteName, setSelectedSiteName] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedPic, setSelectedPic] = useState('');
  const [selectedRpm, setSelectedRpm] = useState('');
  // Remove selectedDate state
  // const [selectedDate, setSelectedDate] = useState('');

  // State untuk data approval dari database
  const [allApprovalData, setAllApprovalData] = useState<ApprovalData[]>([]);
  const [filteredApprovalData, setFilteredApprovalData] = useState<ApprovalData[]>([]);

  // State untuk edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<ApprovalData | null>(null);

  // Handler approve
  const handleApprove = async (docId: string, parentTaskId: string, source: string) => {
    try {
      const approvedBy = user?.name || '';
      if (source === 'request_ops_rpm') {
        const docRef = doc(db, 'request_ops_rpm', docId);
        await updateDoc(docRef, { status_ops: 'approved_top', approved_by: approvedBy });
      } else if (source === 'request_ops' && parentTaskId) {
        const docRef = doc(db, 'tasks', parentTaskId, 'request_ops', docId);
        await updateDoc(docRef, { status_ops: 'approved_top', approved_by: approvedBy });
      }
    } catch (err) {
      alert('Gagal approve: ' + err);
    }
  };
  // Handler reject
  const handleReject = async (docId: string, parentTaskId: string, source: string) => {
    try {
      const approvedBy = user?.name || '';
      if (source === 'request_ops_rpm') {
        const docRef = doc(db, 'request_ops_rpm', docId);
        await updateDoc(docRef, { status_ops: 'rejected', approved_by: approvedBy });
      } else if (source === 'request_ops' && parentTaskId) {
        const docRef = doc(db, 'tasks', parentTaskId, 'request_ops', docId);
        await updateDoc(docRef, { status_ops: 'rejected', approved_by: approvedBy });
      }
    } catch (err) {
      alert('Gagal reject: ' + err);
    }
  };

  // Listener realtime Firestore untuk unique value filter
  useEffect(() => {
    // Listen to request_ops_rpm (OPS)
    const unsubRpm = onSnapshot(collection(db, 'request_ops_rpm'), async (snapshot) => {
      const rpmDataPromises = snapshot.docs.map(async (doc) => {
        const d = doc.data();
        let date = d.date || (d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString().slice(0, 10) : (d.createdAt || ''));
        let totalRaw = d.ops !== undefined ? d.ops : (d.total !== undefined ? d.total : '');
        let totalFormatted = '';
        if (typeof totalRaw === 'number') {
          totalFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalRaw);
        } else if (typeof totalRaw === 'string' && totalRaw) {
          const num = Number(totalRaw.replace(/[^\d]/g, ''));
          if (!isNaN(num) && num > 0) {
            totalFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
          } else {
            totalFormatted = totalRaw;
          }
        }
        
        // Get NIK for PIC name
        const picName = d.picName || '';
        const rpmName = d.rpm || d.rpmName || '';
        console.log('🔄 request_ops_rpm - Processing document:', doc.id);
        console.log('🔄 request_ops_rpm - Raw data:', d);
        console.log('🔄 request_ops_rpm - picName field:', picName);
        console.log('🔄 request_ops_rpm - rpm field:', rpmName);
        const nik = await getNikByName(rpmName);
        console.log('🔄 request_ops_rpm - Final NIK result:', nik);
        
        return {
          id: doc.id,
          parentTaskId: '',
          activityId: d.activityId || '',
          siteName: d.siteName || '',
          picName: picName,
          rpmName: d.rpmName || d.rpm || '',
          division: d.division || 'rpm',
          detailPlan: d.detailPlan || '',
          requestType: d.requestType || '',
          total: totalFormatted,
          status_ops: d.status_ops || '',
          region: d.region || '',
          city: d.city || '',
          date: date || '',
          rpm: d.rpm || '',
          source: 'request_ops_rpm',
          nik: nik,
        };
      });
      
      const rpmData = await Promise.all(rpmDataPromises);
      setAllApprovalData(prev => {
        // Remove old rpm data, keep permit data
        const permitData = prev.filter(d => d.source === 'request_ops');
        return [...permitData, ...rpmData];
      });
    });

    // Listen to all request_ops subcollections (PERMIT)
    const unsubPermit = onSnapshot(collectionGroup(db, 'request_ops'), async (snapshot) => {
      const permitDataPromises = snapshot.docs.map(async (doc) => {
        const d = doc.data();
        let date = d.date || (d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString().slice(0, 10) : (d.createdAt || ''));
        let totalRaw = d.ops !== undefined ? d.ops : (d.total !== undefined ? d.total : '');
        let totalFormatted = '';
        if (typeof totalRaw === 'number') {
          totalFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalRaw);
        } else if (typeof totalRaw === 'string' && totalRaw) {
          const num = Number(totalRaw.replace(/[^\d]/g, ''));
          if (!isNaN(num) && num > 0) {
            totalFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
          } else {
            totalFormatted = totalRaw;
          }
        }
        
        // Get NIK for PIC name
        const picName = d.picName || d.pic || '';
        console.log('🔄 request_ops - Processing document:', doc.id);
        console.log('🔄 request_ops - Raw data:', d);
        console.log('🔄 request_ops - picName field:', picName);
        const nik = await getNikByName(picName);
        console.log('🔄 request_ops - Final NIK result:', nik);
        
        return {
          id: doc.id,
          parentTaskId: doc.ref.parent.parent ? doc.ref.parent.parent.id : '',
          activityId: d.activityId || '',
          siteName: d.siteName || '',
          picName: picName,
          rpmName: d.rpmName || d.rpm || '',
          division: d.division || 'permit',
          detailPlan: d.detailPlan || '',
          requestType: d.requestType || '',
          total: totalFormatted,
          status_ops: d.status_ops || '',
          region: d.region || '',
          city: d.city || '',
          date: date || '',
          rpm: d.rpm || '',
          source: 'request_ops',
          nik: nik,
        };
      });
      
      const permitData = await Promise.all(permitDataPromises);
      setAllApprovalData(prev => {
        // Remove old permit data, keep rpm data
        const rpmData = prev.filter(d => d.source === 'request_ops_rpm');
        return [...rpmData, ...permitData];
      });
    });

    return () => {
      unsubRpm();
      unsubPermit();
    };
  }, []);

  // Separate useEffect untuk mengisi filter options dari kedua collection
  useEffect(() => {
    // Extract filter options from allApprovalData (which already contains data from both collections)
    const extractFilterOptions = () => {
      console.log('🔄 Extracting filter options from allApprovalData...');
      console.log('🔄 Total data in allApprovalData:', allApprovalData.length);
      
      // Filter only data with status_ops = "pending_top"
      const pendingTopData = allApprovalData.filter(item => item.status_ops === 'pending_top');
      console.log('🔄 Data with pending_top status:', pendingTopData.length);
      
      // Apply cascading filters - start with all data and filter progressively
      let filteredData = pendingTopData;
      
      // Filter by Activity ID if selected
      if (selectedActivityId) {
        filteredData = filteredData.filter(item => item.activityId === selectedActivityId);
        console.log('🔄 Filtered by Activity ID:', selectedActivityId, 'Data count:', filteredData.length);
      }
      
      // Filter by Site Name if selected
      if (selectedSiteName) {
        filteredData = filteredData.filter(item => item.siteName === selectedSiteName);
        console.log('🔄 Filtered by Site Name:', selectedSiteName, 'Data count:', filteredData.length);
      }
      
      // Filter by City if selected
      if (selectedCity) {
        filteredData = filteredData.filter(item => item.city === selectedCity);
        console.log('🔄 Filtered by City:', selectedCity, 'Data count:', filteredData.length);
      }
      
      // Filter by PIC if selected
      if (selectedPic) {
        filteredData = filteredData.filter(item => item.picName === selectedPic);
        console.log('🔄 Filtered by PIC:', selectedPic, 'Data count:', filteredData.length);
      }
      
      // Filter by RPM if selected
      if (selectedRpm) {
        filteredData = filteredData.filter(item => (item.rpmName === selectedRpm || item.rpm === selectedRpm));
        console.log('🔄 Filtered by RPM:', selectedRpm, 'Data count:', filteredData.length);
      }
      
      // Extract unique values for each filter based on cascading logic
      // Activity ID: Show options based on current filtered data (not all pendingTopData)
      const activityIds = Array.from(new Set(filteredData.map(item => item.activityId).filter(Boolean)));
      
      // Site Name: Show options based on current filtered data
      const siteNames = Array.from(new Set(filteredData.map(item => item.siteName).filter(Boolean)));
      
      // City: Show options based on current filtered data
      const cities = Array.from(new Set(filteredData.map(item => item.city).filter(Boolean)));
      
      // PIC: Show options based on current filtered data
      const pics = Array.from(new Set(filteredData.map(item => item.picName).filter(Boolean)));
      
      // RPM: Show options based on current filtered data
      const rpms = Array.from(new Set(filteredData.map(item => item.rpmName || item.rpm).filter(Boolean)));
      
      console.log('🔄 Extracted Activity IDs:', activityIds);
      console.log('🔄 Extracted Site Names:', siteNames);
      console.log('🔄 Extracted Cities:', cities);
      console.log('🔄 Extracted PICs:', pics);
      console.log('🔄 Extracted RPMs:', rpms);
      
      // Set filter options
      setActivityIdOptions(activityIds);
      setSiteNameOptions(siteNames);
      setCityOptions(cities);
      setPicOptions(pics);
      setRpmOptions(rpms);
    };
    
    extractFilterOptions();
  }, [allApprovalData, selectedActivityId, selectedSiteName, selectedCity, selectedPic, selectedRpm]);

  // Filter data approval setiap kali filter berubah atau data berubah
  useEffect(() => {
    let filtered = allApprovalData.filter(item => {
      if (selectedActivityId && item.activityId !== selectedActivityId) return false;
      if (selectedSiteName && item.siteName !== selectedSiteName) return false;
      if (selectedCity && item.city !== selectedCity) return false;
      if (selectedPic && item.picName !== selectedPic) return false;
      if (selectedRpm && (item.rpmName !== selectedRpm && item.rpm !== selectedRpm)) return false;
      // Remove date filter logic from the filter useEffect
      // if (selectedDate && item.date !== selectedDate) return false;
      if (item.status_ops !== 'pending_top') return false;
      return true;
    });
    setFilteredApprovalData(filtered);
  }, [allApprovalData, selectedActivityId, selectedSiteName, selectedCity, selectedPic, selectedRpm]);

  // Tambahkan fungsi untuk reset semua filter
  const clearAllFilters = () => {
    setSelectedActivityId('');
    setSelectedCity('');
    setSelectedRpm('');
    setSelectedSiteName('');
    setSelectedPic('');
    // Remove selectedDate from clearAllFilters
    // setSelectedDate('');
  };

  // Handle Activity ID change - reset dependent filters
  const handleActivityIdChange = (option: any) => {
    setSelectedActivityId(option ? option.value : '');
    // Reset dependent filters when Activity ID changes
    setSelectedSiteName('');
    setSelectedCity('');
    setSelectedPic('');
    setSelectedRpm('');
  };

  // Handle Site Name change - reset dependent filters
  const handleSiteNameChange = (option: any) => {
    setSelectedSiteName(option ? option.value : '');
    // Reset dependent filters when Site Name changes
    setSelectedCity('');
    setSelectedPic('');
    setSelectedRpm('');
  };

  // Handle City change - reset dependent filters
  const handleCityChange = (option: any) => {
    setSelectedCity(option ? option.value : '');
    // Reset dependent filters when City changes
    setSelectedPic('');
    setSelectedRpm('');
  };

  // Handle PIC change - reset dependent filters
  const handlePicChange = (option: any) => {
    setSelectedPic(option ? option.value : '');
    // Reset dependent filters when PIC changes
    setSelectedRpm('');
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-sans">
      <Sidebar
      />
      
      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        <div className="max-w-full mx-auto">
          
          {/* Page Header */}
          <div className="flex items-center mb-6">
            <img src="/logo.jpeg" alt="Ansinda Logo" className="h-20 mr-95" />
            <h1 className='ml-6 text-black text-3xl font-bold'>Approval OPS</h1>
          </div>
          
          {/* Filters Section */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Activity ID */}
              <Select
                options={toSelectOptions(activityIdOptions)}
                value={selectedActivityId ? { value: selectedActivityId, label: selectedActivityId } : null}
                onChange={handleActivityIdChange}
                isSearchable={true}
                isClearable={true}
                placeholder="Activity ID"
                classNamePrefix="react-select"
                styles={selectStyles}
              />
              {/* Site Name */}
              <Select
                options={toSelectOptions(siteNameOptions)}
                value={selectedSiteName ? { value: selectedSiteName, label: selectedSiteName } : null}
                onChange={handleSiteNameChange}
                isSearchable={true}
                isClearable={true}
                placeholder="Site Name"
                classNamePrefix="react-select"
                styles={selectStyles}
              />
              {/* City */}
              <Select
                options={toSelectOptions(cityOptions)}
                value={selectedCity ? { value: selectedCity, label: selectedCity } : null}
                onChange={handleCityChange}
                isSearchable={true}
                isClearable={true}
                placeholder="City"
                classNamePrefix="react-select"
                styles={selectStyles}
              />
              {/* PIC */}
              <Select
                options={toSelectOptions(picOptions)}
                value={selectedPic ? { value: selectedPic, label: selectedPic } : null}
                onChange={handlePicChange}
                isSearchable={true}
                isClearable={true}
                placeholder="PIC"
                classNamePrefix="react-select"
                styles={selectStyles}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearAllFilters}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Approval Table Section */}
          <div className="bg-white rounded-lg shadow-sm mb-4">
              {/* Table Header */}
              <div className="w-full flex items-center p-3 bg-blue-900 text-white rounded-t-lg">
                  <h2 className="font-bold text-sm">Approval OPS</h2>
              </div>

              {/* Table Content */}
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Date</th>
                      <th scope="col" className="px-4 py-3">Activity ID</th>
                      <th scope="col" className="px-4 py-3">Site Name</th>
                      <th scope="col" className="px-4 py-3">PIC/RPM Name</th>
                      <th scope="col" className="px-4 py-3">NIK</th>
                      <th scope="col" className="px-4 py-3">Division</th>
                      <th scope="col" className="px-4 py-3">Detail Plan</th>
                      <th scope="col" className="px-4 py-3">Type Request</th>
                      <th scope="col" className="px-4 py-3">Total</th>
                      <th scope="col" className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApprovalData.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">{item.date}</td>
                        <td className="px-4 py-3">{item.activityId}</td>
                        <td className="px-4 py-3">{item.siteName}</td>
                        <td className="px-4 py-3">{item.picName}</td>
                        <td className="px-4 py-3">{item.nik}</td>
                        <td className="px-4 py-3">{item.division}</td>
                        <td className="px-4 py-3">{item.detailPlan}</td>
                        <td className="px-4 py-3">{item.requestType}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{item.total}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-white bg-green-500 hover:bg-green-600 transition-colors py-1 px-4 font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleApprove(item.id, item.parentTaskId, item.source)}
                              disabled={item.status_ops === 'approved_top' || item.status_ops === 'rejected'}
                            >
                              {item.status_ops === 'approved_top' ? 'Approved' : 'Approve'}
                            </button>
                            <button
                              className="text-white bg-red-500 hover:bg-red-600 transition-colors py-1 px-4 font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleReject(item.id, item.parentTaskId, item.source)}
                              disabled={item.status_ops === 'approved_top' || item.status_ops === 'rejected'}
                            >
                              {item.status_ops === 'rejected' ? 'Rejected' : 'Reject'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ApprovalOpsPage;