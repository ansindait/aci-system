"use client";

import React, { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';


import Sidebar from "@/app/components/Sidebar";
import { useSidebar } from "@/context/SidebarContext";

// Firebase helper functions
function useAuth() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading };
}

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
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const { user } = useAuth();
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

  const toggleSection = useCallback((section: string) => {
    setIsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

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
    "L. REDLINE": 1,
    // EL
    "A. OPM Test": 1,
    "B. OTDR": 1,
    "C. RFS EL": 1,
    "D. ATP EL": 3,
    // Document
    "A. RFS": 1,
    "B. ATP Document": 1,
    "C. Redline": 1,
    "D. CW Document": 1,
    "D. EL/OPM": 1,
    "E. Opname": 1,
    "F. ABD Document": 1,
    "G. RFS Certificate": 1,
    "H. CW Certificate": 1,
    "I. EL Certificate": 1,
    "J. FAC Certificate": 1,
    // Material
    "A. Request DO": 1,
    "B. DO Release": 1,
    "C. DN": 1,
    "D. Pole": 1,
    "E. Cable": 1,
    "F. FAT": 1,
    "G. FDT": 1,
    "H. ACCESORIES": 12,
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
    { title: "L. REDLINE", division: "CW" },
    // EL
    { title: "A. OPM Test", division: "EL" },
    { title: "B. OTDR", division: "EL" },
    { title: "C. RFS EL", division: "EL" },
    { title: "D. ATP EL", division: "EL" },
    // Document
    { title: "A. RFS", division: "Document" },
    { title: "B. ATP Document", division: "Document" },
    { title: "C. Redline", division: "Document" },
    { title: "D. CW Document", division: "Document" },
    { title: "D. EL/OPM", division: "Document" },
    { title: "E. Opname", division: "Document" },
    { title: "F. ABD Document", division: "Document" },
    { title: "G. RFS Certificate", division: "Document" },
    { title: "H. CW Certificate", division: "Document" },
    { title: "I. EL Certificate", division: "Document" },
    { title: "J. FAC Certificate", division: "Document" },
    // Material
    { title: "A. Request DO", division: "Material" },
    { title: "B. DO Release", division: "Material" },
    { title: "C. DN", division: "Material" },
    { title: "D. Pole", division: "Material" },
    { title: "E. Cable", division: "Material" },
    { title: "F. FAT", division: "Material" },
    { title: "G. FDT", division: "Material" },
    { title: "H. ACCESORIES", division: "Material" },
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
    if (uploads.some(u => u.status_task === "Done")) {
      status = "Done";
      color = "green";
    }
    console.log(`Section ${title}: ${count}/${max} photos (source: ${source})`);
    console.log(`Final photoCount for ${title}: ${count}/${max}`);
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
  // Calculate total HP based on selected division and site filters
  useEffect(() => {
    const calculateTotalHP = async () => {
      try {
        // 1. Fetch all tasks (Top Management can see all tasks)
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
      setFilteredSites(siteList); // Always show all sites
    };
    fetchSites();
  }, []);

  // Add filteredSites state
  const [filteredSites, setFilteredSites] = useState<SiteInfo[]>([]);
  // Remove the effect that filters by user.name

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
    const siteId = e.target.value;
    setSelectedSiteId(siteId);
    // Cari siteName yang sesuai dari daftar filteredSites
    const matchedSite = filteredSites.find(site => site.siteId === siteId);
    setSelectedSiteName(matchedSite ? matchedSite.siteName : "");
  };

  // Handler for upload card file change (per section)
  const handleSectionUploadCardFileChange = (sectionKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) openUploadModal(sectionKey, file);
  };

  // Handler for drag and drop (per section)
  const handleSectionDrop = (sectionKey: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    if (file) openUploadModal(sectionKey, file);
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
    try {
      const siteFolder = selectedSiteId || selectedSiteName;
      // Cari division yang sesuai dengan sectionKey
      const sectionObj = sectionList.find(
        (s) => s.title.replace(/[^a-zA-Z]/g, "").toLowerCase() === sectionKey
      );
      const division = sectionObj ? sectionObj.division : "";
      // Ambil nama section tanpa awalan abjad dan titik (misal: 'A. Visit' -> 'Visit', 'AA. Something' -> 'Something')
      const sectionName = sectionObj ? sectionObj.title.replace(/^[A-Z]+\.\s*/, "") : sectionKey;
      const storagePath = `uploads/${siteFolder}/${division}/${sectionKey}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);
      // Find the task document by siteId or siteName
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
      if (snap.empty) {
        alert("Data site tidak ditemukan di tasks!");
        return;
      }
      const taskDoc = snap.docs[0].ref;
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
          uploadBy: user?.email || "",
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

  // Handler for confirming replacement
  const handleConfirmReplace = (sectionKey: string) => {
    const pending = pendingReplace[sectionKey];
    if (pending) {
      setSectionUploads(prev => ({
        ...prev,
        [sectionKey]: prev[sectionKey].map((item, i) => i === pending.idx ? { file: pending.file, details: pending.details, remark: pending.remark } : item),
      }));
      setPendingReplace(prev => ({ ...prev, [sectionKey]: null }));
    }
  };

  // Handler to remove an uploaded image from a section
  const handleRemoveUpload = async (sectionKey: string, idx: number) => {
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
      const sectionName = sectionList.find(s => s.title.replace(/[^a-zA-Z]/g, "").toLowerCase() === sectionKey)?.title.replace(/^[A-Z]+\.\s*/, "") || sectionKey;
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
        const siteIdText = selectedSiteId || '-';
        const siteNameText = selectedSiteName || '-';
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
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = () => {
                reject(new Error('Image failed to load'));
              };
              img.src = file.fileUrl;
            });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
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
            // Placeholder for failed images
            pdf.setFillColor(240, 240, 240);
            pdf.rect(currentX, currentY, imgWidth, imgHeight, 'F');
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.5);
            pdf.rect(currentX, currentY, imgWidth, imgHeight, 'S');
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.setFont('helvetica', 'italic');
            pdf.text('[Image not available]', currentX + imgWidth/2, currentY + imgHeight/2, { align: 'center' });
            pdf.text(file.fileName || 'Unknown file', currentX + imgWidth/2, currentY + imgHeight/2 + 8, { align: 'center' });
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
            return (
              <div key={index} className="mb-4">
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
                      {/* Only show uploaded images for this section (no upload card, no remove button) */}
                      {uploadedSections.filter(s => s.section === sectionName).map((item, idx) => (
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
      {/* Remove/hide upload/replace modals and related logic (modal rendering at the bottom) */}
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
