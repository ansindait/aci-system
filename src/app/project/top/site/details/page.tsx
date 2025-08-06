"use client";

import React, { useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import { Save, X, FileDown, Edit2 } from "lucide-react";
import BOQDetailsModal from "./BOQDetailsModal";
import Pagination from "@/app/components/Pagination";
import { usePagination } from "@/app/hooks/usePagination";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, onSnapshot, doc, getDoc, where, updateDoc, addDoc } from "firebase/firestore";
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
async function getSiteProgress(siteId: string, siteName?: string): Promise<{ Permit: string; SND: string; CW: string; EL: string; Document: string }> {
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
        Document: "0/0"
      };
    }
    const snap = await getDocs(q);
    if (snap.empty) {
      return {
        Permit: "0/0",
        SND: "0/0",
        CW: "0/0", 
        EL: "0/0",
        Document: "0/0"
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
    // Calculate progress for each division
    const divisionProgress: { [key: string]: { uploaded: number; target: number } } = {
      PERMIT: { uploaded: 0, target: 0 },
      SND: { uploaded: 0, target: 0 },
      CW: { uploaded: 0, target: 0 },
      EL: { uploaded: 0, target: 0 },
      Document: { uploaded: 0, target: 0 }
    };
    // Process each section
    sectionList.forEach(({ title, division }) => {
      const sectionName = title.replace(/^[A-Z]+\.\s*/, "");
      const uploads = allSections.filter((s: any) => s.section === sectionName);
      const uploadedCount = uploads.length;
      // Target dari mapping
      const target = sectionPhotoMax[title] || 1;
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
      Document: `${divisionProgress.Document.uploaded}/${divisionProgress.Document.target}`
    };
  } catch (error) {
    return {
      Permit: "0/0",
      SND: "0/0",
      CW: "0/0",
      EL: "0/0",
      Document: "0/0"
    };
  }
  // Final fallback return to satisfy linter
  return {
    Permit: "0/0",
    SND: "0/0",
    CW: "0/0",
    EL: "0/0",
    Document: "0/0"
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
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
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
    pic: "",
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
  const rpmOptions = Array.from(
    new Set(siteData.map((row) => row.rpm))
  ).sort();
  
  const regionOptions = Array.from(
    new Set(siteData.map((row) => row.region))
  ).sort();
  
  const cityOptions = Array.from(
    new Set(siteData.map((row) => row.city))
  ).sort();

  // Get all unique PIC values from all PIC columns
  const allPicValues = siteData.flatMap((row) => [
    row.picPermit,
    row.picSnd,
    row.picCw,
    row.picEl,
    row.picDocument
  ]).filter(pic => pic && pic !== "-");
  
  const picOptions = Array.from(new Set(allPicValues)).sort();

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
      const allUsers = snapshot.docs.map(doc => doc.data());
      setUsers(allUsers);
      
      // Kelompokkan user berdasarkan division
      const usersByDivision: {[key: string]: any[]} = {};
      allUsers.forEach(user => {
        // Coba berbagai kemungkinan field division
        const division = user.division?.toLowerCase() || 
                        user.department?.toLowerCase() || 
                        user.role?.toLowerCase() || '';
        
        console.log(`User ${user.name}: division="${user.division}", department="${user.department}", role="${user.role}", final division="${division}"`);
        
        if (division) {
          if (!usersByDivision[division]) {
            usersByDivision[division] = [];
          }
          usersByDivision[division].push(user);
        }
        
        // Mapping khusus untuk division yang sesuai dengan PIC
        // Hanya tambahkan user jika role/division mereka benar-benar sesuai
        
        // PIC Permit - hanya user dengan role/division permit
        if (user.role?.toLowerCase() === 'permit' || division === 'permit') {
          if (!usersByDivision['permit']) {
            usersByDivision['permit'] = [];
          }
          // Cek apakah user sudah ada di array untuk menghindari duplikasi
          if (!usersByDivision['permit'].find(u => u.name === user.name)) {
            usersByDivision['permit'].push(user);
          }
        }
        
        // PIC SND - hanya user dengan role/division snd atau survey
        if (user.role?.toLowerCase() === 'snd' || user.role?.toLowerCase() === 'survey' || 
            division === 'snd' || division === 'survey') {
          if (!usersByDivision['snd']) {
            usersByDivision['snd'] = [];
          }
          if (!usersByDivision['snd'].find(u => u.name === user.name)) {
            usersByDivision['snd'].push(user);
          }
        }
        
        // PIC CW - hanya user dengan role/division cw atau construction
        if (user.role?.toLowerCase() === 'cw' || user.role?.toLowerCase() === 'construction' || 
            division === 'cw' || division === 'construction') {
          if (!usersByDivision['cw']) {
            usersByDivision['cw'] = [];
          }
          if (!usersByDivision['cw'].find(u => u.name === user.name)) {
            usersByDivision['cw'].push(user);
          }
        }
        
        // PIC EL - hanya user dengan role/division el atau electrical
        if (user.role?.toLowerCase() === 'el' || user.role?.toLowerCase() === 'electrical' || 
            division === 'el' || division === 'electrical') {
          if (!usersByDivision['el']) {
            usersByDivision['el'] = [];
          }
          if (!usersByDivision['el'].find(u => u.name === user.name)) {
            usersByDivision['el'].push(user);
          }
        }
        
        // PIC Document - hanya user dengan role/division document atau dc
        if (user.role?.toLowerCase() === 'document' || user.role?.toLowerCase() === 'dc' || 
            division === 'document' || division === 'dc') {
          if (!usersByDivision['document']) {
            usersByDivision['document'] = [];
          }
          if (!usersByDivision['document'].find(u => u.name === user.name)) {
            usersByDivision['document'].push(user);
          }
        }
        
        // Mapping untuk division lainnya
        // SND bisa juga disebut 'survey'
        if (user.role?.toLowerCase() === 'survey') {
          if (!usersByDivision['snd']) {
            usersByDivision['snd'] = [];
          }
          usersByDivision['snd'].push(user);
        }
        
        // CW bisa juga disebut 'construction'
        if (user.role?.toLowerCase() === 'construction') {
          if (!usersByDivision['cw']) {
            usersByDivision['cw'] = [];
          }
          usersByDivision['cw'].push(user);
        }
        
        // EL bisa juga disebut 'electrical'
        if (user.role?.toLowerCase() === 'electrical') {
          if (!usersByDivision['el']) {
            usersByDivision['el'] = [];
          }
          usersByDivision['el'].push(user);
        }
      });
      setDivisionUsers(usersByDivision);
      
      // Debug: Log user data
      console.log('All users:', allUsers);
      console.log('Users by division:', usersByDivision);
      
      // Log detail untuk setiap division
      Object.keys(usersByDivision).forEach(division => {
        console.log(`Division "${division}":`, usersByDivision[division].map(u => u.name));
      });
      
      // Log semua field yang ada di user untuk debugging
      if (allUsers.length > 0) {
        console.log('Sample user fields:', Object.keys(allUsers[0]));
        console.log('Sample user data:', allUsers[0]);
      }
      
      // Log semua field yang ada di user untuk debugging
      if (allUsers.length > 0) {
        console.log('Sample user fields:', Object.keys(allUsers[0]));
        console.log('Sample user data:', allUsers[0]);
      }
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
          const pics = docs.filter(d => (d.division || '').toLowerCase() === division).map(d => d.pic).filter(Boolean);
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
          docId: latestDoc.docId, // Tambahkan docId untuk update
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
        };
        
        console.log(`Row ${idx + 1} for site ${name}: docId = ${result.docId}`);
        return result;
      }));
      setSiteData(mergedRows);
      setIsLoading(false);
    }
    if (loginName) fetchSites();
  }, [filters, loginName, refreshTrigger]);

  // Apply frontend filtering including status and PIC filters
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

    // Apply PIC filter if selected
    if (filters.pic) {
      const hasMatchingPic = [
        row.picPermit,
        row.picSnd,
        row.picCw,
        row.picEl,
        row.picDocument
      ].some(pic => pic === filters.pic);
      
      if (!hasMatchingPic) {
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
          
          // Skip undefined values and compare properly
          if (formValue === undefined) return false;
          
          // Handle "-" values - convert to empty string for comparison
          const normalizedFormValue = formValue === "-" ? "" : formValue;
          const normalizedOriginalValue = originalValue === "-" ? "" : originalValue;
          
          const isChanged = normalizedFormValue !== normalizedOriginalValue;
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
          
          for (const picChange of picChanges) {
            const change = addFieldIfChanged(picChange.field, picChange.value, picChange.original);
            if (change && change.value) {
              // Check if a document for this division already exists
              const existingDivisionDoc = siteDocs.find(doc => 
                doc.division && doc.division.toLowerCase() === picChange.division.toLowerCase()
              );
              
              if (existingDivisionDoc) {
                // Update existing document
                console.log(`Updating PIC ${picChange.division} on existing document ${existingDivisionDoc.docId}: "${change.value}"`);
                updates.push({ 
                  docId: existingDivisionDoc.docId, 
                  fields: { pic: change.value } 
                });
              } else {
                // Create new task for this division
                console.log(`Creating new task for division ${picChange.division} with PIC: "${change.value}"`);
                newTasksToCreate.push({ 
                  division: picChange.division, 
                  pic: change.value 
                });
              }
            }
          }
          
          // Add regular fields update to latest document
          if (Object.keys(regularFields).length > 0) {
            updates.push({ docId: row.docId, fields: regularFields });
            console.log(`Regular fields to update on ${row.docId}:`, regularFields);
          }
          
          // Handle HP fields - these need to be updated on division-specific documents
          const hpUpdates = [
            { field: 'ntpHp', division: 'permit', value: formData.ntpHp, original: row.ntpHp },
            { field: 'drmHp', division: 'snd', value: formData.drmHp, original: row.drmHp },
            { field: 'rfsHp', division: 'el', value: formData.rfsHp, original: row.rfsHp }
          ];
          
          for (const hpUpdate of hpUpdates) {
            const change = addFieldIfChanged(hpUpdate.field, hpUpdate.value, hpUpdate.original);
            if (change) {
              // Find the document for this specific division
              const divisionDoc = siteDocs.find(doc => 
                doc.division && doc.division.toLowerCase() === hpUpdate.division.toLowerCase()
              );
              
              if (divisionDoc) {
                console.log(`Updating ${hpUpdate.field} (${hpUpdate.division}) on document ${divisionDoc.docId}: "${change.value}"`);
                updates.push({ 
                  docId: divisionDoc.docId, 
                  fields: { hp: change.value } 
                });
              } else {
                // Add HP to new task creation if it's being created
                const newTaskIndex = newTasksToCreate.findIndex(task => task.division === hpUpdate.division);
                if (newTaskIndex !== -1) {
                  newTasksToCreate[newTaskIndex].hp = change.value;
                } else {
                  console.warn(`No document found for division ${hpUpdate.division} in site ${row.siteName}`);
                  // Fallback: update on the latest document
                  if (!updates.find(u => u.docId === row.docId)) {
                    updates.push({ docId: row.docId, fields: {} });
                  }
                  const latestUpdate = updates.find(u => u.docId === row.docId);
                  if (latestUpdate) {
                    latestUpdate.fields[hpUpdate.field] = change.value;
                  }
                }
              }
            }
          }
          
          console.log("All updates to perform:", updates);
          console.log("New tasks to create:", newTasksToCreate);
          
          if (updates.length === 0 && newTasksToCreate.length === 0) {
            alert("Tidak ada perubahan untuk disimpan.");
            setIsEditing(false);
            setSelectedRowNo(null);
            setFormData({});
            return;
          }
          
          // Perform all updates
          for (const update of updates) {
            console.log(`Updating document ${update.docId} with fields:`, update.fields);
            await updateDoc(doc(db, "tasks", update.docId), update.fields);
          }
          
          // Create new tasks for divisions that don't exist yet
          for (const newTask of newTasksToCreate) {
            console.log(`Creating new task for division ${newTask.division} with PIC: ${newTask.pic}`);
            
            // Get the latest document to copy basic site information
            const latestDoc = siteDocs[0];
            
            const newTaskData = {
              siteId: latestDoc.siteId || row.siteId,
              siteName: latestDoc.siteName || row.siteName,
              siteType: latestDoc.siteType || row.siteType,
              region: latestDoc.region || row.region,
              city: latestDoc.city || row.city,
              rpm: latestDoc.rpm || row.rpm,
              division: newTask.division,
              pic: newTask.pic,
              hp: newTask.hp || "",
              sections: [], // Empty sections array for new task
              createdAt: new Date(),
              // Copy PO fields from the latest document
              poPermit: latestDoc.poPermit || row.poPermit,
              poSnd: latestDoc.poSnd || row.poSnd,
              poImp: latestDoc.poImp || row.poImp,
              poSf: latestDoc.poSf || row.poSf,
              poAdd: latestDoc.poAdd || row.poAdd,
            };
            
            await addDoc(collection(db, "tasks"), newTaskData);
            console.log(`Successfully created new task for division ${newTask.division}`);
          }
          
          // Show success message
          const updateMessage = updates.length > 0 ? `Updated ${updates.length} existing task(s).` : "";
          const createMessage = newTasksToCreate.length > 0 ? `Created ${newTasksToCreate.length} new task(s).` : "";
          const message = `${updateMessage} ${createMessage}`.trim();
          alert(`Data berhasil diupdate! ${message}`);
          
          // Trigger refresh by incrementing refreshTrigger
          setRefreshTrigger(prev => prev + 1);
          
          // Refresh data by calling the useEffect again
          // The useEffect will automatically refresh the data
        } catch (err) {
          console.error("Error updating document:", err);
          alert("Gagal update data: " + (err as Error).message);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.warn("No docId found for row:", row);
        alert("Tidak dapat menemukan ID dokumen untuk update. Silakan coba lagi.");
      }
    }
    setIsEditing(false);
    setSelectedRowNo(null);
    setFormData({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedRowNo(null);
    setFormData({});
  };

  const handleInputChange = (field: keyof SiteData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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

  const handleCheckboxChange = (rowNo: number) => {
    setSelectedRowNo((prev) => (prev === rowNo ? null : rowNo));
  };

  // Utility untuk menampilkan '-' jika value kosong
  const displayValue = (value: any) => {
    if (value === undefined || value === null || value === "") return "-";
    return value;
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
                  <option value="" className="text-gray-400">Select Region</option>
                  {regionOptions.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
                <select
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
                  value={filters.city}
                  onChange={(e) =>
                    setFilters({ ...filters, city: e.target.value })
                  }
                >
                  <option value="" className="text-gray-400">Select City</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <select
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
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
                  value={filters.pic}
                  onChange={(e) =>
                    setFilters({ ...filters, pic: e.target.value })
                  }
                >
                  <option value="" className="text-gray-400">
                    Select PIC
                  </option>
                  {picOptions.map((pic) => (
                    <option key={pic} value={pic}>
                      {pic}
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
                            className="p-2 border border-gray-300 text-sm font-semibold text-center"
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
                              onClick={() => router.push(`/project/top/site/preview?siteId=${row.siteId}&division=PERMIT`)}
                              title="Click to view Permit sections"
                            >
                              {row.permitStatus}
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/top/site/preview?siteId=${row.siteId}&division=SND`)}
                              title="Click to view SND sections"
                            >
                              {row.sndStatus}
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-sm whitespace-nowrap text-black cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/top/site/preview?siteId=${row.siteId}&division=CW`)}
                              title="Click to view CW sections"
                            >
                              {row.cwStatus}
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/top/site/preview?siteId=${row.siteId}&division=EL`)}
                              title="Click to view EL sections"
                            >
                              {row.elStatus}
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/top/site/preview?siteId=${row.siteId}&division=Document`)}
                              title="Click to view Document sections"
                            >
                              {row.document}
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
                                  onClick={() => router.push(`/project/top/site/preview?siteId=${encodeURIComponent(row.siteId)}`)}
                                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all duration-200 text-sm font-medium shadow-sm"
                                >
                                  {displayValue(row.operation)}
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
      {selectedSiteId && (
        <BOQDetailsModal
          isOpen={isBOQModalOpen}
          onClose={() => setIsBOQModalOpen(false)}
          siteId={selectedSiteId}
        />
      )}
    </div>
  );
};

export default SiteDetailPage;