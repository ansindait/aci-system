"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collectionGroup, getDoc, updateDoc, doc, onSnapshot, addDoc, collection, getDocs } from 'firebase/firestore';
import Select, { SingleValue } from 'react-select';
import * as XLSX from 'xlsx';

interface ApprovalData {
  id: string;
  parentTaskId: string;
  date: string;
  activityId: string;
  siteName: string;
  picName: string;
  rpm: string;
  division: string;
  requestType: string;
  bank: string;
  bankNumber: string;
  total: string;
  status_ops: string;
  region: string;
  city: string;
}

const toSelectOptions = (arr: string[]) => arr.map(opt => ({ value: opt, label: opt }));
const selectStyles = {
  option: (provided: any) => ({ ...provided, color: '#000' }),
  singleValue: (provided: any) => ({ ...provided, color: '#000' }),
  input: (provided: any) => ({ ...provided, color: '#000' }),
};

const ApprovalOpsPage = () => {
  const [filters, setFilters] = useState({
    date: '',
    activityId: '',
  });
  const [allApprovalData, setAllApprovalData] = useState<ApprovalData[]>([]);
  const [filteredApprovalData, setFilteredApprovalData] = useState<ApprovalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [appended, setAppended] = useState(false);
  const [unsubscribers, setUnsubscribers] = useState<(() => void)[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Handler Append: setelah diklik, pasang realtime listener dan biarkan tetap aktif
  const handleAppend = async () => {
    setLoading(true);
    console.log('Starting to fetch OPS approval data...');
    
    try {
      // Listener untuk request_ops (subcollection)
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      console.log('Tasks found:', tasksSnapshot.docs.length);
      
      let unsubList: (() => void)[] = [];
      
      for (const taskDoc of tasksSnapshot.docs) {
        const taskData = taskDoc.data();
        console.log('Task data:', taskData);
        
        const requestOpsRef = collection(doc(db, 'tasks', taskDoc.id), 'request_ops');
        console.log('Setting up listener for request_ops subcollection in task:', taskDoc.id);
        
        const unsub = onSnapshot(requestOpsRef, (requestOpsSnapshot) => {
          console.log('request_ops snapshot received for task:', taskDoc.id, 'docs:', requestOpsSnapshot.docs.length);
          
          let newData: ApprovalData[] = [];
          requestOpsSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            console.log('request_ops document data:', data);
            
                         if (data.status_ops === 'approved_top') {
               newData.push({
                 id: docSnap.id,
                 parentTaskId: taskDoc.id,
                 date: data.date || '',
                 activityId: data.activityId || '',
                 siteName: data.siteName || '',
                 picName: data.picName || data.pic || '',
                 rpm: data.rpm || taskData.rpm || '',
                 division: data.division || '',
                 requestType: data.requestType || '',
                 bank: data.bank || taskData.bank || '',
                 bankNumber: data.bankNo || data.bankNumber || taskData.bankNumber || '',
                 total: data.ops || '',
                 status_ops: data.status_ops || '',
                 region: data.region || '',
                 city: data.city || '',
               });
             }
          });
          
          console.log('New approval data from request_ops for task', taskDoc.id, ':', newData.length);
          
          setAllApprovalData(prev => {
            // Remove old data from this task and add new data
            const filteredPrev = prev.filter(d => d.parentTaskId !== taskDoc.id);
            const combined = [...filteredPrev, ...newData];
            console.log('Updated allApprovalData state:', combined.length);
            return combined;
          });
        });
        unsubList.push(unsub);
      }
      
      setUnsubscribers(unsubList);
      setLoading(false);
      setAppended(true);
      
    } catch (error) {
      console.error('Error in handleAppend:', error);
      setLoading(false);
    }
  };

  // Tambahkan handler approve OPS
  const handleDone = async (docId: string, parentTaskId: string) => {
    try {
      // Data dari subcollection request_ops
      const reqOpsRef = doc(db, 'tasks', parentTaskId, 'request_ops', docId);
      await updateDoc(reqOpsRef, { status_ops: 'done' });
      console.log('Status updated to done for document:', docId);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Gagal update: ' + err);
    }
  };

  // Export Excel function
  const handleExportExcel = () => {
    const formattedData = filteredApprovalData.map(item => ({
      'Date': item.date,
      'Activity ID': item.activityId,
      'Site Name': item.siteName,
      'PIC Name': item.picName,
      'RPM Name': item.rpm,
      'Division': item.division,
      'Type Request': item.requestType,
      'Bank': item.bank,
      'Bank Number': item.bankNumber,
      'Nominal': item.total,
      'Status': item.status_ops === 'approved_top' ? 'Approved Top' :
               item.status_ops === 'done' ? 'Done' :
               item.status_ops === 'rejected' ? 'Rejected' :
               item.status_ops,
      'City': item.city
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'OPS Approval Data');
    
    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Date
      { wch: 20 }, // Activity ID
      { wch: 25 }, // Site Name
      { wch: 20 }, // PIC Name
      { wch: 20 }, // RPM Name
      { wch: 15 }, // Division
      { wch: 20 }, // Type Request
      { wch: 20 }, // Bank
      { wch: 20 }, // Bank Number
      { wch: 20 }, // Nominal
      { wch: 15 }, // Status
      { wch: 15 }  // City
    ];
    worksheet['!cols'] = columnWidths;
    
    XLSX.writeFile(workbook, 'ops_approval_data.xlsx');
  };

  useEffect(() => {
    console.log('Filtering approval data... allApprovalData length:', allApprovalData.length);
    console.log('Current filters:', filters);
    
    let filtered = allApprovalData.filter(item => {
      if (filters.date && item.date !== filters.date) return false;
      if (filters.activityId && !item.activityId.toLowerCase().includes(filters.activityId.toLowerCase())) return false;
      return true;
    });
    
    console.log('Filtered approval data length:', filtered.length);
    setFilteredApprovalData(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [allApprovalData, filters]);

  // Cleanup listener saat unmount
  useEffect(() => {
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [unsubscribers]);

  // Pagination logic
  const totalPages = Math.ceil(filteredApprovalData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredApprovalData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  console.log('Rendering OPS approval component... filteredApprovalData length:', filteredApprovalData.length);
  console.log('Sample filteredApprovalData:', filteredApprovalData.slice(0, 2));
  
  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans">
      {/* Header baru: Logo dan judul OPS Approval */}
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
                  Ops Need Transfers
                </h2>
              </div>
            </div>
          </div>
          <div className="w-full px-2 sm:px-4">
        <div className="flex flex-row items-center justify-between mb-6">
          <div className="flex flex-row items-center gap-4">
            <button className="bg-blue-900 text-white px-10 py-3 rounded-xl font-bold text-lg shadow-md w-full md:w-[200px]" onClick={handleAppend} disabled={loading || appended}>Append</button>
            <input type="text" value={filters.activityId} onChange={e => setFilters(f => ({ ...f, activityId: e.target.value }))} className="border-2 border-gray-400 rounded-xl px-4 py-3 text-gray-900 font-semibold placeholder-gray-500 bg-white" placeholder="Search Activity ID" />
            <input type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} className="border-2 border-gray-400 rounded-xl px-4 py-3 text-gray-900 font-semibold placeholder-gray-500 bg-white" placeholder="Date" />
          </div>
          <div className="flex flex-row items-center gap-4">
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-md transition-colors"
              onClick={handleExportExcel}
              disabled={filteredApprovalData.length === 0}
            >
              Export Excel
            </button>
          </div>
        </div>
        {/* Approval Table Section */}
        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="w-full flex items-center p-3 bg-blue-900 text-white rounded-t-lg">
            <h2 className="font-bold text-lg mx-auto">Approval OPS</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Activity ID</th>
                  <th className="px-4 py-3">Site Name</th>
                  <th className="px-4 py-3">PIC Name</th>
                  <th className="px-4 py-3">RPM Name</th>
                  <th className="px-4 py-3">Division</th>
                  <th className="px-4 py-3">Type Request</th>
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">Bank Number</th>
                  <th className="px-4 py-3">Nominal</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Operation</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                      {allApprovalData.length === 0 ? (
                        <div>
                          <p className="text-lg font-medium mb-2">No OPS Approval Data Found</p>
                          <p className="text-sm">Please click "Append" to load data.</p>
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
                  currentItems.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">{item.date}</td>
                      <td className="px-4 py-3">{item.activityId}</td>
                      <td className="px-4 py-3">{item.siteName}</td>
                      <td className="px-4 py-3">{item.picName}</td>
                      <td className="px-4 py-3">{item.rpm}</td>
                                           <td className="px-4 py-3">{item.division}</td>
                     <td className="px-4 py-3">{item.requestType}</td>
                     <td className="px-4 py-3">{item.bank}</td>
                                           <td className="px-4 py-3">{item.bankNumber}</td>
                     <td className="px-4 py-3 font-semibold text-gray-800">{item.total}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.status_ops === 'approved_top' ? 'bg-blue-500 text-white' : item.status_ops === 'done' ? 'bg-green-500 text-white' : item.status_ops === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-800'}`}>{item.status_ops}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="text-white bg-green-500 hover:bg-green-600 transition-colors py-1 px-4 font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleDone(item.id, item.parentTaskId)}
                          disabled={item.status_ops !== 'approved_top'}
                        >
                          Done
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredApprovalData.length)} of {filteredApprovalData.length} entries
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
      {/* Bottom padding */}
      <div className="pb-8"></div>
    </div>
  );
};

export default ApprovalOpsPage;
