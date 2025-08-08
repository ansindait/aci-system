"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { SingleValue } from 'react-select';

interface HistoryData {
  id: string;
  parentTaskId: string;
  activityId: string;
  siteId: string;
  siteName: string;
  city: string;
  activityCategory: string;
  detailPlan: string;
  requestBy: string;
  nominal: string;
  opsDetail: string;
  bank: string;
  bankNumber: string;
  date: string;
  status_ops: string;
  rpm: string;
  pic: string;
  typeRequest: string;
  ops: string;
  transferProofUrl?: string;
  transferProofUploadedAt?: string;
  notaUrl?: string;
}

const statusColor = (status: string) => {
  switch (status) {
    case 'pending_rpm': return 'bg-yellow-400 text-gray-900';
    case 'pending_top': return 'bg-orange-400 text-white';
    case 'pending_ops': return 'bg-blue-500 text-white';
    case 'done': return 'bg-green-500 text-white';
    case 'rejected': return 'bg-red-500 text-white';
    default: return 'bg-gray-300 text-gray-800';
  }
};

const HistoryOpsPage = () => {
  const [filters, setFilters] = useState({
    date: '',
    activityId: '',
    picRpmName: '',
    status: 'all',
  });
  const [allHistory, setAllHistory] = useState<HistoryData[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryData | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const itemsPerPage = 25;

  useEffect(() => {
    console.log('Starting to fetch OPS history data...');
    
    let unsubscribers: (() => void)[] = [];
    
    async function listenHistory() {
      try {
        console.log('Fetching tasks collection...');
        const tasksSnapshot = await getDocs(collection(db, 'tasks'));
        console.log('Tasks found:', tasksSnapshot.docs.length);
        
        for (const taskDoc of tasksSnapshot.docs) {
          const taskData = taskDoc.data();
          console.log('Task data:', taskData);
          
          const siteId = taskData.siteId || '';
          const city = taskData.city || '';
          const siteName = taskData.siteName || '';
          const rpm = taskData.rpm || '';
          const pic = taskData.pic || '';
          const bank = taskData.bank || '';
          const bankNumber = taskData.bankNumber || '';
          
          const requestOpsRef = collection(doc(db, 'tasks', taskDoc.id), 'request_ops');
          console.log('Setting up listener for request_ops subcollection in task:', taskDoc.id);
          
          const unsub = onSnapshot(requestOpsRef, (requestOpsSnapshot) => {
            console.log('request_ops snapshot received for task:', taskDoc.id, 'docs:', requestOpsSnapshot.docs.length);
            
            let newData: HistoryData[] = [];
            requestOpsSnapshot.forEach((docSnap) => {
              const data = docSnap.data();
              console.log('request_ops document data:', data);
              
              newData.push({
                id: docSnap.id,
                parentTaskId: taskDoc.id,
                activityId: data.activityId || '',
                siteId,
                siteName: data.siteName || siteName,
                city: data.city || city,
                activityCategory: data.activityCategory || data.division || '',
                detailPlan: data.detailPlan || '-',
                requestBy: data.picName || data.pic || pic || '',
                nominal: data.ops || data.nominal || '',
                opsDetail: data.requestType || data.opsDetail || '',
                bank: data.bank || bank,
                bankNumber: data.bankNo || data.bankNumber || bankNumber,
                date: data.date || '',
                status_ops: data.status_ops || '',
                rpm: data.rpm || rpm,
                pic: data.pic || pic,
                typeRequest: data.requestType || '-',
                ops: data.ops || '-',
                transferProofUrl: data.transferProofUrl || '',
                notaUrl: data.notaUrl || '',
              });
            });
            
            console.log('New data from request_ops for task', taskDoc.id, ':', newData.length);
            
            setAllHistory(prev => {
              const filteredPrev = prev.filter(d => d.parentTaskId !== taskDoc.id);
              const combined = [...filteredPrev, ...newData];
              console.log('Updated allHistory state:', combined.length);
              return combined; // Fixed: Replaced '！' with proper return statement
            });
          });
          unsubscribers.push(unsub);
        }

        const requestOpsRpmRef = collection(db, 'request_ops_rpm');
        console.log('Setting up listener for root-level request_ops_rpm collection');
        
        const unsubRpm = onSnapshot(requestOpsRpmRef, (rpmSnapshot) => {
          console.log('request_ops_rpm snapshot received:', rpmSnapshot.docs.length);
          
          let rpmData: HistoryData[] = [];
          rpmSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            console.log('request_ops_rpm document data:', data);
            
            rpmData.push({
              id: docSnap.id,
              parentTaskId: '',
              activityId: data.activityId || '',
              siteId: data.siteId || '',
              siteName: data.siteName || '',
              city: data.city || '',
              activityCategory: data.activityCategory || data.division || '',
              detailPlan: data.detailPlan || '-',
              requestBy: data.picName || data.pic || '',
              nominal: data.ops || data.nominal || '',
              opsDetail: data.requestType || data.opsDetail || '',
              bank: data.bank || '',
              bankNumber: data.bankNo || data.bankNumber || '',
              date: data.date || '',
              status_ops: data.status_ops || '',
              rpm: data.rpm || '',
              pic: data.pic || '',
              typeRequest: data.requestType || '-',
              ops: data.ops || '-',
              transferProofUrl: data.transferProofUrl || '',
              notaUrl: data.notaUrl || '',
            });
          });
          
          console.log('New data from request_ops_rpm:', rpmData.length);
          
          setAllHistory(prev => {
            const filteredPrev = prev.filter(d => d.parentTaskId !== '');
            const combined = [...filteredPrev, ...rpmData];
            console.log('Updated allHistory state with request_ops_rpm:', combined.length);
            return combined;
          });
        });
        unsubscribers.push(unsubRpm);
        
      } catch (error) {
        console.error('Error in listenHistory:', error);
      }
    }
    
    listenHistory();
    
    return () => {
      console.log('Cleaning up listeners...');
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    console.log('Filtering data... allHistory length:', allHistory.length);
    console.log('Current filters:', filters);
    
    let filtered = allHistory.filter(item => {
      if (filters.date && item.date !== filters.date) return false;
      if (filters.activityId && !item.activityId.toLowerCase().includes(filters.activityId.toLowerCase())) return false;
      if (filters.picRpmName && !item.requestBy.toLowerCase().includes(filters.picRpmName.toLowerCase())) return false;
      if (filters.status !== 'all' && item.status_ops !== filters.status) return false;
      return true;
    });
    
    console.log('Filtered data length:', filtered.length);
    setFilteredHistory(filtered);
    setCurrentPage(1);
  }, [allHistory, filters]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredHistory.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleUploadProof = async () => {
    if (!selectedItem || !uploadFile) return;

    setUploading(true);
    try {
      const fileName = `transfer_proof_${selectedItem.id}_${Date.now()}_${uploadFile.name}`;
      const storageRef = ref(storage, `transfer_proofs/${fileName}`);
      const snapshot = await uploadBytes(storageRef, uploadFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      if (selectedItem.parentTaskId === '') {
        const docRef = doc(db, 'request_ops_rpm', selectedItem.id);
        await updateDoc(docRef, {
          transferProofUrl: downloadURL,
          transferProofUploadedAt: new Date().toISOString()
        });
      } else {
        const docRef = doc(db, 'tasks', selectedItem.parentTaskId, 'request_ops', selectedItem.id);
        await updateDoc(docRef, {
          transferProofUrl: downloadURL,
          transferProofUploadedAt: new Date().toISOString()
        });
      }

      console.log('Transfer proof uploaded successfully');
      setUploadModalOpen(false);
      setSelectedItem(null);
      setUploadFile(null);
    } catch (error) {
      console.error('Error uploading transfer proof:', error);
      alert('Gagal upload bukti transfer: ' + error);
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
  };

  console.log('Rendering component... filteredHistory length:', filteredHistory.length);
  console.log('Sample filteredHistory data:', filteredHistory.slice(0, 2));
  
  return (
    <div className="min-h-screen bg-white font-sans">
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
              Ops History
            </h2>
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl shadow p-4 mb-6 max-w-4xl mx-auto w-full flex flex-col md:flex-row gap-4 items-center">
        <input type="text" value={filters.activityId} onChange={e => setFilters(f => ({ ...f, activityId: e.target.value }))} className="w-full border text-black border-gray-300 rounded px-2 py-1" placeholder="Search Activity ID" />
        <input type="text" value={filters.picRpmName} onChange={e => setFilters(f => ({ ...f, picRpmName: e.target.value }))} className="w-full border text-black border-gray-300 rounded px-2 py-1" placeholder="Search PIC/RPM Name" />
        <input type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} className="w-full border text-black border-gray-300 rounded px-2 py-1" placeholder="Date" />
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="w-full border text-black border-gray-300 rounded px-2 py-1">
          <option value="all">All Status</option>
          <option value="pending_rpm">Pending RPM</option>
          <option value="pending_top">Pending Top</option>
          <option value="done">Done</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div className="px-2 sm:px-6">
        <div className="bg-blue-900 text-white text-2xl font-bold rounded-t-lg p-3 text-center">History OPS</div>
        <div className="bg-white rounded-b-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-800">
            <thead className="text-xs uppercase bg-gray-100 font-bold">
              <tr>
                <th className="px-4 py-3">Activity ID</th>
                <th className="px-4 py-3">Site ID</th>
                <th className="px-4 py-3">Site Name</th>
                <th className="px-4 py-3">Activity Category</th>
                <th className="px-4 py-3">Detail Plan</th>
                <th className="px-4 py-3">PIC/RPM Name</th>
                <th className="px-4 py-3">OPS</th>
                <th className="px-4 py-3">Type Request</th>
                <th className="px-4 py-3">Bank Name</th>
                <th className="px-4 py-3">Bank Number</th>
                <th className="px-4 py-3">Tanggal Request</th>
                <th className="px-4 py-3">Nota Receipt</th>
                <th className="px-4 py-3">Bukti TF</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
                    {allHistory.length === 0 ? (
                      <div>
                        <p className="text-lg font-medium mb-2">No OPS History Data Found</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg font-medium mb-2">No Data Matching Current Filters</p>
                        <p className="text-sm">Try adjusting your search criteria.</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                currentItems.map((item, idx) => (
                  <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-4">{item.activityId}</td>
                    <td className="px-4 py-4">{item.siteId}</td>
                    <td className="px-4 py-4">{item.siteName}</td>
                    <td className="px-4 py-3">{item.activityCategory}</td>
                    <td className="px-4 py-4">{item.detailPlan || '-'}</td>
                    <td className="px-4 py-4">{item.requestBy}</td>
                    <td className="px-4 py-4">{item.ops || '-'}</td>
                    <td className="px-4 py-4">{item.typeRequest || '-'}</td>
                    <td className="px-4 py-4">{item.bank}</td>
                    <td className="px-4 py-4">{item.bankNumber}</td>
                    <td className="px-4 py-4">{item.date}</td>
                    <td className="px-4 py-4">
                      {item.notaUrl ? (
                        <button
                          onClick={() => handlePreview(item.notaUrl!)}
                          className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                          title="Preview Nota Receipt"
                        >
                          View
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {item.transferProofUrl ? (
                        <button
                          onClick={() => handlePreview(item.transferProofUrl!)}
                          className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                          title="Preview Bukti TF"
                        >
                          View
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusColor(item.status_ops)}`}>
                          {item.status_ops === 'pending_rpm' ? 'Pending RPM' :
                            item.status_ops === 'pending_top' ? 'Pending Top' :
                            item.status_ops === 'pending_ops' ? 'Pending OPS' :
                            item.status_ops === 'done' ? 'Done' :
                            item.status_ops === 'rejected' ? 'Rejected' :
                            item.status_ops}
                        </span>
                        {item.status_ops === 'done' && !item.transferProofUrl && (
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setUploadModalOpen(true);
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white text-xs p-2 rounded transition-colors mt-1 flex items-center justify-center"
                            title="Upload Bukti TF"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredHistory.length)} of {filteredHistory.length} entries
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-blue-900 text-white border border-gray-300 rounded-md hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      currentPage === page
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-900 text-white border border-gray-300 hover:bg-blue-800'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-blue-900 text-white border border-gray-300 rounded-md hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="pb-8"></div>

      {uploadModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-black">Upload Bukti Transfer</h3>
            <p className="text-sm text-gray-600 mb-4">
              Activity ID: {selectedItem.activityId}
            </p>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleUploadProof}
                disabled={!uploadFile || uploading}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  setSelectedItem(null);
                  setUploadFile(null);
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-black">Preview Document</h3>
              <button
                onClick={() => setPreviewUrl(null)}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {previewUrl.endsWith('.pdf') ? (
              <iframe
                src={previewUrl}
                className="w-full h-[60vh]"
                title="Document Preview"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Document Preview"
                className="w-full h-auto max-h-[60vh] object-contain"
              />
            )}
            <div className="mt-4 flex justify-end">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Open in New Tab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryOpsPage;