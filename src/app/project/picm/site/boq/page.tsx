"use client";

import React, { useRef, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import { useSidebar } from "@/context/SidebarContext";
import BOQDetailsModal from "../details/BOQDetailsModal";
import * as XLSX from "xlsx";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, where, Timestamp } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

// Define types for table data
interface BOQItem {
  no: number;
  city: string;
  siteId: string;
  siteName: string;
  drmHp: number;
  abdHp: number;
  beforeDrmBoq: string;
  afterDrmBoq: string;
  constDoneBoq: string;
  abdBoq: string;
}

const BOQDetailsPage = () => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, user } = useSidebar();

  // State for form inputs
  const [city, setCity] = useState("");
  const [siteIdSiteName, setSiteIdSiteName] = useState("");
  const [drmHp, setDrmHp] = useState("");
  const [abdHp, setAbdHp] = useState("");

  // Modal state for BOQ details
  const [isBOQModalOpen, setIsBOQModalOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Tambahan state untuk jenis BOQ dan hasil parsing excel
  const [boqType, setBoqType] = useState("");
  const [parsedExcel, setParsedExcel] = useState<any[]>([]);

  // State untuk dropdown city & site
  const [cities, setCities] = useState<string[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [filteredSites, setFilteredSites] = useState<any[]>([]);

  // State untuk data upload
  const [uploadedBOQFiles, setUploadedBOQFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // State untuk modal detail BOQ status
  const [openDetail, setOpenDetail] = useState<{id: string, status: string} | null>(null);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  // State untuk modal logs
  const [logsModal, setLogsModal] = useState<{siteId: string, siteName: string} | null>(null);
  const [logsData, setLogsData] = useState<any[]>([]);

  // State untuk modal compare
  const [compareModal, setCompareModal] = useState<any | null>(null);
  const [compareStatus, setCompareStatus] = useState<string>("ABD BOQ"); // default
  const [compareStatus2, setCompareStatus2] = useState<string>("Before DRM BOQ"); // default

  // Handler untuk open detail modal
  const handleOpenDetail = (item: any, status: string) => {
    // Filter items sesuai status
    const statusKey =
      status === "Before DRM BOQ" ? "beforeDrmBoq" :
      status === "After DRM BOQ" ? "afterDrmBoq" :
      status === "Construction Done BOQ" ? "constDoneBoq" :
      status === "ABD BOQ" ? "abdBoq" : "";
    const filtered = (item.items || []).filter((row: any) => row[statusKey]);
    setDetailItems(filtered);
    setOpenDetail({ id: item.id, status });
  };
  const handleCloseDetail = () => {
    setOpenDetail(null);
    setDetailItems([]);
  };

  // Handler untuk open logs modal
  const handleOpenLogs = async (siteId: string, siteName: string) => {
    setLogsModal({ siteId, siteName });
    // Fetch logs dari boq_logs
    const q = query(collection(db, "boq_logs"), where("siteId", "==", siteId));
    const snap = await getDocs(q);
    const logs = snap.docs.map(doc => doc.data());
    // Urutkan dari terbaru ke terlama
    logs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setLogsData(logs);
  };
  const handleCloseLogs = () => {
    setLogsModal(null);
    setLogsData([]);
  };

  // Handler untuk open compare modal
  const handleOpenCompare = (item: any) => {
    // Gabungkan semua status berdasarkan materialCode
    const allRows: Record<string, any> = {};
    ["beforeDrmBoq", "afterDrmBoq", "constDoneBoq", "abdBoq"].forEach((statusKey) => {
      (item[statusKey] || []).forEach((row: any) => {
        const code = row.materialCode || row.materialName;
        if (!allRows[code]) {
          allRows[code] = {
            materialName: row.materialName,
            materialCode: row.materialCode,
            beforeDrmBoq: "",
            afterDrmBoq: "",
            constDoneBoq: "",
            abdBoq: "",
          };
        }
        allRows[code][statusKey] = row[statusKey] || "";
      });
    });
    setCompareModal({
      siteId: item.siteId,
      siteName: item.siteName,
      rows: Object.values(allRows),
    });
    setCompareStatus("ABD BOQ"); // default status1
    setCompareStatus2("Before DRM BOQ"); // default status2
  };
  const handleCloseCompare = () => setCompareModal(null);

  // Sample table data (can be replaced with dynamic data from Firebase)
  const [boqData, setBoqData] = useState<BOQItem[]>([
    {
      no: 1,
      city: "Tangerang",
      siteId: "EZATNG250722001",
      siteName: "TANGERANG RW 1",
      drmHp: 200,
      abdHp: 300,
      beforeDrmBoq: "BOQ.xls",
      afterDrmBoq: "BOQ.xls",
      constDoneBoq: "BOQ.xls",
      abdBoq: "Redline.pdf",
    },
    {
      no: 2,
      city: "Tangerang",
      siteId: "EZATNG250722001",
      siteName: "TANGERANG RW 1",
      drmHp: 300,
      abdHp: 300,
      beforeDrmBoq: "BOQ.xls",
      afterDrmBoq: "BOQ.xls",
      constDoneBoq: "BOQ.xls",
      abdBoq: "Redline.pdf",
    },
    // Add more sample data as needed
  ]);

  // File upload state and handler
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  const handlePdfButtonClick = () => {
    pdfInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };
  const handlePdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedPdf(file);
    }
  };

  // Handler baru untuk upload excel dan parsing
  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Ambil semua data sebagai array
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      // Ambil hanya row 15 sampai 221 (index 14 sampai 220)
      const dataRows = (rows as any[]).slice(14, 221);
      // Kolom N = index 13, Kolom D = index 3
      const parsed = dataRows
        .map((row) => ({
          materialName: row[14] || "", // kolom O
          materialCode: row[13] || "",
          beforeDrmBoq: boqType === "Before DRM BOQ" ? row[3] || "" : "",
          afterDrmBoq: boqType === "After DRM BOQ" ? row[3] || "" : "",
          constDoneBoq: boqType === "Construction Done BOQ" ? row[3] || "" : "",
          abdBoq: boqType === "ABD BOQ" ? row[3] || "" : "",
        }))
        .filter(row => row.beforeDrmBoq || row.afterDrmBoq || row.constDoneBoq || row.abdBoq)
        .map((row, idx) => ({ ...row, no: idx + 1 })); // nomor otomatis
      setParsedExcel(parsed);
    };
    reader.readAsArrayBuffer(file);
  };

  // Fetch city & site dari Firestore
  React.useEffect(() => {
    const fetchSites = async () => {
      const q = collection(db, "site");
      const snap = await getDocs(q);
      const allSites = snap.docs.map(doc => doc.data());
      setSites(allSites);
      setCities([...new Set(allSites.map((s:any) => s.city).filter(Boolean))]);
    };
    fetchSites();
    fetchUploadedBOQFiles();
    // Tidak return JSX, hanya void
  }, []);

  // Filter site berdasarkan city
  React.useEffect(() => {
    setFilteredSites(sites.filter((s:any) => s.city === city));
  }, [city, sites]);

  // Fetch data upload dari Firestore
  const fetchUploadedBOQFiles = async () => {
    const q = collection(db, "boq_files");
    const snap = await getDocs(q);
    setUploadedBOQFiles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // Handler upload ke Firestore
  const handleUploadToFirestore = async () => {
    if (!city || !siteIdSiteName || !drmHp || !abdHp || !boqType || parsedExcel.length === 0) {
      alert("Lengkapi semua field dan upload file excel!");
      return;
    }
    setUploading(true);
    try {
      const selectedSite = filteredSites.find((s:any) => s.siteName === siteIdSiteName);
      let excelUrl = "";
      let pdfUrl = "";
      // Upload Excel ke storage
      if (uploadedFile) {
        const excelPath = `boq_files/${selectedSite?.siteId || siteIdSiteName}/${boqType}/excel_${Date.now()}_${uploadedFile.name}`;
        const excelStorageRef = storageRef(storage, excelPath);
        await uploadBytes(excelStorageRef, uploadedFile);
        excelUrl = await getDownloadURL(excelStorageRef);
      }
      // Upload PDF ke storage jika Construction Done BOQ
      if (boqType === "Construction Done BOQ" && uploadedPdf) {
        const pdfPath = `boq_files/${selectedSite?.siteId || siteIdSiteName}/${boqType}/pdf_${Date.now()}_${uploadedPdf.name}`;
        const pdfStorageRef = storageRef(storage, pdfPath);
        await uploadBytes(pdfStorageRef, uploadedPdf);
        pdfUrl = await getDownloadURL(pdfStorageRef);
      }
      // Build docData tanpa field undefined
      const docData: any = {
        city,
        siteId: selectedSite?.siteId || "",
        siteName: siteIdSiteName,
        drmHp,
        abdHp,
        boqType,
        items: parsedExcel,
        uploadBy: user?.name || "User",
        createdAt: Timestamp.now(),
        ...(excelUrl ? { excelUrl } : {}),
        ...(pdfUrl ? { pdfUrl } : {}),
      };
      await addDoc(collection(db, "boq_files"), docData);
      // Simpan log ke boq_logs (hanya field penting)
      await addDoc(collection(db, "boq_logs"), {
        city,
        siteId: selectedSite?.siteId || "",
        siteName: siteIdSiteName,
        boqType,
        uploadBy: user?.name || "User",
        createdAt: Timestamp.now(),
        action: "upload",
      });
      setParsedExcel([]);
      setUploadedFile(null);
      setUploadedPdf(null);
      alert("Upload berhasil!");
      fetchUploadedBOQFiles();
    } catch (err) {
      alert("Upload gagal: " + err);
    } finally {
      setUploading(false);
    }
  };

  // Untuk preview: cek status mana saja yang ada datanya di hasil parsing
  const previewStatusKeys = [
    { key: "beforeDrmBoq", label: "Before DRM BOQ" },
    { key: "afterDrmBoq", label: "After DRM BOQ" },
    { key: "constDoneBoq", label: "Construction Done BOQ" },
    { key: "abdBoq", label: "ABD BOQ" },
  ].filter(({ key }) => parsedExcel.some(row => row[key]));

  // Untuk tabel bawah: merge upload dengan siteName sama
  const mergedBOQFiles = React.useMemo(() => {
    const map = new Map();
    for (const item of uploadedBOQFiles) {
      const key = `${item.city}||${item.siteName}`;
      if (!map.has(key)) {
        map.set(key, {
          ...item,
          beforeDrmBoq: null,
          afterDrmBoq: null,
          constDoneBoq: null,
          abdBoq: null,
          uploadBy: item.uploadBy,
          createdAt: item.createdAt,
        });
      }
      const row = map.get(key);
      if (item.boqType === "Before DRM BOQ") row.beforeDrmBoq = item.items;
      if (item.boqType === "After DRM BOQ") row.afterDrmBoq = item.items;
      if (item.boqType === "Construction Done BOQ") {
        row.constDoneBoq = item.items;
        row.pdfUrl = item.pdfUrl;
        row.excelUrl = item.excelUrl;
      }
      if (item.boqType === "ABD BOQ") row.abdBoq = item.items;
      // Untuk uploadBy dan createdAt, ambil yang terbaru
      if (item.createdAt && (!row.createdAt || item.createdAt.seconds > row.createdAt.seconds)) {
        row.uploadBy = item.uploadBy;
        row.createdAt = item.createdAt;
        row.drmHp = item.drmHp;
        row.abdHp = item.abdHp;
        if (item.pdfUrl) row.pdfUrl = item.pdfUrl;
        if (item.excelUrl) row.excelUrl = item.excelUrl;
      }
    }
    return Array.from(map.values());
  }, [uploadedBOQFiles]);

  const storage = getStorage();

  // State filter city untuk tabel bawah
  const [filterCity, setFilterCity] = useState<string>("");
  const [searchSiteName, setSearchSiteName] = useState<string>("");

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar
      />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1920px] mx-auto">
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
                  UPLOAD BOQ
                </h2>
              </div>
            </div>
          </div>

          {/* Gabungan Form Input & Upload Section - Redesain modern */}
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl mx-auto mb-8">
            <h2 className="text-2xl font-bold text-[#124688] mb-6 flex items-center gap-3">
              <span className="inline-block bg-blue-100 text-blue-700 rounded-full p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
              </span>
              Upload BOQ File
            </h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                <select
                  value={city}
                  onChange={e => { setCity(e.target.value); setSiteIdSiteName(""); }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 text-black"
                >
                  <option value="">Pilih City</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Site Name</label>
                <select
                  value={siteIdSiteName}
                  onChange={e => setSiteIdSiteName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 text-black"
                  disabled={!city}
                >
                  <option value="">Pilih Site Name</option>
                  {filteredSites.map((s:any) => (
                    <option key={s.siteName} value={s.siteName}>{s.siteName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">DRM HP</label>
                <input
                  type="text"
                  value={drmHp}
                  onChange={(e) => setDrmHp(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="Enter DRM HP"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ABD HP</label>
                <input
                  type="text"
                  value={abdHp}
                  onChange={(e) => setAbdHp(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="Enter ABD HP"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jenis BOQ</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 text-black"
                  value={boqType}
                  onChange={e => setBoqType(e.target.value)}
                >
                  <option value="">Pilih Jenis BOQ</option>
                  <option value="Before DRM BOQ">Before DRM BOQ</option>
                  <option value="After DRM BOQ">After DRM BOQ</option>
                  <option value="Construction Done BOQ">Construction Done BOQ</option>
                  <option value="ABD BOQ">ABD BOQ</option>
                </select>
            </div>
              <div className="md:col-span-2 flex flex-col items-center justify-center border-2 border-dashed border-blue-400 rounded-xl bg-blue-50 py-8 mt-2">
                {/* Upload Excel */}
            <button
              type="button"
                  className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition mb-2"
              onClick={handleButtonClick}
                  disabled={!boqType}
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
                  Upload File Excel
            </button>
            <input
              type="file"
              ref={fileInputRef}
                  onChange={handleExcelUpload}
              className="hidden"
                  accept=".xlsx,.xls"
            />
            {uploadedFile && (
                  <span className="mt-2 text-sm text-gray-600">{uploadedFile.name}</span>
                )}
                {/* Upload PDF jika Construction Done BOQ */}
                {boqType === "Construction Done BOQ" && (
                  <>
                    <button
                      type="button"
                      className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition mt-4"
                      onClick={handlePdfButtonClick}
                    >
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
                      Upload File PDF
                    </button>
                    <input
                      type="file"
                      ref={pdfInputRef}
                      onChange={handlePdfChange}
                      className="hidden"
                      accept=".pdf"
                    />
                    {uploadedPdf && (
                      <span className="mt-2 text-sm text-gray-600">{uploadedPdf.name}</span>
                    )}
                  </>
                )}
              </div>
            </form>
          </div>

          {/* Preview hasil parsing excel */}
          {parsedExcel.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mt-6">
              <h3 className="text-lg font-bold mb-4 text-black">Preview</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
                <table className="min-w-full divide-y divide-gray-300 border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-indigo-900 text-white">
                      <th className="p-2 border border-gray-300 text-sm font-semibold text-center">No</th>
                      <th className="p-2 border border-gray-300 text-sm font-semibold text-center">Material Name</th>
                      <th className="p-2 border border-gray-300 text-sm font-semibold text-center">Material Code</th>
                      {previewStatusKeys.map(({ label }) => (
                        <th key={label} className="p-2 border border-gray-300 text-sm font-semibold text-center">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {parsedExcel.map((row, idx) => (
                      <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b`}>
                        <td className="p-2 text-center border border-gray-300 text-black">{row.no}</td>
                        <td className="p-2 text-center border border-gray-300 text-black">{row.materialName}</td>
                        <td className="p-2 text-center border border-gray-300 text-black">{row.materialCode}</td>
                        {previewStatusKeys.map(({ key }) => (
                          <td key={key} className="p-2 text-center border border-gray-300 text-black">{row[key]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Tombol Upload ke Firestore */}
              <div className="flex justify-end mt-4">
                <button
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200"
                  onClick={handleUploadToFirestore}
                  disabled={uploading || !uploadedFile || (boqType === "Construction Done BOQ" && !uploadedPdf)}
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          )}

          {/* Table Section: Data upload dari Firestore */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mt-6">
            <h3 className="text-lg font-bold mb-4 text-black">History Upload BOQ</h3>
            {/* Filter City & Search Site Name */}
            <div className="mb-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="font-semibold text-gray-700">Filter by City</label>
                <select
                  value={filterCity}
                  onChange={e => setFilterCity(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-base text-black"
                >
                  <option value="">All Cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="font-semibold text-gray-700">Site Name</label>
                <input
                  type="text"
                  value={searchSiteName}
                  onChange={e => setSearchSiteName(e.target.value)}
                  placeholder="Search"
                  className="border border-gray-300 rounded px-3 py-2 text-base text-black"
                />
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
              <table className="min-w-full divide-y divide-gray-300 border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-indigo-900 text-white">
                    <th className="p-2 border border-gray-300 text-sm font-semibold text-center">No</th>
                    <th className="p-2 border border-gray-300 text-sm font-semibold text-center">City</th>
                    <th className="p-2 border border-gray-300 text-sm font-semibold text-center">Site Name</th>
                    <th className="p-2 border border-gray-300 text-sm font-semibold text-center">DRM HP</th>
                    <th className="p-2 border border-gray-300 text-sm font-semibold text-center">ABD HP</th>
                    <th className="p-2 border border-gray-300 text-sm font-semibold text-center">Before DRM BOQ</th>
                    <th className="p-2 border border-gray-300 text-sm font-semibold text-center">After DRM BOQ</th>
                    <th className="p-2 border border-gray-300 text-sm font-semibold text-center">Construction Done BOQ</th>
                    <th className="p-2 border border-gray-300 text-sm font-semibold text-center">ABD BOQ</th>
                    <th className="p-2 border border-gray-300 text-sm font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {mergedBOQFiles
                    .filter(item => (!filterCity || item.city === filterCity) && (!searchSiteName || item.siteName.toLowerCase().includes(searchSiteName.toLowerCase())))
                    .map((item, idx) => (
                    <tr key={item.siteName + item.city} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b`}>
                      <td className="p-2 text-center border border-gray-300 text-black">{idx + 1}</td>
                      <td className="p-2 text-center border border-gray-300 text-black">{item.city}</td>
                      <td className="p-2 text-center border border-gray-300 text-black">{item.siteName}</td>
                      <td className="p-2 text-center border border-gray-300 text-black">{item.drmHp}</td>
                      <td className="p-2 text-center border border-gray-300 text-black">{item.abdHp}</td>
                      {['beforeDrmBoq','afterDrmBoq','constDoneBoq','abdBoq'].map(statusKey => {
                        const hasData = Array.isArray(item[statusKey]) && item[statusKey].length > 0;
                        const statusLabel =
                          statusKey === "beforeDrmBoq" ? "Before DRM BOQ" :
                          statusKey === "afterDrmBoq" ? "After DRM BOQ" :
                          statusKey === "constDoneBoq" ? "Construction Done BOQ" :
                          statusKey === "abdBoq" ? "ABD BOQ" : "";
                        // Link download file
                        let fileUrl = undefined;
                        if (statusKey === "constDoneBoq" && item.pdfUrl) {
                          fileUrl = item.pdfUrl;
                        } else if (statusKey !== "constDoneBoq" && item.excelUrl) {
                          fileUrl = item.excelUrl;
                        }
                        return (
                          <td key={statusKey} className="p-2 text-center border border-gray-300">
                            {/* Open dan Download Excel hanya jika ada data */}
                            {hasData && (
                              <>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs cursor-pointer select-none inline-block"
                                  onClick={() => handleOpenDetail({ ...item, items: item[statusKey], id: item.id }, statusLabel)}
                                  onKeyPress={e => { if (e.key === 'Enter') handleOpenDetail({ ...item, items: item[statusKey], id: item.id }, statusLabel); }}
                                >
                                  Open
                                </span>
                                {/* Download Excel untuk status lain */}
                                {statusKey !== "constDoneBoq" && fileUrl && (
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 text-blue-700 underline text-xs font-semibold"
                                    download
                                  >
                                    BOQ File
                                  </a>
                                )}
                                {/* Download Excel di Construction Done BOQ jika ada data dan file Excel */}
                                {statusKey === "constDoneBoq" && item.excelUrl && (
                                  <a
                                    href={item.excelUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 text-blue-700 underline text-xs font-semibold"
                                    download
                                  >
                                    BOQ File
                                  </a>
                                )}
                              </>
                            )}
                            {/* Download PDF di Construction Done BOQ jika ada file, tanpa cek hasData */}
                            {statusKey === "constDoneBoq" && item.pdfUrl && (
                              <a
                                href={item.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-blue-700 underline text-xs font-semibold"
                                download
                              >
                                Redline
                              </a>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-2 text-center border border-gray-300">
                        <div className="flex justify-center gap-2">
                          <button
                            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition duration-200 text-xs font-semibold"
                            onClick={() => handleOpenCompare(item)}
                          >
                            Compare
                          </button>
                          <button
                            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition duration-200 text-xs font-semibold"
                            onClick={() => handleOpenLogs(item.siteId, item.siteName)}
                          >
                            Logs
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Modal detail BOQ status */}
            {openDetail && (
              <div
                className="fixed inset-0 z-50 flex items-stretch justify-center bg-white bg-opacity-30 backdrop-blur-sm"
                onClick={handleCloseDetail}
              >
                <div
                  className="bg-white rounded-xl shadow-lg w-full max-w-[900px] h-[90vh] flex flex-col relative p-12"
                  style={{ minWidth: 700 }}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    className="absolute top-6 right-8 text-gray-500 hover:text-gray-700 text-3xl"
                    onClick={handleCloseDetail}
                  >
                    &times;
                  </button>
                  <h1 className="text-4xl font-extrabold mb-8 text-black">BOQ Detail</h1>
                  <input
                    type="text"
                    placeholder="Search Material Item"
                    value={search || ""}
                    onChange={e => setSearch(e.target.value)}
                    className="mb-6 w-full border border-gray-300 rounded px-3 py-2 text-gray-800 bg-white text-base"
                  />
                  <div className="bg-blue-900 text-white rounded-t-xl px-8 py-4 font-bold text-lg flex items-center justify-end mb-0">
                    <span className="w-full text-center text-base font-semibold tracking-wide">
                      {openDetail.status} - {uploadedBOQFiles.find(f => f.id === openDetail.id)?.siteId || "-"}
                    </span>
                  </div>
                  <div className="overflow-x-auto flex-1">
                    <table className="min-w-full border border-gray-300 rounded-b-xl text-base">
                      <thead>
                        <tr className="bg-white text-black text-left text-base">
                          <th className="px-4 py-2 border-b">NO</th>
                          <th className="px-4 py-2 border-b">MATERIAL ITEM</th>
                          <th className="px-4 py-2 border-b">MATERIAL CODE</th>
                          <th className="px-4 py-2 border-b">QUANTITY</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(search ? detailItems.filter(row => row.materialName?.toLowerCase().includes(search.toLowerCase())) : detailItems).map((row, idx) => {
                          const statusKey =
                            openDetail.status === "Before DRM BOQ" ? "beforeDrmBoq" :
                            openDetail.status === "After DRM BOQ" ? "afterDrmBoq" :
                            openDetail.status === "Construction Done BOQ" ? "constDoneBoq" :
                            openDetail.status === "ABD BOQ" ? "abdBoq" : "";
                          return (
                            <tr key={idx} className="bg-white text-black text-base">
                              <td className="px-4 py-2 border-b">{idx + 1}</td>
                              <td className="px-4 py-2 border-b">{row.materialName}</td>
                              <td className="px-4 py-2 border-b">{row.materialCode}</td>
                              <td className="px-4 py-2 border-b">{row[statusKey]}</td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td colSpan={4} className="h-24 bg-white"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* BOQ Details Modal */}
        {selectedSiteId && (
          <BOQDetailsModal
            isOpen={isBOQModalOpen}
            onClose={() => setIsBOQModalOpen(false)}
            siteId={selectedSiteId}
          />
        )}
        {/* Modal logs BOQ */}
        {logsModal && (
          <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-white bg-opacity-30 backdrop-blur-sm" onClick={handleCloseLogs}>
            <div className="bg-white rounded-xl shadow-lg w-full max-w-[600px] h-[80vh] flex flex-col relative p-8" style={{ minWidth: 400 }} onClick={e => e.stopPropagation()}>
              <button className="absolute top-4 right-6 text-gray-500 hover:text-gray-700 text-2xl" onClick={handleCloseLogs}>&times;</button>
              <h1 className="text-2xl font-extrabold mb-6 text-black text-center">BOQ Logs<br/><span className='text-base font-semibold'>{logsModal.siteId} - {logsModal.siteName}</span></h1>
              <div className="overflow-x-auto flex-1">
                <table className="min-w-full border border-gray-300 rounded-b-xl text-base">
                  <thead>
                    <tr className="bg-blue-900 text-white text-center text-base">
                      <th className="px-4 py-2 border-b">No</th>
                      <th className="px-4 py-2 border-b">BOQ Type</th>
                      <th className="px-4 py-2 border-b">Action</th>
                      <th className="px-4 py-2 border-b">Upload By</th>
                      <th className="px-4 py-2 border-b">Datetime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsData.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-6 text-gray-400">No logs</td></tr>
                    ) : logsData.map((log, idx) => (
                      <tr key={idx} className="bg-white text-black text-base">
                        <td className="px-4 py-2 border-b text-center">{idx + 1}</td>
                        <td className="px-4 py-2 border-b text-center">{log.boqType}</td>
                        <td className="px-4 py-2 border-b text-center">{log.action}</td>
                        <td className="px-4 py-2 border-b text-center">{log.uploadBy}</td>
                        <td className="px-4 py-2 border-b text-center">{log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* Modal compare BOQ */}
        {compareModal && (
          <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-white bg-opacity-30 backdrop-blur-sm" onClick={handleCloseCompare}>
            <div className="bg-white rounded-xl shadow-lg w-full max-w-[1100px] h-[90vh] flex flex-col relative p-12" style={{ minWidth: 800 }} onClick={e => e.stopPropagation()}>
              <button className="absolute top-6 right-8 text-gray-500 hover:text-gray-700 text-3xl" onClick={handleCloseCompare}>&times;</button>
              <h1 className="text-4xl font-extrabold mb-8 text-black">BOQ Compare</h1>
              <div className="flex items-center gap-4 mb-6 flex-wrap">
                <span className="font-semibold text-lg text-black">GAP = </span>
                <select value={compareStatus} onChange={e => setCompareStatus(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-base text-black">
                  <option value="ABD BOQ">ABD BOQ</option>
                  <option value="Construction Done BOQ">Construction Done BOQ</option>
                  <option value="After DRM BOQ">After DRM BOQ</option>
                  <option value="Before DRM BOQ">Before DRM BOQ</option>
                </select>
                <span className="text-base">-</span>
                <select value={compareStatus2} onChange={e => setCompareStatus2(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-base text-black">
                  <option value="ABD BOQ">ABD BOQ</option>
                  <option value="Construction Done BOQ">Construction Done BOQ</option>
                  <option value="After DRM BOQ">After DRM BOQ</option>
                  <option value="Before DRM BOQ">Before DRM BOQ</option>
                </select>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="min-w-full border border-gray-300 rounded-b-xl text-base">
                  <thead>
                    <tr className="bg-blue-900 text-white text-center text-base">
                      <th className="px-4 py-2 border-b">No</th>
                      <th className="px-4 py-2 border-b">Material Item</th>
                      <th className="px-4 py-2 border-b">Material Code</th>
                      <th className="px-4 py-2 border-b">Before DRM BOQ</th>
                      <th className="px-4 py-2 border-b">After DRM BOQ</th>
                      <th className="px-4 py-2 border-b">Construction Done BOQ</th>
                      <th className="px-4 py-2 border-b">ABD BOQ</th>
                      <th className="px-4 py-2 border-b">GAP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareModal.rows.map((row: any, idx: number) => {
                      const val = (status: string) => {
                        if (status === "ABD BOQ") return parseFloat(row.abdBoq) || 0;
                        if (status === "Construction Done BOQ") return parseFloat(row.constDoneBoq) || 0;
                        if (status === "After DRM BOQ") return parseFloat(row.afterDrmBoq) || 0;
                        if (status === "Before DRM BOQ") return parseFloat(row.beforeDrmBoq) || 0;
                        return 0;
                      };
                      const gap = val(compareStatus) - val(compareStatus2);
                      return (
                        <tr key={idx} className="bg-white text-black text-base">
                          <td className="px-4 py-2 border-b text-center">{idx + 1}</td>
                          <td className="px-4 py-2 border-b">{row.materialName}</td>
                          <td className="px-4 py-2 border-b text-center">{row.materialCode}</td>
                          <td className="px-4 py-2 border-b text-center">{row.beforeDrmBoq}</td>
                          <td className="px-4 py-2 border-b text-center">{row.afterDrmBoq}</td>
                          <td className="px-4 py-2 border-b text-center">{row.constDoneBoq}</td>
                          <td className="px-4 py-2 border-b text-center">{row.abdBoq}</td>
                          <td className="px-4 py-2 border-b text-center font-bold">{gap}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td colSpan={8} className="h-24 bg-white"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BOQDetailsPage;