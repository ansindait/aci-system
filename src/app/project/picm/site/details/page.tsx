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

// Function to get HP data from tasks collection
async function getHPData(siteName: string): Promise<{ ntpHP: string; drmHP: string; rfsHP: string }> {
  try {
    if (!siteName || siteName === "-") {
      return { ntpHP: "-", drmHP: "-", rfsHP: "-" };
    }

    // Get all tasks for this site
    const tasksQuery = query(collection(db, "tasks"), where("siteName", "==", siteName));
    const tasksSnapshot = await getDocs(tasksQuery);
    
    let ntpHP = "-";
    let drmHP = "-";
    let rfsHP = "-";

    tasksSnapshot.forEach((doc) => {
      const data = doc.data();
      const hp = data.hp;
      const division = data.division?.toLowerCase() || "";

      if (hp !== undefined && hp !== null) {
        // NTP HP from division permit
        if (division === "permit") {
          ntpHP = hp.toString();
        }
        // DRM HP from division snd or cw
        else if (division === "snd" || division === "cw") {
          drmHP = hp.toString();
        }
        // RFS HP from division el
        else if (division === "el") {
          rfsHP = hp.toString();
        }
      }
    });

    return { ntpHP, drmHP, rfsHP };
  } catch (error) {
    console.error("Error getting HP data:", error);
    return { ntpHP: "-", drmHP: "-", rfsHP: "-" };
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
  // Modal state for BOQ details
  const [isBOQModalOpen, setIsBOQModalOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const [siteData, setSiteData] = useState<SiteData[]>([]);
  const [users, setUsers] = useState<any[]>([]); // Simpan semua user

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

  // Fetch semua user sekali saja
  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      setUsers(snapshot.docs.map(doc => doc.data()));
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
      
      // For PIC Manager, show ALL sites (no filtering by user name)
      const filteredData = mergedRows;
      
      // Generate nomor urut berdasarkan urutan data hasil filter
      const numberedData = filteredData.map((row, idx) => ({
        ...row,
        no: idx + 1,
      }));
      
      setSiteData(numberedData);
      setIsLoading(false);
    }
    if (loginName) fetchSites();
  }, [filters, loginName]);

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
  } = usePagination({
    data: filteredData,
    itemsPerPage: 25,
  });

  // 6. In the table, use backend-driven values for Permit, SND, EL, Document, Status, Last Update
  const handleExportExcel = () => {
    console.log("Exporting to Excel...");
    
    // Prepare data for export
    const exportData = filteredData.map((row, index) => ({
      'No': index + 1,
      'PO Permit': row.poPermit || '-',
      'PO SND': row.poSnd || '-',
      'PO Imp': row.poImp || '-',
      'PO SF': row.poSf || '-',
      'PO Add': row.poAdd || '-',
      'Site ID': row.siteId || '-',
      'Site Name': row.siteName || '-',
      'Permit': row.permitStatus || '-',
      'SND': row.sndStatus || '-',
      'CW': row.cwStatus || '-',
      'EL': row.elStatus || '-',
      'Document': row.document || '-',
      'Site Type': row.siteType || '-',
      'Region': row.region || '-',
      'City': row.city || '-',
      'NTP HP': row.ntpHp || '-',
      'DRM HP': row.drmHp || '-',
      'RFS HP': row.rfsHp || '-',
      'RPM': row.rpm || '-',
      'PIC Permit': row.picPermit || '-',
      'PIC SND': row.picSnd || '-',
      'PIC CW': row.picCw || '-',
      'PIC EL': row.picEl || '-',
      'PIC Document': row.picDocument || '-',
      'Status Permit': row.statusPermit || '-',
      'Status SND': row.statusSnd || '-',
      'Status CW': row.statusCw || '-',
      'Status EL': row.statusEl || '-',
      'Status Document': row.statusDocument || '-',
      'Total OPS': row.totalOps || '-',
      'Last Update': row.lastUpdate || '-',
      'Operation': row.operation || '-'
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
      { wch: 15 },  // Site ID
      { wch: 25 },  // Site Name
      { wch: 12 },  // Permit
      { wch: 12 },  // SND
      { wch: 12 },  // CW
      { wch: 12 },  // EL
      { wch: 12 },  // Document
      { wch: 15 },  // Site Type
      { wch: 15 },  // Region
      { wch: 15 },  // City
      { wch: 15 },  // NTP HP
      { wch: 15 },  // DRM HP
      { wch: 15 },  // RFS HP
      { wch: 15 },  // RPM
      { wch: 15 },  // PIC Permit
      { wch: 15 },  // PIC SND
      { wch: 15 },  // PIC CW
      { wch: 15 },  // PIC EL
      { wch: 15 },  // PIC Document
      { wch: 15 },  // Status Permit
      { wch: 15 },  // Status SND
      { wch: 15 },  // Status CW
      { wch: 15 },  // Status EL
      { wch: 15 },  // Status Document
      { wch: 20 },  // Total OPS
      { wch: 20 },  // Last Update
      { wch: 15 }   // Operation
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Site Details');

    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
    const filename = `Site_Details_${dateStr}_${timeStr}.xlsx`;

    // Save the file
    XLSX.writeFile(workbook, filename);
    
    console.log(`Excel file exported: ${filename}`);
  };

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
              <button
                onClick={handleExportExcel}
                className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all duration-200 text-sm font-medium shadow-sm"
              >
                <FileDown size={18} />
                <span>Export to Excel</span>
              </button>
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
                              {row.no}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.poPermit}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.poSnd}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.poImp}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.poSf}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.poAdd}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.siteId}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.siteName}
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/pic/site/preview?siteId=${row.siteId}&division=PERMIT`)}
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
                              onClick={() => router.push(`/project/pic/site/preview?siteId=${row.siteId}&division=SND`)}
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
                              onClick={() => router.push(`/project/pic/site/preview?siteId=${row.siteId}&division=CW`)}
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
                              onClick={() => router.push(`/project/pic/site/preview?siteId=${row.siteId}&division=EL`)}
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
                              onClick={() => router.push(`/project/pic/site/preview?siteId=${row.siteId}&division=Document`)}
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
                              {row.siteType}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.region}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.city}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.ntpHp}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.drmHp}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.rfsHp}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.rpm}
                            </td>
                            {/* Hapus kolom PIC utama */}
                            {/* Tambahan kolom PIC per kategori */}
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.picPermit}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.picSnd}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.picCw}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.picEl}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.picDocument}
                            </td>
                            {/* Tambahan kolom Status per kategori */}
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.statusPermit}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.statusSnd}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.statusCw}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.statusEl}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.statusDocument}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.totalOps}
                            </td>

                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {row.lastUpdate}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              <div className="flex justify-center items-center space-x-3">
                                <button
                                  onClick={() => router.push(`/project/pic/site/preview?siteId=${row.siteId}`)}
                                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all duration-200 text-sm font-medium shadow-sm"
                                >
                                  {row.operation}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedSiteId(row.siteId);
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

            {/* BOQ Details Modal */}
            {selectedSiteId && (
              <BOQDetailsModal
                isOpen={isBOQModalOpen}
                onClose={() => setIsBOQModalOpen(false)}
                siteId={selectedSiteId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteDetailPage;