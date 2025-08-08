"use client";

import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar'; // Assuming Sidebar component exists
import * as XLSX from 'xlsx';
// @ts-ignore
import { saveAs } from 'file-saver';
import { collection, getDocs, doc, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// A placeholder for the ChevronDown icon
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

// Define types for state and data
interface OpenSectionsState {
  permit: boolean;
  snd: boolean;
  cw: boolean;
  el: boolean;
  document: boolean;
  rpm: boolean;
}

interface TableData {
  type: string;
  pic: string;
  date: string;
  total: string;
  tfUrl?: string; // Added for photo preview
  notaUrl?: string; // Added for photo preview
  status_ops?: string; // Added for filtering
}

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

// Reusable DataTable Component with pagination
const DataTable = ({ data }: { data: any[] }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  
  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);
  
  // Reset to page 1 when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div>
    <div className="p-4 overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-600">
        <thead className="bg-gray-50 text-gray-500 font-bold">
          <tr>
            <th scope="col" className="px-4 py-3">Type Request</th>
            <th scope="col" className="px-4 py-3">PIC REQ</th>
            <th scope="col" className="px-4 py-3">DATE APPROVED</th>
            <th scope="col" className="px-4 py-3">TRANSFER RECEIPT</th>
            <th scope="col" className="px-4 py-3">NOTA RECEIPT</th>
            <th scope="col" className="px-4 py-3">STATUS</th>
            <th scope="col" className="px-4 py-3">OPS</th>
          </tr>
        </thead>
        <tbody>
            {currentData.map((item, index) => (
            <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-800">{item.requestType}</td>
              <td className="px-4 py-3">{item.pic}</td>
              <td className="px-4 py-3">{item.date}</td>
              <td className="px-4 py-3">
                {item.tfUrl ? (
                  <a href="#" className="text-blue-600 hover:underline" onClick={e => { e.preventDefault(); setPreviewUrl(item.tfUrl); }}>Photo TF</a>
                ) : (
                  <span className="text-gray-400">No Photo</span>
                )}
              </td>
              <td className="px-4 py-3">
                {item.notaUrl ? (
                  <a href="#" className="text-blue-600 hover:underline" onClick={e => { e.preventDefault(); setPreviewUrl(item.notaUrl); }}>Photo Nota</a>
                ) : (
                  <span className="text-gray-400">No Photo</span>
                )}
              </td>
              <td className="px-4 py-3">
                {item.status_ops === 'done' ? (
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">Done</span>
                ) : item.status_ops === 'approved_top' ? (
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">Approved Top</span>
                ) : (
                  <span className="bg-gray-300 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">{item.status_ops}</span>
                )}
              </td>
              <td className="px-4 py-3 font-semibold text-gray-800">{item.ops}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      
      {/* Show pagination only if there are more than 5 items */}
      {data.length > 25 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={data.length}
        />
      )}
      
      {previewUrl && <PhotoPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </div>
  );
};

// Tambahkan komponen modal preview photo
function PhotoPreviewModal({ url, onClose }: { url: string, onClose: () => void }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-lg w-full relative" onClick={e => e.stopPropagation()}>
        <button className="absolute top-2 right-2 text-gray-600 hover:text-red-500 text-xl font-bold" onClick={onClose}>&times;</button>
        <img src={url} alt="Preview" className="w-full h-auto max-h-[70vh] object-contain rounded" />
      </div>
    </div>
  );
}


const OpsDetailsPage = () => {
  const [openSections, setOpenSections] = useState<OpenSectionsState>({
    permit: true,
    snd: false,
    cw: false,
    el: false,
    document: false,
    rpm: false,
  });
  const [opsData, setOpsData] = useState({
    permit: [] as TableData[],
    snd: [] as TableData[],
    cw: [] as TableData[],
    el: [] as TableData[],
    document: [] as TableData[],
    rpm: [] as TableData[],
  });
  const [loading, setLoading] = useState(true);
  // Filter state
  const [filters, setFilters] = useState({
    siteId: '',
    region: '',
    city: '',
    siteName: '',
    date: '',
    pic: '',
  });
  // All request_ops with parent info
  const [allRequestOps, setAllRequestOps] = useState<any[]>([]);
  const [userRpmName, setUserRpmName] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllRequestOps = async () => {
      setLoading(true);
      // Fetch all tasks for parent mapping
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      const taskParentMap = new Map();
      tasksSnapshot.docs.forEach(taskDoc => {
        const data = taskDoc.data();
        taskParentMap.set(taskDoc.id, {
          siteId: data.siteId || '',
          region: data.region || '',
          city: data.city || '',
          siteName: data.siteName || '',
          division: (data.division || '').toLowerCase(),
          rpm: data.rpm || '',
        });
      });
      // Fetch all request_ops in one go
      const requestOpsSnapshot = await getDocs(collectionGroup(db, 'request_ops'));
      const allRequestOpsArr = requestOpsSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        // Get parent taskId from docSnap.ref.parent.parent.id
        const parentTaskId = docSnap.ref.parent.parent?.id;
        const parentInfo = parentTaskId ? taskParentMap.get(parentTaskId) || {} : {};
        return {
          ...data,
          requestType: (data.requestType || '').toUpperCase(),
          pic: data.picName || data.pic || '-',
          parent: {
            ...parentInfo,
            date: data.date || '',
            division: (data.division || parentInfo.division || '').toLowerCase(),
            rpm: data.rpm || parentInfo.rpm || '',
          },
          division: (data.division || parentInfo.division || '').toLowerCase(),
        };
      });
      setAllRequestOps(allRequestOpsArr);
      setLoading(false);
    };
    fetchAllRequestOps();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDocs(collection(db, 'users'));
        const userData = userDoc.docs.find((docSnap) => docSnap.id === user.uid)?.data();
        if (userData && userData.name) {
          setUserRpmName(userData.name.toLowerCase());
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Filter logic
  const filteredRequestOps = allRequestOps
    .filter(item => item.status_ops === 'approved_top' || item.status_ops === 'done')
    .filter((item) => {
      const { siteId, region, city, siteName, date, pic } = filters;
      return (
        (!siteId || (item.parent.siteId || '').toLowerCase().includes(siteId.toLowerCase())) &&
        (!region || (item.parent.region || '').toLowerCase().includes(region.toLowerCase())) &&
        (!city || (item.parent.city || '').toLowerCase().includes(city.toLowerCase())) &&
        (!siteName || (item.parent.siteName || '').toLowerCase().includes(siteName.toLowerCase())) &&
        (!date || (item.parent.date || '').includes(date)) &&
        (!pic || (item.pic || '').toLowerCase().includes(pic.toLowerCase()))
      );
    })
    .filter(item => !userRpmName || (item.parent?.rpm && item.parent.rpm.toLowerCase() === userRpmName)); // Filter hanya milik RPM login
  // Group filtered data by division
  const filteredOpsData = {
    permit: filteredRequestOps.filter((item) => item.division === 'permit'),
    snd: filteredRequestOps.filter((item) => item.division === 'snd'),
    cw: filteredRequestOps.filter((item) => item.division === 'cw' || item.division === 'cw'),
    el: filteredRequestOps.filter((item) => item.division === 'el' || item.division === 'el/jointer'),
    document: filteredRequestOps.filter((item) => item.division === 'document'),
    rpm: filteredRequestOps.filter((item) => item.division === 'rpm'),
  };
  // Hitung total dari semua filtered data
  const totalFiltered = [
    ...filteredOpsData.permit,
    ...filteredOpsData.snd,
    ...filteredOpsData.cw,
    ...filteredOpsData.el,
    ...filteredOpsData.document,
    ...filteredOpsData.rpm
  ].reduce((sum, item) => {
    let nominal = item.ops;
    if (typeof nominal === 'string') {
      nominal = Number(nominal.replace(/[^\d]/g, ''));
    }
    return sum + (Number(nominal) || 0);
  }, 0);

  // Helper untuk dapatkan unique value dari array
  function getUnique(arr: any[], key: string) {
    return Array.from(new Set(arr.map(item => (item.parent?.[key] || '').toString()).filter(Boolean)));
  }

  const toggleSection = useCallback((section: keyof OpenSectionsState) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Data for Permit Section
  const permitData: TableData[] = [
    { type: 'Entertain', pic: 'Adit', date: '10/08/2025', total: '150.000' },
    { type: 'BBM', pic: 'Adit', date: '10/08/2025', total: '20.000' },
    { type: 'Soswar', pic: 'Adit', date: '10/08/2025', total: '1.000.000' },
  ];

  // Data for SND Section
  const sndData: TableData[] = [
    { type: 'Pengadaan Material', pic: 'Budi', date: '11/08/2025', total: '2.500.000' },
    { type: 'Sewa Alat', pic: 'Charlie', date: '12/08/2025', total: '800.000' },
  ];

   // Data for cw Section
  const CWData: TableData[] = [
    { type: 'Pengadaan Material', pic: 'Budi', date: '11/08/2025', total: '2.500.000' },
    { type: 'Sewa Alat', pic: 'Charlie', date: '12/08/2025', total: '800.000' },
  ];

  //Data for el Section
  const elData: TableData[] = [
    { type: 'Jasa Penyambungan Kabel', pic: 'Dedi', date: '15/08/2025', total: '1.200.000' },
    { type: 'Sewa Alat Splicer', pic: 'Eka', date: '15/08/2025', total: '450.000' },
    { type: 'Pembelian Material Joint', pic: 'Dedi', date: '16/08/2025', total: '780.000' },
    { type: 'Instalasi ODP', pic: 'Fahmi', date: '17/08/2025', total: '950.000' },
  ];

  // Data for Document Section
  const documentData: TableData[] = [
    { type: 'Fotokopi & Jilid Berkas', pic: 'Gita', date: '18/08/2025', total: '175.000' },
    { type: 'Biaya Legalisir Dokumen', pic: 'Hadi', date: '19/08/2025', total: '300.000' },
    { type: 'Pengiriman Dokumen Tender', pic: 'Gita', date: '20/08/2025', total: '85.000' },
  ];

  // Data for RPM Section
  const rpmData: TableData[] = [
    { type: 'Biaya Rapat Mingguan', pic: 'Indra', date: '21/08/2025', total: '400.000' },
    { type: 'Sewa Ruang Meeting', pic: 'Joko', date: '22/08/2025', total: '750.000' },
    { type: 'Perjalanan Dinas - RPM', pic: 'Indra', date: '23/08/2025', total: '1.500.000' },
  ];

  // Fungsi untuk menggabungkan semua data dan export ke Excel
  const handleExportExcel = () => {
    // Format data sesuai dengan struktur yang diinginkan
    const formattedData = allRequestOps.map(item => ({
      'Activity ID': item.activityId || '-',
      'Site ID': item.parent?.siteId || '-',
      'Site Name': item.parent?.siteName || '-',
      'City': item.parent?.city || '-',
      'Activity Category': item.division || '-',
      'Detail Plan': item.detailPlan || '-',
      'PIC': item.pic || '-',
      'Nominal': item.ops || '-',
      'Request Type': item.requestType || '-',
      'Bank': item.bank || '-',
      'Tanggal Request': item.date || '-',
      'Tanggal Approved': item.date || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'OPS Details');
    
    // Set column widths
    const columnWidths = [
      { wch: 20 }, // Activity ID
      { wch: 15 }, // Site ID
      { wch: 25 }, // Site Name
      { wch: 15 }, // City
      { wch: 20 }, // Activity Category
      { wch: 20 }, // Detail Plan
      { wch: 15 }, // PIC
      { wch: 15 }, // Nominal
      { wch: 20 }, // Request Type
      { wch: 20 }, // Bank
      { wch: 15 }, // Tanggal Request
      { wch: 15 }  // Tanggal Approved
    ];
    worksheet['!cols'] = columnWidths;
    
    XLSX.writeFile(workbook, 'ops_details_rpm.xlsx');
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-sans">
      <Sidebar />
      
      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        <div className="max-w-full mx-auto">
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
                  OPS Dashboard
                </h2>
              </div>
            </div>
          </div>
          {/* Filters Section */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-grow">
                {/* Dropdown Searchable: Site ID */}
                <SearchableDropdown
                  label="Site ID"
                  options={getUnique(allRequestOps, 'siteId')}
                  value={filters.siteId}
                  onChange={(val: string) => setFilters(f => ({ ...f, siteId: val }))}
                />
                {/* Dropdown Searchable: Region */}
                <SearchableDropdown
                  label="Region"
                  options={getUnique(allRequestOps, 'region')}
                  value={filters.region}
                  onChange={(val: string) => setFilters(f => ({ ...f, region: val }))}
                />
                {/* Dropdown Searchable: City */}
                <SearchableDropdown
                  label="City"
                  options={getUnique(allRequestOps, 'city')}
                  value={filters.city}
                  onChange={(val: string) => setFilters(f => ({ ...f, city: val }))}
                />
                {/* Dropdown Searchable: Site Name */}
                <SearchableDropdown
                  label="Site Name"
                  options={getUnique(allRequestOps, 'siteName')}
                  value={filters.siteName}
                  onChange={(val: string) => setFilters(f => ({ ...f, siteName: val }))}
                />
                {/* Date Picker */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date</label>
                  <input
                    type="date"
                    className="border border-gray-200 rounded-md p-2 text-sm w-full bg-white text-gray-700"
                    value={filters.date}
                    onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
                    placeholder="Pilih Date"
                  />
                </div>
                {/* Dropdown Searchable: PIC */}
                <SearchableDropdown
                  label="PIC"
                  options={Array.from(new Set(allRequestOps.map(item => item.pic).filter(Boolean)))}
                  value={filters.pic}
                  onChange={(val: string) => setFilters(f => ({ ...f, pic: val }))}
                />
              </div>
              <div className="flex flex-col items-stretch sm:items-end space-y-3 flex-shrink-0 lg:ml-4">
                <button
                  className="bg-blue-900 hover:bg-[#1e293b] text-white font-bold py-2 px-15 rounded-md whitespace-nowrap"
                  onClick={handleExportExcel}
                >
                  Export Excel
                </button>
                <div className="flex items-center justify-between border border-gray-200 rounded-md py-2 px-3 w-full sm:w-auto min-w-[220px]">
                  <span className="font-semibold text-gray-600">Total</span>
                  <span className="font-bold text-gray-800">{totalFiltered.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Sections */}
          {loading ? (
            <div className="text-center py-10 text-lg text-gray-500">Loading data from database...</div>
          ) : (
            (Object.keys(openSections) as Array<keyof OpenSectionsState>).map((sectionKey) => {
              const title = sectionKey.replace(/([A-Z])/g, ' $1').replace(/^(.)/, (c) => c.toUpperCase());
              const formattedTitle = title === 'Snd' ? 'SND' : title === 'El Jointer' ? 'EL/Jointer' : title.replace('Work', ' Work');
              // Use filteredOpsData for each section
              let sectionData: TableData[] = [];
              if (sectionKey === 'permit') sectionData = filteredOpsData.permit;
              else if (sectionKey === 'snd') sectionData = filteredOpsData.snd;
              else if (sectionKey === 'cw') sectionData = filteredOpsData.cw;
              else if (sectionKey === 'el') sectionData = filteredOpsData.el;
              else if (sectionKey === 'document') sectionData = filteredOpsData.document;
              else if (sectionKey === 'rpm') sectionData = filteredOpsData.rpm;
              return (
                <div key={sectionKey} className="bg-white rounded-lg shadow-sm mb-4">
                  <button 
                    onClick={() => toggleSection(sectionKey)} 
                    className={`w-full flex items-center p-3 bg-blue-900 text-white ${openSections[sectionKey] ? 'rounded-t-lg' : 'rounded-lg'}`}
                  >
                    <ChevronDownIcon className={`w-5 h-5 transition-transform ${openSections[sectionKey] ? 'rotate-180' : ''}`} />
                    <h2 className="font-bold text-sm ml-3">{formattedTitle}</h2>
                  </button>
                  {openSections[sectionKey] && (
                    <DataTable data={sectionData} />
                  )}
                  {openSections[sectionKey] && !['permit', 'snd', 'cw', 'el', 'document', 'rpm'].includes(sectionKey) && (
                    <div className="p-4">
                      <p>Content for {formattedTitle} goes here...</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default OpsDetailsPage;

function SearchableDropdown({ label, options, value, onChange }: { label: string, options: string[], value: string, onChange: (val: string) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close dropdown if click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const filtered = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div
        className="border border-gray-200 rounded-md p-2 text-sm w-full bg-white text-gray-500 cursor-pointer"
        onClick={() => setOpen(true)}
        tabIndex={0}
      >
        {value || `Pilih ${label}`}
      </div>
      {open && (
        <div className="absolute z-10 bg-white border border-gray-200 rounded-md mt-1 w-full max-h-48 overflow-auto shadow-lg">
          <input
            type="text"
            className="w-full p-2 text-sm border-b border-gray-100 focus:outline-none bg-gray-200 text-gray-700 placeholder:text-gray-500"
            placeholder={`Cari ${label}`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            onClick={e => e.stopPropagation()}
          />
          <div>
            {filtered.length === 0 && (
              <div className="p-2 text-gray-400 text-xs">Tidak ada data</div>
            )}
            {filtered.map(opt => (
              <div
                key={opt}
                className={`p-2 hover:bg-blue-100 cursor-pointer text-sm text-gray-800 bg-white ${opt === value ? 'bg-blue-50 font-bold' : ''}`}
                onMouseDown={() => { onChange(opt); setOpen(false); setSearch(''); }}
              >
                {opt}
              </div>
            ))}
            {value && (
              <div
                className="p-2 text-xs text-red-500 cursor-pointer border-t border-gray-100"
                onMouseDown={() => { onChange(''); setOpen(false); setSearch(''); }}
              >
                Hapus filter
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}