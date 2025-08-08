"use client";

import React, { useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import { Save, X, FileDown, Edit2 } from "lucide-react";
import BOQDetailsModal from "./BOQDetailsModal";
import Pagination from "@/app/components/Pagination";
import { usePagination } from "@/app/hooks/usePagination";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, onSnapshot, doc, getDoc, where } from "firebase/firestore";
import { useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import * as XLSX from 'xlsx';

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

// Test function to verify Firebase connection
async function testFirebaseConnection() {
  try {
    console.log("Testing Firebase connection...");
    const testQuery = query(collection(db, "tasks"), limit(1));
    const testSnapshot = await getDocs(testQuery);
    console.log("Firebase connection successful. Found", testSnapshot.size, "documents");
    return true;
  } catch (error) {
    console.error("Firebase connection failed:", error);
    return false;
  }
}

// Backend logic for progress and status
async function getSiteProgress(siteId: string, siteName?: string): Promise<{ 
  Permit: string; 
  SND: string; 
  CW: string; 
  EL: string; 
  Document: string;
  PermitRejected: boolean;
  SNDRejected: boolean;
  CWRejected: boolean;
  ELRejected: boolean;
  DocumentRejected: boolean;
  PermitRejectReason: string;
  SNDRejectReason: string;
  CWRejectReason: string;
  ELRejectReason: string;
  DocumentRejectReason: string;
}> {
  try {
    // Find all task documents by siteId or siteName (tanpa filter division)
    let q;
    if (siteId) {
      q = query(collection(db, "tasks"), where("siteId", "==", siteId));
    } else if (siteName) {
      q = query(collection(db, "tasks"), where("siteName", "==", siteName));
    } else {
      return {
        Permit: "0/0",
        SND: "0/0", 
        CW: "0/0",
        EL: "0/0",
        Document: "0/0",
        PermitRejected: false,
        SNDRejected: false,
        CWRejected: false,
        ELRejected: false,
        DocumentRejected: false,
        PermitRejectReason: "",
        SNDRejectReason: "",
        CWRejectReason: "",
        ELRejectReason: "",
        DocumentRejectReason: ""
      };
    }
    const snap = await getDocs(q);
    if (snap.empty) {
      return {
        Permit: "0/0",
        SND: "0/0",
        CW: "0/0", 
        EL: "0/0",
        Document: "0/0",
        PermitRejected: false,
        SNDRejected: false,
        CWRejected: false,
        ELRejected: false,
        DocumentRejected: false,
        PermitRejectReason: "",
        SNDRejectReason: "",
        CWRejectReason: "",
        ELRejectReason: "",
        DocumentRejectReason: ""
      };
    }
    // Gabungkan semua sections dari semua dokumen tasks dengan siteName sama
    let allSections: any[] = [];
    snap.docs.forEach(doc => {
      const data = doc.data();
      if (Array.isArray(data.sections)) {
        allSections = allSections.concat(data.sections);
      }
    });
    // Section list with division mapping (same as preview page)
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
      { title: "B. RFS EL", division: "EL" },
      { title: "C. ATP EL", division: "EL" },
      // Document
      { title: "A. RFS", division: "Document" },
      { title: "B. ATP Document", division: "Document" },
      { title: "C. CW Document", division: "Document" },
      { title: "D. EL/OPM", division: "Document" },
      { title: "E. Opname", division: "Document" },
      { title: "F. ABD Document", division: "Document" },
      { title: "G. RFS Certificate", division: "Document" },
      { title: "H. CW Certificate", division: "Document" },
      { title: "I. EL Certificate", division: "Document" },
      { title: "J. FAC Certificate", division: "Document" },
    ];
    // Section max photo count mapping (same as preview page)
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
      // CW
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
      "B. RFS EL": 1,
      "C. ATP EL": 3,
      // Document
      "A. RFS": 1,
      "B. ATP Document": 1,
      "C. CW Document": 1,
      "D. EL/OPM": 1,
      "E. Opname": 1,
      "F. ABD Document": 1,
      "G. RFS Certificate": 1,
      "H. CW Certificate": 1,
      "I. EL Certificate": 1,
      "J. FAC Certificate": 1,
    };

    // Material code mapping for sections that need to fetch from boq_files
    const sectionMaterialCodeMap: Record<string, string> = {
      "B. DIGGING HOLE": "200000690",
      "C. INSTALL POLE": "200000690", 
      "E. INSTALL FAT": "200000288",
      "F. INSTALL FDT": "200000273",
      "H. POLE FOUNDATION": "200000690",
    };

    // Try to fetch BOQ data for this site
    let boqData: any = null;
    try {
      let siteIdentifier = siteId || siteName;
      if (siteIdentifier) {
        // Try multiple search strategies
        let data: any[] = [];
        
        // Strategy 1: Search by exact siteId
        if (siteId) {
          const qBySiteId = query(collection(db, "boq_files"), where("siteId", "==", siteId));
          const snapshotBySiteId = await getDocs(qBySiteId);
          const dataBySiteId = snapshotBySiteId.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          data.push(...dataBySiteId);
        }
        
        // Strategy 2: Search by exact siteName
        if (siteName) {
          const qBySiteName = query(collection(db, "boq_files"), where("siteName", "==", siteName));
          const snapshotBySiteName = await getDocs(qBySiteName);
          const dataBySiteName = snapshotBySiteName.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          data.push(...dataBySiteName);
        }
        
        // Merge data by siteName
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
        
        const mergedArray = Object.values(mergedData);
        if (mergedArray.length > 0) {
          boqData = mergedArray[0];
        }
      }
    } catch (error) {
    }

    // Calculate progress for each division
    const divisionProgress: { [key: string]: { uploaded: number; target: number } } = {
      PERMIT: { uploaded: 0, target: 0 },
      SND: { uploaded: 0, target: 0 },
      CW: { uploaded: 0, target: 0 },
      EL: { uploaded: 0, target: 0 },
      Document: { uploaded: 0, target: 0 }
    };

    // Track rejected status for each division
    const divisionRejected: { [key: string]: boolean } = {
      PERMIT: false,
      SND: false,
      CW: false,
      EL: false,
      Document: false
    };

    // Track reject reasons for each division
    const divisionRejectReasons: { [key: string]: string[] } = {
      PERMIT: [],
      SND: [],
      CW: [],
      EL: [],
      Document: []
    };

    // Process each section
    sectionList.forEach(({ title, division }) => {
      const sectionName = title.replace(/^[A-Z]+\.\s*/, "");
      const uploads = allSections.filter((s: any) => s.section === sectionName);
      const uploadedCount = uploads.length;
      
      // Check for rejected sections in this division
      const rejectedSections = uploads.filter((s: any) => s.status_task === "Rejected");
      if (rejectedSections.length > 0) {
        divisionRejected[division] = true;
        // Collect reject reasons
        rejectedSections.forEach((section: any) => {
          if (section.reject_reason) {
            divisionRejectReasons[division].push(section.reject_reason);
          }
        });
      }
      
      // Calculate target based on BOQ data or hardcoded values
      let target = 1; // Default value
      
      if (sectionMaterialCodeMap[title] && boqData) {
        // Find the material in afterDrmBoq with matching materialCode
        const materialCode = sectionMaterialCodeMap[title];
        const afterDrmItems = boqData.afterDrmBoq || [];
        
        const matchingItem = afterDrmItems.find((item: any) => {
          const itemCode = item.materialCode?.toString();
          const searchCode = materialCode.toString();
          return itemCode === searchCode;
        });
        
        if (matchingItem && matchingItem.afterDrmBoq !== undefined && matchingItem.afterDrmBoq !== null) {
          const rawValue = matchingItem.afterDrmBoq;
          target = typeof rawValue === 'string' ? 
            parseInt(rawValue) : 
            Number(rawValue);
        } else {
          target = sectionPhotoMax[title] || 1;
        }
      } else {
        target = sectionPhotoMax[title] || 1;
      }
      
      // Add to division totals
      if (divisionProgress[division]) {
        divisionProgress[division].uploaded += uploadedCount;
        divisionProgress[division].target += target;
      }
    });

  return {
      Permit: `${divisionProgress.PERMIT.uploaded}/${divisionProgress.PERMIT.target}`,
      SND: `${divisionProgress.SND.uploaded}/${divisionProgress.SND.target}`,
      CW: `${divisionProgress.CW.uploaded}/${divisionProgress.CW.target}`,
      EL: `${divisionProgress.EL.uploaded}/${divisionProgress.EL.target}`,
      Document: `${divisionProgress.Document.uploaded}/${divisionProgress.Document.target}`,
      PermitRejected: divisionRejected.PERMIT,
      SNDRejected: divisionRejected.SND,
      CWRejected: divisionRejected.CW,
      ELRejected: divisionRejected.EL,
      DocumentRejected: divisionRejected.Document,
      PermitRejectReason: divisionRejectReasons.PERMIT.join("; "),
      SNDRejectReason: divisionRejectReasons.SND.join("; "),
      CWRejectReason: divisionRejectReasons.CW.join("; "),
      ELRejectReason: divisionRejectReasons.EL.join("; "),
      DocumentRejectReason: divisionRejectReasons.Document.join("; ")
    };
  } catch (error) {
    return {
      Permit: "0/0",
      SND: "0/0",
      CW: "0/0",
      EL: "0/0",
      Document: "0/0",
      PermitRejected: false,
      SNDRejected: false,
      CWRejected: false,
      ELRejected: false,
      DocumentRejected: false,
      PermitRejectReason: "",
      SNDRejectReason: "",
      CWRejectReason: "",
      ELRejectReason: "",
      DocumentRejectReason: ""
    };
  }
  // Final fallback return to satisfy linter
  return {
    Permit: "0/0",
    SND: "0/0",
    CW: "0/0",
    EL: "0/0",
    Document: "0/0",
    PermitRejected: false,
    SNDRejected: false,
    CWRejected: false,
    ELRejected: false,
    DocumentRejected: false,
    PermitRejectReason: "",
    SNDRejectReason: "",
    CWRejectReason: "",
    ELRejectReason: "",
    DocumentRejectReason: ""
  };
}
function getSiteStatus(progress: { Permit: string; SND: string; CW: string; EL: string; Document: string }): string {
  // Helper function to check if a progress string indicates completion
  const isCompleted = (progressStr: string) => {
    const [uploaded, target] = progressStr.split('/').map(Number);
    return uploaded > 0 && uploaded >= target;
  };
  
  const isEmpty =
    progress.Permit === "0/0" &&
    progress.SND === "0/0" &&
    progress.CW === "0/0" &&
    progress.EL === "0/0" &&
    progress.Document === "0/0";
  if (isEmpty) return "-";
  
  return (
    isCompleted(progress.Permit) &&
    isCompleted(progress.SND) &&
    isCompleted(progress.CW) &&
    isCompleted(progress.EL) &&
    isCompleted(progress.Document)
  )
    ? "Completed"
    : "In Progress";
}
async function getLastUpdate(siteName: string): Promise<string> {
  try {
    
    if (!siteName || siteName === "-") {
      return "-";
    }
    
    // Get all documents from tasks collection
    const tasksRef = collection(db, "tasks");
    const tasksSnapshot = await getDocs(tasksRef);
    
    
    let latestSection: any = null;
    let latestTime = 0;
    
    // Iterate through all task documents to find matching siteName
    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      
      // Check if this task has the matching site name
      if (taskData.siteName && taskData.siteName.toLowerCase() === siteName.toLowerCase()) {
        
        const sections = taskData.sections || [];
        
        if (sections.length === 0) {
          continue;
        }
        
        // Find the section with the latest uploadedAt in this task
        sections.forEach((section: any, index: number) => {
          
          if (section.uploadedAt) {
            // Handle Firestore timestamp
            let uploadedAt: Date;
            if (section.uploadedAt.toDate) {
              uploadedAt = section.uploadedAt.toDate();
            } else if (section.uploadedAt instanceof Date) {
              uploadedAt = section.uploadedAt;
            } else {
              uploadedAt = new Date(section.uploadedAt);
            }
            
            const timeInMs = uploadedAt.getTime();
            

            console.log(`Section ${index + 1} details:`, {
              section: section.section,
              division: section.division,
              fileName: section.fileName,
              uploadBy: section.uploadBy
            });
            
            if (timeInMs > latestTime) {
              latestTime = timeInMs;
              latestSection = section;
            }
          }
        });
      }
    }
    
    if (latestSection) {
      // Handle Firestore timestamp for the latest section
      let uploadedAt: Date;
      if (latestSection.uploadedAt.toDate) {
        uploadedAt = latestSection.uploadedAt.toDate();
      } else if (latestSection.uploadedAt instanceof Date) {
        uploadedAt = latestSection.uploadedAt;
      } else {
        uploadedAt = new Date(latestSection.uploadedAt);
      }
      
      console.log("Latest section found:", {
        section: latestSection.section,
        division: latestSection.division,
        fileName: latestSection.fileName,
        uploadBy: latestSection.uploadBy,
        uploadedAt: uploadedAt
      });
      
      // Format: DD/MM/YY, HH.MM
      const day = uploadedAt.getDate().toString().padStart(2, '0');
      const month = (uploadedAt.getMonth() + 1).toString().padStart(2, '0');
      const year = uploadedAt.getFullYear().toString().slice(-2);
      const hours = uploadedAt.getHours().toString().padStart(2, '0');
      const minutes = uploadedAt.getMinutes().toString().padStart(2, '0');
      
      return `${day}/${month}/${year}, ${hours}.${minutes}`;
    }
    
    return "-";
  } catch (error) {
    return "-";
  }
}



