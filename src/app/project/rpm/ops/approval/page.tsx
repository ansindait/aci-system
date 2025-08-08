"use client";

import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar'; // Assuming Sidebar component exists
import { useSidebar } from '@/context/SidebarContext'; // Assuming SidebarContext exists
import { db } from '@/lib/firebase';
import { collection, onSnapshot, collectionGroup, getDoc, DocumentData, updateDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Select from 'react-select';

// Define the data structure for the approval table
interface ApprovalData {
  id: string;
  parentTaskId: string;
  date: string;
  activityId: string;
  siteName: string;
  picName: string;
  division: string;
  detailPlan: string;
  requestType: string;
  total: string;
  status_ops: string;
  region: string;
  city: string;
  rpm?: string; // Add RPM field for debugging
}

// Edit Modal Component
function EditModal({ 
  isOpen, 
  onClose, 
  data, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  data: ApprovalData | null; 
  onSave: (updatedData: Partial<ApprovalData>) => void; 
}) {
  const [formData, setFormData] = useState<Partial<ApprovalData>>({});

  useEffect(() => {
    if (data) {
      setFormData({
        date: data.date,
        picName: data.picName,
        division: data.division,
        detailPlan: data.detailPlan,
        requestType: data.requestType,
        total: data.total,
        region: data.region,
        city: data.city
      });
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-black">Edit Approval Data</h2>
          <button
            onClick={onClose}
            className="text-black hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Date</label>
              <input
                type="date"
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>



            {/* PIC Name */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">PIC Name</label>
              <input
                type="text"
                value={formData.picName || ''}
                onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Division */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Division</label>
              <input
                type="text"
                value={formData.division || ''}
                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Request Type */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Request Type</label>
              <input
                type="text"
                value={formData.requestType || ''}
                onChange={(e) => setFormData({ ...formData, requestType: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Total */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Total</label>
              <input
                type="text"
                value={formData.total || ''}
                onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rp 0"
                required
              />
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Region</label>
              <input
                type="text"
                value={formData.region || ''}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">City</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Detail Plan - Full Width */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Detail Plan</label>
            <textarea
              value={formData.detailPlan || ''}
              onChange={(e) => setFormData({ ...formData, detailPlan: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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

const ApprovalOpsPage = () => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen } = useSidebar();

  const [currentUser, setCurrentUser] = useState<any>(null);

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

  // State untuk value filter history terpilih
  const [selectedHistoryStartDate, setSelectedHistoryStartDate] = useState('');
  const [selectedHistoryEndDate, setSelectedHistoryEndDate] = useState('');

  // State untuk data approval dari database
  const [allApprovalData, setAllApprovalData] = useState<ApprovalData[]>([]);
  const [filteredApprovalData, setFilteredApprovalData] = useState<ApprovalData[]>([]);

  // State untuk data history dari database
  const [allHistoryData, setAllHistoryData] = useState<ApprovalData[]>([]);
  const [filteredHistoryData, setFilteredHistoryData] = useState<ApprovalData[]>([]);

  // State untuk cityOptionsByRegion
  const [cityOptionsByRegion, setCityOptionsByRegion] = useState<{ [region: string]: string[] }>({});

  // State untuk edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<ApprovalData | null>(null);

  // Handler approve
  const handleApprove = async (docId: string, parentTaskId: string) => {
    try {
      const docRef = doc(db, 'tasks', parentTaskId, 'request_ops', docId);
      await updateDoc(docRef, { 
        status_ops: 'pending_top', 
        approved_by_rpm: currentUser?.name || currentUser?.displayName || 'Unknown User', 
        approved_at: serverTimestamp() 
      });
    } catch (err) {
      alert('Gagal approve: ' + err);
    }
  };
  // Handler reject
  const handleReject = async (docId: string, parentTaskId: string) => {
    try {
      const docRef = doc(db, 'tasks', parentTaskId, 'request_ops', docId);
      await updateDoc(docRef, { status_ops: 'rejected' });
    } catch (err) {
      alert('Gagal reject: ' + err);
    }
  };

  // Handler edit
  const handleEdit = (data: ApprovalData) => {
    setEditingData(data);
    setIsEditModalOpen(true);
  };

  // Handler save edit
  const handleSaveEdit = async (updatedData: Partial<ApprovalData>) => {
    if (!editingData) return;

    try {
      const docRef = doc(db, 'tasks', editingData.parentTaskId, 'request_ops', editingData.id);
      
      // Convert total back to number if it's a formatted string
      let totalValue = updatedData.total;
      if (typeof totalValue === 'string' && totalValue.includes('Rp')) {
        const numericValue = totalValue.replace(/[^\d]/g, '');
        totalValue = numericValue;
      }

      await updateDoc(docRef, {
        date: updatedData.date,
        picName: updatedData.picName,
        division: updatedData.division,
        detailPlan: updatedData.detailPlan,
        requestType: updatedData.requestType,
        ops: totalValue, // Use 'ops' field for total
        region: updatedData.region,
        city: updatedData.city,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.name || 'Unknown User'
      });

      alert('Data berhasil diperbarui!');
      setIsEditModalOpen(false);
      setEditingData(null);
    } catch (err) {
      alert('Gagal memperbarui data: ' + err);
    }
  };

  // Handler close edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingData(null);
  };

  // Get current user data
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setCurrentUser({
              uid: user.uid,
              name: userDoc.data().name || user.displayName || 'Unknown User',
              email: user.email
            });
          } else {
            setCurrentUser({
              uid: user.uid,
              name: user.displayName || 'Unknown User',
              email: user.email
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setCurrentUser({
            uid: user.uid,
            name: user.displayName || 'Unknown User',
            email: user.email
          });
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listener realtime Firestore untuk data dan filter options
  useEffect(() => {
    if (!currentUser?.name) {
      console.log('⏳ Waiting for current user data...');
      return;
    }

    console.log('🔍 Current user name:', currentUser.name);
    console.log('🔍 Starting to fetch request_ops data...');

    const unsub = onSnapshot(collectionGroup(db, 'request_ops'), async (snapshot) => {
      console.log('📊 Total request_ops documents found:', snapshot.docs.length);
      
      const data = await Promise.all(snapshot.docs.map(async (doc, index) => {
        const d = doc.data();
        console.log(`📄 Document ${index + 1}:`, { id: doc.id, data: d });
        
        // Ambil parent doc (tasks)
        let parentData: DocumentData = {};
        if (doc.ref.parent.parent) {
          const parentSnap = await getDoc(doc.ref.parent.parent);
          if (parentSnap.exists()) {
            parentData = parentSnap.data() || {};
            console.log(`📄 Parent data for doc ${index + 1}:`, parentData);
          }
        }
        
        // Filter data berdasarkan field rpm yang sesuai dengan nama user login
        const rpmField = d.rpm || parentData.rpm || '';
        console.log(`🔍 Document ${index + 1} - RPM field: "${rpmField}", Current user: "${currentUser.name}"`);
        
        if (rpmField !== currentUser.name) {
          console.log(`❌ Document ${index + 1} - RPM mismatch, skipping`);
          return null; // Skip data yang tidak sesuai dengan user login
        }
        
        console.log(`✅ Document ${index + 1} - RPM match, processing`);
        
        // Mapping field, fallback ke string kosong jika tidak ada
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
        
        const result = {
          id: doc.id,
          parentTaskId: doc.ref.parent.parent ? doc.ref.parent.parent.id : '',
          date: date || '',
          activityId: d.activityId || parentData.activityId || parentData.siteId || '',
          siteName: d.siteName || parentData.siteName || '',
          picName: d.picName || parentData.picName || parentData.pic || '',
          division: d.division || parentData.division || '',
          detailPlan: d.detailPlan || '',
          requestType: d.requestType || '',
          total: totalFormatted,
          status_ops: d.status_ops || '',
          region: parentData.region || '',
          city: parentData.city || '',
          // Add RPM field for debugging
          rpm: d.rpm || parentData.rpm || '',
        };
        
        console.log(`✅ Processed document ${index + 1}:`, result);
        return result;
      }));
      
      // Filter out null values (data yang tidak sesuai dengan user login)
      const filteredData = data.filter(item => item !== null);
      console.log('📊 Final filtered data count:', filteredData.length);
      console.log('📊 Final filtered data:', filteredData);
      
      setAllApprovalData(filteredData);
    });
    return () => unsub();
  }, [currentUser?.name]);

  // Listener realtime Firestore untuk data history (pending_top, approved_top, done)
  useEffect(() => {
    if (!currentUser?.name) {
      console.log('⏳ Waiting for current user data for history...');
      return;
    }

    console.log('🔍 Current user name for history:', currentUser.name);
    console.log('🔍 Starting to fetch history data...');

    const unsub = onSnapshot(collectionGroup(db, 'request_ops'), async (snapshot) => {
      console.log('📊 Total request_ops documents found for history:', snapshot.docs.length);
      
      const data = await Promise.all(snapshot.docs.map(async (doc, index) => {
        const d = doc.data();
        
        // Ambil parent doc (tasks)
        let parentData: DocumentData = {};
        if (doc.ref.parent.parent) {
          const parentSnap = await getDoc(doc.ref.parent.parent);
          if (parentSnap.exists()) {
            parentData = parentSnap.data() || {};
          }
        }
        
        // Filter data berdasarkan field rpm yang sesuai dengan nama user login
        const rpmField = d.rpm || parentData.rpm || '';
        
        if (rpmField !== currentUser.name) {
          return null; // Skip data yang tidak sesuai dengan user login
        }
        
        // Filter hanya data dengan status pending_top, approved_top, atau done
        const validStatuses = ['pending_top', 'approved_top', 'done'];
        if (!validStatuses.includes(d.status_ops)) {
          return null; // Skip data yang tidak memiliki status yang valid
        }
        
        // Mapping field, fallback ke string kosong jika tidak ada
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
        
        const result = {
          id: doc.id,
          parentTaskId: doc.ref.parent.parent ? doc.ref.parent.parent.id : '',
          date: date || '',
          activityId: d.activityId || parentData.activityId || parentData.siteId || '',
          siteName: d.siteName || parentData.siteName || '',
          picName: d.picName || parentData.picName || parentData.pic || '',
          division: d.division || parentData.division || '',
          detailPlan: d.detailPlan || '',
          requestType: d.requestType || '',
          total: totalFormatted,
          status_ops: d.status_ops || '',
          region: parentData.region || '',
          city: parentData.city || '',
          rpm: d.rpm || parentData.rpm || '',
        };
        
        return result;
      }));
      
      // Filter out null values (data yang tidak sesuai dengan user login atau status)
      const filteredData = data.filter(item => item !== null);
      console.log('📊 Final filtered history data count:', filteredData.length);
      
      setAllHistoryData(filteredData);
    });
    return () => unsub();
  }, [currentUser?.name]);

  // Separate useEffect untuk mengisi filter options dari collection tasks dengan sub collection request_ops
  useEffect(() => {
    // Extract filter options from allApprovalData (which contains data from request_ops subcollection)
    const extractFilterOptions = () => {
      console.log('🔄 Extracting filter options from allApprovalData...');
      console.log('🔄 Total data in allApprovalData:', allApprovalData.length);
      
      // Filter only data with status_ops = "pending_rpm"
      const pendingRpmData = allApprovalData.filter(item => item.status_ops === 'pending_rpm');
      console.log('🔄 Data with pending_rpm status:', pendingRpmData.length);
      
      // Apply cascading filters - start with all data and filter progressively
      let filteredData = pendingRpmData;
      
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
        filteredData = filteredData.filter(item => item.picName === selectedRpm);
        console.log('🔄 Filtered by RPM:', selectedRpm, 'Data count:', filteredData.length);
      }
      
      // Extract unique values for each filter based on cascading logic
      // Activity ID: Show options based on current filtered data
      const activityIds = Array.from(new Set(filteredData.map(item => item.activityId).filter(Boolean)));
      
      // Site Name: Show options based on current filtered data
      const siteNames = Array.from(new Set(filteredData.map(item => item.siteName).filter(Boolean)));
      
      // City: Show options based on current filtered data
      const cities = Array.from(new Set(filteredData.map(item => item.city).filter(Boolean)));
      
      // PIC: Show options based on current filtered data
      const pics = Array.from(new Set(filteredData.map(item => item.picName).filter(Boolean)));
      
      // RPM: Show options based on current filtered data
      const rpms = Array.from(new Set(filteredData.map(item => item.picName).filter(Boolean)));
      
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

  // Update cityOptionsByRegion setiap kali allApprovalData berubah
  useEffect(() => {
    const mapping: { [region: string]: Set<string> } = {};
    allApprovalData.forEach(item => {
      if (item.region && item.city) {
        if (!mapping[item.region]) mapping[item.region] = new Set();
        mapping[item.region].add(item.city);
      }
    });
    // Convert Set to Array
    const obj: { [region: string]: string[] } = {};
    Object.keys(mapping).forEach(region => {
      obj[region] = Array.from(mapping[region]);
    });
    setCityOptionsByRegion(obj);
  }, [allApprovalData]);

  // Filter data approval setiap kali filter berubah atau data berubah
  useEffect(() => {
    let filtered = allApprovalData.filter(item => {
      if (selectedActivityId && item.activityId !== selectedActivityId) return false;
      if (selectedSiteName && item.siteName !== selectedSiteName) return false;
      if (selectedCity && item.city !== selectedCity) return false;
      if (selectedPic && item.picName !== selectedPic) return false;
      if (selectedRpm && item.picName !== selectedRpm) return false;
      // Only show items with status_ops === 'pending_rpm' for RPM approval
      if (item.status_ops !== 'pending_rpm') return false;
      return true;
    });
    setFilteredApprovalData(filtered);
  }, [allApprovalData, selectedActivityId, selectedSiteName, selectedCity, selectedPic, selectedRpm]);

  // Separate useEffect untuk mengisi filter options history
  useEffect(() => {
    const extractHistoryFilterOptions = () => {
      console.log('🔄 Extracting history filter options from allHistoryData...');
      console.log('🔄 Total data in allHistoryData:', allHistoryData.length);
      
      // Apply date filters - start with all data and filter progressively
      let filteredData = allHistoryData;
      
      // Filter by Start Date if selected
      if (selectedHistoryStartDate) {
        filteredData = filteredData.filter(item => {
          const itemDate = new Date(item.date);
          const startDate = new Date(selectedHistoryStartDate);
          return itemDate >= startDate;
        });
      }
      
      // Filter by End Date if selected
      if (selectedHistoryEndDate) {
        filteredData = filteredData.filter(item => {
          const itemDate = new Date(item.date);
          const endDate = new Date(selectedHistoryEndDate);
          return itemDate <= endDate;
        });
      }
      
      console.log('🔄 Filtered history data count:', filteredData.length);
    };
    
    extractHistoryFilterOptions();
  }, [allHistoryData, selectedHistoryStartDate, selectedHistoryEndDate]);

  // Filter data history setiap kali filter berubah atau data berubah
  useEffect(() => {
    let filtered = allHistoryData.filter(item => {
      // Filter by Start Date if selected
      if (selectedHistoryStartDate) {
        const itemDate = new Date(item.date);
        const startDate = new Date(selectedHistoryStartDate);
        if (itemDate < startDate) return false;
      }
      
      // Filter by End Date if selected
      if (selectedHistoryEndDate) {
        const itemDate = new Date(item.date);
        const endDate = new Date(selectedHistoryEndDate);
        if (itemDate > endDate) return false;
      }
      
      return true;
    });
    setFilteredHistoryData(filtered);
  }, [allHistoryData, selectedHistoryStartDate, selectedHistoryEndDate]);

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

  // Handler untuk filter history
  const clearAllHistoryFilters = () => {
    setSelectedHistoryStartDate('');
    setSelectedHistoryEndDate('');
  };

  // Handle History Start Date change
  const handleHistoryStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedHistoryStartDate(e.target.value);
  };

  // Handle History End Date change
  const handleHistoryEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedHistoryEndDate(e.target.value);
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
                      <th scope="col" className="px-4 py-3">PIC Name</th>
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
                        <td className="px-4 py-3">{item.division}</td>
                        <td className="px-4 py-3">{item.detailPlan}</td>
                        <td className="px-4 py-3">{item.requestType}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{item.total}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-white bg-blue-500 hover:bg-blue-600 transition-colors py-1 px-3 font-semibold rounded-md text-xs"
                              onClick={() => handleEdit(item)}
                              title="Edit Data"
                            >
                              Edit
                            </button>
                            <button
                              className="text-white bg-green-500 hover:bg-green-600 transition-colors py-1 px-4 font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleApprove(item.id, item.parentTaskId)}
                              disabled={['pending_top', 'approved_top', 'rejected'].includes(item.status_ops)}
                            >
                              {item.status_ops === 'pending_rpm' ? 'Approve' : 'Approved'}
                            </button>
                            <button
                              className="text-white bg-red-500 hover:bg-red-600 transition-colors py-1 px-4 font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleReject(item.id, item.parentTaskId)}
                              disabled={['pending_top', 'approved_top', 'rejected'].includes(item.status_ops)}
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

          {/* History OPS Section */}
          <div className="bg-white rounded-lg shadow-sm mb-4">
              {/* Table Header */}
              <div className="w-full flex items-center p-3 bg-blue-900 text-white rounded-t-lg">
                  <h2 className="font-bold text-sm">History OPS</h2>
              </div>

              {/* Filters for History */}
              <div className="bg-gray-100 p-4 rounded-lg shadow-sm mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={selectedHistoryStartDate}
                      onChange={handleHistoryStartDateChange}
                      className="w-full border border-gray-300 text-black rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={selectedHistoryEndDate}
                      onChange={handleHistoryEndDateChange}
                      className="w-full border border-gray-300 text-black rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearAllHistoryFilters}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>

              {/* Table Content */}
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Date</th>
                      <th scope="col" className="px-4 py-3">Activity ID</th>
                      <th scope="col" className="px-4 py-3">Site Name</th>
                      <th scope="col" className="px-4 py-3">PIC Name</th>
                      <th scope="col" className="px-4 py-3">Division</th>
                      <th scope="col" className="px-4 py-3">Detail Plan</th>
                      <th scope="col" className="px-4 py-3">Type Request</th>
                      <th scope="col" className="px-4 py-3">Total</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoryData.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">{item.date}</td>
                        <td className="px-4 py-3">{item.activityId}</td>
                        <td className="px-4 py-3">{item.siteName}</td>
                        <td className="px-4 py-3">{item.picName}</td>
                        <td className="px-4 py-3">{item.division}</td>
                        <td className="px-4 py-3">{item.detailPlan}</td>
                        <td className="px-4 py-3">{item.requestType}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{item.total}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.status_ops === 'pending_top' ? 'bg-yellow-100 text-yellow-800' :
                            item.status_ops === 'approved_top' ? 'bg-green-100 text-green-800' :
                            item.status_ops === 'done' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status_ops === 'pending_top' ? 'Pending TOP' :
                             item.status_ops === 'approved_top' ? 'Approved TOP' :
                             item.status_ops === 'done' ? 'Done' :
                             item.status_ops}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      <EditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        data={editingData}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default ApprovalOpsPage;