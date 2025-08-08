  "use client";

import React, { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc } from "firebase/firestore";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';


import Sidebar from "@/app/components/Sidebar";
import { useSidebar } from "@/context/SidebarContext";

// ChevronDown Icon
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m19.5 8.25-7.5 7.5-7.5-7.5"
    />
  </svg>
);

// Define types for state and data
interface OpenSectionsState {
  [key: string]: boolean;
}

interface SectionData {
  title: string;
  status: string;
  color: string;
  photoCount: string;
  images: { src: string; remark: string }[];
  division: string; // New field to associate task with division
}

// Add type for site
interface SiteInfo {
  siteId: string;
  siteName: string;
  region: string;
  city: string;
}

// Add a helper to check if a file is an image
const isImageFile = (fileNameOrUrl: string) => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileNameOrUrl);
// Add a helper to check if a file is a PDF
const isPdfFile = (fileNameOrUrl: string) => /\.pdf$/i.test(fileNameOrUrl);

// Add a generic file icon SVG
const FileIcon = () => (
  <svg width="64" height="64" fill="none" viewBox="0 0 24 24">
    <rect x="4" y="2" width="16" height="20" rx="2" fill="#e5e7eb"/>
    <path d="M8 2v4a2 2 0 0 0 2 2h4" fill="#cbd5e1"/>
    <rect x="7" y="14" width="10" height="2" rx="1" fill="#94a3b8"/>
    <rect x="7" y="10" width="10" height="2" rx="1" fill="#94a3b8"/>
  </svg>
);

