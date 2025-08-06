"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { collection, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  civilWork: boolean;
  elJointer: boolean;
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

// Reusable DataTable Component
const DataTable = ({ data }: { data: any[] }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  return (
    <div className="p-4 overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-600">
        <thead className="bg-gray-50 text-gray-500 font-bold">
          <tr>
            <th scope="col" className="px-4 py-3">TYPE OPS</th>
            <th scope="col" className="px-4 py-3">PIC REQ</th>
            <th scope="col" className="px-4 py-3">DATE APPROVED</th>
            <th scope="col" className="px-4 py-3">TRANSFER RECEIPT</th>
            <th scope="col" className="px-4 py-3">NOTA RECEIPT</th>
            <th scope="col" className="px-4 py-3">STATUS</th>
            <th scope="col" className="px-4 py-3">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-800">{item.type}</td>
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
                <button className="text-white bg-green-500 transition-colors p-2 px-5 font-semibold rounded-md">
                  Approve
                </button>
              </td>
              <td className="px-4 py-3 font-semibold text-gray-800">Rp. {item.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

// Accordion Section
function AccordionSection({ title, children, open, onClick }: { title: string, children: React.ReactNode, open: boolean, onClick: () => void }) {
  return (
    <div className="mb-2">
      <button
        className={`w-full flex items-center p-3 bg-blue-900 text-white font-bold rounded-t ${open ? '' : 'rounded-b'} transition-all`}
        onClick={onClick}
      >
        <svg className={`w-4 h-4 mr-2 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        {title}
      </button>
      {open && <div className="bg-white rounded-b shadow p-2">{children}</div>}
    </div>
  );
}

// Table for OPS Data
function OpsTable({ data }: { data: any[] }) {
  // Helper format rupiah
  const formatRupiah = (val: string | number) => {
    const num = typeof val === 'number' ? val : Number((val || '').toString().replace(/[^\d]/g, ''));
    if (!num) return '-';
    return num.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
  };
  return (
    <div className="overflow-x-auto max-w-full">
      <table className="w-full text-sm text-left text-gray-600 min-w-[900px]">
        <thead className="bg-gray-50 text-gray-500 font-bold">
          <tr>
            <th className="px-2 py-2">Activity ID</th>
            <th className="px-2 py-2">Requested By</th>
            <th className="px-2 py-2">Date</th>
            <th className="px-2 py-2">City</th>
            <th className="px-2 py-2">Site ID</th>
            <th className="px-2 py-2">Site Name</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Type Request</th>
            <th className="px-2 py-2">Nominal (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-300 hover:bg-gray-50">
              <td className="px-2 py-2">{item.activityId || '-'}</td>
              <td className="px-2 py-2">{item.picName || item.pic || '-'}</td>
              <td className="px-2 py-2">{item.date || item.parent?.date || '-'}</td>
              <td className="px-2 py-2">{item.parent?.city || '-'}</td>
              <td className="px-2 py-2">{item.parent?.siteId || '-'}</td>
              <td className="px-2 py-2">{item.parent?.siteName || '-'}</td>
              <td className="px-2 py-2 min-w-[110px]">
                {item.status_ops === 'done' ? (
                  <span className="bg-green-500 text-white px-4 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">Done</span>
                ) : item.status_ops === 'approved_top' ? (
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">Approved Top</span>
                ) : (
                  <span className="bg-gray-300 text-gray-700 px-4 py-1 rounded-full text-xs font-bold inline-block text-center whitespace-nowrap">{item.status_ops}</span>
                )}
              </td>
              <td className="px-2 py-2">{item.requestType || '-'}</td>
              <td className="px-2 py-2">{formatRupiah(item.ops)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const OPS_CATEGORIES = [
  'Wifi',
  'HB Tokens',
  'SOSWAR',
  'BBM',
  'ATP',
  'Entertaiment',
  'Express',
  'Month Meeting',
  'Pilox',
  'Stamp Duty',
  'Others',
];

const OpsDetailsPage = () => {
  const [loading, setLoading] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [allRequestOps, setAllRequestOps] = useState<any[]>([]);
  const [openSection, setOpenSection] = useState<string | null>('BBM');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Fungsi fetch data approved_top
  const fetchApprovedTopData = async () => {
      setLoading(true);
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      const allRequestOpsArr: any[] = [];
      for (const taskDoc of tasksSnapshot.docs) {
        const taskData = taskDoc.data();
      // request_ops
        const requestOpsRef = collection(doc(db, 'tasks', taskDoc.id), 'request_ops');
        const requestOpsSnapshot = await getDocs(requestOpsRef);
        requestOpsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
        if (data.status_ops === 'approved_top' || data.status_ops === 'done') {
          allRequestOpsArr.push({
            ...data,
            requestType: (data.requestType || '').toUpperCase(),
            pic: data.picName || data.pic || '-',
            parent: {
              rpm: taskData.rpm || '',
              siteId: taskData.siteId || '',
              region: taskData.region || '',
              city: taskData.city || '',
              siteName: taskData.siteName || '',
              date: data.date || '',
              division: (data.division || '').toLowerCase(),
            },
            division: (data.division || '').toLowerCase(),
          });
        }
      });
      // request_ops_rpm
      const requestOpsRpmRef = collection(doc(db, 'tasks', taskDoc.id), 'request_ops_rpm');
      const requestOpsRpmSnapshot = await getDocs(requestOpsRpmRef);
      requestOpsRpmSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status_ops === 'approved_top' || data.status_ops === 'done') {
          allRequestOpsArr.push({
            ...data,
            requestType: (data.requestType || '').toUpperCase(),
            pic: data.picName || data.pic || '-',
            parent: {
              rpm: taskData.rpm || '',
              siteId: taskData.siteId || '',
              region: taskData.region || '',
              city: taskData.city || '',
              siteName: taskData.siteName || '',
              date: data.date || '',
              division: (data.division || '').toLowerCase(),
            },
            division: (data.division || '').toLowerCase(),
          });
        }
      });
    }
    // request_ops_rpm root
    const requestOpsRpmRootSnapshot = await getDocs(collection(db, 'request_ops_rpm'));
    requestOpsRpmRootSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status_ops === 'approved_top' || data.status_ops === 'done') {
        allRequestOpsArr.push({
          ...data,
          requestType: (data.requestType || '').toUpperCase(),
          pic: data.picName || data.pic || '-',
          parent: {
            rpm: data.rpm || '',
            siteId: data.siteId || '',
            region: data.region || '',
            city: data.city || '',
            siteName: data.siteName || '',
            date: data.date || '',
            division: (data.division || '').toLowerCase(),
          },
          division: (data.division || '').toLowerCase(),
        });
      }
    });
    setAllRequestOps(allRequestOpsArr);
    setLoading(false);
  };

  // Panggil fetch data langsung di useEffect seperti sebelumnya
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      const allRequestOpsArr: any[] = [];
      for (const taskDoc of tasksSnapshot.docs) {
        const taskData = taskDoc.data();
        // request_ops
        const requestOpsRef = collection(doc(db, 'tasks', taskDoc.id), 'request_ops');
        const requestOpsSnapshot = await getDocs(requestOpsRef);
        requestOpsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status_ops === 'approved_top' || data.status_ops === 'done') {
            allRequestOpsArr.push({
              ...data,
              requestType: (data.requestType || '').toUpperCase(),
              pic: data.picName || data.pic || '-',
              parent: {
                rpm: taskData.rpm || '',
                siteId: taskData.siteId || '',
                region: taskData.region || '',
                city: taskData.city || '',
                siteName: taskData.siteName || '',
                date: data.date || '',
                division: (data.division || '').toLowerCase(),
              },
              division: (data.division || '').toLowerCase(),
            });
          }
        });
        // request_ops_rpm
        const requestOpsRpmRef = collection(doc(db, 'tasks', taskDoc.id), 'request_ops_rpm');
        const requestOpsRpmSnapshot = await getDocs(requestOpsRpmRef);
        requestOpsRpmSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status_ops === 'approved_top' || data.status_ops === 'done') {
            allRequestOpsArr.push({
              ...data,
              requestType: (data.requestType || '').toUpperCase(),
              pic: data.picName || data.pic || '-',
              parent: {
                rpm: taskData.rpm || '',
                siteId: taskData.siteId || '',
                region: taskData.region || '',
                city: taskData.city || '',
                siteName: taskData.siteName || '',
                date: data.date || '',
                division: (data.division || '').toLowerCase(),
              },
              division: (data.division || '').toLowerCase(),
            });
          }
        });
      }
      // request_ops_rpm root
      const requestOpsRpmRootSnapshot = await getDocs(collection(db, 'request_ops_rpm'));
      requestOpsRpmRootSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status_ops === 'approved_top' || data.status_ops === 'done') {
          allRequestOpsArr.push({
            ...data,
            requestType: (data.requestType || '').toUpperCase(),
            pic: data.picName || data.pic || '-',
            parent: {
              rpm: data.rpm || '',
              siteId: data.siteId || '',
              region: data.region || '',
              city: data.city || '',
              siteName: data.siteName || '',
              date: data.date || '',
              division: (data.division || '').toLowerCase(),
            },
            division: (data.division || '').toLowerCase(),
          });
        }
      });
      setAllRequestOps(allRequestOpsArr);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Group data per kategori berdasarkan requestType
  const filteredRequestOps = allRequestOps.filter(item => {
    const itemDate = item.parent?.date || item.date || '';
    const isStatusValid = item.status_ops === 'approved_top' || item.status_ops === 'done';
    
    if (!filterStartDate && !filterEndDate) return isStatusValid;
    
    if (filterStartDate && filterEndDate) {
      const startDate = new Date(filterStartDate);
      const endDate = new Date(filterEndDate);
      const itemDateObj = new Date(itemDate);
      return itemDateObj >= startDate && itemDateObj <= endDate && isStatusValid;
    }
    
    if (filterStartDate) {
      const startDate = new Date(filterStartDate);
      const itemDateObj = new Date(itemDate);
      return itemDateObj >= startDate && isStatusValid;
    }
    
    if (filterEndDate) {
      const endDate = new Date(filterEndDate);
      const itemDateObj = new Date(itemDate);
      return itemDateObj <= endDate && isStatusValid;
    }
    
    return isStatusValid;
  });
  const groupedData = OPS_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = filteredRequestOps.filter(item =>
      (item.requestType || '').trim().toUpperCase() === cat.toUpperCase()
    );
    return acc;
  }, {} as Record<string, any[]>);
  const totalFiltered = filteredRequestOps.reduce((sum, item) => sum + Number(item.ops?.replace(/[^\d]/g, '') || 0), 0);

  // Export PDF (dummy, bisa diisi sesuai kebutuhan)
  const handleExportExcel = () => {
    // Format data sesuai dengan struktur yang diinginkan
    const formattedData = filteredRequestOps.map(item => ({
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
      'Bank No': item.bankNo || '-',
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
      { wch: 15 }, // Bank No
      { wch: 15 }, // Tanggal Reques
      { wch: 15 }  // Tanggal Approved
    ];
    worksheet['!cols'] = columnWidths;
    
    XLSX.writeFile(workbook, 'ops_details.xlsx');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans">
      {/* Header baru: Logo dan judul Site Details */}
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
                  Ops Details
                </h2>
              </div>
            </div>
          </div>
      {/* Header lama tetap ada, tapi dibuat responsif */}
      <div className="w-full px-2 sm:px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6 bg-white border border-gray-200 rounded-xl shadow py-2 px-4">
          {/* Bagian input date range */}
          <div className="flex flex-col md:flex-row gap-4 w-full max-w-md">
            <div className="flex flex-col w-full">
              <label className="block text-gray-400 text-lg mb-2">Start Date</label>
              <input
                type="date"
                className="border border-gray-200 rounded-xl px-4 py-4 text-lg bg-white shadow-md text-gray-900 w-full"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                placeholder="dd/mm/yyyy"
              />
            </div>
            <div className="flex flex-col w-full">
              <label className="block text-gray-400 text-lg mb-2">End Date</label>
              <input
                type="date"
                className="border border-gray-200 rounded-xl px-4 py-4 text-lg bg-white shadow-md text-gray-900 w-full"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                placeholder="dd/mm/yyyy"
              />
            </div>
          </div>
          {/* Bagian tombol Export dan Total */}
          <div className="flex flex-col items-center md:items-end">
            <button
              className="bg-blue-900 text-white px-10 py-4 rounded-xl font-bold text-xl shadow w-full md:w-[350px] transition hover:bg-blue-800"
              onClick={handleExportExcel}
            >
              Export Excel
            </button>
            <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 font-bold text-lg text-gray-800 flex flex-row justify-between items-center shadow mt-3 w-full md:w-[350px]">
              <span className="text-gray-500 text-xl">Total</span>
              <span className="text-2xl text-black">Rp. {totalFiltered.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
        {/* Accordion per kategori berdasarkan requestType */}
        {OPS_CATEGORIES.map(cat => (
          <AccordionSection
            key={cat}
            title={cat}
            open={openSection === cat}
            onClick={() => setOpenSection(openSection === cat ? '' : cat)}
          >
            <OpsTable data={groupedData[cat] || []} />
          </AccordionSection>
        ))}
      </div>
      {/* Bottom padding */}
      <div className="pb-8"></div>
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
        className="border border-gray-200 rounded-md p-2 text-sm w-full bg-gray text-gray-500 cursor-pointer"
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