// Helper function to format number to Indonesian currency
function formatCurrency(amount: number): string {
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (error) {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }
}

// Function to calculate total OPS for a site
async function getTotalOps(siteId: string, siteName: string): Promise<string> {
  try {
    let totalOps = 0;
    let rpmCount = 0;
    let taskCount = 0;
    
    console.log(`🔍 Calculating Total OPS for site: ${siteName}`);
    
    // 1. Calculate OPS from request_ops_rpm collection
    const rpmQuery = query(collection(db, "request_ops_rpm"), where("siteName", "==", siteName));
    const rpmSnapshot = await getDocs(rpmQuery);
    
    console.log(`📊 Found ${rpmSnapshot.size} documents in request_ops_rpm for site: ${siteName}`);
    
    rpmSnapshot.forEach((doc) => {
      const data = doc.data();
      const statusOps = data.status_ops || '';
      const opsValue = data.ops || '';
      
      console.log(`  RPM OPS - Status: ${statusOps}, Value: ${opsValue}`);
      
      // Only count OPS with status "done" or "approved_top"
      if (statusOps.toLowerCase() === 'done' || statusOps.toLowerCase() === 'approved_top') {
        // Extract numeric value from currency string (e.g., "Rp 1,000,000" -> 1000000)
        const numericValue = opsValue.replace(/[^0-9]/g, '');
        if (numericValue) {
          const amount = parseInt(numericValue);
          totalOps += amount;
          rpmCount++;
          console.log(`  ✅ RPM OPS COUNTED - Amount: ${amount}, Running Total: ${totalOps}`);
        }
      } else {
        console.log(`  ❌ RPM OPS SKIPPED - Status: ${statusOps} not eligible`);
      }
    });
    
    // 2. Calculate OPS from request_ops subcollection in tasks
    const tasksQuery = query(collection(db, "tasks"), where("siteName", "==", siteName));
    const tasksSnapshot = await getDocs(tasksQuery);
    
    console.log(`📊 Found ${tasksSnapshot.size} tasks for site: ${siteName}`);
    
    for (const taskDoc of tasksSnapshot.docs) {
      const requestOpsSnapshot = await getDocs(collection(db, "tasks", taskDoc.id, "request_ops"));
      console.log(`  📁 Task ${taskDoc.id} has ${requestOpsSnapshot.size} request_ops documents`);
      
      requestOpsSnapshot.forEach((doc) => {
        const data = doc.data();
        const statusOps = data.status_ops || '';
        const opsValue = data.ops || '';
        
        console.log(`    Task OPS - Status: ${statusOps}, Value: ${opsValue}`);
        
        // Only count OPS with status "done" or "approved_top"
        if (statusOps.toLowerCase() === 'done' || statusOps.toLowerCase() === 'approved_top') {
          // Extract numeric value from currency string
          const numericValue = opsValue.replace(/[^0-9]/g, '');
          if (numericValue) {
            const amount = parseInt(numericValue);
            totalOps += amount;
            taskCount++;
            console.log(`    ✅ Task OPS COUNTED - Amount: ${amount}, Running Total: ${totalOps}`);
          }
        } else {
          console.log(`    ❌ Task OPS SKIPPED - Status: ${statusOps} not eligible`);
        }
      });
    }
    
    const formattedTotal = formatCurrency(totalOps);
    console.log(`💰 FINAL TOTAL OPS for ${siteName}: ${formattedTotal}`);
    console.log(`📈 Summary: RPM Count: ${rpmCount}, Task Count: ${taskCount}, Total: ${totalOps}`);
    
    // Return "-" if no OPS found, otherwise return formatted currency
    if (totalOps === 0) {
      return "-";
    }
    return formattedTotal;
  } catch (error) {
    console.error("Error calculating total OPS:", error);
    return "-";
  }
}



