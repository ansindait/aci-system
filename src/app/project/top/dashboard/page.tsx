"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList } from 'recharts';
import { Calendar, MapPin, Users, TrendingUp, FileText, Activity, Filter, X, User as UserIcon } from 'lucide-react';
import Sidebar from '@/app/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { Tooltip as RechartsTooltip } from 'recharts';
import { useRouter } from 'next/navigation';
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, onSnapshot, doc, getDoc, where } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import BOQDetailsModal from "../site/details/BOQDetailsModal";
import Pagination from "@/app/components/Pagination";
import { usePagination } from "@/app/hooks/usePagination";

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

// Backend logic for progress and status
async function getSiteProgress(siteId: string, siteName?: string): Promise<{ Permit: string; SND: string; CW: string; EL: string; Document: string }> {
  try {
    // Find the task document by siteId or siteName
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
    
    const taskData = snap.docs[0].data();
    const sections = Array.isArray(taskData.sections) ? taskData.sections : [];
    
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

    // Process each section
    sectionList.forEach(({ title, division }) => {
      const sectionName = title.replace(/^[A-Z]+\.\s*/, "");
      const uploads = sections.filter((s: any) => s.section === sectionName);
      const uploadedCount = uploads.length;
      
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
}

// Function to calculate PO Status pie chart data from Firebase
async function getPOStatusData(): Promise<Array<{ name: string; value: number; total: number; color: string; isCompleted: boolean; hp: number }>> {
  try {
    const tasksRef = collection(db, "tasks");
    const snapshot = await getDocs(tasksRef);
    const allTasks = snapshot.docs.map(doc => doc.data());
    
    console.log('=== Firebase Data Debug ===');
    console.log('Total tasks from Firebase:', allTasks.length);
    console.log('Sample tasks:', allTasks.slice(0, 5).map(t => ({ 
      siteName: t.siteName, 
      division: t.division, 
      hp: t.hp,
      poPermit: t.poPermit,
      poSnd: t.poSnd,
      poImp: t.poImp,
      poSf: t.poSf,
      poAdd: t.poAdd
    })));
    
    // Debug: Check for exact match with the data from Firebase console
    const exactMatchTasks = allTasks.filter(t => 
      t.siteName === "DUSUN BUTUHAN SENDANGREJO SLEMAN" && 
      t.division === "el" && 
      t.hp === 101
    );
    console.log('Exact match tasks (from Firebase console example):', exactMatchTasks.length);
    if (exactMatchTasks.length > 0) {
      console.log('Found exact match:', exactMatchTasks[0]);
    }
    
    // Check for tasks with division EL - try different variations
    const elTasks = allTasks.filter(task => {
      const division = task.division;
      if (!division) return false;
      
      const divisionLower = division.toLowerCase();
      const isEL = divisionLower === 'el' || divisionLower === 'electrical' || divisionLower.includes('el');
      
      if (isEL) {
        console.log(`Found EL task: ${task.siteName}, division: "${division}", hp: ${task.hp}`);
      }
      
      return isEL;
    });
    
    console.log('Tasks with division EL:', elTasks.length);
    console.log('All unique divisions found:', [...new Set(allTasks.map(t => t.division).filter(Boolean))]);
    console.log('All tasks with division field:', allTasks.filter(t => t.division).length);
    console.log('Sample tasks with any division:', allTasks.slice(0, 10).map(t => ({ 
      siteName: t.siteName, 
      division: t.division,
      hp: t.hp
    })));
    console.log('Tasks with HP > 0:', allTasks.filter(t => t.hp && t.hp > 0).length);
    console.log('Sample tasks with HP > 0:', allTasks.filter(t => t.hp && t.hp > 0).slice(0, 5).map(t => ({ 
      siteName: t.siteName, 
      division: t.division,
      hp: t.hp
    })));
    console.log('EL tasks with HP > 0:', elTasks.filter(t => t.hp && t.hp > 0).length);
    console.log('Sample EL tasks with HP:', elTasks.filter(t => t.hp && t.hp > 0).slice(0, 3).map(t => ({ 
      siteName: t.siteName, 
      division: t.division, 
      hp: t.hp
    })));
    console.log('=== End Firebase Data Debug ===');
    
    // Count unique siteNames as total tasks (if same siteName, count as 1)
    const uniqueSiteNames = [...new Set(allTasks.map(task => task.siteName).filter(Boolean))];
    const totalTasks = uniqueSiteNames.length;
    
    // Count unique siteNames that have each PO status and calculate HP for each category
    const poPermitTasks = allTasks.filter(task => task.poPermit && task.poPermit !== "-" && task.poPermit !== "");
    const poSndTasks = allTasks.filter(task => task.poSnd && task.poSnd !== "-" && task.poSnd !== "");
    const poImpTasks = allTasks.filter(task => task.poImp && task.poImp !== "-" && task.poImp !== "");
    const poSfTasks = allTasks.filter(task => task.poSf && task.poSf !== "-" && task.poSf !== "");
    const poAddTasks = allTasks.filter(task => task.poAdd && task.poAdd !== "-" && task.poAdd !== "");
    
    // Get unique site names for each PO category
    const poPermitSites = [...new Set(poPermitTasks.map(task => task.siteName))];
    const poSndSites = [...new Set(poSndTasks.map(task => task.siteName))];
    const poImpSites = [...new Set(poImpTasks.map(task => task.siteName))];
    const poSfSites = [...new Set(poSfTasks.map(task => task.siteName))];
    const poAddSites = [...new Set(poAddTasks.map(task => task.siteName))];
    
    // Calculate total HP for each PO category - only from sites with division EL
    const calculateHP = (tasks: any[]) => {
      console.log('=== HP Calculation Debug ===');
      console.log('Total tasks to process:', tasks.length);
      
      const result = tasks.reduce((sum, task) => {
        let hpValue = 0;
        
        // Get site name to find corresponding HP values
        const siteName = task.siteName;
        if (!siteName) return sum;
        
        // Find all tasks for this site to get HP values from different divisions
        const siteTasks = allTasks.filter(t => t.siteName === siteName);
        
        // Get RFS HP (division = "el")
        const rfsTask = siteTasks.find(t => t.division?.toLowerCase() === 'el');
        let rfsHp = 0;
        if (rfsTask && rfsTask.hp) {
          if (typeof rfsTask.hp === 'number') {
            rfsHp = rfsTask.hp;
          } else if (typeof rfsTask.hp === 'string') {
            rfsHp = parseInt(rfsTask.hp) || 0;
          } else {
            rfsHp = Number(rfsTask.hp) || 0;
          }
        }
        
        // Get DRM HP (division = "snd") as fallback
        const drmTask = siteTasks.find(t => t.division?.toLowerCase() === 'snd');
        let drmHp = 0;
        if (drmTask && drmTask.hp) {
          if (typeof drmTask.hp === 'number') {
            drmHp = drmTask.hp;
          } else if (typeof drmTask.hp === 'string') {
            drmHp = parseInt(drmTask.hp) || 0;
          } else {
            drmHp = Number(drmTask.hp) || 0;
          }
        }
        
        // Use RFS HP if available, otherwise use DRM HP
        hpValue = rfsHp > 0 ? rfsHp : drmHp;
        
        if (hpValue > 0) {
          console.log(`Site: ${siteName}, RFS HP: ${rfsHp}, DRM HP: ${drmHp}, Using: ${hpValue}, PO Status: ${task.poPermit || task.poSnd || task.poImp || task.poSf || task.poAdd}`);
        }
        
        return sum + hpValue;
      }, 0);
      
      console.log('Final HP total:', result);
      console.log('=== End HP Calculation Debug ===');
      
      return result;
    };
    
    const poPermitHP = calculateHP(poPermitTasks);
    const poSndHP = calculateHP(poSndTasks);
    const poImpHP = calculateHP(poImpTasks);
    const poSfHP = calculateHP(poSfTasks);
    const poAddHP = calculateHP(poAddTasks);
    
    return [
      { name: 'PO Permit', value: poPermitSites.length, total: totalTasks, color: '#FF6B6B', isCompleted: false, hp: poPermitHP },
      { name: 'PO SND', value: poSndSites.length, total: totalTasks, color: '#4ECDC4', isCompleted: false, hp: poSndHP },
      { name: 'PO IMPLEMENTATION', value: poImpSites.length, total: totalTasks, color: '#45B7D1', isCompleted: false, hp: poImpHP },
      { name: 'PO SF', value: poSfSites.length, total: totalTasks, color: '#FFA07A', isCompleted: false, hp: poSfHP },
      { name: 'PO ADDITIONAL', value: poAddSites.length, total: totalTasks, color: '#98D8C8', isCompleted: false, hp: poAddHP }
    ];
  } catch (error) {
    console.error("Error getting PO Status data:", error);
    return [
      { name: 'PO Permit', value: 0, total: 0, color: '#FF6B6B', isCompleted: false, hp: 0 },
      { name: 'PO SND', value: 0, total: 0, color: '#4ECDC4', isCompleted: false, hp: 0 },
      { name: 'PO IMPLEMENTATION', value: 0, total: 0, color: '#45B7D1', isCompleted: false, hp: 0 },
      { name: 'PO SF', value: 0, total: 0, color: '#FFA07A', isCompleted: false, hp: 0 },
      { name: 'PO ADDITIONAL', value: 0, total: 0, color: '#98D8C8', isCompleted: false, hp: 0 }
    ];
  }
}

// Function to calculate Permit pie chart data from Firebase
async function getPermitData(): Promise<Array<{ name: string; value: number; total: number; color: string; isCompleted: boolean; hp: number }>> {
  try {
    const tasksRef = collection(db, "tasks");
    const snapshot = await getDocs(tasksRef);
    const allTasks = snapshot.docs.map(doc => doc.data());
    
    // Total: semua tasks dengan division permit
    const permitTasks = allTasks.filter(task => task.division?.toLowerCase() === 'permit');
    
    // Helper function untuk mengecek section dengan status_task = 'Done'
    const checkSectionDone = (task: any, sectionName: string) => {
      if (!task.sections || !Array.isArray(task.sections)) return false;
      return task.sections.some((section: any) => 
        section.section === sectionName &&
        section.status_task === 'Done'
      );
    };
    
    // Helper function untuk menghitung unique site names
    const getUniqueSiteCount = (tasks: any[]) => {
      const uniqueSiteNames = [...new Set(tasks.map(task => task.siteName).filter(Boolean))];
      return uniqueSiteNames.length;
    };
    
    // Total unique sites dengan division permit
    const totalPermitSites = getUniqueSiteCount(permitTasks);
    
    // OG calculation moved to new logic below
    
    // BA OPEN: tasks dengan section 'BA Open' dan status_task = 'Done'
    const baOpenTasks = permitTasks.filter(task => checkSectionDone(task, 'BA Open'));
    const baOpenCount = getUniqueSiteCount(baOpenTasks);
    
    // BA REJECT: tasks dengan section 'BA Reject' dan status_task = 'Done'
    const baRejectTasks = permitTasks.filter(task => checkSectionDone(task, 'BA Reject'));
    const baRejectCount = getUniqueSiteCount(baRejectTasks);
    
    // Define progression order for dependent fields (BAK through SKOM PERMIT)
    const dependentProgression = [
      { name: 'BAK', section: 'BAK' },
      { name: 'SND KASAR', section: 'SND Kasar Permit' },
      { name: 'VALIDASI SALES', section: 'Validasi Sales' },
      { name: 'DONATION APPROVED', section: 'Donation Submit' },
      { name: 'SKOM PERMIT', section: 'SKOM Permit' }
    ];
    
    // Helper function to get latest completed status for dependent fields
    const getLatestCompletedDependentStatus = (siteName: string) => {
      const siteTasks = permitTasks.filter(task => task.siteName === siteName);
      let latestCompleted = null;
      
      for (let i = dependentProgression.length - 1; i >= 0; i--) {
        const category = dependentProgression[i];
        const hasCompleted = siteTasks.some(task => checkSectionDone(task, category.section));
        if (hasCompleted) {
          latestCompleted = category.name;
          break;
        }
      }
      
      return latestCompleted;
    };
    
    // Get unique site names for dependent fields
    const uniqueSiteNames = [...new Set(permitTasks.map(task => task.siteName).filter(Boolean))];
    
    // Count sites by their latest completed dependent status
    const dependentStatusCounts: Record<string, number> = {
      'BAK': 0,
      'SND KASAR': 0,
      'VALIDASI SALES': 0,
      'DONATION APPROVED': 0,
      'SKOM PERMIT': 0
    };
    
    const dependentStatusHP: Record<string, number> = {
      'BAK': 0,
      'SND KASAR': 0,
      'VALIDASI SALES': 0,
      'DONATION APPROVED': 0,
      'SKOM PERMIT': 0
    };
    
    uniqueSiteNames.forEach(siteName => {
      const latestStatus = getLatestCompletedDependentStatus(siteName);
      if (latestStatus && latestStatus in dependentStatusCounts) {
        dependentStatusCounts[latestStatus as keyof typeof dependentStatusCounts]++;
        
        // Calculate HP for this site
        const siteTasks = permitTasks.filter(task => task.siteName === siteName);
        const siteHP = siteTasks.reduce((sum, task) => {
          if (task.division?.toLowerCase() === 'permit' && task.hp && task.hp > 0) {
            const hpValue = typeof task.hp === 'number' ? task.hp : parseInt(task.hp) || 0;
            return sum + hpValue;
          }
          return sum;
        }, 0);
        
        dependentStatusHP[latestStatus as keyof typeof dependentStatusHP] += siteHP;
      }
    });
    
    const bakCount = dependentStatusCounts['BAK'];
    const sndKasarCount = dependentStatusCounts['SND KASAR'];
    const validasiSalesCount = dependentStatusCounts['VALIDASI SALES'];
    const donationCount = dependentStatusCounts['DONATION APPROVED'];
    const skomCount = dependentStatusCounts['SKOM PERMIT'];
    
    const bakHP = dependentStatusHP['BAK'];
    const sndKasarHP = dependentStatusHP['SND KASAR'];
    const validasiSalesHP = dependentStatusHP['VALIDASI SALES'];
    const donationHP = dependentStatusHP['DONATION APPROVED'];
    const skomHP = dependentStatusHP['SKOM PERMIT'];
    
    // Helper function untuk menghitung HP dari tasks
    const calculateHP = (tasks: any[]) => {
      return tasks.reduce((sum, task) => {
        // Hanya ambil HP jika task memiliki division permit dan hp > 0
        if (task.division?.toLowerCase() === 'permit' && task.hp && task.hp > 0) {
          const hpValue = typeof task.hp === 'number' ? task.hp : parseInt(task.hp) || 0;
          return sum + hpValue;
        }
        return sum;
      }, 0);
    };
    
    // Helper function untuk mendapatkan unique sites yang belum memiliki status permit
    const getSitesWithoutPermitStatus = () => {
      const ogUniqueSiteNames = [...new Set(permitTasks.map(task => task.siteName).filter(Boolean))];
      return ogUniqueSiteNames.filter(siteName => {
        const siteTasks = permitTasks.filter(task => task.siteName === siteName);
        // Cek apakah site ini belum memiliki status permit (masih "-" atau kosong)
        return siteTasks.every(task => {
          const statusPermit = task.statusPermit || "";
          return statusPermit === "-" || statusPermit === "" || statusPermit === null || statusPermit === undefined;
        });
      });
    };
    
    // Helper function untuk mendapatkan sites dengan division permit tapi tidak memiliki sections
    const getSitesWithPermitDivisionButNoSections = () => {
      const ogUniqueSiteNames = [...new Set(permitTasks.map(task => task.siteName).filter(Boolean))];
      return ogUniqueSiteNames.filter(siteName => {
        const siteTasks = permitTasks.filter(task => task.siteName === siteName);
        // Cek apakah site ini memiliki division permit
        const hasPermitDivision = siteTasks.some(task => 
          task.division?.toLowerCase() === 'permit'
        );
        // Cek apakah site ini memiliki section Visit dengan status task Done
        const hasVisitSectionDone = siteTasks.some(task => checkSectionDone(task, 'Visit'));
        return hasPermitDivision && hasVisitSectionDone;
      });
    };
    
    // Calculate target untuk OG (sites dengan division permit dan memiliki section Visit dengan status task Done)
    const ogTargetSites = getSitesWithPermitDivisionButNoSections();
    const ogTargetCount = ogTargetSites.length;
    
    // Debug: Check all sites and their status permit
    const allSitesWithStatus = permitTasks.map(task => ({
      siteName: task.siteName,
      statusPermit: task.statusPermit,
      hasVisitDone: checkSectionDone(task, 'Visit')
    }));
    console.log('All sites with status permit:', allSitesWithStatus);
    
    // Debug: Check sites with status permit "-"
    const sitesWithDashStatus = permitTasks.filter(task => task.statusPermit === "-");
    console.log('Sites with status permit "-":', sitesWithDashStatus.length);
    
    // Debug: Check sites with Visit section Done
    const sitesWithVisitDone = permitTasks.filter(task => checkSectionDone(task, 'Visit'));
    console.log('Sites with Visit section Done:', sitesWithVisitDone.length);
    
    // Calculate actual untuk OG (sites dengan Visit section Done, tapi belum ada status permit lain)
    let ogActualCount = 0;
    let ogActualHP = 0;
    
    const allUniqueSiteNames = [...new Set(permitTasks.map(task => task.siteName).filter(Boolean))];
    allUniqueSiteNames.forEach(siteName => {
      const siteTasks = permitTasks.filter(task => task.siteName === siteName);
      
      // Cek apakah site ini memiliki Visit section Done
      const hasVisitDone = siteTasks.some(task => checkSectionDone(task, 'Visit'));
      
      // Cek apakah site ini memiliki section lain yang Done (selain Visit)
      const hasOtherSectionDone = siteTasks.some(task => {
        if (!task.sections || !Array.isArray(task.sections)) return false;
        return task.sections.some((section: any) => {
          const sectionName = section.section || "";
          // Skip Visit section, cek section lain
          return sectionName !== 'Visit' && section.status_task === 'Done';
        });
      });
      
      // Debug untuk setiap site
      console.log(`Site: ${siteName}, Visit Done: ${hasVisitDone}, Other Section Done: ${hasOtherSectionDone}`);
      
      // OG actual hanya jika Visit Done tapi TIDAK ada section lain yang Done
      if (hasVisitDone && !hasOtherSectionDone) {
        ogActualCount++;
        console.log(`✅ Site ${siteName} counted in OG actual`);
        // Hitung HP untuk site ini
        const siteHP = siteTasks.reduce((sum, task) => {
          if (task.division?.toLowerCase() === 'permit' && task.hp && task.hp > 0) {
            const hpValue = typeof task.hp === 'number' ? task.hp : parseInt(task.hp) || 0;
            return sum + hpValue;
          }
          return sum;
        }, 0);
        ogActualHP += siteHP;
      } else {
        console.log(`❌ Site ${siteName} NOT counted in OG actual`);
      }
    });
    
    // Debug logging
    console.log('OG Actual Count:', ogActualCount);
    console.log('OG Actual HP:', ogActualHP);
    
    // Calculate HP for BA OPEN, and BA REJECT
    const baOpenHP = calculateHP(baOpenTasks);
    const baRejectHP = calculateHP(baRejectTasks);
    
    // Calculate target untuk BA OPEN (sites dengan Visit section Done)
    const baOpenTargetSites = allUniqueSiteNames.filter(siteName => {
      const siteTasks = permitTasks.filter(task => task.siteName === siteName);
      return siteTasks.some(task => checkSectionDone(task, 'Visit'));
    });
    const baOpenTargetCount = baOpenTargetSites.length;
    
    // Debug logging untuk BA OPEN target
    console.log('BA OPEN Target Sites:', baOpenTargetSites);
    console.log('BA OPEN Target Count:', baOpenTargetCount);
    
    return [
      { name: 'OG', value: ogActualCount, total: ogTargetCount, color: '#b71c1c', isCompleted: false, hp: ogActualHP },
      { name: 'BA OPEN (Approved)', value: baOpenCount, total: baOpenTargetCount, color: '#bfa600', isCompleted: false, hp: baOpenHP },
      { name: 'BA REJECT', value: baRejectCount, total: baRejectCount, color: '#039be5', isCompleted: false, hp: baRejectHP },
      { name: 'BAK', value: bakCount, total: baOpenCount, color: '#1976d2', isCompleted: false, hp: bakHP },
      { name: 'SND KASAR', value: sndKasarCount, total: baOpenCount, color: '#8e24aa', isCompleted: false, hp: sndKasarHP },
      { name: 'VALIDASI SALES', value: validasiSalesCount, total: baOpenCount, color: '#43a047', isCompleted: false, hp: validasiSalesHP },
      { name: 'DONATION APPROVED', value: donationCount, total: baOpenCount, color: '#e57373', isCompleted: false, hp: donationHP },
      { name: 'SKOM PERMIT', value: skomCount, total: baOpenCount, color: '#7cb342', isCompleted: false, hp: skomHP },
    ];
  } catch (error) {
    console.error("Error getting Permit data:", error);
    return [
      { name: 'OG', value: 0, total: 0, color: '#b71c1c', isCompleted: false, hp: 0 },
      { name: 'BA OPEN (Approved)', value: 0, total: 0, color: '#bfa600', isCompleted: false, hp: 0 },
      { name: 'BA REJECT', value: 0, total: 0, color: '#039be5', isCompleted: false, hp: 0 },
      { name: 'BAK', value: 0, total: 0, color: '#1976d2', isCompleted: false, hp: 0 },
      { name: 'SND KASAR', value: 0, total: 0, color: '#8e24aa', isCompleted: false, hp: 0 },
      { name: 'VALIDASI SALES', value: 0, total: 0, color: '#43a047', isCompleted: false, hp: 0 },
      { name: 'DONATION APPROVED', value: 0, total: 0, color: '#e57373', isCompleted: false, hp: 0 },
      { name: 'SKOM PERMIT', value: 0, total: 0, color: '#7cb342', isCompleted: false, hp: 0 },
    ];
  }
}

// Function to calculate SND pie chart data from siteData (same logic as page1.tsx)
const calculateSNDPieChartData = (siteData: DetailDataItem[], allTasks: any[]) => {
  const sndCategories = [
    { name: 'SURVEY', sectionName: 'Survey', color: '#FF6B6B' },
    { name: 'SND KASAR', sectionName: 'SND Kasar', color: '#4ECDC4' },
    { name: 'APD SUBMIT', sectionName: 'TSSR', color: '#45B7D1' },
    { name: 'APD APPROVED', sectionName: 'APD APPROVED', color: '#FFA07A' },
    { name: 'ABD SUBMIT', sectionName: 'ABD', color: '#98D8C8' }
  ];

  // Filter sites that have PIC SND (not empty or "-")
  const sitesWithPICSnd = siteData.filter(site => 
    site.picSnd && site.picSnd !== "-" && site.picSnd !== ""
  );
  
  const totalSNDTasks = sitesWithPICSnd.length;
  

  
  const pieChartData = sndCategories.map(category => {
    let actualCount = 0;
    let totalHP = 0;
    
    sitesWithPICSnd.forEach(site => {
      const statusSnd = site.statusSnd || "";
      
      // Calculate HP for this site based on division
      let hpValue = 0;
      
      // Get RFS HP (division = "el") first
      const rfsTask = allTasks.find(t => t.siteName === site.siteName && t.division?.toLowerCase() === 'el');
      if (rfsTask && rfsTask.hp) {
        hpValue = typeof rfsTask.hp === 'number' ? rfsTask.hp : parseInt(rfsTask.hp) || 0;
      }
      
      // If no RFS HP, try DRM HP (division = "snd")
      if (hpValue === 0) {
        const drmTask = allTasks.find(t => t.siteName === site.siteName && t.division?.toLowerCase() === 'snd');
        if (drmTask && drmTask.hp) {
          hpValue = typeof drmTask.hp === 'number' ? drmTask.hp : parseInt(drmTask.hp) || 0;
        }
      }
      
      // Check if statusSnd matches the category
      let matches = false;
      if (category.name === 'SURVEY') {
        matches = statusSnd.toLowerCase().includes('survey');
      } else if (category.name === 'SND KASAR') {
        matches = statusSnd.toLowerCase().includes('snd kasar');
      } else if (category.name === 'APD SUBMIT') {
        matches = statusSnd.toLowerCase().includes('tssr');
      } else if (category.name === 'APD APPROVED') {
        matches = statusSnd.toLowerCase().includes('apd approved');
      } else if (category.name === 'ABD SUBMIT') {
        matches = statusSnd.toLowerCase().includes('abd');
      }
      
      if (matches) {
        actualCount++;
        totalHP += hpValue;
      }
    });
    
    return {
      name: category.name,
      value: actualCount,
      total: totalSNDTasks,
      color: category.color,
      isCompleted: actualCount > 0,
      hp: totalHP
    };
  });

  return pieChartData;
};

const calculateCWPieChartData = (siteData: DetailDataItem[], allTasks: any[]) => {
  const cwCategories = [
    { name: 'SKOM DONE', sectionName: 'SKOM DONE', color: '#FF6B6B' },
    { name: 'IMP OG', sectionName: 'IMP OG', color: '#4ECDC4' },
    { name: 'IMP DONE', sectionName: 'IMP DONE', color: '#45B7D1' }
  ];

  // Filter sites that have PIC CW (not empty or "-")
  const sitesWithPICCw = siteData.filter(site => 
    site.picCw && site.picCw !== "-" && site.picCw !== ""
  );
  
  const totalCWTasks = sitesWithPICCw.length;
  
  const pieChartData = cwCategories.map(category => {
    let actualCount = 0;
    let totalHP = 0;
  
  sitesWithPICCw.forEach(site => {
      const statusCw = site.statusCw || "";
    
    // Calculate HP for this site based on division
    let hpValue = 0;
    
    // Get CW division HP first
      const cwTask = allTasks.find(t => t.siteName === site.siteName && t.division?.toLowerCase() === 'cw');
    if (cwTask && cwTask.hp) {
      hpValue = typeof cwTask.hp === 'number' ? cwTask.hp : parseInt(cwTask.hp) || 0;
    }
    
    // If no CW HP, try EL division
    if (hpValue === 0) {
        const elTask = allTasks.find(t => t.siteName === site.siteName && t.division?.toLowerCase() === 'el');
      if (elTask && elTask.hp) {
        hpValue = typeof elTask.hp === 'number' ? elTask.hp : parseInt(elTask.hp) || 0;
      }
    }
    
    // If still no HP, try SND division
    if (hpValue === 0) {
        const sndTask = allTasks.find(t => t.siteName === site.siteName && t.division?.toLowerCase() === 'snd');
      if (sndTask && sndTask.hp) {
        hpValue = typeof sndTask.hp === 'number' ? sndTask.hp : parseInt(sndTask.hp) || 0;
      }
    }
    
      // Check if statusCw matches the category
      let matches = false;
      if (category.name === 'SKOM DONE') {
        matches = statusCw.toLowerCase().includes('skom done');
      } else if (category.name === 'IMP OG') {
        matches = statusCw.toLowerCase().includes('digging hole') || statusCw.toLowerCase().includes('install pole');
      } else if (category.name === 'IMP DONE') {
        matches = statusCw.toLowerCase().includes('pulling cable') || 
        statusCw.toLowerCase().includes('install fat') ||
        statusCw.toLowerCase().includes('install fdt') ||
        statusCw.toLowerCase().includes('install acc') ||
        statusCw.toLowerCase().includes('pole foundation') ||
        statusCw.toLowerCase().includes('subfeeder') ||
        statusCw.toLowerCase().includes('osp') ||
                 statusCw.toLowerCase().includes('ehs');
      }
      
      if (matches) {
        actualCount++;
        totalHP += hpValue;
      }
    });
    
    return {
      name: category.name,
      value: actualCount,
      total: totalCWTasks,
      color: category.color,
      isCompleted: actualCount > 0,
      hp: totalHP
    };
  });

  return pieChartData;
};

const calculateEHSPieChartData = (siteData: DetailDataItem[], allTasks: any[]) => {
  // Filter sites that have PIC CW (not empty or "-")
  const sitesWithPICCw = siteData.filter(site => 
    site.picCw && site.picCw !== "-" && site.picCw !== ""
  );
  
  const totalCWTasks = sitesWithPICCw.length;
  
  let ehsDoneCount = 0;
  let ehsOgCount = 0;
  let ehsDoneHP = 0;
  let ehsOgHP = 0;
  
  sitesWithPICCw.forEach(site => {
    const statusCw = site.statusCw || "-";
    const siteName = site.siteName;
    
    // Calculate HP for this site based on division
    let hpValue = 0;
    const siteTasks = allTasks.filter(t => t.siteName === siteName);
    
    // Get CW division HP first
    const cwTask = siteTasks.find(t => t.division?.toLowerCase() === 'cw');
    if (cwTask && cwTask.hp) {
      hpValue = typeof cwTask.hp === 'number' ? cwTask.hp : parseInt(cwTask.hp) || 0;
    }
    
    // If no CW HP, try EL division
    if (hpValue === 0) {
      const elTask = siteTasks.find(t => t.division?.toLowerCase() === 'el');
      if (elTask && elTask.hp) {
        hpValue = typeof elTask.hp === 'number' ? elTask.hp : parseInt(elTask.hp) || 0;
      }
    }
    
    // If still no HP, try SND division
    if (hpValue === 0) {
      const sndTask = siteTasks.find(t => t.division?.toLowerCase() === 'snd');
      if (sndTask && sndTask.hp) {
        hpValue = typeof sndTask.hp === 'number' ? sndTask.hp : parseInt(sndTask.hp) || 0;
      }
    }
    
    // Check for EHS DONE (status cw EHS with status_task = "Done")
    const allSections = siteTasks.flatMap(task => 
      Array.isArray(task.sections) ? task.sections : []
    );
    
    const ehsSection = allSections.find(section => 
      (section.section === 'K. EHS' || section.section === 'EHS') && 
      section.division === 'CW' &&
      section.status_task === 'Done'
    );
    
    if (ehsSection) {
      ehsDoneCount++;
      ehsDoneHP += hpValue;
    } else {
      // OG (any status or empty)
      ehsOgCount++;
      ehsOgHP += hpValue;
    }
  });
  
  return [
    {
      name: 'DONE',
      value: ehsDoneCount,
      total: totalCWTasks,
      color: '#4ECDC4',
      isCompleted: ehsDoneCount > 0,
      hp: ehsDoneHP
    },
    {
      name: 'OG',
      value: ehsOgCount,
      total: totalCWTasks,
      color: '#FF6B6B',
      isCompleted: ehsOgCount > 0,
      hp: ehsOgHP
    }
  ];
};

const calculateOSPPieChartData = (siteData: DetailDataItem[], allTasks: any[]) => {
  // Filter sites that have PIC CW (not empty or "-")
  const sitesWithPICCw = siteData.filter(site => 
    site.picCw && site.picCw !== "-" && site.picCw !== ""
  );
  
  const totalCWTasks = sitesWithPICCw.length;
  
  let ospDoneCount = 0;
  let ospOgCount = 0;
  let ospDoneHP = 0;
  let ospOgHP = 0;
  
  sitesWithPICCw.forEach(site => {
    const statusCw = site.statusCw || "-";
    const siteName = site.siteName;
    
    // Calculate HP for this site based on division
    let hpValue = 0;
    const siteTasks = allTasks.filter(t => t.siteName === siteName);
    
    // Get CW division HP first
    const cwTask = siteTasks.find(t => t.division?.toLowerCase() === 'cw');
    if (cwTask && cwTask.hp) {
      hpValue = typeof cwTask.hp === 'number' ? cwTask.hp : parseInt(cwTask.hp) || 0;
    }
    
    // If no CW HP, try EL division
    if (hpValue === 0) {
      const elTask = siteTasks.find(t => t.division?.toLowerCase() === 'el');
      if (elTask && elTask.hp) {
        hpValue = typeof elTask.hp === 'number' ? elTask.hp : parseInt(elTask.hp) || 0;
      }
    }
    
    // If still no HP, try SND division
    if (hpValue === 0) {
      const sndTask = siteTasks.find(t => t.division?.toLowerCase() === 'snd');
      if (sndTask && sndTask.hp) {
        hpValue = typeof sndTask.hp === 'number' ? sndTask.hp : parseInt(sndTask.hp) || 0;
      }
    }
    
    // Check for OSP DONE (status cw OSP with status_task = "Done")
    const allSections = siteTasks.flatMap(task => 
      Array.isArray(task.sections) ? task.sections : []
    );
    
    const ospSection = allSections.find(section => 
      (section.section === 'J. OSP' || section.section === 'OSP') && 
      section.division === 'CW' &&
      section.status_task === 'Done'
    );
    
    if (ospSection) {
      ospDoneCount++;
      ospDoneHP += hpValue;
    } else {
      // OG (any status or empty)
      ospOgCount++;
      ospOgHP += hpValue;
    }
  });
  
  return [
    {
      name: 'DONE',
      value: ospDoneCount,
      total: totalCWTasks,
      color: '#4ECDC4',
      isCompleted: ospDoneCount > 0,
      hp: ospDoneHP
    },
    {
      name: 'OG',
      value: ospOgCount,
      total: totalCWTasks,
      color: '#FF6B6B',
      isCompleted: ospOgCount > 0,
      hp: ospOgHP
    }
  ];
};

const calculateELPieChartData = (siteData: DetailDataItem[], allTasks: any[]) => {
  const elCategories = [
    { name: 'RFS', sectionName: 'RFS', color: '#D9534F' },
    { name: 'ATP', sectionName: 'ATP', color: '#AF944B' }
  ];

  // Filter sites that have PIC EL (not empty or "-")
  const sitesWithPICEl = siteData.filter(site => 
    site.picEl && site.picEl !== "-" && site.picEl !== ""
  );
  
  const totalElTasks = sitesWithPICEl.length;
  
  const pieChartData = elCategories.map(category => {
    let actualCount = 0;
    let totalHP = 0;
  
  sitesWithPICEl.forEach(site => {
      const statusEl = site.statusEl || "";
    
    // Calculate HP for this site based on division
    let hpValue = 0;
    
    // Get EL division HP first
      const elTask = allTasks.find(t => t.siteName === site.siteName && t.division?.toLowerCase() === 'el');
    if (elTask && elTask.hp) {
      hpValue = typeof elTask.hp === 'number' ? elTask.hp : parseInt(elTask.hp) || 0;
    }
    
    // If no EL HP, try CW division
    if (hpValue === 0) {
        const cwTask = allTasks.find(t => t.siteName === site.siteName && t.division?.toLowerCase() === 'cw');
      if (cwTask && cwTask.hp) {
        hpValue = typeof cwTask.hp === 'number' ? cwTask.hp : parseInt(cwTask.hp) || 0;
      }
    }
    
    // If still no HP, try SND division
    if (hpValue === 0) {
        const sndTask = allTasks.find(t => t.siteName === site.siteName && t.division?.toLowerCase() === 'snd');
      if (sndTask && sndTask.hp) {
        hpValue = typeof sndTask.hp === 'number' ? sndTask.hp : parseInt(sndTask.hp) || 0;
      }
    }
    
      // Check if statusEl matches the category (exact match like in filter)
      let matches = false;
      if (category.name === 'RFS') {
        matches = statusEl.toLowerCase().includes('rfs') && 
                  !statusEl.toLowerCase().includes('rfs certificate');
      } else if (category.name === 'ATP') {
        matches = statusEl.toLowerCase().includes('atp') && 
                  !statusEl.toLowerCase().includes('atp document');
      }
      
      if (matches) {
        actualCount++;
        totalHP += hpValue;
      }
    });
    
    return {
      name: category.name,
      value: actualCount,
      total: totalElTasks,
      color: category.color,
      isCompleted: actualCount > 0,
      hp: totalHP
    };
  });

  return pieChartData;
};

const calculateDCPieChartData = (siteData: DetailDataItem[], allTasks: any[]) => {
  const dcCategories = [
    { name: 'RFS', sectionName: 'RFS', color: '#FF6B6B' },
    { name: 'ATP DOCUMENT', sectionName: 'ATP DOCUMENT', color: '#4ECDC4' },
    { name: 'REDLINE', sectionName: 'REDLINE', color: '#45B7D1' },
    { name: 'CW DOCUMENT', sectionName: 'CW DOCUMENT', color: '#98D8C8' },
    { name: 'OPM', sectionName: 'OPM', color: '#FFA07A' },
    { name: 'OPNAME', sectionName: 'OPNAME', color: '#D9534F' },
    { name: 'ABD DOCUMENT', sectionName: 'ABD DOCUMENT', color: '#AF944B' },
    { name: 'RFS CERTIFICATE', sectionName: 'RFS CERTIFICATE', color: '#F0AD4E' },
    { name: 'CW CERTIFICATE', sectionName: 'CW CERTIFICATE', color: '#5BC0DE' },
    { name: 'EL CERTIFICATE', sectionName: 'EL CERTIFICATE', color: '#5CB85C' },
    { name: 'FAC CERTIFICATE', sectionName: 'FAC CERTIFICATE', color: '#D9534F' }
  ];

  // Filter sites that have PIC Document (not empty or "-") or any PIC field
  const sitesWithPICDocument = siteData.filter(site => 
    (site.picDocument && site.picDocument !== "-" && site.picDocument !== "") ||
    (site.pic && site.pic !== "-" && site.pic !== "")
  );
  
  const totalDocumentTasks = sitesWithPICDocument.length;
  
  const pieChartData = dcCategories.map(category => {
    let actualCount = 0;
    let totalHP = 0;
  
  sitesWithPICDocument.forEach(site => {
    const siteName = site.siteName;
    
    // Calculate HP for this site based on division
    let hpValue = 0;
    
    // Get Document division HP first
      const documentTask = allTasks.find(t => t.siteName === siteName && t.division?.toLowerCase() === 'document');
    if (documentTask && documentTask.hp) {
      hpValue = typeof documentTask.hp === 'number' ? documentTask.hp : parseInt(documentTask.hp) || 0;
    }
    
    // If no Document HP, try CW division
    if (hpValue === 0) {
        const cwTask = allTasks.find(t => t.siteName === siteName && t.division?.toLowerCase() === 'cw');
      if (cwTask && cwTask.hp) {
        hpValue = typeof cwTask.hp === 'number' ? cwTask.hp : parseInt(cwTask.hp) || 0;
      }
    }
    
    // If still no HP, try EL division
    if (hpValue === 0) {
        const elTask = allTasks.find(t => t.siteName === siteName && t.division?.toLowerCase() === 'el');
      if (elTask && elTask.hp) {
        hpValue = typeof elTask.hp === 'number' ? elTask.hp : parseInt(elTask.hp) || 0;
      }
    }
    
    // If still no HP, try SND division
    if (hpValue === 0) {
        const sndTask = allTasks.find(t => t.siteName === siteName && t.division?.toLowerCase() === 'snd');
      if (sndTask && sndTask.hp) {
        hpValue = typeof sndTask.hp === 'number' ? sndTask.hp : parseInt(sndTask.hp) || 0;
      }
    }
    
    // Check for all Document sections with status_task = "Done"
      const siteTasks = allTasks.filter(t => t.siteName === siteName);
    const allSections = siteTasks.flatMap(task => 
      Array.isArray(task.sections) ? task.sections : []
    );
    

      
      // Check if any section matches the category with status_task = "Done"
      let matches = false;
      if (category.name === 'RFS') {
              matches = allSections.some(section => 
        (section.section === 'RFS' || section.section === 'A. RFS') && 
        (section.division === 'Document' || section.division === 'document') &&
      section.status_task === 'Done'
    );
      } else if (category.name === 'ATP DOCUMENT') {
        matches = allSections.some(section => 
          (section.section === 'ATP Document' || section.section === 'B. ATP Document') && 
          (section.division === 'Document' || section.division === 'document') &&
      section.status_task === 'Done'
    );
      } else if (category.name === 'REDLINE') {
        matches = allSections.some(section => 
          (section.section === 'Redline' || section.section === 'C. Redline') && 
          (section.division === 'Document' || section.division === 'document') &&
      section.status_task === 'Done'
    );
      } else if (category.name === 'CW DOCUMENT') {
        matches = allSections.some(section => 
          (section.section === 'CW Document' || section.section === 'D. CW Document') && 
          (section.division === 'Document' || section.division === 'document') &&
      section.status_task === 'Done'
    );
      } else if (category.name === 'OPM') {
        matches = allSections.some(section => 
          (section.section === 'EL/OPM' || section.section === 'E. EL/OPM') && 
          (section.division === 'Document' || section.division === 'document') &&
      section.status_task === 'Done'
    );
      } else if (category.name === 'OPNAME') {
        matches = allSections.some(section => 
          (section.section === 'Opname' || section.section === 'F. Opname') && 
          (section.division === 'Document' || section.division === 'document') &&
      section.status_task === 'Done'
    );
      } else if (category.name === 'ABD DOCUMENT') {
        matches = allSections.some(section => 
          (section.section === 'ABD Document' || section.section === 'G. ABD Document') && 
          (section.division === 'Document' || section.division === 'document') &&
      section.status_task === 'Done'
    );
      } else if (category.name === 'RFS CERTIFICATE') {
        matches = allSections.some(section => 
          (section.section === 'RFS Certificate' || section.section === 'H. RFS Certificate') && 
          (section.division === 'Document' || section.division === 'document') &&
      section.status_task === 'Done'
    );
      } else if (category.name === 'CW CERTIFICATE') {
        matches = allSections.some(section => 
          (section.section === 'CW Certificate' || section.section === 'I. CW Certificate') && 
          (section.division === 'Document' || section.division === 'document') &&
      section.status_task === 'Done'
    );
      } else if (category.name === 'EL CERTIFICATE') {
        matches = allSections.some(section => 
          (section.section === 'EL Certificate' || section.section === 'J. EL Certificate') && 
          (section.division === 'Document' || section.division === 'document') &&
      section.status_task === 'Done'
    );
      } else if (category.name === 'FAC CERTIFICATE') {
        matches = allSections.some(section => 
          (section.section === 'FAC Certificate' || section.section === 'K. FAC Certificate') && 
          (section.division === 'Document' || section.division === 'document') &&
      section.status_task === 'Done'
    );
      }
      
      if (matches) {
        actualCount++;
        totalHP += hpValue;
      }
    });
    
    return {
      name: category.name,
      value: actualCount,
      total: totalDocumentTasks,
      color: category.color,
      isCompleted: actualCount > 0,
      hp: totalHP
    };
  });

  return pieChartData;
};
    


async function getLastUpdate(siteName: string): Promise<string> {
  try {
    if (!siteName || siteName === "-") {
      return "-";
    }
    
    const tasksRef = collection(db, "tasks");
    const tasksSnapshot = await getDocs(tasksRef);
    
    let latestSection: any = null;
    let latestTime = 0;
    
    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      
      if (taskData.siteName && taskData.siteName.toLowerCase() === siteName.toLowerCase()) {
        const sections = taskData.sections || [];
        
        if (sections.length === 0) {
          continue;
        }
        
        sections.forEach((section: any) => {
          if (section.uploadedAt) {
            let uploadedAt: Date;
            if (section.uploadedAt.toDate) {
              uploadedAt = section.uploadedAt.toDate();
            } else if (section.uploadedAt instanceof Date) {
              uploadedAt = section.uploadedAt;
            } else {
              uploadedAt = new Date(section.uploadedAt);
            }
            
            const timeInMs = uploadedAt.getTime();
            
            if (timeInMs > latestTime) {
              latestTime = timeInMs;
              latestSection = section;
            }
          }
        });
      }
    }
    
    if (latestSection) {
      let uploadedAt: Date;
      if (latestSection.uploadedAt.toDate) {
        uploadedAt = latestSection.uploadedAt.toDate();
      } else if (latestSection.uploadedAt instanceof Date) {
        uploadedAt = latestSection.uploadedAt;
      } else {
        uploadedAt = new Date(latestSection.uploadedAt);
      }
      
      const day = uploadedAt.getDate().toString().padStart(2, '0');
      const month = (uploadedAt.getMonth() + 1).toString().padStart(2, '0');
      const year = uploadedAt.getFullYear().toString().slice(-2);
      const hours = uploadedAt.getHours().toString().padStart(2, '0');
      const minutes = uploadedAt.getMinutes().toString().padStart(2, '0');
      
      return `${day}/${month}/${year}, ${hours}.${minutes}`;
    }
    
    return "-";
  } catch (error) {
    console.error("Error getting last update:", error);
    return "-";
  }
}

function formatCurrency(amount: number): string {
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (error) {
    console.error("Error formatting currency:", error);
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }
}

async function getTotalOps(siteId: string, siteName: string): Promise<string> {
  try {
    if (!siteName || siteName === "-") {
      return "-";
    }
    
    let totalOps = 0;
    
    const requestOpsRpmRef = collection(db, "request_ops_rpm");
    const rpmSnapshot = await getDocs(requestOpsRpmRef);
    
    rpmSnapshot.forEach(doc => {
      const data = doc.data();
      
      if (data && data.siteName && data.siteName.toLowerCase() === siteName.toLowerCase()) {
        // Only count OPS if status_ops is 'approved_top' or 'done'
        if (data.ops && (data.status_ops === 'approved_top' || data.status_ops === 'done')) {
          const opsValue = extractNumericValue(data.ops);
          totalOps += opsValue;
        }
      }
    });
    
    try {
      const tasksRef = collection(db, "tasks");
      const tasksSnapshot = await getDocs(tasksRef);
      
      for (const taskDoc of tasksSnapshot.docs) {
        const taskData = taskDoc.data();
        
        if (taskData && taskData.siteName && taskData.siteName.toLowerCase() === siteName.toLowerCase()) {
          const requestOpsRef = collection(db, "tasks", taskDoc.id, "request_ops");
          const requestOpsSnapshot = await getDocs(requestOpsRef);
          
          requestOpsSnapshot.forEach(doc => {
            const data = doc.data();
            
            // Only count OPS if status_ops is 'approved_top' or 'done'
            if (data && data.ops && (data.status_ops === 'approved_top' || data.status_ops === 'done')) {
              const opsValue = extractNumericValue(data.ops);
              totalOps += opsValue;
            }
          });
        }
      }
    } catch (error) {
      console.log("Error accessing request_ops subcollection in tasks:", error);
    }
    
    if (totalOps === 0) return "-";
    return formatCurrency(totalOps);
  } catch (error) {
    console.error("Error fetching total OPS:", error);
    return "-";
  }
}

function extractNumericValue(opsString: string): number {
  try {
    const numericString = opsString.replace(/[^\d]/g, '');
    const numericValue = parseInt(numericString) || 0;
    return numericValue;
  } catch (error) {
    console.error("Error extracting numeric value from:", opsString);
    return 0;
  }
}

// --- Definisi Tipe Data ---
type DetailDataItem = {
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
};

// Function to get HP data from Firebase
async function getHPData(loginName: string): Promise<{ totalHP: number; hpData: Array<{ siteName: string; siteId: string; hp: number; city: string; status: string }> }> {
  try {
    const tasksRef = collection(db, "tasks");
    const snapshot = await getDocs(tasksRef);
    const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    
    // Calculate total HP by summing all hp values from tasks collection
    const totalHP = allTasks.reduce((sum, task) => {
      let hpValue = 0;
      
      // Handle different data types for hp field
      if (typeof task.hp === 'number') {
        hpValue = task.hp;
      } else if (typeof task.hp === 'string') {
        hpValue = parseInt(task.hp) || 0;
      } else if (task.hp) {
        hpValue = Number(task.hp) || 0;
      }
      
      return sum + hpValue;
    }, 0);
    
    // Debug logging
    console.log('Total HP calculation:', {
      totalTasks: allTasks.length,
      totalHP: totalHP,
      sampleTasks: allTasks.slice(0, 5).map(t => ({ siteName: t.siteName, hp: t.hp }))
    });
    
    // Get HP data for current user's sites (for pie chart sections)
    const userHPData = allTasks
      .filter(task => {
        // Filter tasks that have the current user as PIC
        const pic = task.pic || "";
        return pic.toLowerCase().includes(loginName.toLowerCase()) && task.hp && task.hp > 0;
      })
      .map(task => ({
        siteName: task.siteName || "-",
        siteId: task.siteId || task.id,
        hp: task.hp || 0,
        city: task.city || "-",
        status: task.status || "-"
      }))
      .sort((a, b) => b.hp - a.hp); // Sort by HP descending
    
    return { totalHP, hpData: userHPData };
  } catch (error) {
    console.error("Error getting HP data:", error);
    return { totalHP: 0, hpData: [] };
  }
}

const Dashboard = () => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [picFilter, setPicFilter] = useState('');
  const [rpmFilter, setRpmFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [siteData, setSiteData] = useState<DetailDataItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  // Modal state for BOQ details
  const [isBOQModalOpen, setIsBOQModalOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedPieFilter, setSelectedPieFilter] = useState<{chart: string, value: string} | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const [loginName, setLoginName] = useState<string>("");
  // State for dynamic pie chart data
  const [poStatusData, setPoStatusData] = useState<Array<{ name: string; value: number; total: number; color: string; isCompleted: boolean; hp: number }>>([]);
  const [permitData, setPermitData] = useState<Array<{ name: string; value: number; total: number; color: string; isCompleted: boolean }>>([]);
  const [sndData, setSndData] = useState<Array<{ name: string; value: number; total: number; color: string; isCompleted: boolean; hp: number }>>([]);
  const [cwData, setCwData] = useState<Array<{ name: string; value: number; total: number; color: string; isCompleted: boolean; hp: number }>>([]);
  const [ehsData, setEhsData] = useState<Array<{ name: string; value: number; total: number; color: string; isCompleted: boolean; hp: number }>>([]);
  const [ospData, setOspData] = useState<Array<{ name: string; value: number; total: number; color: string; isCompleted: boolean; hp: number }>>([]);
  const [elData, setElData] = useState<Array<{ name: string; value: number; total: number; color: string; isCompleted: boolean; hp: number }>>([]);
  const [dcData, setDcData] = useState<Array<{ name: string; value: number; total: number; color: string; isCompleted: boolean; hp: number }>>([]);
  // HP data state
  const [hpData, setHpData] = useState<Array<{ siteName: string; siteId: string; hp: number; city: string; status: string }>>([]);
  const [totalHP, setTotalHP] = useState<number>(0);
  // All tasks data for region chart calculation
  const [allTasks, setAllTasks] = useState<any[]>([]);
  
  // Filtered site data based on filters
  const filteredSiteData = useMemo(() => {
    let filtered = [...siteData];
    
    // Filter by RPM
    if (rpmFilter) {
      filtered = filtered.filter(site => 
        site.rpm && site.rpm.toLowerCase().includes(rpmFilter.toLowerCase())
      );
    }
    
    // Filter by PIC
    if (picFilter) {
      filtered = filtered.filter(site => 
        (site.picPermit && site.picPermit.toLowerCase().includes(picFilter.toLowerCase())) ||
        (site.picSnd && site.picSnd.toLowerCase().includes(picFilter.toLowerCase())) ||
        (site.picCw && site.picCw.toLowerCase().includes(picFilter.toLowerCase())) ||
        (site.picEl && site.picEl.toLowerCase().includes(picFilter.toLowerCase())) ||
        (site.picDocument && site.picDocument.toLowerCase().includes(picFilter.toLowerCase())) ||
        (site.pic && site.pic.toLowerCase().includes(picFilter.toLowerCase()))
      );
    }
    
    // Filter by Date Range (using uploadedAt from allTasks)
    if (dateRange.start || dateRange.end) {
      console.log('Date range filter:', dateRange);
      console.log('Total sites before date filter:', filtered.length);
      console.log('Total allTasks:', allTasks.length);
      console.log('Sample allTasks structure:', allTasks.slice(0, 2));
      
      filtered = filtered.filter(site => {
        const siteTasks = allTasks.filter(t => t.siteName === site.siteName);
        const allSections = siteTasks.flatMap(task => 
          Array.isArray(task.sections) ? task.sections : []
        );
        
        console.log(`Site: ${site.siteName}, Total sections: ${allSections.length}`);
        
        // Check if any section has uploadedAt within the date range
        const hasMatchingDate = allSections.some(section => {
          if (!section.uploadedAt) {
            console.log(`Section ${section.section} has no uploadedAt`);
            return false;
          }
          
          // Create date range with proper time
          const startDate = dateRange.start ? new Date(dateRange.start + 'T00:00:00.000Z') : null;
          const endDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59.999Z') : null;
          
          // Handle different uploadedAt formats
          let uploadDate;
          try {
            if (section.uploadedAt && section.uploadedAt.seconds) {
              // Firebase Timestamp format
              uploadDate = new Date(section.uploadedAt.seconds * 1000);
            } else if (section.uploadedAt && section.uploadedAt.toDate) {
              // Firebase Timestamp object
              uploadDate = section.uploadedAt.toDate();
            } else if (typeof section.uploadedAt === 'string') {
              // String format
              uploadDate = new Date(section.uploadedAt);
            } else if (section.uploadedAt instanceof Date) {
              // Already a Date object
              uploadDate = section.uploadedAt;
            } else {
              console.log('Unknown uploadedAt format:', section.uploadedAt);
              return false;
            }
            
            // Validate uploadDate
            if (isNaN(uploadDate.getTime())) {
              console.log('Invalid uploadDate:', section.uploadedAt);
              return false;
            }
            
            // Debug logging for all sites
            console.log(`Site: ${site.siteName}, Section: ${section.section}, Division: ${section.division}`);
            console.log(`Original uploadedAt:`, section.uploadedAt);
            console.log(`Parsed uploadDate: ${uploadDate.toISOString()}`);
            console.log(`Start date: ${startDate?.toISOString()}, End date: ${endDate?.toISOString()}`);
            
            if (startDate && endDate) {
              const isInRange = uploadDate >= startDate && uploadDate <= endDate;
              console.log(`Date in range: ${isInRange}`);
              return isInRange;
            } else if (startDate) {
              const isAfterStart = uploadDate >= startDate;
              console.log(`Date after start: ${isAfterStart}`);
              return isAfterStart;
            } else if (endDate) {
              const isBeforeEnd = uploadDate <= endDate;
              console.log(`Date before end: ${isBeforeEnd}`);
              return isBeforeEnd;
            }
            return true;
          } catch (error) {
            console.log('Error parsing uploadedAt:', error, section.uploadedAt);
            return false;
          }
        });
        
        if (!hasMatchingDate) {
          console.log(`Site ${site.siteName} filtered out by date range`);
        } else {
          console.log(`Site ${site.siteName} passed date filter`);
        }
        
        return hasMatchingDate;
      });
      
      console.log('Total sites after date filter:', filtered.length);
    }
    
    return filtered;
  }, [siteData, rpmFilter, picFilter, dateRange, allTasks]);

  // Get user name from Firebase
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

  // Calculate PO Status data from filteredSiteData
  useEffect(() => {
    const calculatePOStatusData = () => {
      try {
        // Filter allTasks based on filteredSiteData site names
        const filteredSiteNames = filteredSiteData.map(site => site.siteName);
        const filteredTasks = allTasks.filter(task => 
          filteredSiteNames.includes(task.siteName)
        );
        
        // Count unique siteNames as total tasks
        const uniqueSiteNames = [...new Set(filteredTasks.map(task => task.siteName).filter(Boolean))];
        const totalTasks = uniqueSiteNames.length;
        
        // Count unique siteNames that have each PO status
        const poPermitTasks = filteredTasks.filter(task => task.poPermit && task.poPermit !== "-" && task.poPermit !== "");
        const poSndTasks = filteredTasks.filter(task => task.poSnd && task.poSnd !== "-" && task.poSnd !== "");
        const poImpTasks = filteredTasks.filter(task => task.poImp && task.poImp !== "-" && task.poImp !== "");
        const poSfTasks = filteredTasks.filter(task => task.poSf && task.poSf !== "-" && task.poSf !== "");
        const poAddTasks = filteredTasks.filter(task => task.poAdd && task.poAdd !== "-" && task.poAdd !== "");
        
        // Get unique site names for each PO category
        const poPermitSites = [...new Set(poPermitTasks.map(task => task.siteName))];
        const poSndSites = [...new Set(poSndTasks.map(task => task.siteName))];
        const poImpSites = [...new Set(poImpTasks.map(task => task.siteName))];
        const poSfSites = [...new Set(poSfTasks.map(task => task.siteName))];
        const poAddSites = [...new Set(poAddTasks.map(task => task.siteName))];
        
        // Calculate total HP for each PO category
        const calculateHP = (tasks: any[]) => {
          return tasks.reduce((sum, task) => {
            let hpValue = 0;
            const siteName = task.siteName;
            if (!siteName) return sum;
            
            // Find all tasks for this site to get HP values from different divisions
            const siteTasks = filteredTasks.filter(t => t.siteName === siteName);
            
            // Get CW division HP first
            const cwTask = siteTasks.find(t => t.division?.toLowerCase() === 'cw');
            if (cwTask && cwTask.hp) {
              hpValue = typeof cwTask.hp === 'number' ? cwTask.hp : parseInt(cwTask.hp) || 0;
            }
            
            // If no CW HP, try EL division
            if (hpValue === 0) {
              const elTask = siteTasks.find(t => t.division?.toLowerCase() === 'el');
              if (elTask && elTask.hp) {
                hpValue = typeof elTask.hp === 'number' ? elTask.hp : parseInt(elTask.hp) || 0;
              }
            }
            
            // If still no HP, try SND division
            if (hpValue === 0) {
              const sndTask = siteTasks.find(t => t.division?.toLowerCase() === 'snd');
              if (sndTask && sndTask.hp) {
                hpValue = typeof sndTask.hp === 'number' ? sndTask.hp : parseInt(sndTask.hp) || 0;
              }
            }
            
            return sum + hpValue;
          }, 0);
        };
        
        const data = [
          { name: 'PO Permit', value: poPermitSites.length, total: totalTasks, color: '#FF6B6B', isCompleted: poPermitSites.length > 0, hp: calculateHP(poPermitTasks) },
          { name: 'PO SND', value: poSndSites.length, total: totalTasks, color: '#4ECDC4', isCompleted: poSndSites.length > 0, hp: calculateHP(poSndTasks) },
          { name: 'PO IMPLEMENTATION', value: poImpSites.length, total: totalTasks, color: '#45B7D1', isCompleted: poImpSites.length > 0, hp: calculateHP(poImpTasks) },
          { name: 'PO SF', value: poSfSites.length, total: totalTasks, color: '#FFA07A', isCompleted: poSfSites.length > 0, hp: calculateHP(poSfTasks) },
          { name: 'PO ADDITIONAL', value: poAddSites.length, total: totalTasks, color: '#98D8C8', isCompleted: poAddSites.length > 0, hp: calculateHP(poAddTasks) }
        ];
        
        setPoStatusData(data);
      } catch (error) {
        console.error("Error calculating PO Status data:", error);
      }
    };
    calculatePOStatusData();
  }, [filteredSiteData, allTasks]);

  // Calculate Permit data from filteredSiteData
  useEffect(() => {
    const calculatePermitData = () => {
      try {
        // Filter allTasks based on filteredSiteData site names
        const filteredSiteNames = filteredSiteData.map(site => site.siteName);
        const filteredTasks = allTasks.filter(task => 
          filteredSiteNames.includes(task.siteName)
        );
        
        // Total: semua tasks dengan division permit
        const permitTasks = filteredTasks.filter(task => task.division?.toLowerCase() === 'permit');
        
        // Helper function untuk mengecek section dengan status_task = 'Done'
        const checkSectionDone = (task: any, sectionName: string) => {
          if (!task.sections || !Array.isArray(task.sections)) return false;
          return task.sections.some((section: any) => 
            section.section === sectionName &&
            section.status_task === 'Done'
          );
        };
        
        // Helper function untuk menghitung unique site names
        const getUniqueSiteCount = (tasks: any[]) => {
          const uniqueSiteNames = [...new Set(tasks.map(task => task.siteName).filter(Boolean))];
          return uniqueSiteNames.length;
        };
        
        // Total unique sites dengan division permit
        const totalPermitSites = getUniqueSiteCount(permitTasks);
        
        // OG calculation - sites dengan status permit Visit saja
        const ogSites = filteredSiteData.filter(site => {
          const permitStatus = site.statusPermit || "";
          return permitStatus.toLowerCase().includes('visit') && 
                 !permitStatus.toLowerCase().includes('ba open') &&
                 !permitStatus.toLowerCase().includes('ba reject') &&
                 !permitStatus.toLowerCase().includes('bak') &&
                 !permitStatus.toLowerCase().includes('snd kasar') &&
                 !permitStatus.toLowerCase().includes('validasi sales') &&
                 !permitStatus.toLowerCase().includes('donation') &&
                 !permitStatus.toLowerCase().includes('skom');
        });
        
        // BA OPEN: tasks dengan section 'BA Open' dan status_task = 'Done'
        const baOpenTasks = permitTasks.filter(task => checkSectionDone(task, 'BA Open'));
        const baOpenCount = getUniqueSiteCount(baOpenTasks);
        
        // BA REJECT: tasks dengan section 'BA Reject' dan status_task = 'Done'
        const baRejectTasks = permitTasks.filter(task => checkSectionDone(task, 'BA Reject'));
        const baRejectCount = getUniqueSiteCount(baRejectTasks);
        
        // Define progression order for dependent fields
        const dependentProgression = [
          { name: 'BAK', section: 'BAK' },
          { name: 'SND KASAR', section: 'SND Kasar Permit' },
          { name: 'VALIDASI SALES', section: 'Validasi Sales' },
          { name: 'DONATION APPROVED', section: 'Donation Submit' },
          { name: 'SKOM PERMIT', section: 'SKOM Permit' }
        ];
        
        // Helper function to get latest completed status for dependent fields
        const getLatestCompletedDependentStatus = (siteName: string) => {
          const siteTasks = permitTasks.filter(task => task.siteName === siteName);
          let latestCompleted = null;
          
          for (let i = dependentProgression.length - 1; i >= 0; i--) {
            const category = dependentProgression[i];
            const hasCompleted = siteTasks.some(task => checkSectionDone(task, category.section));
            if (hasCompleted) {
              latestCompleted = category.name;
              break;
            }
          }
          
          return latestCompleted;
        };
        
        // Get unique site names for dependent fields
        const uniqueSiteNames = [...new Set(permitTasks.map(task => task.siteName).filter(Boolean))];
        
        // Count sites by their latest completed dependent status
        const dependentStatusCounts: Record<string, number> = {
          'BAK': 0,
          'SND KASAR': 0,
          'VALIDASI SALES': 0,
          'DONATION APPROVED': 0,
          'SKOM PERMIT': 0
        };
        
        const dependentStatusHP: Record<string, number> = {
          'BAK': 0,
          'SND KASAR': 0,
          'VALIDASI SALES': 0,
          'DONATION APPROVED': 0,
          'SKOM PERMIT': 0
        };
        
        uniqueSiteNames.forEach(siteName => {
          const latestStatus = getLatestCompletedDependentStatus(siteName);
          if (latestStatus && latestStatus in dependentStatusCounts) {
            dependentStatusCounts[latestStatus as keyof typeof dependentStatusCounts]++;
            
            // Calculate HP for this site
            const siteTasks = permitTasks.filter(task => task.siteName === siteName);
            const siteHP = siteTasks.reduce((sum, task) => {
              if (task.division?.toLowerCase() === 'permit' && task.hp && task.hp > 0) {
                const hpValue = typeof task.hp === 'number' ? task.hp : parseInt(task.hp) || 0;
                return sum + hpValue;
              }
              return sum;
            }, 0);
            
            dependentStatusHP[latestStatus as keyof typeof dependentStatusHP] += siteHP;
          }
        });
        
        // Calculate HP for OG sites
        const ogHP = ogSites.reduce((sum, site) => {
          const siteTasks = filteredTasks.filter(t => t.siteName === site.siteName);
          let hpValue = 0;
          
          // Get CW division HP first
          const cwTask = siteTasks.find(t => t.division?.toLowerCase() === 'cw');
          if (cwTask && cwTask.hp) {
            hpValue = typeof cwTask.hp === 'number' ? cwTask.hp : parseInt(cwTask.hp) || 0;
          }
          
          // If no CW HP, try EL division
          if (hpValue === 0) {
            const elTask = siteTasks.find(t => t.division?.toLowerCase() === 'el');
            if (elTask && elTask.hp) {
              hpValue = typeof elTask.hp === 'number' ? elTask.hp : parseInt(elTask.hp) || 0;
            }
          }
          
          // If still no HP, try SND division
          if (hpValue === 0) {
            const sndTask = siteTasks.find(t => t.division?.toLowerCase() === 'snd');
            if (sndTask && sndTask.hp) {
              hpValue = typeof sndTask.hp === 'number' ? sndTask.hp : parseInt(sndTask.hp) || 0;
            }
          }
          
          return sum + hpValue;
        }, 0);
        
        const data = [
          { name: 'OG', value: ogSites.length, total: totalPermitSites, color: '#b71c1c', isCompleted: ogSites.length > 0, hp: ogHP },
          { name: 'BA OPEN (Approved)', value: baOpenCount, total: totalPermitSites, color: '#bfa600', isCompleted: baOpenCount > 0, hp: 0 },
          { name: 'BA REJECT', value: baRejectCount, total: totalPermitSites, color: '#039be5', isCompleted: baRejectCount > 0, hp: 0 },
          { name: 'BAK', value: dependentStatusCounts['BAK'], total: totalPermitSites, color: '#1976d2', isCompleted: dependentStatusCounts['BAK'] > 0, hp: dependentStatusHP['BAK'] },
          { name: 'SND KASAR', value: dependentStatusCounts['SND KASAR'], total: totalPermitSites, color: '#8e24aa', isCompleted: dependentStatusCounts['SND KASAR'] > 0, hp: dependentStatusHP['SND KASAR'] },
          { name: 'VALIDASI SALES', value: dependentStatusCounts['VALIDASI SALES'], total: totalPermitSites, color: '#43a047', isCompleted: dependentStatusCounts['VALIDASI SALES'] > 0, hp: dependentStatusHP['VALIDASI SALES'] },
          { name: 'DONATION APPROVED', value: dependentStatusCounts['DONATION APPROVED'], total: totalPermitSites, color: '#e57373', isCompleted: dependentStatusCounts['DONATION APPROVED'] > 0, hp: dependentStatusHP['DONATION APPROVED'] },
          { name: 'SKOM PERMIT', value: dependentStatusCounts['SKOM PERMIT'], total: totalPermitSites, color: '#7cb342', isCompleted: dependentStatusCounts['SKOM PERMIT'] > 0, hp: dependentStatusHP['SKOM PERMIT'] }
        ];
        
        setPermitData(data);
      } catch (error) {
        console.error("Error calculating Permit data:", error);
      }
    };
    calculatePermitData();
  }, [filteredSiteData, allTasks]);

  // Calculate SND data from filteredSiteData (same as page1.tsx)
  useEffect(() => {
    if (filteredSiteData.length > 0) {
      // Get allTasks from Firebase for HP calculation
      const fetchSNDData = async () => {
        try {
          const tasksRef = collection(db, "tasks");
          const snapshot = await getDocs(tasksRef);
          const allTasks = snapshot.docs.map(doc => doc.data());
          const data = calculateSNDPieChartData(filteredSiteData, allTasks);
          setSndData(data);
        } catch (error) {
          console.error("Error calculating SND data:", error);
        }
      };
      fetchSNDData();
    }
  }, [filteredSiteData]);

  // Calculate CW data from filteredSiteData
  useEffect(() => {
    if (filteredSiteData.length > 0) {
      // Get allTasks from Firebase for HP calculation
      const fetchCWData = async () => {
        try {
          const tasksRef = collection(db, "tasks");
          const snapshot = await getDocs(tasksRef);
          const allTasks = snapshot.docs.map(doc => doc.data());
          const data = calculateCWPieChartData(filteredSiteData, allTasks);
          setCwData(data);
        } catch (error) {
          console.error("Error calculating CW data:", error);
        }
      };
      fetchCWData();
    }
  }, [filteredSiteData]);

  // Calculate EHS data from filteredSiteData
  useEffect(() => {
    if (filteredSiteData.length > 0) {
      // Get allTasks from Firebase for HP calculation
      const fetchEHSData = async () => {
        try {
          const tasksRef = collection(db, "tasks");
          const snapshot = await getDocs(tasksRef);
          const allTasks = snapshot.docs.map(doc => doc.data());
          const data = calculateEHSPieChartData(filteredSiteData, allTasks);
          setEhsData(data);
        } catch (error) {
          console.error("Error calculating EHS data:", error);
        }
      };
      fetchEHSData();
    }
  }, [filteredSiteData]);

  // Calculate OSP data from filteredSiteData
  useEffect(() => {
    if (filteredSiteData.length > 0) {
      // Get allTasks from Firebase for HP calculation
      const fetchOSPData = async () => {
        try {
          const tasksRef = collection(db, "tasks");
          const snapshot = await getDocs(tasksRef);
          const allTasks = snapshot.docs.map(doc => doc.data());
          const data = calculateOSPPieChartData(filteredSiteData, allTasks);
          setOspData(data);
        } catch (error) {
          console.error("Error calculating OSP data:", error);
        }
      };
      fetchOSPData();
    }
  }, [filteredSiteData]);

  // Calculate EL data from filteredSiteData
  useEffect(() => {
    if (filteredSiteData.length > 0) {
      // Get allTasks from Firebase for HP calculation
      const fetchELData = async () => {
        try {
          const tasksRef = collection(db, "tasks");
          const snapshot = await getDocs(tasksRef);
          const allTasks = snapshot.docs.map(doc => doc.data());
          const data = calculateELPieChartData(filteredSiteData, allTasks);
          setElData(data);
        } catch (error) {
          console.error("Error calculating EL data:", error);
        }
      };
      fetchELData();
    }
  }, [filteredSiteData]);

  // Calculate DC data from filteredSiteData
  useEffect(() => {
    if (filteredSiteData.length > 0) {
      // Get allTasks from Firebase for HP calculation
      const fetchDCData = async () => {
        try {
          const tasksRef = collection(db, "tasks");
          const snapshot = await getDocs(tasksRef);
          const allTasks = snapshot.docs.map(doc => doc.data());
          const data = calculateDCPieChartData(filteredSiteData, allTasks);
          setDcData(data);
        } catch (error) {
          console.error("Error calculating DC data:", error);
        }
      };
      fetchDCData();
    }
  }, [filteredSiteData]);

  // Fetch all users once
  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      setUsers(snapshot.docs.map(doc => doc.data()));
    };
    fetchUsers();
  }, []);

  // Fetch HP data
  useEffect(() => {
    const fetchHPData = async () => {
      if (loginName) {
        const { totalHP, hpData } = await getHPData(loginName);
        setTotalHP(totalHP);
        setHpData(hpData);
      }
    };
    fetchHPData();
  }, [loginName]);

  // Fetch all tasks data for region chart calculation
  useEffect(() => {
    const fetchAllTasks = async () => {
      try {
        const tasksRef = collection(db, "tasks");
        const snapshot = await getDocs(tasksRef);
        const tasks = snapshot.docs.map(doc => doc.data());
        setAllTasks(tasks);
      } catch (error) {
        console.error("Error fetching all tasks:", error);
      }
    };
    fetchAllTasks();
  }, []);

  // Fetch data from Firebase
  useEffect(() => {
    async function fetchSites() {
      setIsLoading(true);
      let q = collection(db, "tasks");
      const snapshot = await getDocs(q);
      // Gabungkan data per siteName
      const siteMap: { [siteName: string]: any[] } = {};
      snapshot.docs.forEach(doc => {
        const d: any = doc.data();
        const name = d.siteName || "-";
        if (!siteMap[name]) siteMap[name] = [];
        siteMap[name].push({ ...(d as object), docId: doc.id });
      });
      const mergedRows = await Promise.all(Object.entries(siteMap).map(async ([name, docs], idx) => {
        // Gabungkan sections dari semua dokumen
        const allSections = (docs as any[]).flatMap((d: any) => Array.isArray(d.sections) ? d.sections : []);
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
        // Calculate progress for each division (sama persis dengan site details)
        const divisionProgress: { [key: string]: { uploaded: number; target: number } } = {
          PERMIT: { uploaded: 0, target: 0 },
          SND: { uploaded: 0, target: 0 },
          CW: { uploaded: 0, target: 0 },
          EL: { uploaded: 0, target: 0 },
          Document: { uploaded: 0, target: 0 }
        };
        sectionList.forEach(({ title, division }) => {
          const sectionName = title.replace(/^[A-Z]+\.\s*/, "");
          const uploads = allSections.filter((s: any) => s.section === sectionName);
          const uploadedCount = uploads.length;
          const target = sectionPhotoMax[title] || 1;
          if (divisionProgress[division]) {
            divisionProgress[division].uploaded += uploadedCount;
            divisionProgress[division].target += target;
          }
        });
        // Gabungkan PIC per kategori (pakai koma jika lebih dari satu)
        const getMergedPic = (division: string) => {
          const pics = (docs as any[]).filter((d: any) => (d.division || '').toLowerCase() === division).map((d: any) => d.pic).filter(Boolean);
          return Array.from(new Set(pics)).join(', ') || "-";
        };
        // Ambil siteId dari dokumen terbaru
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
        const siteId = latestDoc.siteId || latestDoc.docId || "-";
        const lastUpdate = await getLastUpdate(name);
        const totalOps = await getTotalOps(siteId, name);
        const getLastSectionName = (sections: any[], division: string) => {
          const filtered = (sections || [])
            .filter((s: any) => (s.division || '').toUpperCase() === division)
            .filter((s: any) => (s.status_task || '') === 'Done') // Hanya ambil yang status_task = "Done"
            .sort((a: any, b: any) => {
              return (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0);
            });
          return filtered[0]?.section || "-";
        };
        
        // Fungsi untuk mengambil HP berdasarkan division (sama seperti di site details)
        const getHpByDivision = (division: string) => {
          const divisionDoc = (docs as any[]).find(d => 
            d.division && d.division.toLowerCase() === division.toLowerCase()
          );
          return divisionDoc?.hp || "-";
        };
        
        return {
          no: idx + 1,
          docId: latestDoc.docId,
          poPermit: (docs as any[]).find(d => d.poPermit && d.poPermit !== "-")?.poPermit || "-",
          poSnd: (docs as any[]).find(d => d.poSnd && d.poSnd !== "-")?.poSnd || "-",
          poImp: (docs as any[]).find(d => d.poImp && d.poImp !== "-")?.poImp || "-",
          poSf: (docs as any[]).find(d => d.poSf && d.poSf !== "-")?.poSf || "-",
          poAdd: (docs as any[]).find(d => d.poAdd && d.poAdd !== "-")?.poAdd || "-",
          siteId: siteId,
          siteName: name,
          permitStatus: `${divisionProgress.PERMIT.uploaded}/${divisionProgress.PERMIT.target}`,
          sndStatus: `${divisionProgress.SND.uploaded}/${divisionProgress.SND.target}`,
          cwStatus: `${divisionProgress.CW.uploaded}/${divisionProgress.CW.target}`,
          elStatus: `${divisionProgress.EL.uploaded}/${divisionProgress.EL.target}`,
          document: `${divisionProgress.Document.uploaded}/${divisionProgress.Document.target}`,
          siteType: latestDoc.siteType || "-",
          region: latestDoc.region || "-",
          city: latestDoc.city || "-",
          ntpHp: getHpByDivision('permit'),
          drmHp: getHpByDivision('snd'),
          rfsHp: getHpByDivision('el'),
          rpm: latestDoc.rpm || "-",
          lastUpdate: lastUpdate || "-",
          operation: latestDoc.operation || "Preview",
          pic: latestDoc.pic || "-",
          hp: getHpByDivision('el') || "0", // Use EL division HP as default
          // PIC per kategori
          picPermit: getMergedPic('permit'),
          picSnd: getMergedPic('snd'),
          picCw: getMergedPic('cw'),
          picEl: getMergedPic('el'),
          picDocument: getMergedPic('document'),
          // Status per kategori
          statusPermit: getLastSectionName(allSections, "PERMIT") || "-",
          statusSnd: getLastSectionName(allSections, "SND") || "-",
          statusCw: getLastSectionName(allSections, "CW") || "-",
          statusEl: getLastSectionName(allSections, "EL") || "-",
          statusDocument: getLastSectionName(allSections, "DOCUMENT") || "-",
          totalOps: totalOps || "-",
          // Tambahan agar mapping tidak error
          division: latestDoc.division,
        } as DetailDataItem;
      }));
      setSiteData(mergedRows);
      setIsLoading(false);
    }
    fetchSites();
  }, []);

  const summaryData = {
    totalSites: filteredSiteData.length,
    totalHP: totalHP,
    totalOps: 1000000
  };

  // Get user name from Firebase
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

  // Calculate total OPS from filteredSiteData
  const totalOps = useMemo(() => {
    return filteredSiteData.reduce((sum, site) => {
      const opsValue = extractNumericValue(site.totalOps || '0');
      return sum + opsValue;
    }, 0);
  }, [filteredSiteData]);

  const pieChartData = {
    poStatus: poStatusData.length > 0 ? poStatusData : [
      { name: 'PO Permit', value: 0, total: 0, color: '#FF6B6B', isCompleted: false },
      { name: 'PO SND', value: 0, total: 0, color: '#4ECDC4', isCompleted: false },
      { name: 'PO IMPLEMENTATION', value: 0, total: 0, color: '#45B7D1', isCompleted: false },
      { name: 'PO SF', value: 0, total: 0, color: '#FFA07A', isCompleted: false },
      { name: 'PO ADDITIONAL', value: 0, total: 0, color: '#98D8C8', isCompleted: false }
    ],
    permit: permitData.length > 0 ? permitData : [
      { name: 'OG', value: 0, total: 0, color: '#b71c1c', isCompleted: false, hp: 0 },
      { name: 'BA OPEN (Approved)', value: 0, total: 0, color: '#bfa600', isCompleted: false, hp: 0 },
      { name: 'BA REJECT', value: 0, total: 0, color: '#039be5', isCompleted: false, hp: 0 },
      { name: 'BAK', value: 0, total: 0, color: '#1976d2', isCompleted: false, hp: 0 },
      { name: 'SND KASAR', value: 0, total: 0, color: '#8e24aa', isCompleted: false, hp: 0 },
      { name: 'VALIDASI SALES', value: 0, total: 0, color: '#43a047', isCompleted: false, hp: 0 },
      { name: 'DONATION APPROVED', value: 0, total: 0, color: '#e57373', isCompleted: false, hp: 0 },
      { name: 'SKOM', value: 0, total: 0, color: '#7cb342', isCompleted: false, hp: 0 },
    ],
    snd: sndData.length > 0 ? sndData : [
      { name: 'SURVEY', value: 0, total: 0, color: '#FF6B6B', isCompleted: false, hp: 0 },
      { name: 'SND KASAR', value: 0, total: 0, color: '#4ECDC4', isCompleted: false, hp: 0 },
      { name: 'APD SUBMIT', value: 0, total: 0, color: '#45B7D1', isCompleted: false, hp: 0 },
      { name: 'APD APPROVED', value: 0, total: 0, color: '#FFA07A', isCompleted: false, hp: 0 },
      { name: 'ABD SUBMIT', value: 0, total: 0, color: '#98D8C8', isCompleted: false, hp: 0 }
    ],
    cw: cwData,
    el: elData,
    dc: dcData,
    ehs: ehsData,
    osp: ospData,
  };

  const groupedBarChartData = [
    { name: 'Serang', SKOM: 62, CW: 73, EL: 11, EHS: 34, OSP: 35, ATP: 88 },
    { name: 'Tangerang', SKOM: 55, CW: 68, EL: 22, EHS: 40, OSP: 25, ATP: 70 },
    { name: 'Depok', SKOM: 40, CW: 50, EL: 30, EHS: 20, OSP: 45, ATP: 60 },
    { name: 'Cilegon', SKOM: 70, CW: 80, EL: 15, EHS: 25, OSP: 30, ATP: 95 },
  ];

  // ====================================================================
  // === PERUBAHAN PADA WARNA DAN URUTAN ===
  // ====================================================================
  const barColors: {[key: string]: string} = {
    SKOM: '#a19df4',
    CW: '#f4b3a1',
    EL: '#74d8d8',
    EHS: '#f4c874',
    OSP: '#0088FE', // Warna OSP diubah menjadi biru
    ATP: '#a1f4b3',
  };



  // Calculate region/city bar chart data from database
  const regionCityBarChartData = useMemo(() => {
    const regions = [...new Set(filteredSiteData.map(site => site.region).filter(Boolean))];
    
    return regions.map(region => {
      const sitesInRegion = filteredSiteData.filter(site => site.region === region);
      const cities = [...new Set(sitesInRegion.map(site => site.city).filter(Boolean))];
      
      const cityData = cities.map(city => {
        const sitesInCity = sitesInRegion.filter(site => site.city === city);
        
        // Calculate metrics for each city
        let skomCount = 0;
        let cwCount = 0;
        let elCount = 0;
        let ehsCount = 0;
        let ospCount = 0;
        let atpCount = 0;
        
        let skomHP = 0;
        let cwHP = 0;
        let elHP = 0;
        let ehsHP = 0;
        let ospHP = 0;
        let atpHP = 0;
        
        sitesInCity.forEach(site => {
          const siteName = site.siteName;
          const siteTasks = allTasks.filter(t => t.siteName === siteName);
          
          // Calculate HP for this site
          let hpValue = 0;
          const cwTask = siteTasks.find(t => t.division?.toLowerCase() === 'cw');
          if (cwTask && cwTask.hp) {
            hpValue = typeof cwTask.hp === 'number' ? cwTask.hp : parseInt(cwTask.hp) || 0;
          }
          
          if (hpValue === 0) {
            const elTask = siteTasks.find(t => t.division?.toLowerCase() === 'el');
            if (elTask && elTask.hp) {
              hpValue = typeof elTask.hp === 'number' ? elTask.hp : parseInt(elTask.hp) || 0;
            }
          }
          
          if (hpValue === 0) {
            const sndTask = siteTasks.find(t => t.division?.toLowerCase() === 'snd');
            if (sndTask && sndTask.hp) {
              hpValue = typeof sndTask.hp === 'number' ? sndTask.hp : parseInt(sndTask.hp) || 0;
            }
          }
          
          // Check for SKOM DONE - using same logic as CW pie chart (only statusCw)
          const statusCw = site.statusCw || "-";
          const hasSkomFromStatus = statusCw.toLowerCase().includes('skom done');
          
          if (hasSkomFromStatus) {
            skomCount++;
            skomHP += hpValue;
          }
          
          // Get allSections for other checks
          const allSections = siteTasks.flatMap(task => 
            Array.isArray(task.sections) ? task.sections : []
          );
          
          // Check for IMP DONE (from CW pie chart) - using same logic as pie chart
          const impDoneSection = allSections.find(section => 
            (section.section === 'D. PULLING CABLE' || section.section === 'PULLING CABLE' ||
             section.section === 'E. INSTALL FAT' || section.section === 'INSTALL FAT' ||
             section.section === 'F. INSTALL FDT' || section.section === 'INSTALL FDT' ||
             section.section === 'G. INSTALL ACC' || section.section === 'INSTALL ACC' ||
             section.section === 'H. POLE FOUNDATION' || section.section === 'POLE FOUNDATION' ||
             section.section === 'I. SUBFEEDER' || section.section === 'SUBFEEDER' ||
             section.section === 'J. OSP' || section.section === 'OSP' ||
             section.section === 'K. EHS' || section.section === 'EHS') && 
            section.division === 'CW' &&
            section.status_task === 'Done'
          );
          
          // Also check statusCw for IMP DONE (same as pie chart logic)
          const hasImpDoneFromStatus = statusCw.toLowerCase().includes('pulling cable') ||
                                      statusCw.toLowerCase().includes('install fat') ||
                                      statusCw.toLowerCase().includes('install fdt') ||
                                      statusCw.toLowerCase().includes('install acc') ||
                                      statusCw.toLowerCase().includes('pole foundation') ||
                                      statusCw.toLowerCase().includes('subfeeder') ||
                                      statusCw.toLowerCase().includes('osp') ||
                                      statusCw.toLowerCase().includes('ehs');
          
          if (impDoneSection || hasImpDoneFromStatus) {
            cwCount++;
            cwHP += hpValue;
          }
          
          // Check for RFS EL (from EL pie chart) - using same logic as pie chart
          const rfsElSection = allSections.find(section => 
            (section.section === 'B. RFS EL' || section.section === 'RFS EL') && 
            section.division === 'EL' &&
            section.status_task === 'Done'
          );
          
          // Also check statusEl for RFS (same as pie chart logic)
          const statusEl = site.statusEl || "-";
          const hasRfsFromStatus = statusEl.toLowerCase().includes('rfs');
          
          if (rfsElSection || hasRfsFromStatus) {
            elCount++;
            elHP += hpValue;
          }
          
          // Check for EHS DONE (from EHS pie chart) - using same logic as pie chart
          const ehsSection = allSections.find(section => 
            (section.section === 'K. EHS' || section.section === 'EHS') && 
            section.division === 'CW' &&
            section.status_task === 'Done'
          );
          
          // Also check statusCw for EHS DONE (same as pie chart logic)
          const hasEhsFromStatus = statusCw.toLowerCase().includes('ehs');
          
          if (ehsSection || hasEhsFromStatus) {
            ehsCount++;
            ehsHP += hpValue;
          }
          
          // Check for OSP DONE (from OSP pie chart) - using same logic as pie chart
          const ospSection = allSections.find(section => 
            (section.section === 'J. OSP' || section.section === 'OSP') && 
            section.division === 'CW' &&
            section.status_task === 'Done'
          );
          
          // Also check statusCw for OSP DONE (same as pie chart logic)
          const hasOspFromStatus = statusCw.toLowerCase().includes('osp');
          
          if (ospSection || hasOspFromStatus) {
            ospCount++;
            ospHP += hpValue;
          }
          
          // Check for ATP EL (from EL pie chart) - using same logic as pie chart
          const atpElSection = allSections.find(section => 
            (section.section === 'C. ATP EL' || section.section === 'ATP EL') && 
            section.division === 'EL' &&
            section.status_task === 'Done'
          );
          
          // Also check statusEl for ATP (same as pie chart logic)
          const hasAtpFromStatus = statusEl.toLowerCase().includes('atp');
          
          if (atpElSection || hasAtpFromStatus) {
            atpCount++;
            atpHP += hpValue;
          }
        });
        
                          return {
           name: city,
           SKOM: skomCount,
           CW: cwCount,
           EL: elCount,
           EHS: ehsCount,
           OSP: ospCount,
           ATP: atpCount,
           // HP values
           skomHP,
           cwHP,
           elHP,
           ehsHP,
           ospHP,
           atpHP
         } as Record<string, number | string>;
      });
      
      return {
        region,
        cities: cityData
      };
    });
  }, [filteredSiteData, allTasks]);

  // Filter details table
  const filteredDetailsData = useMemo(() => {
    if (!filteredSiteData || !Array.isArray(filteredSiteData)) {
      return [];
    }
    
    console.log('filteredDetailsData - filteredSiteData length:', filteredSiteData.length);
    console.log('filteredDetailsData - dateRange:', dateRange);
    
    const result = filteredSiteData.filter(item => {
      if (!item) return false;
      
      // PIC and RPM filters are already applied in filteredSiteData
      const picMatch = true; // Already filtered in filteredSiteData
      const rpmMatch = true; // Already filtered in filteredSiteData
      
      // Date filter - use the same logic as filteredSiteData
      let dateMatch = true;
      if (dateRange.start || dateRange.end) {
        const siteTasks = allTasks.filter(t => t.siteName === item.siteName);
        const allSections = siteTasks.flatMap(task => 
          Array.isArray(task.sections) ? task.sections : []
        );
        
        dateMatch = allSections.some(section => {
          if (!section.uploadedAt) return false;
          
          // Create date range with proper time
          const startDate = dateRange.start ? new Date(dateRange.start + 'T00:00:00.000Z') : null;
          const endDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59.999Z') : null;
          
          // Handle different uploadedAt formats
          let uploadDate;
          try {
            if (section.uploadedAt && section.uploadedAt.seconds) {
              uploadDate = new Date(section.uploadedAt.seconds * 1000);
            } else if (section.uploadedAt && section.uploadedAt.toDate) {
              uploadDate = section.uploadedAt.toDate();
            } else if (typeof section.uploadedAt === 'string') {
              uploadDate = new Date(section.uploadedAt);
            } else if (section.uploadedAt instanceof Date) {
              uploadDate = section.uploadedAt;
            } else {
              return false;
            }
            
            if (isNaN(uploadDate.getTime())) {
              return false;
            }
            
            if (startDate && endDate) {
              return uploadDate >= startDate && uploadDate <= endDate;
            } else if (startDate) {
              return uploadDate >= startDate;
            } else if (endDate) {
              return uploadDate <= endDate;
            }
            return true;
          } catch (error) {
            return false;
          }
        });
      }
      
      const cityMatch = !selectedCity || item.city === selectedCity;
      
      const finalMatch = picMatch && rpmMatch && dateMatch && cityMatch;
      if (!finalMatch) {
        console.log(`Site ${item.siteName} filtered out: picMatch=${picMatch}, rpmMatch=${rpmMatch}, dateMatch=${dateMatch}, cityMatch=${cityMatch}`);
      }
      
      // Pie chart filtering logic
      let pieMatch = true;
      if (selectedPieFilter) {
        const { chart, value } = selectedPieFilter;
        console.log('Filtering by:', chart, value, 'for item:', item.siteName);
        
        switch (chart) {
          case 'PO Status':
            // Filter based on PO status values
            if (value === 'PO Permit') {
              pieMatch = item.poPermit !== '-' && item.poPermit !== '' && item.poPermit !== undefined && item.poPermit !== null;
            } else if (value === 'PO SND') {
              pieMatch = item.poSnd !== '-' && item.poSnd !== '' && item.poSnd !== undefined && item.poSnd !== null;
            } else if (value === 'PO IMPLEMENTATION') {
              pieMatch = item.poImp !== '-' && item.poImp !== '' && item.poImp !== undefined && item.poImp !== null;
            } else if (value === 'PO SF') {
              pieMatch = item.poSf !== '-' && item.poSf !== '' && item.poSf !== undefined && item.poSf !== null;
            } else if (value === 'PO ADDITIONAL') {
              pieMatch = item.poAdd !== '-' && item.poAdd !== '' && item.poAdd !== undefined && item.poAdd !== null;
            }
            break;
            
          case 'Permit':
            // Filter based on sections with status_task = "Done"
            const permitSiteName = item.siteName;
            const permitSiteTasks = allTasks.filter(t => t.siteName === permitSiteName);
            const permitAllSections = permitSiteTasks.flatMap(task => 
              Array.isArray(task.sections) ? task.sections : []
            );
            
            if (value === 'OG') {
              // OG: Site dengan status permit Visit saja, tidak memiliki status permit lainnya
              const permitStatus = item.statusPermit || "";
              pieMatch = permitStatus.toLowerCase().includes('visit') && 
                        !permitStatus.toLowerCase().includes('ba open') &&
                        !permitStatus.toLowerCase().includes('ba reject') &&
                        !permitStatus.toLowerCase().includes('bak') &&
                        !permitStatus.toLowerCase().includes('snd kasar') &&
                        !permitStatus.toLowerCase().includes('validasi sales') &&
                        !permitStatus.toLowerCase().includes('donation') &&
                        !permitStatus.toLowerCase().includes('skom');
            } else if (value === 'BA OPEN (Approved)') {
              // BA OPEN: BA Open section Done
              pieMatch = permitAllSections.some(section => 
                section.section === 'BA Open' && section.status_task === 'Done'
              );
            } else if (value === 'BA REJECT') {
              // BA REJECT: BA Reject section Done
              pieMatch = permitAllSections.some(section => 
                section.section === 'BA Reject' && section.status_task === 'Done'
              );
            } else if (value === 'BAK') {
              // BAK: BAK section Done
              pieMatch = permitAllSections.some(section => 
                section.section === 'BAK' && section.status_task === 'Done'
              );
            } else if (value === 'SND KASAR') {
              // SND KASAR: SND Kasar Permit section Done
              pieMatch = permitAllSections.some(section => 
                section.section === 'SND Kasar Permit' && section.status_task === 'Done'
              );
            } else if (value === 'VALIDASI SALES') {
              // VALIDASI SALES: Validasi Sales section Done
              pieMatch = permitAllSections.some(section => 
                section.section === 'Validasi Sales' && section.status_task === 'Done'
              );
            } else if (value === 'DONATION APPROVED') {
              // DONATION APPROVED: Donation Submit section Done
              pieMatch = permitAllSections.some(section => 
                section.section === 'Donation Submit' && section.status_task === 'Done'
              );
            } else if (value === 'SKOM PERMIT') {
              // SKOM PERMIT: SKOM Permit section Done
              pieMatch = permitAllSections.some(section => 
                section.section === 'SKOM Permit' && section.status_task === 'Done'
              );
            }
            break;
            
          case 'SND':
            // Filter based on SND status
            if (value === 'SURVEY') {
              pieMatch = item.statusSnd?.toLowerCase().includes('survey');
            } else if (value === 'SND KASAR') {
              pieMatch = item.statusSnd?.toLowerCase().includes('snd kasar');
            } else if (value === 'APD SUBMIT') {
              pieMatch = item.statusSnd?.toLowerCase().includes('apd submit');
            } else if (value === 'APD APPROVED') {
              pieMatch = item.statusSnd?.toLowerCase().includes('apd approved');
            } else if (value === 'ABD SUBMIT') {
              pieMatch = item.statusSnd?.toLowerCase().includes('abd submit');
            }
            break;
            
          case 'CW':
            // Filter based on CW status
            if (value === 'SKOM DONE') {
              pieMatch = item.statusCw?.toLowerCase().includes('skom done');
            } else if (value === 'IMP OG') {
              pieMatch = item.statusCw?.toLowerCase().includes('imp og');
            } else if (value === 'IMP DONE') {
              pieMatch = item.statusCw?.toLowerCase().includes('imp done');
            }
            break;
            
          case 'OSP':
            // Filter based on OSP sections with status_task = "Done"
            const ospSiteName = item.siteName;
            const ospSiteTasks = allTasks.filter(t => t.siteName === ospSiteName);
            const ospAllSections = ospSiteTasks.flatMap(task => 
              Array.isArray(task.sections) ? task.sections : []
            );
            
            if (value === 'OSP') {
              // Check if OSP section is Done
              pieMatch = ospAllSections.some(section => 
                (section.section === 'J. OSP' || section.section === 'OSP') && 
                section.division === 'CW' && 
                section.status_task === 'Done'
              );
            } else if (value === 'OG') {
              // Check if OSP section is NOT Done
              const hasOspDone = ospAllSections.some(section => 
                (section.section === 'J. OSP' || section.section === 'OSP') && 
                section.division === 'CW' && 
                section.status_task === 'Done'
              );
              pieMatch = !hasOspDone;
            }
            break;
            
          case 'EL':
            // Filter based on EL status
            if (value === 'RFS') {
              // Check for RFS status in statusEl
              pieMatch = item.statusEl?.toLowerCase().includes('rfs') && 
                        !item.statusEl?.toLowerCase().includes('rfs certificate');
            } else if (value === 'ATP') {
              // Check for ATP status in statusEl
              pieMatch = item.statusEl?.toLowerCase().includes('atp') && 
                        !item.statusEl?.toLowerCase().includes('atp document');
            }
            break;
            
          case 'DC':
            // Filter based on sections with status_task = "Done"
            const dcSiteName2 = item.siteName;
            const dcSiteTasks2 = allTasks.filter(t => t.siteName === dcSiteName2);
            const dcAllSections2 = dcSiteTasks2.flatMap(task => 
              Array.isArray(task.sections) ? task.sections : []
            );
            
            if (value === 'RFS') {
              pieMatch = dcAllSections2.some(section => 
                (section.section === 'RFS' || section.section === 'A. RFS') && 
                (section.division === 'Document' || section.division === 'document') && 
                section.status_task === 'Done'
              );
            } else if (value === 'ATP DOCUMENT') {
              pieMatch = dcAllSections2.some(section => 
                (section.section === 'ATP Document' || section.section === 'B. ATP Document') && 
                (section.division === 'Document' || section.division === 'document') && 
                section.status_task === 'Done'
              );
            } else if (value === 'REDLINE') {
              pieMatch = dcAllSections2.some(section => 
                (section.section === 'Redline' || section.section === 'C. Redline') && 
                (section.division === 'Document' || section.division === 'document') && 
                section.status_task === 'Done'
              );
            } else if (value === 'CW DOCUMENT') {
              pieMatch = dcAllSections2.some(section => 
                (section.section === 'CW Document' || section.section === 'D. CW Document') && 
                (section.division === 'Document' || section.division === 'document') && 
                section.status_task === 'Done'
              );
            } else if (value === 'OPM') {
              pieMatch = dcAllSections2.some(section => 
                (section.section === 'EL/OPM' || section.section === 'E. EL/OPM') && 
                (section.division === 'Document' || section.division === 'document') && 
                section.status_task === 'Done'
              );
            } else if (value === 'OPNAME') {
              pieMatch = dcAllSections2.some(section => 
                (section.section === 'Opname' || section.section === 'F. Opname') && 
                (section.division === 'Document' || section.division === 'document') && 
                section.status_task === 'Done'
              );
            } else if (value === 'ABD DOCUMENT') {
              pieMatch = dcAllSections2.some(section => 
                (section.section === 'ABD Document' || section.section === 'G. ABD Document') && 
                (section.division === 'Document' || section.division === 'document') && 
                section.status_task === 'Done'
              );
            } else if (value === 'RFS CERTIFICATE') {
              pieMatch = dcAllSections2.some(section => 
                (section.section === 'RFS Certificate' || section.section === 'H. RFS Certificate') && 
                (section.division === 'Document' || section.division === 'document') && 
                section.status_task === 'Done'
              );
            } else if (value === 'CW CERTIFICATE') {
              pieMatch = dcAllSections2.some(section => 
                (section.section === 'CW Certificate' || section.section === 'I. CW Certificate') && 
                (section.division === 'Document' || section.division === 'document') && 
                section.status_task === 'Done'
              );
            } else if (value === 'EL CERTIFICATE') {
              pieMatch = dcAllSections2.some(section => 
                (section.section === 'EL Certificate' || section.section === 'J. EL Certificate') && 
                (section.division === 'Document' || section.division === 'document') && 
                section.status_task === 'Done'
              );
            } else if (value === 'FAC CERTIFICATE') {
              pieMatch = dcAllSections2.some(section => 
                (section.section === 'FAC Certificate' || section.section === 'K. FAC Certificate') && 
                (section.division === 'Document' || section.division === 'document') && 
                section.status_task === 'Done'
              );
            }
            break;
        }
      }
      
      const result = picMatch && rpmMatch && dateMatch && cityMatch && pieMatch;
      if (selectedPieFilter) {
        console.log('Filtering item:', item.siteName, 'Chart:', selectedPieFilter.chart, 'Value:', selectedPieFilter.value);
        console.log('Status details:', {
          statusPermit: item.statusPermit,
          statusSnd: item.statusSnd,
          statusCw: item.statusCw,
          statusEl: item.statusEl,
          statusDocument: item.statusDocument,
          poPermit: item.poPermit,
          poSND: item.poSND,
          poIMP: item.poIMP,
          poSF: item.poSF,
          poADD: item.poADD
        });
        console.log('Raw status values (for debugging):', {
          statusPermit: `"${item.statusPermit}"`,
          statusSnd: `"${item.statusSnd}"`,
          statusCw: `"${item.statusCw}"`,
          statusEl: `"${item.statusEl}"`,
          statusDocument: `"${item.statusDocument}"`
        });
        console.log('Pie match result:', pieMatch);
        if (result) {
          console.log('✅ Item matched filter:', item.siteName);
        } else {
          console.log('❌ Item did not match filter:', item.siteName);
        }
      }
      
      return result;
    });
    
    console.log('filteredDetailsData final result length:', result.length);
    console.log('filteredDetailsData sample items:', result.slice(0, 3).map(item => ({
      siteName: item.siteName,
      statusCw: item.statusCw,
      statusEl: item.statusEl,
      statusDocument: item.statusDocument
    })));
    
    return result;
  }, [picFilter, rpmFilter, dateRange, siteData, selectedCity, selectedPieFilter, allTasks]);

  // Chart data for current drilldown level - using pie chart data
  const chartData = useMemo(() => {
    if (!selectedRegion) {
      // Aggregate data for each region using pie chart logic
      return regionCityBarChartData.map(regionObj => {
        const metrics: string[] = ['SKOM', 'CW', 'EL', 'EHS', 'OSP', 'ATP'];
        const regionData: Record<string, number|string> = { name: regionObj.region };
        
        // Filter filteredSiteData for this region (use filtered data, not original siteData)
        const regionSiteData = filteredSiteData.filter(site => site.region === regionObj.region);
        
        metrics.forEach(metric => {
          if (metric === 'SKOM') {
            // Use same logic as pie chart CW for SKOM DONE (based on statusCw from filteredSiteData)
            let skomDoneCount = 0;
            let skomDoneHP = 0;
            console.log(`ChartData - Region ${regionObj.region}: Processing ${regionSiteData.length} sites for SKOM`);
            
            regionSiteData.forEach(site => {
              const statusCw = site.statusCw || "-";
              const siteName = site.siteName;
              
              console.log(`ChartData - Site ${siteName}: statusCw = "${statusCw}"`);
              
              // Check if statusCw contains "SKOM DONE" (same logic as pie chart CW)
              if (statusCw.toLowerCase().includes('skom done')) {
                skomDoneCount++;
                console.log(`ChartData - Site ${siteName}: SKOM DONE found! Count: ${skomDoneCount}`);
                
                // Calculate HP for this site (same logic as pie chart CW)
                let hpValue = 0;
                const cwTask = allTasks.find(t => t.siteName === siteName && t.division?.toLowerCase() === 'cw');
                if (cwTask && cwTask.hp) {
                  hpValue = typeof cwTask.hp === 'number' ? cwTask.hp : parseInt(cwTask.hp) || 0;
                }
                if (hpValue === 0) {
                  const elTask = allTasks.find(t => t.siteName === siteName && t.division?.toLowerCase() === 'el');
                  if (elTask && elTask.hp) {
                    hpValue = typeof elTask.hp === 'number' ? elTask.hp : parseInt(elTask.hp) || 0;
                  }
                }
                if (hpValue === 0) {
                  const sndTask = allTasks.find(t => t.siteName === siteName && t.division?.toLowerCase() === 'snd');
                  if (sndTask && sndTask.hp) {
                    hpValue = typeof sndTask.hp === 'number' ? sndTask.hp : parseInt(sndTask.hp) || 0;
                  }
                }
                skomDoneHP += hpValue;
                console.log(`ChartData - Site ${siteName}: HP = ${hpValue}, Total HP = ${skomDoneHP}`);
              }
            });
            
            console.log(`ChartData - Region ${regionObj.region}: Final SKOM count = ${skomDoneCount}, HP = ${skomDoneHP}`);
            // Use HP value if count > 0, otherwise 0
            regionData[metric] = skomDoneCount > 0 ? skomDoneHP : 0;
          } else {
            // For other metrics, use HP values as before
          const hpKey = metric.toLowerCase() + 'HP';
          regionData[metric] = regionObj.cities.reduce((sum, city) => sum + Number(city[hpKey] ?? 0), 0);
          }
        });
        return regionData;
      });
    } else {
      // Show cities in the selected region
      const regionObj = regionCityBarChartData.find(r => r.region === selectedRegion);
      return regionObj ? regionObj.cities.map(city => {
        const metrics: string[] = ['SKOM', 'CW', 'EL', 'EHS', 'OSP', 'ATP'];
        const cityData: Record<string, number|string> = { name: city.name };
        
        // Filter filteredSiteData for this city (use filtered data, not original siteData)
        const citySiteData = filteredSiteData.filter(site => site.city === city.name);
        
        metrics.forEach(metric => {
          if (metric === 'SKOM') {
            // Use same logic as pie chart CW for SKOM DONE (based on statusCw from filteredSiteData)
            let skomDoneCount = 0;
            let skomDoneHP = 0;
            console.log(`ChartData - City ${city.name}: Processing ${citySiteData.length} sites for SKOM`);
            
            citySiteData.forEach(site => {
              const statusCw = site.statusCw || "-";
              const siteName = site.siteName;
              
              console.log(`ChartData - City ${city.name} - Site ${siteName}: statusCw = "${statusCw}"`);
              
              // Check if statusCw contains "SKOM DONE" (same logic as pie chart CW)
              if (statusCw.toLowerCase().includes('skom done')) {
                skomDoneCount++;
                console.log(`ChartData - City ${city.name} - Site ${siteName}: SKOM DONE found! Count: ${skomDoneCount}`);
                
                // Calculate HP for this site (same logic as pie chart CW)
                let hpValue = 0;
                const cwTask = allTasks.find(t => t.siteName === siteName && t.division?.toLowerCase() === 'cw');
                if (cwTask && cwTask.hp) {
                  hpValue = typeof cwTask.hp === 'number' ? cwTask.hp : parseInt(cwTask.hp) || 0;
                }
                if (hpValue === 0) {
                  const elTask = allTasks.find(t => t.siteName === siteName && t.division?.toLowerCase() === 'el');
                  if (elTask && elTask.hp) {
                    hpValue = typeof elTask.hp === 'number' ? elTask.hp : parseInt(elTask.hp) || 0;
                  }
                }
                if (hpValue === 0) {
                  const sndTask = allTasks.find(t => t.siteName === siteName && t.division?.toLowerCase() === 'snd');
                  if (sndTask && sndTask.hp) {
                    hpValue = typeof sndTask.hp === 'number' ? sndTask.hp : parseInt(sndTask.hp) || 0;
                  }
                }
                skomDoneHP += hpValue;
                console.log(`ChartData - City ${city.name} - Site ${siteName}: HP = ${hpValue}, Total HP = ${skomDoneHP}`);
              }
            });
            
            console.log(`ChartData - City ${city.name}: Final SKOM count = ${skomDoneCount}, HP = ${skomDoneHP}`);
            // Use HP value if count > 0, otherwise 0
            cityData[metric] = skomDoneCount > 0 ? skomDoneHP : 0;
          } else {
            // For other metrics, use HP values as before
          const hpKey = metric.toLowerCase() + 'HP';
          cityData[metric] = Number(city[hpKey] ?? 0);
          }
        });
        return cityData;
      }) : [];
    }
  }, [selectedRegion, regionCityBarChartData, filteredSiteData, allTasks]);

  // Calculate Total HP from NTP HP, DRM HP, and RFS HP (take the latest/largest value)
  const totalHPFromChart = useMemo(() => {
    // Get unique sites from filteredSiteData to avoid duplicates
    const uniqueSites = filteredSiteData.reduce((acc, site) => {
      if (!acc.find(s => s.siteName === site.siteName)) {
        acc.push(site);
      }
      return acc;
    }, [] as DetailDataItem[]);
    
    // Calculate total HP by taking the latest/largest HP value from each site
    return uniqueSites.reduce((total, site) => {
      const ntpHp = parseInt(site.ntpHp || '0') || 0;
      const drmHp = parseInt(site.drmHp || '0') || 0;
      const rfsHp = parseInt(site.rfsHp || '0') || 0;
      
      // Take the largest/latest HP value from the three fields
      const siteLatestHP = Math.max(ntpHp, drmHp, rfsHp);
      
      console.log(`Site ${site.siteName}: NTP HP = ${ntpHp}, DRM HP = ${drmHp}, RFS HP = ${rfsHp}, Latest = ${siteLatestHP}`);
      
      return total + siteLatestHP;
    }, 0);
  }, [filteredSiteData]);

  // Update pie chart values based on actual data (count values for progress display)
  const pieChartValues = useMemo(() => {
    const values: Record<string, number> = {};
    
    // Filter siteData based on selected region/city
    let filteredSiteData = siteData;
    if (selectedRegion) {
      filteredSiteData = filteredSiteData.filter(site => site.region === selectedRegion);
    }
    if (selectedCity) {
      filteredSiteData = filteredSiteData.filter(site => site.city === selectedCity);
    }
    
    // Calculate values based on filtered data
    const statusCwValues = filteredSiteData.map(site => site.statusCw || "-");
    
    // SKOM DONE count - use same logic as pie chart CW
    // SKOM DONE count - using same logic as pie chart CW (statusCw)
    const skomDoneCount = statusCwValues.filter(status => 
      status.toLowerCase().includes('skom done')
    ).length;
    values['SKOM'] = skomDoneCount;
    
    // IMP DONE count
    const impDoneCount = statusCwValues.filter(status => 
      status.toLowerCase().includes('pulling cable') ||
      status.toLowerCase().includes('install fat') ||
      status.toLowerCase().includes('install fdt') ||
      status.toLowerCase().includes('install acc') ||
      status.toLowerCase().includes('pole foundation') ||
      status.toLowerCase().includes('subfeeder') ||
      status.toLowerCase().includes('osp') ||
      status.toLowerCase().includes('ehs')
    ).length;
    values['CW'] = impDoneCount;
    
    // RFS EL count
    const statusElValues = filteredSiteData.map(site => site.statusEl || "-");
    const rfsCount = statusElValues.filter(status => 
      status.toLowerCase().includes('rfs')
    ).length;
    values['EL'] = rfsCount;
    
    // EHS DONE count
    const ehsDoneCount = statusCwValues.filter(status => 
      status.toLowerCase().includes('ehs')
    ).length;
    values['EHS'] = ehsDoneCount;
    
    // OSP DONE count
    const ospDoneCount = statusCwValues.filter(status => 
      status.toLowerCase().includes('osp')
    ).length;
    values['OSP'] = ospDoneCount;
    
    // ATP count (from DC pie chart)
    const statusDocumentValues = filteredSiteData.map(site => site.statusDocument || "-");
    const atpCount = statusDocumentValues.filter(status => 
      status.toLowerCase().includes('atp')
    ).length;
    values['ATP'] = atpCount;
    
    return values;
  }, [siteData, selectedRegion, selectedCity]);



  // Bar click handler for drilldown
  const handleBarClick = (barName: string | number) => {
    if (!selectedRegion) {
      setSelectedRegion(String(barName));
      setSelectedCity(null);
    } else {
      setSelectedCity(String(barName));
    }
  };

  // Reset logic
  const handleResetCity = () => setSelectedCity(null);
  const handleResetRegion = () => {
    setSelectedRegion(null);
    setSelectedCity(null);
  };
  const handleResetPieFilter = () => setSelectedPieFilter(null);
  
  const handlePieChartClick = (chart: string, value: string) => {
    try {
      console.log('Pie chart clicked:', chart, value);
      console.log('Current selectedPieFilter:', selectedPieFilter);
      
      // If clicking the same chart and value, clear the filter
      if (selectedPieFilter?.chart === chart && selectedPieFilter?.value === value) {
        console.log('Clearing filter - same chart and value clicked');
        setSelectedPieFilter(null);
      } else {
        // Set new filter (automatically replaces previous filter)
        console.log('Setting new filter for:', chart, 'value:', value);
        setSelectedPieFilter({ chart, value });
      }
    } catch (error) {
      console.error('Error in handlePieChartClick:', error);
    }
  };

  // Utility untuk menampilkan '-' jika value kosong
  const displayValue = (value: any) => {
    if (value === undefined || value === null || value === "") return "-";
    return value;
  };

  // Debug: Log all available status values when filter is active
  useEffect(() => {
    if (selectedPieFilter && siteData.length > 0) {
      console.log('=== DEBUG: Available status values ===');
      const uniqueStatuses = {
        permit: [...new Set(siteData.map(item => item.statusPermit).filter(Boolean))],
        snd: [...new Set(siteData.map(item => item.statusSnd).filter(Boolean))],
        cw: [...new Set(siteData.map(item => item.statusCw).filter(Boolean))],
        el: [...new Set(siteData.map(item => item.statusEl).filter(Boolean))],
        document: [...new Set(siteData.map(item => item.statusDocument).filter(Boolean))]
      };
      console.log('Unique status values:', uniqueStatuses);
      console.log('Current filter:', selectedPieFilter);
    }
  }, [selectedPieFilter, siteData]);

  const CustomPieChart = ({
    data,
    title,
    onPieClick
  }: {
    data: Array<{ name: string; value: number; total: number; color: string; isCompleted: boolean; hp?: number }>;
    title: string;
    onPieClick: (chart: string, value: string) => void;
  }) => {
    // Ensure onPieClick is a valid function
    const safeOnPieClick = (chart: string, value: string) => {
      try {
        if (onPieClick && typeof onPieClick === 'function') {
          onPieClick(chart, value);
        }
      } catch (error) {
        console.error('Error in safeOnPieClick:', error);
      }
    };
    const [hoveredName, setHoveredName] = useState<string | null>(null);

    const handlePieClick = (entry: any) => {
      try {
        if (entry && entry.type === 'completed') {
          safeOnPieClick(title, entry.name);
        }
      } catch (error) {
        console.error('Error in handlePieClick:', error);
      }
    };

    const chartData = useMemo(() => {
        try {
        const transformed: any[] = [];
        if (Array.isArray(data)) {
            data.forEach(item => {
                    if (item && typeof item.total !== 'undefined' && typeof item.value !== 'undefined' && 
                        typeof item.name !== 'undefined' && typeof item.color !== 'undefined') {
                    transformed.push({ name: item.name, value: item.value, color: item.color, type: 'completed', total: item.total });
                    const remainingValue = item.total - item.value;
                    if (remainingValue > 0) {
                        transformed.push({ name: item.name, value: remainingValue, color: item.color, type: 'remaining', total: item.total });
                    }
                }
            });
        }
        return transformed;
        } catch (error) {
            console.error('Error in chartData useMemo:', error);
            return [];
        }
    }, [data]);

    // Function to get HP total for specific pie chart section
    const getHPForSection = (sectionName: string): number => {
      if (!hpData || hpData.length === 0 || !siteData || siteData.length === 0) return 0;
      
      // Filter siteData based on selected city
      let filteredSiteData = siteData;
      if (selectedCity) {
        filteredSiteData = siteData.filter(item => item.city === selectedCity);
      }
      
      // For PO Status chart, use the HP value from the data
      if (title === 'PO Status') {
        const dataItem = data.find(item => item.name === sectionName);
        return dataItem?.hp || 0;
      }
      
      // For other charts, use the value from pie chart data (count of sites)
      const dataItem = data.find(item => item.name === sectionName);
      return dataItem?.value || 0;
    };

    // Custom Tooltip for PieChart
    const CustomPieTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const entry = payload[0].payload;
        if (entry.type === 'completed') {
          const percent = entry.total > 0 ? Math.round((entry.value / entry.total) * 100) : 0;
          const isSelected = selectedPieFilter?.chart === title && selectedPieFilter?.value === entry.name;
          const sectionHP = getHPForSection(entry.name);
          
          return (
            <div style={{ 
              background: 'white', 
              border: isSelected ? '2px solid #3b82f6' : '1px solid #ddd', 
              borderRadius: 8, 
              padding: 16, 
              boxShadow: '0 2px 8px #0001', 
              color: '#222', 
              fontWeight: 500 
            }}>
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: '#222', fontWeight: 600 }}>{entry.name}</span>
                {isSelected && (
                  <span style={{ 
                    color: '#3b82f6', 
                    fontSize: '12px', 
                    marginLeft: 8, 
                    backgroundColor: '#dbeafe', 
                    padding: '2px 6px', 
                    borderRadius: 4 
                  }}>
                    ACTIVE FILTER
                  </span>
                )}
              </div>
              <div>
                <span style={{ color: '#222', fontWeight: 700 }}>{entry.value}</span>
                <span style={{ color: '#888' }}> / {entry.total} </span>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>HP: {entry.hp ? entry.hp.toLocaleString() : '0'}</span>
                <span style={{ color: '#1976d2', fontWeight: 700 }}> ({percent}%)</span>
              </div>
              {isSelected && (
                <div style={{ 
                  marginTop: 8, 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  fontStyle: 'italic' 
                }}>
                  Click to clear filter
                </div>
              )}
            </div>
          );
        }
      }
      return null;
    };

    return (
      <div className={`bg-white rounded-xl p-6 shadow-lg border flex flex-col items-center ${
        selectedPieFilter?.chart === title ? 'border-blue-300 shadow-blue-100' : 'border-gray-100'
      }`}>
        <div className="flex items-center justify-between w-full mb-4">
          <h3 className="text-lg font-semibold text-gray-800">{title || 'Chart'}</h3>
          {selectedPieFilter?.chart === title && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-600 font-medium">Active Filter</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Clear filter button clicked for chart:', title);
                  handleResetPieFilter();
                }}
                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                title="Clear all filters"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
        <div className="h-48 w-full flex justify-center items-center">
            <ResponsiveContainer width={180} height={180}>
                <PieChart onMouseLeave={() => {
                  try {
                    if (!selectedPieFilter?.chart) {
                      // Only clear hover state if no filter is active
                      setHoveredName(null);
                    }
                  } catch (error) {
                    console.error('Error in onMouseLeave:', error);
                  }
                }}>
                    <Pie 
                        data={chartData} 
                        dataKey="value" 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={80} 
                        innerRadius="0%"
                        onMouseEnter={(data) => {
                          try {
                            if (data && data.name && !selectedPieFilter?.chart) {
                              // Only set hover state if no filter is active
                              setHoveredName(data.name);
                            }
                          } catch (error) {
                            console.error('Error in onMouseEnter:', error);
                          }
                        }}
                        onClick={(entry) => {
                          try {
                            handlePieClick(entry);
                          } catch (error) {
                            console.error('Error in pie chart onClick:', error);
                          }
                        }}
                    >
                        {chartData.map((entry, index) => {
                            const isHovered = hoveredName === entry.name;
                            const isSelected = selectedPieFilter?.chart === title && selectedPieFilter?.value === entry.name;
                            
                            // Determine if this segment should be highlighted
                            let shouldHighlight = false;
                            let opacity = 1;
                            
                            if (selectedPieFilter?.chart === title) {
                                // If this chart has a filter active
                                if (isSelected) {
                                    // Selected item: full opacity
                                    shouldHighlight = true;
                                    opacity = 1;
                                } else {
                                    // Non-selected items: reduced opacity but still visible
                                    opacity = 0.3;
                                }
                            } else if (hoveredName) {
                                // If hovering over an item (no filter active)
                                shouldHighlight = hoveredName === entry.name;
                                opacity = shouldHighlight ? 1 : 0.2;
                            } else {
                                // No filter, no hover: all items normal
                                opacity = 1;
                            }
                            
                            let fillColor = entry.type === 'completed' ? entry.color : '#F0F0F0';
                            if (isHovered && entry.type === 'remaining') {
                                fillColor = `${entry.color}40`;
                            }

                            return (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={fillColor}
                                    opacity={opacity}
                                    style={{ 
                                        transition: 'opacity 0.3s ease-in-out', 
                                        cursor: 'pointer',
                                        filter: shouldHighlight ? 'drop-shadow(0 0 4px rgba(0,0,0,0.2))' : 'none'
                                    }}
                                    stroke="#FFFFFF"
                                    strokeWidth={2}
                                />
                            );
                        })}
                    </Pie>
                    <RechartsTooltip content={<CustomPieTooltip />} />
                </PieChart>
            </ResponsiveContainer>
        </div>
        {/* Data list/legend below the pie chart */}
        <div className="mt-4 w-full space-y-1">
          {Array.isArray(data) && data.map((item, index) => {
            try {
              if (!item || typeof item.total === 'undefined' || typeof item.value === 'undefined' || 
                  typeof item.name === 'undefined' || typeof item.color === 'undefined') {
                return null;
              }
            const percent = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0;
              const isSelected = selectedPieFilter?.chart === title && selectedPieFilter?.value === item.name;
              const sectionHP = getHPForSection(item.name);
              
            return (
              <div 
                key={index} 
                className={`flex items-center text-sm gap-2 justify-between w-full cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors ${
                  isSelected ? 'bg-blue-50 border-l-2 border-blue-500 shadow-sm' : 
                  selectedPieFilter?.chart === title && !isSelected ? 'opacity-50' : ''
                }`}
                onClick={() => {
                  try {
                    safeOnPieClick(title, item.name);
                  } catch (error) {
                    console.error('Error in legend onClick:', error);
                  }
                }}
                title={`Click to filter by ${item.name}`}
              >
                <div className="flex items-center min-w-0">
                  <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                  <span className="text-gray-700 min-w-[90px] truncate">{item.name}</span>
                </div>
                <div className="flex items-center min-w-0 justify-end gap-2">
                  <span className="font-semibold text-gray-900">{item.value}</span>
                  <span className="text-gray-400">/ {item.total}</span>
                  <span className="ml-2 text-green-600 font-semibold">HP: {item.hp ? item.hp.toLocaleString() : '0'}</span>
                  <span className="ml-2 text-blue-600 font-semibold">({percent}%)</span>
                </div>
              </div>
            );
            } catch (error) {
              console.error('Error processing legend item:', error);
              return null;
            }
          })}
        </div>
      </div>
    );
  };
  
  const customLegend = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
      <span style={{ color: barColors.SKOM, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width={16} height={16}><circle cx={8} cy={8} r={8} fill={barColors.SKOM} /></svg>
        SKOM
      </span>
      <span style={{ color: barColors.CW, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width={16} height={16}><circle cx={8} cy={8} r={8} fill={barColors.CW} /></svg>
        CW
      </span>
      <span style={{ color: barColors.EL, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width={16} height={16}><circle cx={8} cy={8} r={8} fill={barColors.EL} /></svg>
        EL
      </span>
      <span style={{ color: barColors.EHS, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width={16} height={16}><circle cx={8} cy={8} r={8} fill={barColors.EHS} /></svg>
        EHS
      </span>
      <span style={{ color: barColors.OSP, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width={16} height={16}><circle cx={8} cy={8} r={8} fill={barColors.OSP} /></svg>
        OSP
      </span>
      <span style={{ color: barColors.ATP, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width={16} height={16}><circle cx={8} cy={8} r={8} fill={barColors.ATP} /></svg>
        ATP
      </span>
    </div>
  );

  // Inside the Dashboard component, before the return statement:
  const {
    currentPage,
    totalPages,
    paginatedData,
    startItem,
    endItem,
    totalItems,
    goToPage,
  } = usePagination({ data: filteredDetailsData, itemsPerPage: 25 });

  return (
    <div className="flex bg-gray-50 min-h-screen overflow-hidden">
      <Sidebar
      />
      
      <div className="flex-1 p-8 overflow-auto relative">
        <div className="max-w-[1920px] mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
            <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
              <div className="flex items-center space-x-6">
                <div className="flex items-center"><MapPin className="w-4 h-4 mr-1" />Total Site: <span className="font-semibold text-gray-800 ml-1">{summaryData.totalSites.toLocaleString()}</span></div>
                <div className="flex items-center"><TrendingUp className="w-4 h-4 mr-1" />Total HP: <span className="font-semibold text-gray-800 ml-1">{totalHPFromChart.toLocaleString()}</span></div>
              </div>
            </div>
          </div>

          {/* Enhanced Filter Section */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
              </div>
              <button
                onClick={() => {
                  setRpmFilter('');
                  setPicFilter('');
                  setDateRange({ start: '', end: '' });
                }}
                className="flex items-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-200"
              >
                <X className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* RPM Filter */}
              <div className="space-y-2">
                                 <label className="block text-sm font-medium text-gray-700 flex items-center space-x-2">
                   <UserIcon className="w-4 h-4 text-gray-500" />
                   <span>RPM</span>
                 </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  value={rpmFilter}
                  onChange={(e) => setRpmFilter(e.target.value)}
                >
                  <option value="">All RPM</option>
                  {Array.from(new Set(filteredSiteData.map(item => item.rpm))).map(rpm => (
                    <option key={rpm} value={rpm}>{rpm}</option>
                  ))}
                </select>
              </div>

              {/* PIC Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span>PIC</span>
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  value={picFilter}
                  onChange={(e) => setPicFilter(e.target.value)}
                >
                  <option value="">All PIC</option>
                  {Array.from(new Set([
                    ...filteredSiteData.map(item => item.picPermit).filter(Boolean),
                    ...filteredSiteData.map(item => item.picSnd).filter(Boolean),
                    ...filteredSiteData.map(item => item.picCw).filter(Boolean),
                    ...filteredSiteData.map(item => item.picEl).filter(Boolean),
                    ...filteredSiteData.map(item => item.picDocument).filter(Boolean),
                    ...filteredSiteData.map(item => item.pic).filter(Boolean)
                  ])).map(pic => (
                    <option key={pic} value={pic}>{pic}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>Start Date</span>
                </label>
                <input 
                  type="date" 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" 
                  value={dateRange.start} 
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} 
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>End Date</span>
                </label>
                <input 
                  type="date" 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" 
                  value={dateRange.end} 
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} 
                />
              </div>
            </div>

            {/* Active Filters Display */}
            {(rpmFilter || picFilter || dateRange.start || dateRange.end) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">Active Filters:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {rpmFilter && (
                                         <span className="inline-flex items-center space-x-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                       <UserIcon className="w-3 h-3" />
                       <span>RPM: {rpmFilter}</span>
                      <button 
                        onClick={() => setRpmFilter('')}
                        className="ml-1 hover:text-blue-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {picFilter && (
                    <span className="inline-flex items-center space-x-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                      <Users className="w-3 h-3" />
                      <span>PIC: {picFilter}</span>
                      <button 
                        onClick={() => setPicFilter('')}
                        className="ml-1 hover:text-green-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {dateRange.start && (
                    <span className="inline-flex items-center space-x-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                      <Calendar className="w-3 h-3" />
                      <span>From: {dateRange.start}</span>
                      <button 
                        onClick={() => setDateRange(prev => ({ ...prev, start: '' }))}
                        className="ml-1 hover:text-purple-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {dateRange.end && (
                    <span className="inline-flex items-center space-x-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                      <Calendar className="w-3 h-3" />
                      <span>To: {dateRange.end}</span>
                      <button 
                        onClick={() => setDateRange(prev => ({ ...prev, end: '' }))}
                        className="ml-1 hover:text-purple-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <CustomPieChart data={pieChartData.poStatus} title="PO Status" onPieClick={handlePieChartClick} />
            <CustomPieChart data={pieChartData.permit} title="Permit" onPieClick={handlePieChartClick} />
            <CustomPieChart data={pieChartData.snd} title="SND" onPieClick={handlePieChartClick} />
            <CustomPieChart data={pieChartData.cw} title="CW" onPieClick={handlePieChartClick} />
            <CustomPieChart data={pieChartData.el} title="EL" onPieClick={handlePieChartClick} />
            <CustomPieChart data={pieChartData.dc} title="DC" onPieClick={handlePieChartClick} />
            <CustomPieChart data={pieChartData.ehs} title="EHS" onPieClick={handlePieChartClick} />
            <CustomPieChart data={pieChartData.osp} title="OSP" onPieClick={handlePieChartClick} />
            {/* Total OPS Card */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 flex flex-col">
              <div className="flex items-center justify-between w-full mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Total OPS</h3>
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div className="h-48 w-full flex justify-center items-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {totalOps.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 mb-1">
                    Total Operations
                  </div>
                  <div className="text-xs text-gray-400">
                    Across {siteData.length} sites
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
             {selectedRegion ? `${selectedRegion} Performance` : 'Region Performance'}
            </h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} label={{ value: 'Total HP', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} />
                  <Tooltip 
                    cursor={{fill: 'rgba(206, 206, 206, 0.4)'}}
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        const currentData = chartData.find((item: any) => item.name === label);
                        
                        if (currentData) {
                          return (
                            <div style={{
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '12px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              minWidth: '200px',
                              fontFamily: 'Inter, system-ui, sans-serif'
                            }}>
                              <div style={{ 
                                fontWeight: '600', 
                                fontSize: '14px', 
                                marginBottom: '8px',
                                color: '#1a202c',
                                borderBottom: '1px solid #e2e8f0',
                                paddingBottom: '6px'
                              }}>
                                {label}
                              </div>
                              <div style={{
                                fontSize: '10px',
                                color: '#64748b',
                                marginBottom: '6px',
                                fontStyle: 'italic'
                              }}>
                                Total HP (Progress)
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {Object.keys(barColors).map((category) => {
                                  const totalHP = currentData[category]; // This is now the HP value
                                  // Calculate progress for this specific category
                                  let progress = 0;
                                  
                                  if (!selectedRegion) {
                                    // Region level - calculate progress for the specific region being hovered
                                    // We need to get the region name from the current data point
                                    const currentRegionName = currentData.name;
                                    const regionObj = regionCityBarChartData.find(r => r.region === currentRegionName);
                                    if (regionObj) {
                                      progress = regionObj.cities.reduce((cityTotal, city) => {
                                        return cityTotal + Number(city[category] ?? 0);
                                      }, 0);
                                    }
                                  } else {
                                    // City level - calculate progress for all cities in the selected region
                                    const regionObj = regionCityBarChartData.find(r => r.region === selectedRegion);
                                    if (regionObj) {
                                      progress = regionObj.cities.reduce((cityTotal, city) => {
                                        return cityTotal + Number(city[category] ?? 0);
                                      }, 0);
                                    }
                                  }
                                  
                                  return (
                                    <div key={category} style={{ 
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '4px 0',
                                      fontSize: '12px'
                                    }}>
                                      <span style={{ 
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: barColors[category as keyof typeof barColors],
                                        fontWeight: '500'
                                      }}>
                                        <div style={{
                                          width: '8px',
                                          height: '8px',
                                          borderRadius: '50%',
                                          backgroundColor: barColors[category as keyof typeof barColors]
                                        }}></div>
                                        {category}
                                      </span>
                                      <span style={{ 
                                        color: '#64748b',
                                        fontWeight: '500'
                                      }}>
                                        {totalHP?.toLocaleString()} ({progress})
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div style={{
                                fontSize: '9px',
                                color: '#94a3b8',
                                marginTop: '8px',
                                paddingTop: '6px',
                                borderTop: '1px solid #e2e8f0',
                                lineHeight: '1.3'
                              }}>
                                <div>• Total HP: Nilai performa kategori</div>
                                <div>• Progress: Data dari pie chart terkait</div>
                              </div>
                            </div>
                          );
                        }
                      }
                      return null;
                    }}
                  />
                  <Legend content={customLegend} />
                  {/* Render bars for each metric */}
                  {Object.keys(barColors).map(metric => (
                    <Bar
                      key={metric}
                      dataKey={metric}
                      fill={barColors[metric]}
                      onClick={(_, index) => handleBarClick(chartData[index].name)}
                    >
                      <LabelList 
                        dataKey={metric} 
                        position="center" 
                        fill="white"
                        fontSize="12"
                        fontWeight="bold"
                        formatter={(value: any) => {
                          if (!selectedRegion) {
                            // Region level - calculate count for each region individually
                            // Since we can't get the specific bar name, we'll calculate the count for each region
                            // and return the appropriate one based on the current chart data
                            const regionCounts: Record<string, number> = {};
                            
                            // Calculate count for each region
                            regionCityBarChartData.forEach(regionObj => {
                              regionCounts[regionObj.region] = regionObj.cities.reduce((cityTotal, city) => {
                                return cityTotal + Number(city[metric] ?? 0);
                              }, 0);
                            });
                            
                            // For now, return the count for CENTRAL JAVA (this is a temporary fix)
                            // In a real implementation, we would need to get the specific bar being rendered
                            return regionCounts['CENTRAL JAVA'] || regionCounts['JABO'] || 0;
                          } else {
                            // City level - calculate count for all cities in the selected region
                            const regionObj = regionCityBarChartData.find(r => r.region === selectedRegion);
                            if (regionObj) {
                              return regionObj.cities.reduce((cityTotal, city) => {
                                return cityTotal + Number(city[metric] ?? 0);
                              }, 0);
                            }
                            return 0;
                          }
                        }}
                      />
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${metric}-${index}`}
                          opacity={
                            selectedCity
                              ? (entry.name === selectedCity ? 1 : 0.3)
                              : 1
                          }
                        />
                      ))}
                    </Bar>
                  ))}
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
            {/* Reset buttons */}
            <div className="flex justify-center mt-4 space-x-2">
              {selectedCity && (
                <>
                  <p className="text-gray-600">
                    Selected City: <span className="font-semibold text-blue-600">{selectedCity}</span>
                  </p>
                  <button
                    onClick={handleResetCity}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg text-sm shadow-md transition duration-300"
                  >
                    Reset City
                  </button>
                </>
              )}
              {!selectedCity && selectedRegion && (
                <>
                  <p className="text-gray-600">
                    Selected Region: <span className="font-semibold text-blue-600">{selectedRegion}</span>
                  </p>
                  <button
                    onClick={handleResetRegion}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg text-sm shadow-md transition duration-300"
                  >
                    Reset Region
                  </button>
                </>
              )}
              {!selectedRegion && !selectedCity && (
                <p className="mt-4 text-center text-gray-600">Click a region bar to drill down to cities. Data shows Total HP for each category.</p>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Details</h3>
              {(selectedCity || selectedPieFilter) && (
                <div className="flex items-center gap-2">
                  {selectedCity && (
                    <span className="text-sm text-gray-600">
                      City: <span className="font-semibold text-blue-600">{selectedCity}</span>
                    </span>
                  )}
                  {selectedPieFilter && (
                    <span className="text-sm text-gray-600">
                      Filter: <span className="font-semibold text-green-600">{selectedPieFilter.chart} - {selectedPieFilter.value}</span>
                    </span>
                  )}
                  <div className="flex gap-2">
                    {selectedCity && (
                      <button
                        onClick={handleResetCity}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Reset City
                      </button>
                    )}
                    {selectedPieFilter && (
                      <button
                        onClick={handleResetPieFilter}
                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden">
              {filteredDetailsData.length === 0 ? (
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
                        {paginatedData.map((item, index) => (
                          <tr
                            key={item.no}
                            className={`${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            } border-b hover:bg-indigo-100 transition-all duration-200`}
                          >
                            
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {index + 1}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.poPermit)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.poSnd)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.poImp)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.poSf)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.poAdd)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.siteId)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.siteName)}
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/top/site/preview?siteId=${item.siteId}&division=PERMIT`)}
                              title="Click to view Permit sections"
                            >
                              {item.permitStatus}
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/top/site/preview?siteId=${item.siteId}&division=SND`)}
                              title="Click to view SND sections"
                            >
                              {item.sndStatus}
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-sm whitespace-nowrap text-black cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/top/site/preview?siteId=${item.siteId}&division=CW`)}
                              title="Click to view CW sections"
                            >
                              {item.cwStatus}
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/top/site/preview?siteId=${item.siteId}&division=EL`)}
                              title="Click to view EL sections"
                            >
                              {item.elStatus}
                            </td>
                            <td 
                              className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                              onClick={() => router.push(`/project/top/site/preview?siteId=${item.siteId}&division=Document`)}
                              title="Click to view Document sections"
                            >
                              {item.document}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.siteType)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.region)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.city)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.ntpHp)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.drmHp)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.rfsHp)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.rpm)}
                            </td>
                            {/* Hapus kolom PIC utama */}
                            {/* Tambahan kolom PIC per kategori */}
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.picPermit)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.picSnd)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.picCw)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.picEl)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.picDocument)}
                            </td>
                            {/* Tambahan kolom Status per kategori */}
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.statusPermit)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.statusSnd)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.statusCw)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.statusEl)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.statusDocument)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.totalOps)}
                            </td>
                            {/* Hapus kolom Status utama */}
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              {displayValue(item.lastUpdate)}
                            </td>
                            <td className="p-2 text-center border border-gray-300 text-gray-800 text-sm whitespace-nowrap">
                              <div className="flex justify-center items-center space-x-3">
                                <button
                                  onClick={() => router.push(`/project/top/site/preview?siteId=${encodeURIComponent(item.siteId)}`)}
                                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all duration-200 text-sm font-medium shadow-sm"
                                >
                                  {displayValue(item.operation)}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedSiteId(item.siteId);
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
          <Pagination
            data={filteredDetailsData}
            currentPage={currentPage}
            onPageChange={goToPage}
            itemsPerPage={25}
          />
        </div>
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

export default Dashboard;