const SitePreviewContent = () => {
  // Sidebar and navigation
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, user } = useSidebar();
  const searchParams = useSearchParams();
  const siteIdParam = searchParams.get('siteId');
  const siteNameParam = searchParams.get('siteName');
  const divisionParam = searchParams.get('division');
  const validDivisions = ["PERMIT", "SND", "CW", "EL", "Document", "Material"];
  const initialDivision = divisionParam && validDivisions.includes(divisionParam) ? divisionParam : "PERMIT";
  const [activeDivision, setActiveDivision] = useState<string>(initialDivision);
  const [isOpen, setIsOpen] = useState<OpenSectionsState>({
    visit: true, baopen: true, bareject: true, bak: true, pks: true, bap: true, boundaries: true, sndkosar: true, validasisales: true, donationsubmit: true, skom: true, survey: true, kmz: true, boq: true, dwg: true, hpdb: true, tssr: true, drmapproval: true, abd: true, apdapproved: true, digginghole: true, atp: true, pullingcable: true, installfat: true, installfdt: true, installacc: true, polefoundation: true, subfeeder: true, osp: true, ehs: true, opmtest: true, rfstest: true, rfs: true, cw: true, elopm: true, opname: true, rfscertificate: true, cwcertificate: true, elcertificate: true, faccertificate: true, requestdo: true, dorelease: true, pole: true, cable: true, fat: true, fdt: true, accesories: true,
  });
  // Section/file upload states
  const [selectedFiles, setSelectedFiles] = useState<{[key: string]: File | null}>({});
  const [uploadTarget, setUploadTarget] = useState<{sectionKey: string, imgIndex: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const uploadCardRef = useRef<HTMLDivElement>(null);
  const [sectionUploads, setSectionUploads] = useState<{ [sectionKey: string]: { file: File; details: string; remark: string }[] }>({});
  const [pendingUpload, setPendingUpload] = useState<{ [sectionKey: string]: { file: File; details: string; remark: string } | null }>({});
  const [pendingReplace, setPendingReplace] = useState<{ [sectionKey: string]: { idx: number; file: File; details: string; remark: string } | null }>({});
  const [modal, setModal] = useState<null | { type: 'upload' | 'replace', sectionKey: string, idx?: number }>(null);
  // Site filter/search states
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedSiteName, setSelectedSiteName] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [citySearch, setCitySearch] = useState("");
  const [regionSearch, setRegionSearch] = useState("");
  const [siteNameSearch, setSiteNameSearch] = useState("");
  const [siteIdSearch, setSiteIdSearch] = useState("");
  // Task info for selected site
  const [taskInfo, setTaskInfo] = useState<any>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  // Add state for selectedSectionDivision
  const [selectedSectionDivision, setSelectedSectionDivision] = useState<string>(initialDivision);
  // Add state to store uploaded sections from Firestore
  type UploadedSection = {
    section: string;
    fileUrl: string;
    fileName: string;
    details: string;
    remark: string;
    division: string;
    uploadedAt: any;
    storagePath: string;
    uploadBy?: string;
    status_task?: string; // New field for status from task
  };
  const [uploadedSections, setUploadedSections] = useState<UploadedSection[]>([]);

  // Add state for BOQ data
  interface BOQFileData {
    id: string;
    city: string;
    siteName: string;
    siteId: string;
    boqType: string;
    items: any[];
    [key: string]: any;
  }
  const [boqData, setBoqData] = useState<BOQFileData | null>(null);
  // Add state for total HP calculation
  const [totalHP, setTotalHP] = useState<number>(0);

  // Initialize state from URL parameters
  useEffect(() => {
    if (siteNameParam) {
      setSelectedSiteName(siteNameParam);
      console.log('Setting selectedSiteName from URL parameter:', siteNameParam);
    }
    if (siteIdParam) {
      setSelectedSiteId(siteIdParam);
      console.log('Setting selectedSiteId from URL parameter:', siteIdParam);
    }
  }, [siteNameParam, siteIdParam]);

  // Check mode states
  const [isCheckMode, setIsCheckMode] = useState(false);
  const [checkedSections, setCheckedSections] = useState<string[]>([]);
  const [showCheckPanel, setShowCheckPanel] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ type: 'pass' | 'reject' | null }>({ type: null });
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleSection = useCallback((section: string) => {
    setIsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Check mode handlers
  const handleCheckButtonClick = () => {
    setIsCheckMode((prev) => !prev);
    setCheckedSections([]);
    setShowCheckPanel(false);
  };

  const handleSectionCheckbox = (sectionKey: string, checked: boolean) => {
    setCheckedSections((prev) => {
      if (checked) return [...prev, sectionKey];
      return prev.filter((key) => key !== sectionKey);
    });
  };

  const handlePassSections = async () => {
    if ((!selectedSiteId && !selectedSiteName) || checkedSections.length === 0) return;
    
    setIsProcessing(true);
    try {
      if (!selectedSiteId && !selectedSiteName) {
        alert("Pilih site ID atau site name terlebih dahulu!");
        setIsProcessing(false);
        return;
      }

      const tasksRef = collection(db, "tasks");
      const q = selectedSiteId 
        ? query(tasksRef, 
            where("siteId", "==", selectedSiteId), 
            where("division", "==", selectedSectionDivision.toLowerCase()))
        : query(tasksRef,
            where("siteName", "==", selectedSiteName), 
            where("division", "==", selectedSectionDivision.toLowerCase()));
      
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("Data site tidak ditemukan di tasks! Pastikan site telah memiliki task untuk divisi yang dipilih.");
        setIsProcessing(false);
        return;
      }
      const taskDoc = snap.docs[0].ref;
      const data = snap.docs[0].data();
      const sectionsArr = Array.isArray(data.sections) ? data.sections : [];
      
      console.log("Checked sections:", checkedSections);
      console.log("Current sections:", sectionsArr);
      
      // Debug: Show section mapping
      sectionsArr.forEach((item, index) => {
        console.log(`Section ${index}:`, item.section);
        checkedSections.forEach(checkedKey => {
          const sectionObj = sectionList.find(s => s.title.replace(/[^a-zA-Z]/g, "").toLowerCase() === checkedKey);
          const expectedSectionName = sectionObj ? sectionObj.title.replace(/^[A-Z]+\.\s*/, "") : checkedKey;
          console.log(`  Comparing: "${item.section}" with expected section name "${expectedSectionName}" from checked key "${checkedKey}"`);
        });
      });
      
      // Update status_task menjadi 'Done' untuk section yang dipilih
      const updatedSections = sectionsArr.map((item: any) => {
        // Check if this section is in checkedSections
        const isChecked = checkedSections.some(checkedKey => {
          // Get the section name from the sectionList that matches the checked key
          const sectionObj = sectionList.find(s => s.title.replace(/[^a-zA-Z]/g, "").toLowerCase() === checkedKey);
          const expectedSectionName = sectionObj ? sectionObj.title.replace(/^[A-Z]+\.\s*/, "") : checkedKey;
          
          console.log(`Comparing: "${item.section}" with expected section name "${expectedSectionName}" from checked key "${checkedKey}"`);
          
          // Check if the section name matches
          return item.section === expectedSectionName;
        });
        
        if (isChecked) {
          console.log("Updating section:", item.section, "to Done");
          return { ...item, status_task: "Done" };
        }
        return item;
      });
      
      console.log("Updated sections:", updatedSections);
      
      await updateDoc(taskDoc, { sections: updatedSections });
      console.log("Firestore update completed successfully");
      
      // Refetch uploaded sections
      const updatedSnap = await getDocs(q);
      if (!updatedSnap.empty) {
        const updatedData = updatedSnap.docs[0].data();
        setUploadedSections(Array.isArray(updatedData.sections) ? updatedData.sections : []);
      }
      setCheckedSections([]);
      setShowCheckPanel(false);
      setIsCheckMode(false);
      alert("Status berhasil diupdate!");
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Gagal update status: " + err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSections = () => {
    setShowRejectInput(true);
  };

  const handleSubmitReject = async () => {
    if ((!selectedSiteId && !selectedSiteName) || checkedSections.length === 0 || !rejectReason.trim()) return;
    
    setIsProcessing(true);
    try {
      const q = query(collection(db, "tasks"), where("siteId", "==", selectedSiteId), where("division", "==", selectedSectionDivision.toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("Data site tidak ditemukan!");
        setIsProcessing(false);
        return;
      }
      const taskDoc = snap.docs[0].ref;
      const data = snap.docs[0].data();
      const sectionsArr = Array.isArray(data.sections) ? data.sections : [];
      
      console.log("Checked sections for reject:", checkedSections);
      console.log("Current sections:", sectionsArr);
      
      // Update status_task menjadi 'Rejected' dan simpan alasan untuk section yang dipilih
      const updatedSections = sectionsArr.map((item: any) => {
        // Check if this section is in checkedSections
        const isChecked = checkedSections.some(checkedKey => {
          // Get the section name from the sectionList that matches the checked key
          const sectionObj = sectionList.find(s => s.title.replace(/[^a-zA-Z]/g, "").toLowerCase() === checkedKey);
          const expectedSectionName = sectionObj ? sectionObj.title.replace(/^[A-Z]+\.\s*/, "") : checkedKey;
          
          console.log(`Comparing for reject: "${item.section}" with expected section name "${expectedSectionName}" from checked key "${checkedKey}"`);
          
          // Check if the section name matches
          return item.section === expectedSectionName;
        });
        
        if (isChecked) {
          console.log("Updating section:", item.section, "to Rejected");
          return { ...item, status_task: "Rejected", reject_reason: rejectReason };
        }
        return item;
      });
      
      console.log("Updated sections for reject:", updatedSections);
      
      await updateDoc(taskDoc, { sections: updatedSections });
      console.log("Firestore reject update completed successfully");
      
      // Refetch uploaded sections
      const updatedSnap = await getDocs(q);
      if (!updatedSnap.empty) {
        const updatedData = updatedSnap.docs[0].data();
        setUploadedSections(Array.isArray(updatedData.sections) ? updatedData.sections : []);
      }
      setCheckedSections([]);
      setShowCheckPanel(false);
      setIsCheckMode(false);
      setRejectReason("");
      setShowRejectInput(false);
      alert("Status berhasil diupdate!");
    } catch (err) {
      console.error("Error updating reject status:", err);
      alert("Gagal update status: " + err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePassSectionsConfirm = () => {
    setConfirmModal({ type: 'pass' });
  };

  const handleSubmitRejectConfirm = () => {
    setConfirmModal({ type: 'reject' });
  };

  const handleConfirmYes = () => {
    if (confirmModal.type === 'pass') {
      handlePassSections();
    } else if (confirmModal.type === 'reject') {
      handleSubmitReject();
    }
    setConfirmModal({ type: null });
  };

  const handleConfirmNo = () => {
    setConfirmModal({ type: null });
  };

  // Section max photo count mapping
  const sectionPhotoMax: Record<string, number> = {
    // PERMIT
    "A. Visit": 3,
    "B. BA Open": 1,
    "C. BA Reject": 1,
    "D. BAK": 1,
    "E. PKS": 1,
    "F. BAP": 1,
    "G. BOUNDARIES": 1,
    "H. SND Kasar Permit": 1,
    "I. Validasi Sales": 1,
    "J. Donation Submit": 1,
    "K. SKOM Permit": 3,
    // SND
    "A. Survey": 1,
    "B. SND Kasar": 1,
    "C. KMZ": 1,
    "D. BOQ": 1,
    "E. DWG": 1,
    "F. HPDB": 1,
    "G. TSSR": 1,
    "H. APD APPROVED": 1,
    "I. ABD": 1,

    // CW (Civil Work)
    "A. SKOM DONE": 3,
    "B. DIGGING HOLE": 50,
    "C. INSTALL POLE": 3,
    "D. PULLING CABLE": 3,
    "E. INSTALL FAT": 20,
    "F. INSTALL FDT": 20,
    "G. INSTALL ACC": 12,
    "H. POLE FOUNDATION": 50,
    "I. SUBFEEDER": 3,
    "J. OSP": 2,
    "K. EHS": 2,
    // EL
    "A. OPM Test": 1,
    "B. TDR": 1,
    "C. RFS EL": 1,
          "D. ATP EL": 3,
    // Document
    "A. RFS": 1,
    "B. ATP Document": 1,
    "C. Redline": 1,
    "D. CW Document": 1,
    "E. EL/OPM": 1,
    "F. Opname": 1,
    "G. ABD Document": 1,
    "H. RFS Certificate": 1,
    "I. CW Certificate": 1,
    "J. EL Certificate": 1,
    "K. FAC Certificate": 1,
    // Material
    "A. Request DO": 1,
    "B. DO Release": 1,
    "C. Pole": 1,
    "D. Cable": 1,
    "E. FAT": 1,
    "F. FDT": 1,
    "G. ACCESORIES": 12,
  };

  // Material code mapping for sections that need to fetch from boq_files
  const sectionMaterialCodeMap: Record<string, string> = {
    "B. DIGGING HOLE": "200000690",
    "C. INSTALL POLE": "200000690", 
    "E. INSTALL FAT": "200000288",
    "F. INSTALL FDT": "200000273",
    "H. POLE FOUNDATION": "200000690",
  };

  // Section list with division
  const sectionList: { title: string; division: string }[] = [
    // PERMIT
    { title: "A. Visit", division: "PERMIT" },
    { title: "B. BA Open", division: "PERMIT" },
    { title: "C. BA Reject", division: "PERMIT" },
    { title: "D. BAK", division: "PERMIT" },
    { title: "E. PKS", division: "PERMIT" },
    { title: "F. BAP", division: "PERMIT" },
    { title: "G. BOUNDARIES", division: "PERMIT" },
    { title: "H. SND Kasar Permit", division: "PERMIT" },
    { title: "I. Validasi Sales", division: "PERMIT" },
    { title: "J. Donation Submit", division: "PERMIT" },
    { title: "K. SKOM Permit", division: "PERMIT" },
    // SND
    { title: "A. Survey", division: "SND" },
    { title: "B. SND Kasar", division: "SND" },
    { title: "C. KMZ", division: "SND" },
    { title: "D. BOQ", division: "SND" },
    { title: "E. DWG", division: "SND" },
    { title: "F. HPDB", division: "SND" },
    { title: "G. TSSR", division: "SND" },
    { title: "H. APD APPROVED", division: "SND" },
    { title: "I. ABD", division: "SND" },
    
    // CW
    { title: "A. SKOM DONE", division: "CW" },
    { title: "B. DIGGING HOLE", division: "CW" },
    { title: "C. INSTALL POLE", division: "CW" },
    { title: "D. PULLING CABLE", division: "CW" },
    { title: "E. INSTALL FAT", division: "CW" },
    { title: "F. INSTALL FDT", division: "CW" },
    { title: "G. INSTALL ACC", division: "CW" },
    { title: "H. POLE FOUNDATION", division: "CW" },
    { title: "I. SUBFEEDER", division: "CW" },
    { title: "J. OSP", division: "CW" },
    { title: "K. EHS", division: "CW" },
    // EL
    { title: "A. OPM Test", division: "EL" },
    { title: "B. TDR", division: "EL" },
    { title: "C. RFS EL", division: "EL" },
    { title: "D. ATP EL", division: "EL" },
    // Document
    { title: "A. RFS", division: "Document" },
    { title: "B. ATP Document", division: "Document" },
    { title: "C. Redline", division: "Document" },
    { title: "D. CW Document", division: "Document" },
    { title: "E. EL/OPM", division: "Document" },
    { title: "F. Opname", division: "Document" },
    { title: "G. ABD Document", division: "Document" },
    { title: "H. RFS Certificate", division: "Document" },
    { title: "I. CW Certificate", division: "Document" },
    { title: "J. EL Certificate", division: "Document" },
    { title: "K. FAC Certificate", division: "Document" },
    // Material
    { title: "A. Request DO", division: "Material" },
    { title: "B. DO Release", division: "Material" },
    { title: "C. Pole", division: "Material" },
    { title: "D. Cable", division: "Material" },
    { title: "E. FAT", division: "Material" },
    { title: "F. FDT", division: "Material" },
    { title: "G. ACCESORIES", division: "Material" },
  ];

  // Dynamically generate sectionData based on uploadedSections and mapping
  const dynamicSectionData: SectionData[] = sectionList.map(({ title, division }) => {
    // Ambil nama section tanpa awalan abjad dan titik
    const sectionName = title.replace(/^[A-Z]+\.\s*/, "");
    const uploads = uploadedSections.filter(s => s.section === sectionName);
    const count = uploads.length;
    
    console.log(`Processing section: ${title}, needs BOQ: ${!!sectionMaterialCodeMap[title]}, BOQ data available: ${!!boqData}`);
    if (sectionMaterialCodeMap[title]) {
      console.log(`This section uses material code: ${sectionMaterialCodeMap[title]}`);
      console.log(`Section title: "${title}"`);
    }
    
    // Get max photo count - check if this section needs BOQ data
    let max = 1; // Default value
    let source = "default"; // Track where the max value comes from
    
         // For sections that need BOQ data, get from database
     if (sectionMaterialCodeMap[title] && boqData) {
       // Find the material in afterDrmBoq with matching materialCode
       const materialCode = sectionMaterialCodeMap[title];
       const afterDrmItems = boqData.afterDrmBoq || [];
       console.log(`=== DEBUGGING SECTION: ${title} ===`);
       console.log(`Looking for materialCode: ${materialCode} in BOQ data:`, afterDrmItems);
       console.log(`BOQ data available:`, !!boqData);
       console.log(`afterDrmBoq items count:`, afterDrmItems.length);
       
       const matchingItem = afterDrmItems.find((item: any) => {
         const itemCode = item.materialCode?.toString();
         const searchCode = materialCode.toString();
         console.log(`Comparing: itemCode="${itemCode}" with searchCode="${searchCode}"`);
         return itemCode === searchCode;
       });
       
       if (matchingItem && matchingItem.afterDrmBoq !== undefined && matchingItem.afterDrmBoq !== null) {
         // Use the exact value from afterDrmBoq, convert to number if needed
         const rawValue = matchingItem.afterDrmBoq;
         max = typeof rawValue === 'string' ? 
           parseInt(rawValue) : 
           Number(rawValue);
         source = `BOQ (${matchingItem.materialName})`;
         console.log(`Found matching item for ${title}:`, matchingItem);
         console.log(`Raw afterDrmBoq value: ${rawValue}, type: ${typeof rawValue}, converted to: ${max}`);
         console.log(`Max set to: ${max} from ${source}`);
       } else {
         console.log(`No matching item found for ${title} with materialCode: ${materialCode}`);
         console.log(`Available items in afterDrmBoq:`, afterDrmItems.map((item: any) => ({
           materialCode: item.materialCode,
           materialName: item.materialName,
           afterDrmBoq: item.afterDrmBoq
         })));
         // For sections that need BOQ data but no match found, use a default value
         max = 1; // Use 1 as default instead of hardcoded value
         source = "default (no BOQ match)";
         console.log(`Using default value: ${max} (no BOQ match found)`);
       }
    } else {
      // For sections that don't need BOQ data, use hardcoded values
      max = sectionPhotoMax[title] || 1;
      source = "hardcoded";
    }
    
    // Status: 'Done' ONLY if any upload has status_task === 'Done', else 'Not Yet'
    let status = "Not Yet";
    let color = "red";
    
    // Debug: Log all uploads for this section
    console.log(`Section ${title} uploads:`, uploads);
    console.log(`Section ${title} status_task values:`, uploads.map(u => u.status_task));
    
    if (uploads.some(u => u.status_task === "Done")) {
      status = "Done";
      color = "green";
      console.log(`Section ${title} marked as Done`);
    } else {
      console.log(`Section ${title} marked as Not Yet`);
    }
    
    console.log(`Section ${title}: ${count}/${max} photos (source: ${source})`);
    console.log(`Final photoCount for ${title}: ${count}/${max}`);
    console.log(`Final status for ${title}: ${status} (${color})`);
    return {
      title,
      status,
      color,
      photoCount: `${count}/${max}`,
      images: [],
      division,
    };
  });

  // Fetch task info when siteId or siteName changes
  useEffect(() => {
    if (!selectedSiteId && !selectedSiteName) {
      setTaskInfo(null);
      return;
    }
    setTaskLoading(true);
    const fetchTask = async () => {
      try {
        let q;
        if (selectedSiteId) {
          q = query(collection(db, "tasks"), where("siteId", "==", selectedSiteId));
        } else if (selectedSiteName) {
          q = query(collection(db, "tasks"), where("siteName", "==", selectedSiteName));
        } else {
          setTaskInfo(null);
          setTaskLoading(false);
          return;
        }
        const snap = await getDocs(q);
        if (!snap.empty) {
          setTaskInfo(snap.docs[0].data());
        } else {
          setTaskInfo(null);
        }
      } catch (err) {
        setTaskInfo(null);
      } finally {
        setTaskLoading(false);
      }
    };
    fetchTask();
  }, [selectedSiteId, selectedSiteName]);

  // Fetch uploaded sections from Firestore when siteId or siteName changes
  useEffect(() => {
    if (!selectedSiteId && !selectedSiteName) {
      setUploadedSections([]);
      return;
    }
    const fetchSections = async () => {
      let q;
      let divisionToSearch = selectedSectionDivision.toLowerCase();
      
      // For Material division, search in CW tasks instead
      if (selectedSectionDivision === "Material") {
        divisionToSearch = "cw";
      }
      
      if (selectedSiteId) {
        q = query(collection(db, "tasks"), where("siteId", "==", selectedSiteId), where("division", "==", divisionToSearch));
      } else if (selectedSiteName) {
        q = query(collection(db, "tasks"), where("siteName", "==", selectedSiteName), where("division", "==", divisionToSearch));
      } else {
        setUploadedSections([]);
        return;
      }
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setUploadedSections(Array.isArray(data.sections) ? data.sections : []);
      } else {
        setUploadedSections([]);
      }
    };
    fetchSections();
  }, [selectedSiteId, selectedSiteName, selectedSectionDivision]);

  // Fetch BOQ data when siteId or siteName changes
  useEffect(() => {
    if (!selectedSiteId && !selectedSiteName) {
      setBoqData(null);
      return;
    }
    const fetchBOQData = async () => {
      try {
        let siteIdentifier = selectedSiteId || selectedSiteName;
        console.log('Fetching BOQ data for site identifier:', siteIdentifier);
        
        // Try multiple search strategies
        let data: any[] = [];
        
        // Strategy 1: Search by exact siteId
        if (selectedSiteId) {
          console.log('Strategy 1: Searching by exact siteId:', selectedSiteId);
          const qBySiteId = query(collection(db, "boq_files"), where("siteId", "==", selectedSiteId));
          const snapshotBySiteId = await getDocs(qBySiteId);
          console.log('BOQ files found by siteId:', snapshotBySiteId.docs.length);
          const dataBySiteId = snapshotBySiteId.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          data.push(...dataBySiteId);
        }
        
        // Strategy 2: Search by exact siteName
        if (selectedSiteName) {
          console.log('Strategy 2: Searching by exact siteName:', selectedSiteName);
          const qBySiteName = query(collection(db, "boq_files"), where("siteName", "==", selectedSiteName));
          const snapshotBySiteName = await getDocs(qBySiteName);
          console.log('BOQ files found by siteName:', snapshotBySiteName.docs.length);
          const dataBySiteName = snapshotBySiteName.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          data.push(...dataBySiteName);
        }
        
        // Strategy 3: Search by partial siteName (if no exact matches found)
        if (data.length === 0 && selectedSiteName) {
          console.log('Strategy 3: Searching by partial siteName match...');
          const allBOQSnapshot = await getDocs(collection(db, "boq_files"));
          const allBOQData = allBOQSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Find sites with similar names
          const partialMatches = allBOQData.filter((item: any) => {
            const itemSiteName = item.siteName?.toLowerCase() || '';
            const searchSiteName = selectedSiteName.toLowerCase();
            
            // Check if the search term is contained in the site name or vice versa
            return itemSiteName.includes(searchSiteName) || searchSiteName.includes(itemSiteName);
          });
          
          console.log('Partial matches found:', partialMatches.length);
          console.log('Partial matches:', partialMatches.map((item: any) => `${item.siteName} (${item.siteId})`));
          data.push(...partialMatches);
        }
        
        console.log('Total BOQ data found:', data.length);
        console.log('Raw BOQ data from database:', data);
        
        // Merge data by siteName (similar to BOQ page logic)
        const mergedData: {[siteName: string]: any} = {};
        data.forEach((item: any) => {
          const key = `${item.city}||${item.siteName}`;
          if (!mergedData[key]) {
            mergedData[key] = {
              ...item,
              beforeDrmBoq: null,
              afterDrmBoq: null,
              constDoneBoq: null,
              abdBoq: null,
            };
          }
          const row = mergedData[key];
          if (item.boqType === "Before DRM BOQ") row.beforeDrmBoq = item.items;
          if (item.boqType === "After DRM BOQ") row.afterDrmBoq = item.items;
          if (item.boqType === "Construction Done BOQ") row.constDoneBoq = item.items;
          if (item.boqType === "ABD BOQ") row.abdBoq = item.items;
        });
        
        console.log('Merged BOQ data:', mergedData);
        const mergedArray = Object.values(mergedData);
        if (mergedArray.length > 0) {
          const boqDataItem = mergedArray[0]; // Take the first (and should be only) item
          console.log('BOQ Data fetched:', boqDataItem);
          console.log('constDoneBoq items:', boqDataItem.constDoneBoq);
          console.log('constDoneBoq items count:', boqDataItem.constDoneBoq?.length || 0);
          setBoqData(boqDataItem);
        } else {
          console.log('No BOQ data found for site:', siteIdentifier);
          console.log('Available sites with BOQ data:');
          // Fetch all BOQ files to show available sites
          const allBOQSnapshot = await getDocs(collection(db, "boq_files"));
          const allBOQData = allBOQSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const availableSites = [...new Set(allBOQData.map((item: any) => `${item.siteName} (${item.siteId})`))];
          console.log('Sites with BOQ data:', availableSites);
          setBoqData(null);
        }
      } catch (error) {
        console.error("Error fetching BOQ data:", error);
        setBoqData(null);
      }
    };
    fetchBOQData();
  }, [selectedSiteId, selectedSiteName]);

  // Only show section list if a site is selected (either by siteId or siteName)
  const showSections = (!!selectedSiteId || !!selectedSiteName) && !!taskInfo;

  // Filter sections based on selected site (taskInfo.division)
  const filteredSections = showSections
    ? dynamicSectionData.filter(item => !selectedSectionDivision || item.division === selectedSectionDivision)
    : [];

  // Button labels for the division buttons
  const actionButtons = ["PERMIT", "SND", "CW", "EL", "Document", "Material"];


  // Ref for the upload card (used for focusing or scrolling, etc.)
  // Search states for dropdowns
  // Fetch site data from Firestore
  useEffect(() => {
    const fetchSites = async () => {
      const querySnapshot = await getDocs(collection(db, "site"));
      const siteList: SiteInfo[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          siteId: data.siteId || "",
          siteName: data.siteName || "",
          region: data.region || "",
          city: data.city || "",
        };
      });
      setSites(siteList);
    };
    fetchSites();
  }, []);

  // Add filteredSites state
  const [filteredSites, setFilteredSites] = useState<SiteInfo[]>([]);
  // Fetch all sites without PIC filtering
  useEffect(() => {
    const fetchFilteredSites = async () => {
      // 1. Fetch all tasks
      const tasksSnapshot = await getDocs(collection(db, "tasks"));
      // 2. Get unique siteIds from all tasks
      const siteIds = Array.from(new Set(tasksSnapshot.docs.map(doc => doc.data().siteId)));
      if (siteIds.length === 0) {
        setFilteredSites([]);
        return;
      }
      // 3. Fetch all sites and filter by siteId
      const sitesSnapshot = await getDocs(collection(db, "site"));
      const filtered = sitesSnapshot.docs
        .map(doc => doc.data() as SiteInfo)
        .filter(site => siteIds.includes(site.siteId));
      setFilteredSites(filtered);
    };
    fetchFilteredSites();
  }, []);

  // Calculate total HP based on selected division and site filters
  useEffect(() => {
    const calculateTotalHP = async () => {
      try {
        // 1. Fetch all tasks (QC can see all tasks)
        const tasksSnapshot = await getDocs(collection(db, "tasks"));

        // 2. Filter tasks by selected division (convert to lowercase for comparison)
        const selectedDivisionLower = selectedSectionDivision.toLowerCase();
        const filteredTasks = tasksSnapshot.docs.filter(doc => {
          const data = doc.data();
          const taskDivision = (data.division || "").toLowerCase();
          return taskDivision === selectedDivisionLower;
        });

        // 3. Apply additional site filters if selected
        let finalTasks = filteredTasks;
        if (selectedSiteId) {
          finalTasks = filteredTasks.filter(doc => {
            const data = doc.data();
            return data.siteId === selectedSiteId;
          });
        } else if (selectedSiteName) {
          finalTasks = filteredTasks.filter(doc => {
            const data = doc.data();
            return data.siteName === selectedSiteName;
          });
        } else if (selectedCity) {
          finalTasks = filteredTasks.filter(doc => {
            const data = doc.data();
            return data.city === selectedCity;
          });
        } else if (selectedRegion) {
          finalTasks = filteredTasks.filter(doc => {
            const data = doc.data();
            return data.region === selectedRegion;
          });
        }

        // 4. Sum up all hp values from filtered tasks
        const total = finalTasks.reduce((sum, doc) => {
          const data = doc.data();
          const hpValue = data.hp || 0;
          // Convert to number to ensure proper addition
          const numericHp = typeof hpValue === 'string' ? parseFloat(hpValue) || 0 : Number(hpValue) || 0;
          return sum + numericHp;
        }, 0);

        setTotalHP(total);
      } catch (error) {
        console.error('Error calculating total HP:', error);
        setTotalHP(0);
      }
    };

    calculateTotalHP();
  }, [selectedSectionDivision, selectedSiteId, selectedSiteName, selectedCity, selectedRegion]);

  // Use filteredSites for dropdowns and selection
  const regionOptions = Array.from(new Set(filteredSites
    .filter(s =>
      (!selectedCity || s.city === selectedCity) &&
      (!selectedSiteName || s.siteName === selectedSiteName) &&
      (!selectedSiteId || s.siteId === selectedSiteId)
    )
    .map((s) => s.region)
    .filter(Boolean)))
    .filter((region) => region.toLowerCase().includes(regionSearch.toLowerCase()));

  const cityOptions = Array.from(new Set(filteredSites
    .filter(s =>
      (!selectedRegion || s.region === selectedRegion) &&
      (!selectedSiteName || s.siteName === selectedSiteName) &&
      (!selectedSiteId || s.siteId === selectedSiteId)
    )
    .map((s) => s.city)
    .filter(Boolean)))
    .filter((city) => city.toLowerCase().includes(citySearch.toLowerCase()));

  const siteNameOptions = Array.from(new Set(filteredSites
    .filter(s =>
      (!selectedRegion || s.region === selectedRegion) &&
      (!selectedCity || s.city === selectedCity) &&
      (!selectedSiteId || s.siteId === selectedSiteId)
    )
    .map((s) => s.siteName)
    .filter(Boolean)))
    .filter((siteName) => siteName.toLowerCase().includes(siteNameSearch.toLowerCase()));

  const siteIdOptions = Array.from(new Set(filteredSites
    .filter(s =>
      (!selectedRegion || s.region === selectedRegion) &&
      (!selectedCity || s.city === selectedCity) &&
      (!selectedSiteName || s.siteName === selectedSiteName)
    )
    .map((s) => s.siteId)
    .filter(Boolean)))
    .filter((siteId) => siteId.toLowerCase().includes(siteIdSearch.toLowerCase()));

  // Use filteredSites for the main filteredSites list
  const filteredSitesList = filteredSites.filter((s) => {
    return (
      (!selectedRegion || s.region === selectedRegion) &&
      (!selectedCity || s.city === selectedCity) &&
      (!selectedSiteName || s.siteName === selectedSiteName) &&
      (!selectedSiteId || s.siteId === selectedSiteId)
    );
  });

  // Handlers for dropdown changes
  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRegion(e.target.value);
    // Reset only if the value is cleared
    if (!e.target.value) {
      setSelectedCity("");
      setSelectedSiteName("");
      setSelectedSiteId("");
    }
  };
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value);
    if (!e.target.value) {
      setSelectedSiteName("");
      setSelectedSiteId("");
    }
  };
  const handleSiteNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSiteName(e.target.value);
    if (!e.target.value) {
      setSelectedSiteId("");
    }
  };
  const handleSiteIdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSiteId(e.target.value);
  };

  // Handler for upload card file change (per section)
  const handleSectionUploadCardFileChange = (sectionKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Check if section is already completed
      const sectionObj = sectionList.find(s => s.title.replace(/[^a-zA-Z]/g, "").toLowerCase() === sectionKey);
      const sectionName = sectionObj ? sectionObj.title.replace(/^[A-Z]+\.\s*/, "") : sectionKey;
      const sectionUploads = uploadedSections.filter(s => s.section === sectionName);
      
      if (sectionUploads.some(u => u.status_task === 'Done')) {
        alert("Section ini sudah selesai dan tidak bisa diupload lagi!");
        return;
      }
      openUploadModal(sectionKey, file);
    }
  };

  // Handler for drag and drop (per section)
  const handleSectionDrop = (sectionKey: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      // Check if section is already completed
      const sectionObj = sectionList.find(s => s.title.replace(/[^a-zA-Z]/g, "").toLowerCase() === sectionKey);
      const sectionName = sectionObj ? sectionObj.title.replace(/^[A-Z]+\.\s*/, "") : sectionKey;
      const sectionUploads = uploadedSections.filter(s => s.section === sectionName);
      
      if (sectionUploads.some(u => u.status_task === 'Done')) {
        alert("Section ini sudah selesai dan tidak bisa diupload lagi!");
        return;
      }
      openUploadModal(sectionKey, file);
    }
  };

  // Add upload handler to Storage + Firestore
  const uploadSectionFile = async (
    sectionKey: string,
    file: File,
    details: string,
    remark: string
  ) => {
    if (!selectedSiteId && !selectedSiteName) {
      alert("Pilih site terlebih dahulu!");
      return;
    }
    
    // Check if section is already completed
    const sectionObj = sectionList.find(
      (s) => s.title.replace(/[^a-zA-Z]/g, "").toLowerCase() === sectionKey
    );
    const sectionName = sectionObj ? sectionObj.title.replace(/^[A-Z]+\.\s*/, "") : sectionKey;
    const sectionUploads = uploadedSections.filter(s => s.section === sectionName);
    
    if (sectionUploads.some(u => u.status_task === 'Done')) {
      alert("Section ini sudah selesai dan tidak bisa diupload lagi!");
      return;
    }
    
    try {
      const siteFolder = selectedSiteId || selectedSiteName;
      // Cari division yang sesuai dengan sectionKey
      const division = sectionObj ? sectionObj.division : "";
      // Ambil nama section tanpa awalan abjad dan titik (misal: 'A. Visit' -> 'Visit', 'AA. Something' -> 'Something')
      const storagePath = `uploads/${siteFolder}/${division}/${sectionKey}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);
      // Find the task document by siteId or siteName AND division
      let q;
      let divisionToSearch = selectedSectionDivision.toLowerCase();
      
      // For Material division, search in CW tasks instead
      if (selectedSectionDivision === "Material") {
        divisionToSearch = "cw";
      }
      
      if (selectedSiteId) {
        q = query(collection(db, "tasks"), where("siteId", "==", selectedSiteId), where("division", "==", divisionToSearch));
      } else if (selectedSiteName) {
        q = query(collection(db, "tasks"), where("siteName", "==", selectedSiteName), where("division", "==", divisionToSearch));
      } else {
        alert("Data site tidak ditemukan di tasks!");
        return;
      }
      const snap = await getDocs(q);
      console.log('UploadSectionFile: Querying tasks with:', {
        siteId: selectedSiteId,
        siteName: selectedSiteName,
        division: divisionToSearch,
        foundDocs: snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      });
      let taskDoc;
      if (snap.empty) {
        // Try to find any task for this site regardless of division
        console.log('No task found with division:', divisionToSearch);
        console.log('Trying to find any task for this site...');
        
        let fallbackQ;
        if (selectedSiteId) {
          fallbackQ = query(collection(db, "tasks"), where("siteId", "==", selectedSiteId));
        } else if (selectedSiteName) {
          fallbackQ = query(collection(db, "tasks"), where("siteName", "==", selectedSiteName));
        }
        
        if (fallbackQ) {
          const fallbackSnap = await getDocs(fallbackQ);
          console.log('Fallback query found tasks:', fallbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          
          if (!fallbackSnap.empty) {
            // Use the first available task
            taskDoc = fallbackSnap.docs[0].ref;
            console.log('Using fallback task:', fallbackSnap.docs[0].id, fallbackSnap.docs[0].data());
          } else {
            alert("Data site tidak ditemukan di tasks!");
            return;
          }
        } else {
          alert("Data site dengan division yang sesuai tidak ditemukan di tasks!");
          return;
        }
      } else {
        taskDoc = snap.docs[0].ref;
        console.log('UploadSectionFile: Akan update dokumen tasks:', snap.docs[0].id, snap.docs[0].data());
      }
      // Add to sections array
      await updateDoc(taskDoc, {
        sections: arrayUnion({
          section: sectionName,
          fileUrl,
          fileName: file.name,
          details,
          remark,
          division,
          uploadedAt: new Date(),
          storagePath,
          uploadBy: user?.name || "",
        })
      });
      // Refetch uploaded sections
      const updatedSnap = await getDocs(q);
      if (!updatedSnap.empty) {
        const updatedData = updatedSnap.docs[0].data();
        setUploadedSections(Array.isArray(updatedData.sections) ? updatedData.sections : []);
      }
      alert("Upload berhasil!");
    } catch (err) {
      alert("Upload gagal: " + err);
    }
  };

  // Handler for confirming upload
  const handleConfirmUpload = (sectionKey: string) => {
    const pending = pendingUpload[sectionKey];
    if (pending) {
      setSectionUploads(prev => ({
        ...prev,
        [sectionKey]: [...(prev[sectionKey] || []), pending],
      }));
      setPendingUpload(prev => ({ ...prev, [sectionKey]: null }));
      // Upload to Firebase
      uploadSectionFile(sectionKey, pending.file, pending.details, pending.remark);
    }
  };

  // Handler for replacing an uploaded image in a section
  const handleSectionReplaceImage = (sectionKey: string, idx: number, file: File) => {
    setSectionUploads(prev => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((item, i) => i === idx ? { ...item, file } : item),
    }));
  };

  // Handler for editing remark of an uploaded image
  const handleEditRemark = (sectionKey: string, idx: number, remark: string) => {
    setSectionUploads(prev => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((item, i) => i === idx ? { ...item, remark } : item),
    }));
  };

  // Handler for file input change for replacement
  const handleSectionReplaceFileChange = (sectionKey: string, idx: number, details: string, remark: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) openReplaceModal(sectionKey, idx, file, details, remark);
  };

  // Replace a file in a section and update Firestore
  const replaceSectionFile = async (
    sectionKey: string,
    idx: number,
    file: File,
    details: string,
    remark: string
  ) => {
    if (!selectedSiteId && !selectedSiteName) {
      alert("Pilih site terlebih dahulu!");
      return;
    }
    try {
      const siteFolder = selectedSiteId || selectedSiteName;
      const sectionObj = sectionList.find(
        (s) => s.title.replace(/[^a-zA-Z]/g, "").toLowerCase() === sectionKey
      );
      const division = sectionObj ? sectionObj.division : "";
      const sectionName = sectionObj ? sectionObj.title.replace(/^[A-Z]+\.\s*/, "") : sectionKey;
      const storagePath = `uploads/${siteFolder}/${division}/${sectionKey}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);
      let q;
      let divisionToSearch = selectedSectionDivision.toLowerCase();
      if (selectedSectionDivision === "Material") {
        divisionToSearch = "cw";
      }
      if (selectedSiteId) {
        q = query(collection(db, "tasks"), where("siteId", "==", selectedSiteId), where("division", "==", divisionToSearch));
      } else if (selectedSiteName) {
        q = query(collection(db, "tasks"), where("siteName", "==", selectedSiteName), where("division", "==", divisionToSearch));
      } else {
        alert("Data site tidak ditemukan di tasks!");
        return;
      }
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("Data site dengan division yang sesuai tidak ditemukan di tasks!");
        return;
      }
      const taskDoc = snap.docs[0].ref;
      const data = snap.docs[0].data();
      const sectionsArr = Array.isArray(data.sections) ? data.sections : [];
      // Find the correct section occurrence by index (idx)
      let count = 0;
      const updatedSections = sectionsArr.map((item) => {
        if (item.section === sectionName) {
          if (count === idx) {
            count++;
            return {
              ...item,
              fileUrl,
              fileName: file.name,
              details,
              remark,
              uploadedAt: new Date(),
              storagePath,
              uploadBy: user?.name || "",
            };
          }
          count++;
        }
        return item;
      });
      await updateDoc(taskDoc, { sections: updatedSections });
      // Refetch uploaded sections
      const updatedSnap = await getDocs(q);
      if (!updatedSnap.empty) {
        const updatedData = updatedSnap.docs[0].data();
        setUploadedSections(Array.isArray(updatedData.sections) ? updatedData.sections : []);
      }
      alert("Replace berhasil!");
    } catch (err) {
      alert("Replace gagal: " + err);
    }
  };

  // Handler for confirming replacement
  const handleConfirmReplace = (sectionKey: string) => {
    const pending = pendingReplace[sectionKey];
    if (pending) {
      setSectionUploads(prev => ({
        ...prev,
        [sectionKey]: (prev[sectionKey] || []).map((item, i) => i === pending.idx ? { file: pending.file, details: pending.details, remark: pending.remark } : item),
      }));
      setPendingReplace(prev => ({ ...prev, [sectionKey]: null }));
      // Backend update
      replaceSectionFile(sectionKey, pending.idx, pending.file, pending.details, pending.remark);
    }
  };

  // Handler to remove an uploaded image from a section
  const handleRemoveUpload = async (sectionKey: string, idx: number) => {
    // Check if section is already completed
    const sectionObj = sectionList.find(s => s.title.replace(/[^a-zA-Z]/g, "").toLowerCase() === sectionKey);
    const sectionName = sectionObj ? sectionObj.title.replace(/^[A-Z]+\.\s*/, "") : sectionKey;
    const sectionUploads = uploadedSections.filter(s => s.section === sectionName);
    
    if (sectionUploads.some(u => u.status_task === 'Done')) {
      alert("Section ini sudah selesai dan tidak bisa dihapus lagi!");
      return;
    }

    setSectionUploads(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter((_, i) => i !== idx),
    }));

    if (!selectedSiteId && !selectedSiteName) return;
    try {
      let q;
      let divisionToSearch = selectedSectionDivision.toLowerCase();
      
      // For Material division, search in CW tasks instead
      if (selectedSectionDivision === "Material") {
        divisionToSearch = "cw";
      }
      
      if (selectedSiteId) {
        q = query(collection(db, "tasks"), where("siteId", "==", selectedSiteId), where("division", "==", divisionToSearch));
      } else if (selectedSiteName) {
        q = query(collection(db, "tasks"), where("siteName", "==", selectedSiteName), where("division", "==", divisionToSearch));
      } else {
        return;
      }
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("Data site tidak ditemukan di tasks!");
        return;
      }
      const taskDoc = snap.docs[0].ref;
      const data = snap.docs[0].data();
      const sectionsArr = Array.isArray(data.sections) ? data.sections : [];
      // Ambil nama section tanpa awalan abjad dan titik
      const filtered = sectionsArr.filter((item, i) => {
        if (item.section === sectionName && i === idx) return false;
        return true;
      });
      await updateDoc(taskDoc, { sections: filtered });
      const updatedSnap = await getDocs(q);
      if (!updatedSnap.empty) {
        const updatedData = updatedSnap.docs[0].data();
        setUploadedSections(Array.isArray(updatedData.sections) ? updatedData.sections : []);
      }
    } catch (err) {
      alert("Gagal menghapus file: " + err);
    }
  };

  // Helper to generate a unique key for each image
  const getImageKey = (sectionKey: string, imgIndex: number) => `${sectionKey}_${imgIndex}`;

  // Handler for file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!uploadTarget) return;
    const { sectionKey, imgIndex } = uploadTarget;
    const file = e.target.files?.[0] || null;
    setSelectedFiles(prev => ({
      ...prev,
      [getImageKey(sectionKey, imgIndex)]: file,
    }));
    setUploadTarget(null);
    // Add upload logic here if needed
  };

  // Handler for upload button click
  const handleUploadClick = (sectionKey: string, imgIndex: number) => {
    setUploadTarget({ sectionKey, imgIndex });
    fileInputRef.current?.click();
  };

  // Update upload card file change handler
  const handleUploadCardFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) setUploadedImages(prev => [...prev, file]);
  };

  // Update drag and drop handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    if (file) setUploadedImages(prev => [...prev, file]);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Update openUploadModal and openReplaceModal
  const openUploadModal = (sectionKey: string, file: File) => {
    setPendingUpload(prev => ({ ...prev, [sectionKey]: { file, details: '', remark: '' } }));
    setModal({ type: 'upload', sectionKey });
  };
  const openReplaceModal = (sectionKey: string, idx: number, file: File, details: string, remark: string) => {
    setPendingReplace(prev => ({ ...prev, [sectionKey]: { idx, file, details, remark } }));
    setModal({ type: 'replace', sectionKey, idx });
  };
  // Handler to close modal
  const closeModal = () => {
    setModal(null);
    // Optionally clear pending states
  };

  // Add ZIP export handler
  const handleExportZIP = async () => {
    if (!selectedSiteId && !selectedSiteName) {
      alert("Please select a site first!");
      return;
    }

    try {
      const zip = new JSZip();
      
      // Get all image files from all sections
      const allImageFiles = uploadedSections.filter(file => {
        const fileName = file.fileName.toLowerCase();
        const fileUrl = file.fileUrl.toLowerCase();
        return isImageFile(fileName) || isImageFile(fileUrl);
      });

      if (allImageFiles.length === 0) {
        alert("No images found to export!");
        return;
      }

      // Download and add each image to ZIP
      for (let i = 0; i < allImageFiles.length; i++) {
        const file = allImageFiles[i];
        try {
          // Fetch the image
          const response = await fetch(file.fileUrl);
          const blob = await response.blob();
          
          // Create folder structure: Division/Section/filename
          const sectionObj = sectionList.find(s => s.title.replace(/^[A-Z]+\.\s*/, "") === file.section);
          const division = sectionObj ? sectionObj.division : 'Unknown';
          const sectionName = file.section;
          
          // Create filename with metadata
          const fileExtension = file.fileName.split('.').pop() || 'jpg';
          const timestamp = file.uploadedAt ? new Date(file.uploadedAt.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          const cleanFileName = file.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
          const zipFileName = `${division}/${sectionName}/${timestamp}_${cleanFileName}`;
          
          // Add file to ZIP
          zip.file(zipFileName, blob);
          
          console.log(`Added to ZIP: ${zipFileName}`);
        } catch (error) {
          console.error(`Failed to add file ${file.fileName} to ZIP:`, error);
        }
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate filename
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `Photos_${selectedSiteId || selectedSiteName}_${dateStr}_${timeStr}.zip`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`ZIP exported: ${filename}`);
      alert(`ZIP file downloaded successfully! Contains ${allImageFiles.length} images.`);
    } catch (error) {
      console.error('Error generating ZIP:', error);
      alert('Error generating ZIP. Please try again.');
    }
  };

  // Add PDF export handler
  const handleExportPDF = async () => {
    if (!selectedSiteId && !selectedSiteName) {
      alert("Please select a site first!");
      return;
    }

    try {
      // Instead of filtering, use all filteredSections
      const sectionsToExport = filteredSections;
      // Calculate totalPages dynamically
      let totalPages = 0;
      for (const section of sectionsToExport) {
        const sectionName = section.title.replace(/^[A-Z]+\.\s*/, "");
        const sectionFiles = uploadedSections.filter(s => s.section === sectionName);
        const imageFiles = sectionFiles.filter(file => {
          const fileName = file.fileName.toLowerCase();
          const fileUrl = file.fileUrl.toLowerCase();
          return isImageFile(fileName) || isImageFile(fileUrl);
        });
        if (imageFiles.length === 0) {
          totalPages += 1;
        } else {
          totalPages += Math.ceil(imageFiles.length / 4);
        }
      }
      let currentPage = 1;

      if (sectionsToExport.length === 0) {
        alert("No sections found to export!");
        return;
      }

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let tempY = 100; // Start after header
      for (const section of sectionsToExport) {
        const sectionName = section.title.replace(/^[A-Z]+\.\s*/, "");
        const sectionFiles = uploadedSections.filter(s => s.section === sectionName);
        const imageFiles = sectionFiles.filter(file => {
          const fileName = file.fileName.toLowerCase();
          const fileUrl = file.fileUrl.toLowerCase();
          return isImageFile(fileName) || isImageFile(fileUrl);
        });

        // Section header takes 25mm
        tempY += 25;
        
        // Calculate images per page (2x2 grid)
        const imagesPerPage = 4;
        const imgHeight = 60;
        const imgSpacing = 40;
        const pagesNeeded = Math.ceil(imageFiles.length / imagesPerPage);
        
        tempY += pagesNeeded * (imgHeight + imgSpacing);
        
        if (tempY > pageHeight - 50) {
          totalPages += Math.ceil((tempY - (pageHeight - 50)) / (pageHeight - 50));
          tempY = 100;
        }
      }

      // Define addHeader function before the loop
      const addHeader = async () => {
        // Main title
        pdf.setFontSize(18);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Photo Dokumentasi Pekerjaan', pageWidth / 2, 20, { align: 'center' });

        // Calculate center position for header content
        const headerStartX = (pageWidth - 160) / 2; // Increased total width for text + logo
        // Project details table - centered with borders
        const tableWidth = 120; // Increased table width
        const tableHeight = 35; // Increased table height
        const tableX = headerStartX;
        const tableY = 30;
        
        // Get text content for dynamic sizing
        const siteIdText = selectedSiteId || selectedSiteName || '-';
        const siteNameText = selectedSiteName || selectedSiteId || '-';
        const regionText = taskInfo?.region || '-';
        const dateText = new Date().toLocaleDateString('en-CA');
        
        // Calculate required width for text content
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        const siteIdWidth = pdf.getTextWidth(siteIdText);
        const siteNameWidth = pdf.getTextWidth(siteNameText);
        const regionWidth = pdf.getTextWidth(regionText);
        const dateWidth = pdf.getTextWidth(dateText);
        
        // Find the maximum width needed
        const maxTextWidth = Math.max(siteIdWidth, siteNameWidth, regionWidth, dateWidth);
        const requiredTableWidth = Math.max(tableWidth, maxTextWidth + 50); // Add padding
        
        // Draw table border with dynamic width
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.rect(tableX, tableY, requiredTableWidth, tableHeight, 'S');
        
        // Draw horizontal lines
        pdf.line(tableX, tableY + 8.75, tableX + requiredTableWidth, tableY + 8.75);
        pdf.line(tableX, tableY + 17.5, tableX + requiredTableWidth, tableY + 17.5);
        pdf.line(tableX, tableY + 26.25, tableX + requiredTableWidth, tableY + 26.25);
        
        // Draw vertical line - adjust position based on longest label
        const labelColumnWidth = 50; // Fixed width for labels
        pdf.line(tableX + labelColumnWidth, tableY, tableX + labelColumnWidth, tableY + tableHeight);
        
        // Add table content with proper text wrapping
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text('SITE ID:', tableX + 2, tableY + 6);
        pdf.text('SITE NAME:', tableX + 2, tableY + 15);
        pdf.text('REGION:', tableX + 2, tableY + 24);
        pdf.text('DIVISION:', tableX + 2, tableY + 33);
        pdf.setFont('helvetica', 'normal');
        
        // Add content with text wrapping if needed
        const contentX = tableX + labelColumnWidth + 2;
        const maxContentWidth = requiredTableWidth - labelColumnWidth - 4;
        
        // Helper function to wrap text
        const wrapText = (text: string, maxWidth: number, startY: number) => {
          const words = text.split(' ');
          let line = '';
          let y = startY;
          const lineHeight = 4;
          
          for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const testWidth = pdf.getTextWidth(testLine);
            
            if (testWidth > maxWidth && line !== '') {
              pdf.text(line, contentX, y);
              line = words[i] + ' ';
              y += lineHeight;
            } else {
              line = testLine;
            }
          }
          pdf.text(line, contentX, y);
          return y + lineHeight;
        };
        
        wrapText(siteIdText, maxContentWidth, tableY + 6);
        wrapText(siteNameText, maxContentWidth, tableY + 15);
        wrapText(regionText, maxContentWidth, tableY + 24);
        wrapText(selectedSectionDivision || '-', maxContentWidth, tableY + 33);
        
        // Logo - positioned to the right of text, centered as a group
        try {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            logoImg.onload = resolve;
            logoImg.onerror = () => {
              reject(new Error('Logo failed to load'));
            };
            logoImg.src = '/logo.jpeg';
          });
          const logoCanvas = document.createElement('canvas');
          const logoCtx = logoCanvas.getContext('2d');
          logoCanvas.width = logoImg.width;
          logoCanvas.height = logoImg.height;
          logoCtx?.drawImage(logoImg, 0, 0);
          const logoData = logoCanvas.toDataURL('image/jpeg', 0.9);
          const logoWidth = 30;
          const logoHeight = 30;
          pdf.addImage(logoData, 'JPEG', headerStartX + requiredTableWidth + 10, 30, logoWidth, logoHeight);
        } catch (error) {
          // Fallback logo placeholder
          pdf.setFillColor(200, 200, 200);
          pdf.rect(headerStartX + requiredTableWidth + 10, 30, 30, 30, 'F');
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text('BAKTI', headerStartX + requiredTableWidth + 25, 45, { align: 'center' });
        }
      };

      // Process each section
      for (let sectionIdx = 0; sectionIdx < sectionsToExport.length; sectionIdx++) {
        const section = sectionsToExport[sectionIdx];
        // Only render the header on the first page
        if (sectionIdx === 0) {
          await addHeader();
        }
        const sectionName = section.title.replace(/^[A-Z]+\.\s*/, "");
        const sectionFiles = uploadedSections.filter(s => s.section === sectionName);
        const imageFiles = sectionFiles.filter(file => {
          const fileName = file.fileName.toLowerCase();
          const fileUrl = file.fileUrl.toLowerCase();
          return isImageFile(fileName) || isImageFile(fileUrl);
        });
        // Set yPosition based on page
        let yPosition;
        if (sectionIdx === 0) {
          yPosition = 90; // after header with more spacing
        } else {
          yPosition = 35; // pull up for subsequent pages with more spacing
        }
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text(section.title, margin, yPosition);
        yPosition += 15; // Increased spacing after section title
        let imagesOnCurrentPage = 0;
        if (imageFiles.length === 0) {
          pdf.setFontSize(12);
          pdf.setTextColor(150, 150, 150);
          pdf.setFont('helvetica', 'italic');
          pdf.text('No images available for this section', margin, yPosition + 10);
          // Only add a new page if this is not the last section
          if (sectionIdx !== sectionsToExport.length - 1) {
            pdf.addPage();
          }
          continue;
        }
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          // Calculate position for 2x2 grid
          const imgWidth = 85;
          const imgHeight = 60;
          const spacing = 10;
          const row = Math.floor(imagesOnCurrentPage / 2);
          const col = imagesOnCurrentPage % 2;
          const currentX = margin + col * (imgWidth + spacing);
          const currentY = yPosition + row * (imgHeight + 25);

          try {
            // Fetch the image first to handle CORS properly
            const response = await fetch(file.fileUrl);
            const blob = await response.blob();
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            // Create object URL from blob
            const objectUrl = URL.createObjectURL(blob);
            
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = (error) => {
                console.error('Error loading image:', error);
                reject(new Error('Image failed to load'));
              };
              img.src = objectUrl;
            });
            
            // Clean up object URL
            URL.revokeObjectURL(objectUrl);
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas dimensions based on image aspect ratio
            const aspectRatio = img.width / img.height;
            const maxWidth = 1200; // Maximum width to prevent memory issues
            const maxHeight = 1200;
            
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                width = maxWidth;
                height = width / aspectRatio;
            }
            if (height > maxHeight) {
                height = maxHeight;
                width = height * aspectRatio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw image with white background to prevent transparency issues
            if (ctx) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
            }
            
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            pdf.addImage(imgData, 'JPEG', currentX, currentY, imgWidth, imgHeight);
            // Add embedded text overlay with remarks, details, and uploader
            pdf.setFontSize(8);
            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'bold');
            
            // Calculate text content and required overlay height
            const textLines = [];
            if (file.remark && file.remark !== '-') {
              textLines.push(`Remark: ${file.remark}`);
            }
            if (file.details && file.details !== '-') {
              textLines.push(`Details: ${file.details}`);
            }
            if (file.uploadBy && file.uploadBy !== '-') {
              textLines.push(`By: ${file.uploadBy}`);
            }
            
            // Calculate required overlay height based on text content
            const lineHeight = 4;
            const padding = 2;
            const requiredHeight = Math.max(20, textLines.length * lineHeight + padding * 2);
            
            // Ensure overlay doesn't exceed image height
            const overlayHeight = Math.min(requiredHeight, imgHeight * 0.4); // Max 40% of image height
            
            // Add semi-transparent overlay for text readability
            pdf.setFillColor(0, 0, 0, 0.7);
            pdf.rect(currentX, currentY + imgHeight - overlayHeight, imgWidth, overlayHeight, 'F');
            
            // Add text with proper wrapping
            let overlayY = currentY + imgHeight - overlayHeight + padding + lineHeight;
            const maxTextWidth = imgWidth - 4; // Leave 2mm padding on each side
            
            textLines.forEach(line => {
              // Check if text needs wrapping
              const textWidth = pdf.getTextWidth(line);
              if (textWidth > maxTextWidth) {
                // Wrap text
                const words = line.split(' ');
                let currentLine = '';
                let y = overlayY;
                
                for (let i = 0; i < words.length; i++) {
                  const testLine = currentLine + words[i] + ' ';
                  const testWidth = pdf.getTextWidth(testLine);
                  
                  if (testWidth > maxTextWidth && currentLine !== '') {
                    pdf.text(currentLine, currentX + 2, y);
                    currentLine = words[i] + ' ';
                    y += lineHeight;
                  } else {
                    currentLine = testLine;
                  }
                }
                pdf.text(currentLine, currentX + 2, y);
                overlayY = y + lineHeight;
              } else {
                pdf.text(line, currentX + 2, overlayY);
                overlayY += lineHeight;
              }
            });
          } catch (error) {
            // Enhanced placeholder for failed images with more details
            pdf.setFillColor(245, 245, 245);
            pdf.rect(currentX, currentY, imgWidth, imgHeight, 'F');
            
            // Add a border
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.5);
            pdf.rect(currentX, currentY, imgWidth, imgHeight, 'S');
            
            // Add an error icon or pattern
            pdf.setDrawColor(180, 180, 180);
            pdf.setLineWidth(0.3);
            
            // Draw a simple image icon
            const iconX = currentX + imgWidth/2 - 10;
            const iconY = currentY + imgHeight/2 - 15;
            pdf.rect(iconX, iconY, 20, 16, 'S');
            pdf.line(iconX + 15, iconY + 4, iconX + 15, iconY + 4); // Small circle for image icon
            
            // Add error text
            pdf.setFontSize(9);
            pdf.setTextColor(100, 100, 100);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Image Not Available', currentX + imgWidth/2, currentY + imgHeight/2 + 10, { align: 'center' });
            
            // Add filename if available
            if (file.fileName) {
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'normal');
                const truncatedName = file.fileName.length > 30 ? 
                    file.fileName.substring(0, 27) + '...' : 
                    file.fileName;
                pdf.text(truncatedName, currentX + imgWidth/2, currentY + imgHeight/2 + 20, { align: 'center' });
            }
          }
          imagesOnCurrentPage++;
          // Only add a new page if more images remain, and this is not the last image of the last section
          if (imagesOnCurrentPage === 4 && i !== imageFiles.length - 1) {
            pdf.addPage();
            // Do NOT call addHeader here
            pdf.setFontSize(14);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'bold');
            pdf.text(section.title, margin, 35);
            yPosition = 50;
            imagesOnCurrentPage = 0;
          }
        }
        // Only add a new page if this is not the last section
        if (sectionIdx !== sectionsToExport.length - 1) {
          pdf.addPage();
        }
      }
      // After all pages are generated, set correct page numbers
      const totalPagesGenerated = (pdf as any).getNumberOfPages();
      for (let i = 1; i <= totalPagesGenerated; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`${i}/${totalPagesGenerated}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      // Generate filename
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `Photo_Dokumentasi_${selectedSiteId || selectedSiteName}_${dateStr}_${timeStr}.pdf`;

      // Save PDF
      pdf.save(filename);
      
      console.log(`PDF exported: ${filename}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  useEffect(() => {
    if (siteIdParam) {
      setSelectedSiteId(siteIdParam);
    }
  }, [siteIdParam]);

  useEffect(() => {
    if (divisionParam && validDivisions.includes(divisionParam)) {
      setSelectedSectionDivision(divisionParam);
    }
  }, [divisionParam]);

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-sans">
      <Sidebar
      />
      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        <div className="max-w-full mx-auto">
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
                  Site Preview
                </h2>
              </div>
            </div>
          </div>

          {/* Combined Filter Section */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
            <div className="flex flex-wrap gap-3 mb-4">
              {actionButtons.map((buttonLabel, index) => (
                <button
                  key={index}
                  className={`relative font-bold py-2 px-4 rounded-md whitespace-nowrap transition duration-200
                    ${selectedSectionDivision === buttonLabel ? "bg-[#1e293b] text-white shadow-lg ring-2 ring-blue-300" : "bg-blue-900 text-white hover:bg-[#1e293b]"}
                  `}
                  onClick={() => setSelectedSectionDivision(selectedSectionDivision === buttonLabel ? "" : buttonLabel)}
                >
                  {buttonLabel}
                </button>
              ))}
            </div>
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-grow">
                <div>
                  <input
                    type="text"
                    className="border border-gray-200 rounded-md p-2 text-sm w-full mb-1 bg-white text-gray-700"
                    placeholder="Search Region..."
                    value={regionSearch}
                    onChange={e => setRegionSearch(e.target.value)}
                  />
                  <select
                    className="border border-gray-200 rounded-md p-2 text-sm w-full bg-white text-gray-500"
                    value={selectedRegion}
                    onChange={handleRegionChange}
                  >
                    <option value="">Pilih Region</option>
                    {regionOptions.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    className="border border-gray-200 rounded-md p-2 text-sm w-full mb-1 bg-white text-gray-700"
                    placeholder="Search City..."
                    value={citySearch}
                    onChange={e => setCitySearch(e.target.value)}
                  />
                  <select
                    className="border border-gray-200 rounded-md p-2 text-sm w-full bg-white text-gray-500"
                    value={selectedCity}
                    onChange={handleCityChange}
                  >
                    <option value="">Pilih City</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    className="border border-gray-200 rounded-md p-2 text-sm w-full mb-1 bg-white text-gray-700"
                    placeholder="Search Site Name..."
                    value={siteNameSearch}
                    onChange={e => setSiteNameSearch(e.target.value)}
                  />
                  <select
                    className="border border-gray-200 rounded-md p-2 text-sm w-full bg-white text-gray-500"
                    value={selectedSiteName}
                    onChange={handleSiteNameChange}
                  >
                    <option value="">Pilih Site Name</option>
                    {siteNameOptions.map((siteName) => (
                      <option key={siteName} value={siteName}>{siteName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    className="border border-gray-200 rounded-md p-2 text-sm w-full mb-1 bg-white text-gray-700"
                    placeholder="Search Site ID..."
                    value={siteIdSearch}
                    onChange={e => setSiteIdSearch(e.target.value)}
                  />
                  <select
                    className="border border-gray-200 rounded-md p-2 text-sm w-full bg-white text-gray-500"
                    value={selectedSiteId}
                    onChange={handleSiteIdChange}
                  >
                    <option value="">Pilih Site ID</option>
                    {siteIdOptions.map((siteId) => (
                      <option key={siteId} value={siteId}>{siteId}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col items-stretch sm:items-end space-y-3 flex-shrink-0 lg:ml-4">
                <button 
                  onClick={handleExportZIP}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md whitespace-nowrap transition duration-200"
                >
                  Export ZIP
                </button>
                <button 
                  onClick={handleExportPDF}
                  className="bg-blue-900 hover:bg-[#1e293b] text-white font-bold py-2 px-6 rounded-md whitespace-nowrap transition duration-200"
                >
                  Export PDF
                </button>
                <div className="flex items-center justify-center bg-gray-100 rounded-md px-4 py-2">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-sm text-gray-700">Total HP: <span className="font-semibold text-gray-800 ml-1">{totalHP.toLocaleString()}</span></span>
                </div>
                <button 
                  className={`font-bold py-2 px-6 rounded-md whitespace-nowrap transition duration-200 ${
                    isCheckMode 
                      ? "bg-red-600 hover:bg-red-700 text-white" 
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                  onClick={handleCheckButtonClick}
                >
                  {isCheckMode ? "Cancel Check" : "Check"}
                </button>
              </div>
            </div>
          </div>

          {/* BOQ Data Status Message */}
          {showSections && !boqData && (selectedSiteId || selectedSiteName) && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-yellow-800">No BOQ Data Found</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    No BOQ data found for site "{selectedSiteId || selectedSiteName}". The photo counts will use default values. 
                    upload After DRM BOQ data for this site through the BOQ page.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Collapsible Sections */}
          {showSections && filteredSections.map((item, index) => {
            // Ambil nama section tanpa awalan abjad dan titik
            const sectionKey = item.title.replace(/[^a-zA-Z]/g, "").toLowerCase();
            const sectionName = item.title.replace(/^[A-Z]+\.\s*/, "");
            const isLocked = item.status === 'Done';
            return (
              <div key={index} className="mb-4 flex items-start">
                {/* Checkbox untuk mode check */}
                {isCheckMode && (
                  <input
                    type="checkbox"
                    className="mr-3 mt-6 w-5 h-5 accent-green-600"
                    checked={checkedSections.includes(sectionKey)}
                    onChange={e => {
                      handleSectionCheckbox(sectionKey, e.target.checked);
                      setShowCheckPanel(e.target.checked || checkedSections.length > 0);
                    }}
                    disabled={isLocked}
                  />
                )}
                <div className="flex-1">
                  <button
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex items-center justify-between p-4 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition duration-200"
                  >
                    <div className="flex items-center">
                      <ChevronDownIcon
                        className={`w-5 h-5 transition-transform ${
                          isOpen[sectionKey] ? "rotate-180" : ""
                        }`}
                      />
                      <h2 className="font-bold text-lg ml-3">{item.title}</h2>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded text-white text-center select-none ${
                          item.color === "red"
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        } transition duration-200`}
                        style={{ display: 'inline-block', minWidth: 70 }}
                      >
                        {item.status}
                      </span>
                      <span className="text-white text-sm">
                        ({item.photoCount})
                      </span>
                    </div>
                  </button>
                {isOpen[sectionKey] && (
                  <div className="p-6 bg-white border border-gray-200 rounded-b-lg">
                                         {/* BOQ Target Information */}
                     {sectionMaterialCodeMap[item.title] && boqData && (
                       <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                         <h3 className="font-semibold text-blue-900 mb-2">BOQ Target Information (After DRM BOQ)</h3>
                         <div className="grid grid-cols-2 gap-4 text-sm">
                           <div>
                             <span className="font-medium">Material Code:</span> {sectionMaterialCodeMap[item.title]}
                           </div>
                           <div>
                             <span className="font-medium">Target Photos:</span> {item.photoCount.split('/')[1]}
                           </div>
                           {(() => {
                             const materialCode = sectionMaterialCodeMap[item.title];
                             const afterDrmItems = boqData.afterDrmBoq || [];
                             const matchingItem = afterDrmItems.find((boqItem: any) => {
                               const itemCode = boqItem.materialCode?.toString();
                               const searchCode = materialCode.toString();
                               return itemCode === searchCode;
                             });
                             return matchingItem ? (
                               <div className="col-span-2">
                                 <span className="font-medium">Material Name:</span> {matchingItem.materialName}
                               </div>
                             ) : null;
                           })()}
                         </div>
                       </div>
                     )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {item.images.length > 0 && item.images.some((_, imgIndex) => selectedFiles[getImageKey(sectionKey, imgIndex)]) && item.images.map((image, imgIndex) => {
                        const imageKey = getImageKey(sectionKey, imgIndex);
                        return (
                          <div
                            key={imgIndex}
                            className="relative flex flex-col justify-between border rounded-xl shadow bg-white overflow-hidden min-h-[290px] group"
                            style={{ minWidth: 220 }}
                          >
                            <div className="relative w-full h-40 flex items-center justify-center bg-gray-100">
                              <img
                                src={image.src}
                                alt={`${item.title} ${imgIndex + 1}`}
                                className="w-full h-40 object-cover"
                              />
                              <div className="absolute top-1/2 right-1/2 transform translate-x-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 w-32 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                  className="bg-blue-600 text-white px-0 py-2 rounded-full shadow hover:bg-blue-700 transition duration-200 font-semibold text-base w-full"
                                  onClick={() => handleUploadClick(sectionKey, imgIndex)}
                                  type="button"
                                >
                                  Upload
                                </button>
                                {uploadTarget && uploadTarget.sectionKey === sectionKey && uploadTarget.imgIndex === imgIndex && (
                                  <input
                                    type="file"
                                    style={{ display: "none" }}
                                    onChange={handleFileChange}
                                  />
                                )}
                                <button className="bg-blue-600 text-white px-0 py-2 rounded-full shadow hover:bg-blue-700 transition duration-200 font-semibold text-base w-full">
                                  Download
                                </button>
                              </div>
                            </div>
                            <div className="flex-1 flex flex-col justify-end">
                              <div className="bg-blue-900 text-white rounded-b-xl px-4 py-3 mt-2">
                                <p className="text-sm font-semibold">Remark: Visit {imgIndex + 1}</p>
                                <p className="text-xs mt-1">{image.remark}</p>
                              </div>
                              {selectedFiles[imageKey] && (
                                <span className="text-xs text-green-700 ml-2 mt-1">
                                  {selectedFiles[imageKey]?.name}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {/* Uploaded images for this section */}
                      {uploadedSections.filter(s => s.section === sectionName).map((item, idx) => (
                        item.status_task === 'Done' ? (
                          <div key={idx} className="relative border rounded-xl shadow bg-white overflow-hidden group" style={{ minWidth: 220 }}>
                            <div className="relative w-full h-60 flex items-center justify-center bg-gray-100">
                              {(isImageFile(item.fileName) || isImageFile(item.fileUrl)) ? (
                                <img src={item.fileUrl} alt={item.fileName} className="w-full h-60 object-cover" />
                              ) : (isPdfFile(item.fileName) || isPdfFile(item.fileUrl)) ? (
                                <iframe src={item.fileUrl} title={item.fileName} className="w-full h-60 bg-gray-100" />
                              ) : (
                                <div className="flex flex-col items-center justify-center w-full h-full">
                                  <FileIcon />
                                  <span className="mt-2 text-gray-700 font-semibold text-base text-center w-full">{item.fileName}</span>
                                </div>
                              )}
                            </div>
                            <div className="absolute top-1/2 right-1/2 transform translate-x-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 w-32 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button className="bg-blue-600 text-white px-0 py-2 rounded-full shadow hover:bg-blue-700 transition duration-200 font-semibold text-base w-full" onClick={() => { const a = document.createElement('a'); a.href = item.fileUrl; a.download = item.fileName; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); }, 100); }} type="button">Download</button>
                            </div>
                            <div className="bg-blue-900 text-white rounded-b-xl px-4 py-3">
                              <p className="text-sm font-semibold">Remark: {item.remark || '-'}</p>
                              <p className="text-xs mt-1">Details: {item.details || '-'}</p>
                              <p className="text-xs mt-1 italic">Upload by: {item.uploadBy || '-'}</p>
                              <p className="text-xs mt-1 text-blue-200">
                                Uploaded: {item.uploadedAt ? 
                                  new Date(item.uploadedAt.seconds * 1000).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '-'
                                }
                              </p>
                              {item.status_task === 'Done' && (
                                <p className="text-xs mt-1 text-green-300 font-semibold">✓ Completed</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div key={idx} className="relative border rounded-xl shadow bg-white overflow-hidden group" style={{ minWidth: 220 }}>
                            {/* Only show remove button if status is not Done */}
                            {item.status_task !== 'Done' && (
                              <button
                                className="absolute top-2 right-2 z-20 bg-white border border-gray-300 shadow-sm rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-100 transition group/remove"
                                onClick={() => handleRemoveUpload(sectionKey, idx)}
                                title="Remove"
                                type="button"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  className="w-4 h-4 text-gray-400 group-hover/remove:text-red-600"
                                >
                                  <line x1="5" y1="5" x2="15" y2="15" />
                                  <line x1="15" y1="5" x2="5" y2="15" />
                                </svg>
                              </button>
                            )}
                            <div className="relative w-full h-60 flex items-center justify-center bg-gray-100">
                              {(isImageFile(item.fileName) || isImageFile(item.fileUrl)) ? (
                                <img src={item.fileUrl} alt={item.fileName} className="w-full h-60 object-cover" />
                              ) : (isPdfFile(item.fileName) || isPdfFile(item.fileUrl)) ? (
                                <iframe src={item.fileUrl} title={item.fileName} className="w-full h-60 bg-gray-100" />
                              ) : (
                                <div className="flex flex-col items-center justify-center w-full h-full">
                                  <FileIcon />
                                  <span className="mt-2 text-gray-700 font-semibold text-base text-center w-full">{item.fileName}</span>
                                </div>
                              )}
                            </div>
                            <div className="absolute top-1/2 right-1/2 transform translate-x-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 w-32 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {/* Only show upload button if status is not Done */}
                              {item.status_task !== 'Done' && (
                                <>
                                  <input type="file" style={{ display: 'none' }} id={`upload-input-${sectionKey}-${idx}`} onChange={e => handleSectionReplaceFileChange(sectionKey, idx, item.details, item.remark, e)} />
                                  <button className="bg-blue-600 text-white px-0 py-2 rounded-full shadow hover:bg-blue-700 transition duration-200 font-semibold text-base w-full" onClick={() => document.getElementById(`upload-input-${sectionKey}-${idx}`)?.click()} type="button">Upload</button>
                                </>
                              )}
                              <button className="bg-blue-600 text-white px-0 py-2 rounded-full shadow hover:bg-blue-700 transition duration-200 font-semibold text-base w-full" onClick={() => { const a = document.createElement('a'); a.href = item.fileUrl; a.download = item.fileName; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); }, 100); }} type="button">Download</button>
                            </div>
                            <div className="bg-blue-900 text-white rounded-b-xl px-4 py-3">
                              <p className="text-sm font-semibold">Remark: {item.remark || '-'}</p>
                              <p className="text-xs mt-1">Details: {item.details || '-'}</p>
                              <p className="text-xs mt-1 italic">Upload by: {item.uploadBy || '-'}</p>
                              <p className="text-xs mt-1 text-blue-200">
                                Uploaded: {item.uploadedAt ? 
                                  new Date(item.uploadedAt.seconds * 1000).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '-'
                                }
                              </p>
                              {item.status_task === 'Done' && (
                                <p className="text-xs mt-1 text-green-300 font-semibold">✓ Completed</p>
                              )}
                            </div>
                          </div>
                        )
                      ))}
                      {/* Pending upload preview for this section */}
                      {pendingUpload[sectionKey] && (
                        <div className="relative border rounded-xl shadow bg-white overflow-hidden group" style={{ minWidth: 220 }}>
                          <div className="relative w-full h-60 flex items-center justify-center bg-gray-100">
                            {isImageFile(pendingUpload[sectionKey]!.file.name) ? (
                              <img
                                src={URL.createObjectURL(pendingUpload[sectionKey]!.file)}
                                alt="Pending Preview"
                                className="w-full h-60 object-cover"
                              />
                            ) : isPdfFile(pendingUpload[sectionKey]!.file.name) ? (
                              <iframe
                                src={URL.createObjectURL(pendingUpload[sectionKey]!.file)}
                                title="Pending PDF Preview"
                                className="w-full h-60 bg-gray-100"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center w-full h-[300px] bg-gray-100 rounded-xl border border-gray-200 shadow-md">
                                <FileIcon />
                                <span className="mt-2 text-gray-700 font-semibold text-base text-center w-full">{pendingUpload[sectionKey]!.file.name}</span>
                              </div>
                            )}
                          </div>
                          <div className="bg-blue-900 text-white rounded-b-xl px-4 py-3 flex flex-col gap-2">
                            <input
                              type="text"
                              className="rounded-2xl px-6 py-5 text-gray-900 bg-white border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 w-full mb-6 text-2xl shadow-sm"
                              placeholder="Remark..."
                              value={pendingUpload[sectionKey]!.remark}
                              onChange={e => setPendingUpload(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey]!, remark: e.target.value } }))}
                            />
                            <input
                              type="text"
                              className="rounded-2xl px-6 py-5 text-gray-900 bg-white border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 w-full mb-10 text-2xl shadow-sm"
                              placeholder="Image Details..."
                              value={pendingUpload[sectionKey]!.details}
                              onChange={e => setPendingUpload(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey]!, details: e.target.value } }))}
                            />
                            <button
                              className="bg-gray-900 text-white px-8 py-5 rounded-2xl hover:bg-gray-700 transition duration-200 w-full text-2xl font-bold shadow-md"
                              onClick={() => { handleConfirmUpload(sectionKey); closeModal(); }}
                            >
                              Save & Upload
                            </button>
                          </div>
                        </div>
                      )}
                      {/* Only show upload card if status is Not Yet */}
                      {item.status !== 'Done' && !pendingUpload[sectionKey] && (
                        <div
                          className="flex flex-col items-center justify-center border-2 border-dashed border-blue-400 rounded-xl min-h-[290px] bg-white hover:bg-blue-50 transition duration-200 cursor-pointer"
                          onClick={e => e.currentTarget.querySelector('input')?.click()}
                          onDrop={e => handleSectionDrop(sectionKey, e)}
                          onDragOver={e => e.preventDefault()}
                          style={{ minWidth: 220 }}
                        >
                          <input
                            type="file"
                            style={{ display: 'none' }}
                            onChange={e => handleSectionUploadCardFileChange(sectionKey, e)}
                          />
                          <button className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 shadow hover:bg-blue-700 transition duration-200" type="button" tabIndex={-1}>
                            +
                          </button>
                          <p className="text-blue-900 text-sm font-semibold">Tap or Drag file to upload</p>
                        </div>
                      )}
                      {/* Show locked message when status is Done */}
                      {item.status === 'Done' && !pendingUpload[sectionKey] && (
                        <div
                          className="flex flex-col items-center justify-center border-2 border-dashed border-green-400 rounded-xl min-h-[290px] bg-green-50 transition duration-200"
                          style={{ minWidth: 220 }}
                        >
                          <div className="bg-green-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 shadow">
                            ✓
                          </div>
                          <p className="text-green-900 text-sm font-semibold">Section Completed</p>
                          <p className="text-green-700 text-xs mt-1">No further uploads allowed</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </main>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white rounded-2xl shadow-2xl p-0 max-w-2xl w-full relative flex flex-col items-center" style={{ width: '600px', height: '700px', minWidth: '320px', minHeight: '400px' }}>
            <button onClick={closeModal} className="absolute top-6 right-8 text-3xl font-bold text-gray-400 hover:text-gray-700 transition-all">&times;</button>
            <div className="flex flex-col w-full h-full p-12 overflow-y-auto items-center">
              {modal.type === 'upload' && pendingUpload[modal.sectionKey] && (
                <>
                  <div className="w-full flex justify-center mb-10">
                    {isImageFile(pendingUpload[modal.sectionKey]!.file.name) ? (
                      <img
                        src={URL.createObjectURL(pendingUpload[modal.sectionKey]!.file)}
                        alt="Pending Preview"
                        className="max-w-xl max-h-[300px] object-contain rounded-xl border border-gray-200 shadow-md"
                        style={{ width: '100%', height: '300px', objectFit: 'contain' }}
                      />
                    ) : isPdfFile(pendingUpload[modal.sectionKey]!.file.name) ? (
                      <iframe
                        src={URL.createObjectURL(pendingUpload[modal.sectionKey]!.file)}
                        title="Pending PDF Preview"
                        className="max-w-xl max-h-[300px] rounded-xl border border-gray-200 shadow-md bg-gray-100"
                        style={{ width: '100%', height: '300px' }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-[300px] bg-gray-100 rounded-xl border border-gray-200 shadow-md">
                        <FileIcon />
                        <span className="mt-2 text-gray-700 font-semibold text-lg text-center w-full">{pendingUpload[modal.sectionKey]!.file.name}</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    className="rounded-2xl px-6 py-5 text-gray-900 bg-white border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 w-full mb-6 text-2xl shadow-sm"
                    placeholder="Remark..."
                    value={pendingUpload[modal.sectionKey]!.remark}
                    onChange={e => setPendingUpload(prev => ({ ...prev, [modal.sectionKey]: { ...prev[modal.sectionKey]!, remark: e.target.value } }))}
                  />
                  <input
                    type="text"
                    className="rounded-2xl px-6 py-5 text-gray-900 bg-white border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 w-full mb-10 text-2xl shadow-sm"
                    placeholder="Image Details..."
                    value={pendingUpload[modal.sectionKey]!.details}
                    onChange={e => setPendingUpload(prev => ({ ...prev, [modal.sectionKey]: { ...prev[modal.sectionKey]!, details: e.target.value } }))}
                  />
                  <button
                    className="bg-gray-900 text-white px-8 py-5 rounded-2xl hover:bg-gray-700 transition duration-200 w-full text-2xl font-bold shadow-md"
                    onClick={() => { handleConfirmUpload(modal.sectionKey); closeModal(); }}
                  >
                    Save & Upload
                  </button>
                </>
              )}
              {modal.type === 'replace' && pendingReplace[modal.sectionKey] && (
                <>
                  <div className="w-full flex justify-center mb-10">
                    {isImageFile(pendingReplace[modal.sectionKey]!.file.name) ? (
                      <img
                        src={URL.createObjectURL(pendingReplace[modal.sectionKey]!.file)}
                        alt="Pending Replace Preview"
                        className="max-w-xl max-h-[300px] object-contain rounded-xl border border-gray-200 shadow-md"
                        style={{ width: '100%', height: '300px', objectFit: 'contain' }}
                      />
                    ) : isPdfFile(pendingReplace[modal.sectionKey]!.file.name) ? (
                      <iframe
                        src={URL.createObjectURL(pendingReplace[modal.sectionKey]!.file)}
                        title="Pending Replace PDF Preview"
                        className="max-w-xl max-h-[300px] rounded-xl border border-gray-200 shadow-md bg-gray-100"
                        style={{ width: '100%', height: '300px' }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-[300px] bg-gray-100 rounded-xl border border-gray-200 shadow-md">
                        <FileIcon />
                        <span className="mt-2 text-gray-700 font-semibold text-lg text-center w-full">{pendingReplace[modal.sectionKey]!.file.name}</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    className="rounded-2xl px-6 py-5 text-gray-900 bg-white border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 w-full mb-6 text-2xl shadow-sm"
                    placeholder="Remark..."
                    value={pendingReplace[modal.sectionKey]!.remark}
                    onChange={e => setPendingReplace(prev => ({ ...prev, [modal.sectionKey]: { ...prev[modal.sectionKey]!, remark: e.target.value } }))}
                  />
                  <input
                    type="text"
                    className="rounded-2xl px-6 py-5 text-gray-900 bg-white border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 w-full mb-10 text-2xl shadow-sm"
                    placeholder="Image Details..."
                    value={pendingReplace[modal.sectionKey]!.details}
                    onChange={e => setPendingReplace(prev => ({ ...prev, [modal.sectionKey]: { ...prev[modal.sectionKey]!, details: e.target.value } }))}
                  />
                  <button
                    className="bg-gray-900 text-white px-8 py-5 rounded-2xl hover:bg-gray-700 transition duration-200 w-full text-2xl font-bold shadow-md"
                    onClick={() => { handleConfirmReplace(modal.sectionKey); closeModal(); }}
                  >
                    Save & Replace
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Check Panel */}
      {isCheckMode && checkedSections.length > 0 && (
        <div className="fixed top-24 right-8 z-50 bg-white border border-green-600 rounded-2xl shadow-2xl p-8 w-80 flex flex-col items-center">
          <h3 className="text-xl font-bold mb-4 text-green-700">Check Section</h3>
          <ul className="mb-6 w-full">
            {checkedSections.map((key, idx) => {
              const sectionObj = sectionList.find(s => s.title.replace(/[^a-zA-Z]/g, "").toLowerCase() === key);
              return (
                <li key={key} className="text-base text-gray-800 mb-2 font-semibold">
                  {sectionObj ? sectionObj.title : key}
                </li>
              );
            })}
          </ul>
          {isProcessing ? (
            <div className="w-full text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-3 text-green-700 font-semibold">Processing...</span>
              </div>
              <p className="text-sm text-gray-600">Sedang mengupdate status section...</p>
            </div>
          ) : showRejectInput ? (
            <>
              <textarea
                className="w-full border border-gray-300 rounded-md p-2 mb-4 text-gray-800"
                rows={3}
                placeholder="Masukkan alasan reject..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
              <div className="flex gap-4 w-full">
                <button 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md" 
                  onClick={handleSubmitRejectConfirm} 
                  disabled={!rejectReason.trim()}
                >
                  Submit Reject
                </button>
                <button 
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md" 
                  onClick={() => { setShowRejectInput(false); setRejectReason(""); }}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-4 w-full">
              <button 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md" 
                onClick={handlePassSectionsConfirm}
                disabled={isProcessing}
              >
                Pass
              </button>
              <button 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md" 
                onClick={handleRejectSections}
                disabled={isProcessing}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.type && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full flex flex-col items-center">
            <h4 className="text-lg font-bold mb-4 text-gray-800 text-center">
              {confirmModal.type === 'pass' ? 'Yakin ingin Pass section ini?' : 'Yakin ingin Reject section ini?'}
            </h4>
            {isProcessing ? (
              <div className="w-full text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <span className="ml-3 text-green-700 font-semibold">Processing...</span>
                </div>
                <p className="text-sm text-gray-600">Sedang mengupdate status section...</p>
              </div>
            ) : (
              <div className="flex gap-6 mt-2">
                <button 
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md" 
                  onClick={handleConfirmYes}
                  disabled={isProcessing}
                >
                  Yes
                </button>
                <button 
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-md" 
                  onClick={handleConfirmNo}
                  disabled={isProcessing}
                >
                  No
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SitePreviewPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SitePreviewContent />
    </Suspense>
  );
};

export default SitePreviewPage;