interface SiteData {
  no: number;
  docId?: string; // Document ID for database updates
  poPermit: string;
  poSnd: string;
  poImp: string;
  poSf: string;
  poAdd: string;
  siteId: string;
  siteName: string;
  permitStatus: string;
  sndStatus: string;
  cwStatus: string;
  elStatus: string;
  document: string;
  siteType: string;
  region: string;
  city: string;
  ntpHp: string; // NTP HP field
  drmHp: string; // DRM HP field
  rfsHp: string; // RFS HP field
  rpm: string;
  lastUpdate: string;
  operation: string;
  picPermit: string;
  picSnd: string;
  picCw: string;
  picEl: string;
  picDocument: string;
  statusPermit: string;
  statusSnd: string;
  statusCw: string;
  statusEl: string;
  statusDocument: string;
  totalOps: string;
  // Rejected status fields
  permitRejected: boolean;
  sndRejected: boolean;
  cwRejected: boolean;
  elRejected: boolean;
  documentRejected: boolean;
  // Reject reason fields
  permitRejectReason: string;
  sndRejectReason: string;
  cwRejectReason: string;
  elRejectReason: string;
  documentRejectReason: string;
  // Tambahan agar mapping tidak error
  division?: string;
  pic?: string;
  [key: string]: any;
}

const SiteDetailPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRowNo, setSelectedRowNo] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<SiteData>>({});
  // Modal state for BOQ details
  const [isBOQModalOpen, setIsBOQModalOpen] = useState(false);
  const [selectedSiteName, setSelectedSiteName] = useState<string | null>(null);
  // Add refresh trigger state
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [siteData, setSiteData] = useState<SiteData[]>([]);
  const [users, setUsers] = useState<any[]>([]); // Simpan semua user
  const [divisionUsers, setDivisionUsers] = useState<{[key: string]: any[]}>({}); // User per division

  const [filters, setFilters] = useState({
    siteName: "",
    region: "",
    city: "",
    rpm: "",
    status: "",
  });

  // Get all unique status values from all status columns
  const allStatusValues = siteData.flatMap((row) => [
    row.statusPermit,
    row.statusSnd,
    row.statusCw,
    row.statusEl,
    row.statusDocument
  ]).filter(status => status && status !== "-");
  
  const statusOptions = Array.from(new Set(allStatusValues)).sort();
  // Remove picOptions variable
  // const picOptions = Array.from(
  //   new Set(siteData.map((row) => row.pic))
  // ).sort();
  const rpmOptions = Array.from(
    new Set(siteData.map((row) => row.rpm))
  ).sort();
  
  const regionOptions = Array.from(
    new Set(siteData.map((row) => row.region))
  ).sort();
  
  const cityOptions = Array.from(
    new Set(siteData.map((row) => row.city))
  ).sort();

  const { user } = useAuth();
  const [loginName, setLoginName] = useState<string>("");
  const router = useRouter();

  // Ambil nama user dari collection users setelah login
  useEffect(() => {
    const fetchUserName = async () => {
      if (user?.uid) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setLoginName((data.name || "").toLowerCase());
        }
      }
    };
    fetchUserName();
  }, [user]);

  // Fetch semua user sekali saja dan kelompokkan berdasarkan division
  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      // Define a type for user
      type UserType = {
        id: string;
        name?: string;
        division?: string;
        department?: string;
        role?: string;
        [key: string]: any;
      };

      const allUsers: UserType[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id // Preserve the document ID
      }));
      setUsers(allUsers);
      
      // Kelompokkan user berdasarkan division
      const usersByDivision: {[key: string]: UserType[]} = {};
      allUsers.forEach(user => {
        // Coba berbagai kemungkinan field division
        const divisionFields = ['division', 'department', 'role'];
        let division = '';
        
        // Find first non-empty division field
        for (const field of divisionFields) {
          if (user[field]) {
            division = String(user[field]).toLowerCase();
            break;
          }
        }
        
        // Log user details for debugging
        console.log(`User ${user.name}: ${JSON.stringify({
          division: user.division,
          department: user.department,
          role: user.role,
          finalDivision: division
        })}`);
        
        if (division) {
          // Map 'dc' division users to 'document' in usersByDivision
          const mappedDivision = division === 'dc' ? 'document' : division;
          
          if (!usersByDivision[mappedDivision]) {
            usersByDivision[mappedDivision] = [];
          }
          usersByDivision[mappedDivision].push(user);
        }
      });
      
      // Sort users in each division by name
      Object.keys(usersByDivision).forEach(division => {
        usersByDivision[division].sort((a, b) => 
          (a.name || '').localeCompare(b.name || '')
        );
      });
      
      setDivisionUsers(usersByDivision);
      console.log("Users by division:", 
        Object.fromEntries(
          Object.entries(usersByDivision).map(([k, v]) => 
            [k, v.map(u => u.name)]
          )
        )
      );
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    async function fetchSites() {
      setIsLoading(true);
      
      // Test Firebase connection first
      const isConnected = await testFirebaseConnection();
      if (!isConnected) {
        console.error("Firebase connection failed, cannot fetch data");
        setIsLoading(false);
        return;
      }
      
      let q = collection(db, "tasks");
      const { siteName, region, city, rpm, status } = filters;
      const { query: firestoreQuery, where } = await import("firebase/firestore");
      let queryRef: any = q;
      // Remove siteName filter from Firebase query since we're using frontend filtering
      // if (siteName) queryRef = firestoreQuery(queryRef, where("siteName", "==", siteName));
      if (region) queryRef = firestoreQuery(queryRef, where("region", "==", region));
      if (city) queryRef = firestoreQuery(queryRef, where("city", "==", city));
      if (rpm) queryRef = firestoreQuery(queryRef, where("rpm", "==", rpm));
      // Note: Status filtering will be done on the frontend since we need to check multiple status columns
      const snapshot = await getDocs(queryRef);
      console.log(`🔥 Firebase query returned ${snapshot.size} documents`);
      // Gabungkan data per siteName
      const siteMap: { [siteName: string]: any[] } = {};
      snapshot.docs.forEach(doc => {
        const d: any = doc.data();
        const name = d.siteName || "-";
        if (!siteMap[name]) siteMap[name] = [];
        siteMap[name].push({ ...(d as object), docId: doc.id });
      });
      
      console.log("Site map created:", Object.keys(siteMap));
      
      const mergedRows = await Promise.all(Object.entries(siteMap).map(async ([name, docs], idx) => {
        // Gabungkan sections dari semua dokumen
        const allSections = (docs as any[]).flatMap((d: any) => Array.isArray(d.sections) ? d.sections : []);
        // Cari dokumen terbaru berdasarkan uploadedAt di sections, fallback ke dokumen pertama
        let latestDoc: any = docs[0];
        let latestTime = 0;
        (docs as any[]).forEach((d: any) => {
          if (Array.isArray(d.sections) && d.sections.length > 0) {
            const maxSection = d.sections.reduce((max: number, s: any) => {
              const t = s.uploadedAt?.seconds || 0;
              return t > max ? t : max;
            }, 0);
            if (maxSection > latestTime) {
              latestTime = maxSection;
              latestDoc = d;
            }
          }
        });
        
        console.log(`Site ${name}: Latest doc ID: ${latestDoc.docId}`);
        
        // Gabungkan PIC per kategori (pakai koma jika lebih dari satu)
        const getMergedPic = (division: string) => {
          const pics = docs.filter(d => (d.division || '').toLowerCase() === division.toLowerCase()).map(d => d.pic).filter(Boolean);
          return Array.from(new Set(pics)).join(', ') || "-";
        };
        // Ambil siteId dari dokumen terbaru
        const siteId = latestDoc.siteId || latestDoc.docId || "-";
        // Progress dan last update dari helper
        const progress = await getSiteProgress(siteId, name);
        const lastUpdate = await getLastUpdate(name);
        const totalOps = await getTotalOps(siteId, name);
        // Fungsi untuk ambil nama section terbaru sesuai division
        const getLastSectionName = (sections: any[], division: string) => {
          const filtered = (sections || [])
            .filter(s => (s.division || '').toUpperCase() === division)
            .sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
          return filtered[0]?.section || "-";
        };
        // Fungsi untuk mengambil HP berdasarkan division
        const getHpByDivision = (division: string) => {
          const divisionDoc = (docs as any[]).find(d => 
            d.division && d.division.toLowerCase() === division.toLowerCase()
          );
          return divisionDoc?.hp || "-";
        };

        const result = {
          no: idx + 1,
          docId: latestDoc.docId,
          poPermit: (docs as any[]).find(d => d.poPermit && d.poPermit !== "-")?.poPermit || "-",
          poSnd: (docs as any[]).find(d => d.poSnd && d.poSnd !== "-")?.poSnd || "-",
          poImp: (docs as any[]).find(d => d.poImp && d.poImp !== "-")?.poImp || "-",
          poSf: (docs as any[]).find(d => d.poSf && d.poSf !== "-")?.poSf || "-",
          poAdd: (docs as any[]).find(d => d.poAdd && d.poAdd !== "-")?.poAdd || "-",
          siteId: siteId,
          siteName: name,
          permitStatus: `${progress.Permit}`,
          sndStatus: `${progress.SND}`,
          cwStatus: `${progress.CW}`,
          elStatus: `${progress.EL}`,
          document: `${progress.Document}`,
          siteType: latestDoc.siteType || "-",
          region: latestDoc.region || "-",
          city: latestDoc.city || "-",
          ntpHp: getHpByDivision('permit'),
          drmHp: getHpByDivision('snd'),
          rfsHp: getHpByDivision('el'),
          rpm: latestDoc.rpm || "-",
          lastUpdate: lastUpdate || "-",
          operation: latestDoc.operation || "Preview",
          picPermit: getMergedPic('permit'),
          picSnd: getMergedPic('snd'),
          picCw: getMergedPic('cw'),
          picEl: getMergedPic('el'),
          picDocument: getMergedPic('document'),
          statusPermit: getLastSectionName(allSections, "PERMIT") || "-",
          statusSnd: getLastSectionName(allSections, "SND") || "-",
          statusCw: getLastSectionName(allSections, "CW") || "-",
          statusEl: getLastSectionName(allSections, "EL") || "-",
          statusDocument: getLastSectionName(allSections, "DOCUMENT") || "-",
          totalOps: totalOps || "-",
          // Rejected status fields
          permitRejected: progress.PermitRejected,
          sndRejected: progress.SNDRejected,
          cwRejected: progress.CWRejected,
          elRejected: progress.ELRejected,
          documentRejected: progress.DocumentRejected,
          // Reject reason fields
          permitRejectReason: progress.PermitRejectReason,
          sndRejectReason: progress.SNDRejectReason,
          cwRejectReason: progress.CWRejectReason,
          elRejectReason: progress.ELRejectReason,
          documentRejectReason: progress.DocumentRejectReason,
        };
        
        console.log(`Row ${idx + 1} for site ${name}: docId = ${result.docId}`);
        return result;
      }));
      
      // Filter agar hanya baris yang memiliki RPM sesuai loginName
      const filteredData = mergedRows.filter(row =>
        (row.rpm || '').toLowerCase().includes(loginName)
      );
      
      // Generate nomor urut berdasarkan urutan data hasil filter
      const numberedData = filteredData.map((row, idx) => ({
        ...row,
        no: idx + 1,
      }));
      
      setSiteData(numberedData);
      setIsLoading(false);
    }
    if (loginName) fetchSites();
  }, [filters, loginName, refreshTrigger]);

  // Apply frontend filtering including status filter
  const filteredData = siteData.filter(row => {
    // Apply site name filter with partial matching
    if (filters.siteName) {
      const siteNameLower = row.siteName.toLowerCase();
      const filterLower = filters.siteName.toLowerCase();
      if (!siteNameLower.includes(filterLower)) {
        return false;
      }
    }

    // Apply status filter if selected
    if (filters.status) {
      const hasMatchingStatus = [
        row.statusPermit,
        row.statusSnd,
        row.statusCw,
        row.statusEl,
        row.statusDocument
      ].some(status => status === filters.status);
      
      if (!hasMatchingStatus) {
        return false;
      }
    }
    
    return true;
  });

  // Debug: Log the results
  console.log(`📊 Total siteData: ${siteData.length}, Filtered: ${filteredData.length}, Site Name Filter: "${filters.siteName}"`);

  // Use pagination hook
  const {
    currentPage,
    totalPages,
    paginatedData,
    startItem,
    endItem,
    totalItems,
    goToPage,
    nextPage,
    previousPage,
  } = usePagination({
    data: filteredData,
    itemsPerPage: 25,
  });

  const handleEdit = () => {
    if (selectedRowNo === null) {
      alert("Please select a row to edit.");
      return;
    }
    const selectedRow = siteData.find((row) => row.no === selectedRowNo);
    if (selectedRow) {
      console.log("Editing row:", selectedRow);
      setIsEditing(true);
      setFormData({ ...selectedRow });
    } else {
      alert("Selected row not found.");
    }
  };

  const handleSave = async () => {
    if (selectedRowNo !== null) {
      const row = siteData.find((item) => item.no === selectedRowNo);
      console.log("Selected row:", row);
      console.log("Form data:", formData);
      
      if (row && row.docId) {
        console.log("Found docId:", row.docId);
        console.log("Form data:", formData);
        
        // Validate that we have at least some data to update
        const hasChanges = Object.keys(formData).some(key => {
          const formValue = formData[key as keyof typeof formData];
          const originalValue = row[key as keyof typeof row];
          
          // Skip undefined values
          if (formValue === undefined) return false;
          
          // Handle empty values and "-" values
          const normalizedFormValue = formValue === "-" || formValue === "" ? "" : formValue;
          const normalizedOriginalValue = originalValue === "-" || originalValue === "" ? "" : originalValue;
          
          // Case-insensitive comparison for string values
          const isChanged = typeof normalizedFormValue === 'string' && typeof normalizedOriginalValue === 'string'
            ? normalizedFormValue.toLowerCase() !== normalizedOriginalValue.toLowerCase()
            : normalizedFormValue !== normalizedOriginalValue;
            
          if (isChanged) {
            console.log(`Field ${key} changed: "${normalizedOriginalValue}" -> "${normalizedFormValue}"`);
          }
          
          return isChanged;
        });
        
        console.log("Has changes:", hasChanges);
        
        if (!hasChanges) {
          alert("Tidak ada perubahan untuk disimpan.");
          setIsEditing(false);
          setSelectedRowNo(null);
          setFormData({});
          return;
        }
        
        try {
          setIsLoading(true);
          
          // Get all documents for this site to find division-specific documents
          const { collection, query, where, getDocs } = await import("firebase/firestore");
          const siteDocsQuery = query(collection(db, "tasks"), where("siteName", "==", row.siteName));
          const siteDocsSnapshot = await getDocs(siteDocsQuery);
          const siteDocs = siteDocsSnapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id })) as any[];
          
          console.log(`Found ${siteDocs.length} documents for site ${row.siteName}`);
          
          // Helper function to add field to update if changed
          const addFieldIfChanged = (fieldName: string, formValue: any, originalValue: any) => {
            const normalizedFormValue = formValue === "-" ? "" : formValue;
            const normalizedOriginalValue = originalValue === "-" ? "" : originalValue;
            
            if (normalizedFormValue !== normalizedOriginalValue) {
              return { fieldName, value: normalizedFormValue };
            }
            return null;
          };
          
          // Track updates for different documents
          const updates: { docId: string; fields: any }[] = [];
          const newTasksToCreate: { division: string; pic: string; hp?: string }[] = [];
          
          // Check regular fields (non-HP fields) - these go to the latest document
          const regularFields: any = {};
          addFieldIfChanged("poPermit", formData.poPermit, row.poPermit) && (regularFields.poPermit = formData.poPermit);
          addFieldIfChanged("poSnd", formData.poSnd, row.poSnd) && (regularFields.poSnd = formData.poSnd);
          addFieldIfChanged("poImp", formData.poImp, row.poImp) && (regularFields.poImp = formData.poImp);
          addFieldIfChanged("poSf", formData.poSf, row.poSf) && (regularFields.poSf = formData.poSf);
          addFieldIfChanged("poAdd", formData.poAdd, row.poAdd) && (regularFields.poAdd = formData.poAdd);
          addFieldIfChanged("siteId", formData.siteId, row.siteId) && (regularFields.siteId = formData.siteId);
          addFieldIfChanged("siteName", formData.siteName, row.siteName) && (regularFields.siteName = formData.siteName);
          addFieldIfChanged("rpm", formData.rpm, row.rpm) && (regularFields.rpm = formData.rpm);
          
          // Check PIC changes and determine if new tasks need to be created
          const picChanges = [
            { field: 'picPermit', division: 'permit', value: formData.picPermit, original: row.picPermit },
            { field: 'picSnd', division: 'snd', value: formData.picSnd, original: row.picSnd },
            { field: 'picCw', division: 'cw', value: formData.picCw, original: row.picCw },
            { field: 'picEl', division: 'el', value: formData.picEl, original: row.picEl },
            { field: 'picDocument', division: 'document', value: formData.picDocument, original: row.picDocument }
          ];
          
          // Check HP changes
          const hpChanges = [
            { field: 'ntpHp', division: 'permit', value: formData.ntpHp, original: row.ntpHp },
            { field: 'drmHp', division: 'snd', value: formData.drmHp, original: row.drmHp },
            { field: 'rfsHp', division: 'el', value: formData.rfsHp, original: row.rfsHp }
          ];
          
          // Process regular field updates
          if (Object.keys(regularFields).length > 0) {
            // Update all documents for this site with regular fields
            siteDocs.forEach(doc => {
              updates.push({ docId: doc.docId, fields: regularFields });
            });
          }
          
          // Process PIC and HP changes
          [...picChanges, ...hpChanges].forEach(change => {
            if (change.value !== change.original) {
              // Find existing document for this division
              const existingDoc = siteDocs.find(doc => 
                doc.division && doc.division.toLowerCase() === change.division
              );
              
              if (existingDoc) {
                // Update existing document
                const existingUpdate = updates.find(u => u.docId === existingDoc.docId);
                if (existingUpdate) {
                  existingUpdate.fields[change.field] = change.value;
                  
                  // Update hp field for division when HP fields change
                  if (change.field === 'ntpHp' && change.division === 'permit') {
                    existingUpdate.fields.hp = change.value;
                  } else if (change.field === 'drmHp' && change.division === 'snd') {
                    existingUpdate.fields.hp = change.value;
                  } else if (change.field === 'rfsHp' && change.division === 'el') {
                    existingUpdate.fields.hp = change.value;
                  }
                } else {
                  const fieldsToUpdate: any = { [change.field]: change.value };
                  
                  // Update hp field for division when HP fields change
                  if (change.field === 'ntpHp' && change.division === 'permit') {
                    fieldsToUpdate.hp = change.value;
                  } else if (change.field === 'drmHp' && change.division === 'snd') {
                    fieldsToUpdate.hp = change.value;
                  } else if (change.field === 'rfsHp' && change.division === 'el') {
                    fieldsToUpdate.hp = change.value;
                  }
                  
                  updates.push({ docId: existingDoc.docId, fields: fieldsToUpdate });
                }
              } else if (change.field.startsWith('pic') && change.value) {
                // Create new task for new PIC assignment
                newTasksToCreate.push({
                  division: change.division,
                  pic: change.value,
                  hp: change.field.startsWith('pic') ? undefined : change.value
                });
              }
            }
          });
          
          // Delete existing tasks and create new ones
          const { updateDoc, addDoc, deleteDoc } = await import("firebase/firestore");

          // Update PIC in existing documents or create new ones if needed
          const picUpdatePromises: Promise<any>[] = [];
          for (const change of picChanges) {
            if (change.value !== change.original && change.value) { // Only proceed if we have a new value
              // Find existing document for this division
              const existingDoc = siteDocs.find(doc => 
                doc.division && doc.division.toLowerCase() === change.division.toLowerCase()
              );
              
              if (existingDoc) {
                // Update only the pic field in existing document
                console.log(`Updating PIC for division ${change.division} in doc ${existingDoc.docId}`);
                picUpdatePromises.push(
                  updateDoc(doc(db, "tasks", existingDoc.docId), {
                    pic: change.value
                  })
                );
              } else {
                // Create new document if one doesn't exist
                console.log(`Creating new document for division ${change.division}`);
                const templateDoc = siteDocs[0]; // Use first doc as template
                const newDocData = {
                  division: change.division.toLowerCase(),
                  pic: change.value,
                  sections: [],
                  createdAt: new Date(),
                  // Essential fields
                  siteName: row.siteName,
                  siteId: row.siteId,
                  region: row.region,
                  city: row.city,
                  rpm: row.rpm,
                  // Add HP if relevant
                  hp: (change.division.toLowerCase() === 'permit' ? formData.ntpHp : 
                       change.division.toLowerCase() === 'snd' ? formData.drmHp :
                       change.division.toLowerCase() === 'el' ? formData.rfsHp : 
                       "-")
                };
                picUpdatePromises.push(addDoc(collection(db, "tasks"), newDocData));
              }
            }
          }

          // Wait for all updates to complete
          if (picUpdatePromises.length > 0) {
            console.log(`Executing ${picUpdatePromises.length} PIC updates/creations...`);
            await Promise.all(picUpdatePromises);
          }

          // Handle regular field updates for all divisions (excluding PIC fields)
          const updatedFields = { ...updates[0]?.fields };
          delete updatedFields.pic;
          delete updatedFields.picPermit;
          delete updatedFields.picSnd;
          delete updatedFields.picCw;
          delete updatedFields.picEl;
          delete updatedFields.picDocument;
          delete updatedFields.hp;
          delete updatedFields.ntpHp;
          delete updatedFields.drmHp;
          delete updatedFields.rfsHp;

          const fieldUpdatePromises = Object.keys(updatedFields).length > 0 
            ? updates.map(update => updateDoc(doc(db, "tasks", update.docId), updatedFields))
            : [];
          
          // Handle HP updates only for existing documents
          const hpUpdatePromises: Promise<any>[] = [];
          for (const change of hpChanges) {
            if (change.value !== change.original) {
              // Find existing document for this division
              const existingDoc = siteDocs.find(doc => 
                doc.division && doc.division.toLowerCase() === change.division.toLowerCase()
              );
              
              if (existingDoc) {
                // Update HP in existing document
                console.log(`Updating HP for division ${change.division} in doc ${existingDoc.docId}`);
                hpUpdatePromises.push(
                  updateDoc(doc(db, "tasks", existingDoc.docId), {
                    hp: change.value || "-"
                  })
                );
              }
            }
          }
          
          // Execute all updates
          const results = await Promise.allSettled([
            ...fieldUpdatePromises, 
            ...picUpdatePromises, 
            ...hpUpdatePromises
          ]);
          
          // Check for any failures
          const failures = results.filter(r => r.status === 'rejected');
          if (failures.length > 0) {
            console.error("Some operations failed:", failures);
            throw new Error(`${failures.length} operations failed`);
          }

          // Log success
          console.log(`Successfully completed ${results.length} operations`);
          
          // Trigger refresh to reload latest data
          setRefreshTrigger(prev => prev + 1);
          
          // Reset form state
          setIsEditing(false);
          setSelectedRowNo(null);
          setFormData({});
          
          alert("Data updated successfully!");
          
        } catch (error) {
          console.error("Error updating data:", error);
          alert("Error updating data. Please try again.");
        } finally {
          setIsLoading(false);
        }
      } else {
        alert("Document ID not found for selected row.");
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedRowNo(null);
    setFormData({});
  };

  const handleInputChange = (field: keyof SiteData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (rowNo: number) => {
    setSelectedRowNo((prev) => (prev === rowNo ? null : rowNo));
  };

  // Utility untuk menampilkan '-' jika value kosong
  const displayValue = (value: any) => {
    if (value === undefined || value === null || value === "") return "-";
    return value;
  };

  // 6. In the table, use backend-driven values for Permit, SND, EL, Document, Status, Last Update
  const handleExportExcel = () => {
    try {
      // Prepare data for export - export all filtered data, not just current page
      const exportData = filteredData.map((row) => ({
        'No': row.no,
        'PO Permit': row.poPermit,
        'PO SND': row.poSnd,
        'PO Imp': row.poImp,
        'PO SF': row.poSf,
        'PO Add': row.poAdd,
        'Site ID': row.siteId,
        'Site Name': row.siteName,
        'Permit': row.permitStatus,
        'SND': row.sndStatus,
        'CW': row.cwStatus,
        'EL': row.elStatus,
        'Document': row.document,
        'Site Type': row.siteType,
        'Region': row.region,
        'City': row.city,
        'RPM': row.rpm,
        'PIC Permit': row.picPermit,
        'PIC SND': row.picSnd,
        'PIC CW': row.picCw,
        'PIC EL': row.picEl,
        'PIC Document': row.picDocument,
        'Status Permit': row.statusPermit,
        'Status SND': row.statusSnd,
        'Status CW': row.statusCw,
        'Status EL': row.statusEl,
        'Status Document': row.statusDocument,
        'Total OPS': row.totalOps,
        'Last Update': row.lastUpdate,
        'Operation': row.operation,
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const columnWidths = [
        { wch: 5 },   // No
        { wch: 15 },  // PO Permit
        { wch: 15 },  // PO SND
        { wch: 15 },  // PO Imp
        { wch: 15 },  // PO SF
        { wch: 15 },  // PO Add
        { wch: 20 },  // Site ID
        { wch: 40 },  // Site Name
        { wch: 12 },  // Permit
        { wch: 12 },  // SND
        { wch: 12 },  // CW
        { wch: 12 },  // EL
        { wch: 12 },  // Document
        { wch: 15 },  // Site Type
        { wch: 15 },  // Region
        { wch: 20 },  // City
        { wch: 15 },  // RPM
        { wch: 15 },  // PIC Permit
        { wch: 15 },  // PIC SND
        { wch: 15 },  // PIC CW
        { wch: 15 },  // PIC EL
        { wch: 15 },  // PIC Document
        { wch: 20 },  // Status Permit
        { wch: 20 },  // Status SND
        { wch: 20 },  // Status CW
        { wch: 20 },  // Status EL
        { wch: 20 },  // Status Document
        { wch: 15 },  // Total OPS
        { wch: 20 },  // Last Update
        { wch: 15 },  // Operation
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Site Details');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `Site_Details_${currentDate}.xlsx`;

      // Save file
      XLSX.writeFile(workbook, filename);

      console.log('Excel file exported successfully:', filename);
    } catch (error) {
      console.error('Error exporting Excel file:', error);
      alert('Error exporting Excel file. Please try again.');
    }
  };

  // Remove checkboxes and edit form rendering
  // Remove isEditing && selectedRowNo !== null && (
  //   <div className="mt-6 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
  //     <h3 className="text-lg font-semibold text-gray-900 mb-4">
  //       Edit Site:{" "}
  //       {siteData.find((row) => row.no === selectedRowNo)?.siteId}
  //     </h3>
  //     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
  //       <div>
  //         <label className="block text-sm font-medium text-gray-700">
  //           PO Permit
  //         </label>
  //         <input
  //           type="text"
  //           value={formData.poPermit || ""}
  //           onChange={(e) =>
  //             handleInputChange("poPermit", e.target.value)
  //           }
  //           className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
  //         />
  //       </div>
  //       <div>
  //         <label className="block text-sm font-medium text-gray-700">
  //           PO SND
  //         </label>
  //         <input
  //           type="text"
  //           value={formData.poSnd || ""}
  //           onChange={(e) =>
  //             handleInputChange("poSnd", e.target.value)
  //           }
  //           className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
  //         />
  //       </div>
  //       <div>
  //         <label className="block text-sm font-medium text-gray-700">
  //           PO Imp
  //         </label>
  //         <input
  //           type="text"
  //           value={formData.poImp || ""}
  //           onChange={(e) =>
  //             handleInputChange("poImp", e.target.value)
  //           }
  //           className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
  //         />
  //       </div>
  //       <div>
  //         <label className="block text-sm font-medium text-gray-700">
  //           PO SF
  //         </label>
  //         <input
  //           type="text"
  //           value={formData.poSf || ""}
  //           onChange={(e) =>
  //             handleInputChange("poSf", e.target.value)
  //           }
  //           className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
  //         />
  //       </div>
  //       <div>
  //         <label className="block text-sm font-medium text-gray-700">
  //           PO Add
  //         </label>
  //         <input
  //           type="text"
  //           value={formData.poAdd || ""}
  //           onChange={(e) =>
  //             handleInputChange("poAdd", e.target.value)
  //           }
  //           className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
  //         />
  //       </div>
  //     </div>
  //     <div className="mt-6 flex items-center justify-end space-x-3">
  //       <button
  //         onClick={handleSave}
  //         className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-sm"
  //       >
  //         <Save size={18} />
  //         <span>Save</span>
  //       </button>
  //       <button
  //         onClick={handleCancel}
  //         className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-200 text-sm font-medium shadow-sm"
  //       >
  //         <X size={18} />
  //         <span>Cancel</span>
  //       </button>
  //     </div>
  //   </div>
  // );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 p-6 lg:p-10 overflow-auto flex justify-center">
        <div className="w-full max-w-7xl">
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
                  Site Details
                </h2>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-end mb-4 space-x-3">
              {!isEditing && (
                <>
                  <button
                    onClick={handleEdit}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-sm"
                  >
                    <Edit2 size={18} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all duration-200 text-sm font-medium shadow-sm"
                  >
                    <FileDown size={18} />
                    <span>Export to Excel</span>
                  </button>
                </>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
                <input
                  type="text"
                  placeholder="Site Name"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 placeholder-gray-400 transition-all duration-200"
                  value={filters.siteName}
                  onChange={(e) =>
                    setFilters({ ...filters, siteName: e.target.value })
                  }
                />
                <select
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
                  value={filters.region}
                  onChange={(e) =>
                    setFilters({ ...filters, region: e.target.value })
                  }
                >
                  <option value="" className="text-gray-400">
                    Select Region
                  </option>
                  {regionOptions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                <select
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
                  value={filters.city}
                  onChange={(e) =>
                    setFilters({ ...filters, city: e.target.value })
                  }
                >
                  <option value="" className="text-gray-400">
                    Select City
                  </option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <select
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
                  value={filters.rpm}
                  onChange={(e) =>
                    setFilters({ ...filters, rpm: e.target.value })
                  }
                >
                  <option value="" className="text-gray-400">
                    Select RPM
                  </option>
                  {rpmOptions.map((rpm) => (
                    <option key={rpm} value={rpm}>
                      {rpm}
                    </option>
                  ))}
                </select>
                <select
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                >
                  <option value="" className="text-gray-400">
                    Select Status
                  </option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-600 font-medium">
                Showing {startItem}-{endItem} of {totalItems} records
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
                    </div>
                  ) : paginatedData.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-gray-500 text-sm font-medium">
                        No records found
                      </p>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-300 border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-indigo-900 text-white">
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          ></th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            No
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            PO Permit
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            PO SND
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            PO Imp
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            PO SF
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            PO Add
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            Site ID
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            Site Name
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            Permit
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            SND
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center "
                          >
                            CW
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            EL
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            Document
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            Site Type
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            Region
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            City
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            NTP HP
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            DRM HP
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            RFS HP
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            RPM
                          </th>
                          {/* Hapus kolom PIC utama */}
                          {/* Tambahan kolom PIC per kategori */}
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            PIC Permit
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            PIC SND
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            PIC CW
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            PIC EL
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            PIC Document
                          </th>
                          {/* Tambahan kolom Status per kategori */}
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            Status Permit
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            Status SND
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            Status CW
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            Status EL
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            Status Document
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            Total OPS
                          </th>
                          {/* Hapus kolom Status utama */}

                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            Last Update
                          </th>
                          <th
                            scope="col"
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
                          >
                            Operation
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {paginatedData.map((row, index) => (
                          <tr
                            key={row.no}
                            className={`${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            } border-b hover:bg-indigo-100 transition-all duration-200`}
                          >
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedRowNo === row.no}
                                onChange={() => handleCheckboxChange(row.no)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                disabled={isEditing && selectedRowNo !== row.no}
                              />
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {index + 1}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.poPermit)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.poSnd)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.poImp)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.poSf)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.poAdd)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.siteId)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.siteName)}
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/rpm/site/preview?siteId=${row.siteId}&division=PERMIT`)}
                              title="Click to view Permit sections"
                            >
                              <div className="flex items-center justify-center space-x-1">
                                {row.permitRejected && (
                                  <div 
                                    className="w-2 h-2 bg-red-500 rounded-full cursor-help"
                                    title={`Reject Reason = ${row.permitRejectReason || "No reason provided"}`}
                                  ></div>
                                )}
                                <span>{row.permitStatus}</span>
                              </div>
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/rpm/site/preview?siteId=${row.siteId}&division=SND`)}
                              title="Click to view SND sections"
                            >
                              <div className="flex items-center justify-center space-x-1">
                                {row.sndRejected && (
                                  <div 
                                    className="w-2 h-2 bg-red-500 rounded-full cursor-help"
                                    title={`Reject Reason = ${row.sndRejectReason || "No reason provided"}`}
                                  ></div>
                                )}
                                <span>{row.sndStatus}</span>
                              </div>
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-sm whitespace-nowrap text-black cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/rpm/site/preview?siteId=${row.siteId}&division=CW`)}
                              title="Click to view CW sections"
                            >
                              <div className="flex items-center justify-center space-x-1">
                                {row.cwRejected && (
                                  <div 
                                    className="w-2 h-2 bg-red-500 rounded-full cursor-help"
                                    title={`Reject Reason = ${row.cwRejectReason || "No reason provided"}`}
                                  ></div>
                                )}
                                <span>{row.cwStatus}</span>
                              </div>
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/rpm/site/preview?siteId=${row.siteId}&division=EL`)}
                              title="Click to view EL sections"
                            >
                              <div className="flex items-center justify-center space-x-1">
                                {row.elRejected && (
                                  <div 
                                    className="w-2 h-2 bg-red-500 rounded-full cursor-help"
                                    title={`Reject Reason = ${row.elRejectReason || "No reason provided"}`}
                                  ></div>
                                )}
                                <span>{row.elStatus}</span>
                              </div>
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/rpm/site/preview?siteId=${row.siteId}&division=Document`)}
                              title="Click to view Document sections"
                            >
                              <div className="flex items-center justify-center space-x-1">
                                {row.documentRejected && (
                                  <div 
                                    className="w-2 h-2 bg-red-500 rounded-full cursor-help"
                                    title={`Reject Reason = ${row.documentRejectReason || "No reason provided"}`}
                                  ></div>
                                )}
                                <span>{row.document}</span>
                              </div>
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.siteType)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.region)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.city)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.ntpHp)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.drmHp)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.rfsHp)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.rpm)}
                            </td>
                            {/* Hapus kolom PIC utama */}
                            {/* Tambahan kolom PIC per kategori */}
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.picPermit)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.picSnd)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.picCw)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.picEl)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.picDocument)}
                            </td>
                            {/* Tambahan kolom Status per kategori */}
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.statusPermit)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.statusSnd)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.statusCw)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.statusEl)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.statusDocument)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.totalOps)}
                            </td>
                            {/* Hapus kolom Status utama */}

                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(row.lastUpdate)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              <div className="flex justify-center items-center space-x-3">
                                <button
                                  onClick={() => router.push(`/project/rpm/site/preview?siteName=${encodeURIComponent(row.siteName)}`)}
                                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all duration-200 text-sm font-medium shadow-sm"
                                >
                                  {displayValue(row.operation)}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedSiteName(row.siteName);
                                    setIsBOQModalOpen(true);
                                  }}
                                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all duration-200 text-sm font-medium shadow-sm"
                                >
                                  Check BOQ
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Pagination */}
            <Pagination
              data={filteredData}
              currentPage={currentPage}
              onPageChange={goToPage}
              itemsPerPage={25}
            />

            {/* Edit Form */}
            {isEditing && selectedRowNo !== null && (
              <div className="mt-6 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Edit Site: {siteData.find((row) => row.no === selectedRowNo)?.siteId}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PO Permit</label>
                    <input
                      type="text"
                      value={formData.poPermit || ""}
                      onChange={(e) => handleInputChange("poPermit", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PO SND</label>
                    <input
                      type="text"
                      value={formData.poSnd || ""}
                      onChange={(e) => handleInputChange("poSnd", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PO Imp</label>
                    <input
                      type="text"
                      value={formData.poImp || ""}
                      onChange={(e) => handleInputChange("poImp", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PO SF</label>
                    <input
                      type="text"
                      value={formData.poSf || ""}
                      onChange={(e) => handleInputChange("poSf", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PO Add</label>
                    <input
                      type="text"
                      value={formData.poAdd || ""}
                      onChange={(e) => handleInputChange("poAdd", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Site ID</label>
                    <input
                      type="text"
                      value={formData.siteId || ""}
                      onChange={(e) => handleInputChange("siteId", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Site Name</label>
                    <input
                      type="text"
                      value={formData.siteName || ""}
                      onChange={(e) => handleInputChange("siteName", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">NTP HP</label>
                    <input
                      type="text"
                      value={formData.ntpHp || ""}
                      onChange={(e) => handleInputChange("ntpHp", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">DRM HP</label>
                    <input
                      type="text"
                      value={formData.drmHp || ""}
                      onChange={(e) => handleInputChange("drmHp", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">RFS HP</label>
                    <input
                      type="text"
                      value={formData.rfsHp || ""}
                      onChange={(e) => handleInputChange("rfsHp", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">RPM</label>
                    <select
                      value={formData.rpm || ""}
                      onChange={(e) => handleInputChange("rpm", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 bg-white"
                    >
                      <option value="">Select RPM</option>
                      {rpmOptions.map((rpm) => (
                        <option key={rpm} value={rpm}>{rpm}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIC Permit</label>
                    <select
                      value={formData.picPermit || ""}
                      onChange={(e) => handleInputChange("picPermit", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 bg-white"
                    >
                      <option value="">Select PIC Permit</option>
                      {divisionUsers['permit']?.map((user, index) => (
                        <option key={index} value={user.name}>
                          {user.name}
                        </option>
                      ))}
                      {(!divisionUsers['permit'] || divisionUsers['permit'].length === 0) && (
                        <option value="" disabled>No users found for Permit division</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIC SND</label>
                    <select
                      value={formData.picSnd || ""}
                      onChange={(e) => handleInputChange("picSnd", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 bg-white"
                    >
                      <option value="">Select PIC SND</option>
                      {divisionUsers['snd']?.map((user, index) => (
                        <option key={index} value={user.name}>
                          {user.name}
                        </option>
                      ))}
                      {(!divisionUsers['snd'] || divisionUsers['snd'].length === 0) && (
                        <option value="" disabled>No users found for SND division</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIC CW</label>
                    <select
                      value={formData.picCw || ""}
                      onChange={(e) => handleInputChange("picCw", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 bg-white"
                    >
                      <option value="">Select PIC CW</option>
                      {divisionUsers['cw']?.map((user, index) => (
                        <option key={index} value={user.name}>
                          {user.name}
                        </option>
                      ))}
                      {(!divisionUsers['cw'] || divisionUsers['cw'].length === 0) && (
                        <option value="" disabled>No users found for CW division</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIC EL</label>
                    <select
                      value={formData.picEl || ""}
                      onChange={(e) => handleInputChange("picEl", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 bg-white"
                    >
                      <option value="">Select PIC EL</option>
                      {divisionUsers['el']?.map((user, index) => (
                        <option key={index} value={user.name}>
                          {user.name}
                        </option>
                      ))}
                      {(!divisionUsers['el'] || divisionUsers['el'].length === 0) && (
                        <option value="" disabled>No users found for EL division</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIC Document</label>
                    <select
                      value={formData.picDocument || ""}
                      onChange={(e) => handleInputChange("picDocument", e.target.value)}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 bg-white"
                    >
                      <option value="">Select PIC Document</option>
                      {divisionUsers['document']?.map((user, index) => (
                        <option key={index} value={user.name}>
                          {user.name}
                        </option>
                      ))}
                      {(!divisionUsers['document'] || divisionUsers['document'].length === 0) && (
                        <option value="" disabled>No users found for Document division</option>
                      )}
                    </select>
                  </div>

                </div>
                <div className="mt-6 flex items-center justify-end space-x-3">
                  <button
                    onClick={handleSave}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-sm"
                  >
                    <Save size={18} />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-200 text-sm font-medium shadow-sm"
                  >
                    <X size={18} />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* BOQ Details Modal */}
      {selectedSiteName && (
        <BOQDetailsModal
          isOpen={isBOQModalOpen}
          onClose={() => setIsBOQModalOpen(false)}
          siteName={selectedSiteName}
        />
      )}
    </div>
  );
};

export default SiteDetailPage;