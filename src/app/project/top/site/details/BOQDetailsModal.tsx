"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

interface BOQDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteName: string;
}

interface BOQItem {
  materialName: string;
  materialCode: string;
  beforeDrmBoq: string;
  afterDrmBoq: string;
  constDoneBoq: string;
  abdBoq: string;
}

interface BOQFileData {
  id: string;
  city: string;
  siteName: string;
  siteId: string;
  boqType: string;
  items: BOQItem[];
  [key: string]: any;
}

const BOQDetailsModal: React.FC<BOQDetailsModalProps> = ({ isOpen, onClose, siteName }) => {
  const [search, setSearch] = useState("");
  const [boqData, setBoqData] = useState<BOQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareStatus, setCompareStatus] = useState<string>("ABD BOQ");
  const [compareStatus2, setCompareStatus2] = useState<string>("Before DRM BOQ");

  // Fetch BOQ data for the specific site
  useEffect(() => {
    const fetchBOQData = async () => {
      if (!siteName) return;
      
      setLoading(true);
      try {
        const q = query(collection(db, "boq_files"), where("siteName", "==", siteName));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BOQFileData[];
        
        // Merge data by siteName (similar to BOQ page logic)
        const mergedData: {[siteName: string]: any} = {};
        data.forEach(item => {
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
          const siteData = mergedArray[0]; // Take the first (and should be only) item
          
          // Combine all rows based on materialCode
          const allRows: Record<string, any> = {};
          ["beforeDrmBoq", "afterDrmBoq", "constDoneBoq", "abdBoq"].forEach((statusKey) => {
            (siteData[statusKey] || []).forEach((row: any) => {
              const code = row.materialCode || row.materialName;
              if (!allRows[code]) {
                allRows[code] = {
                  materialName: String(row.materialName || ""),
                  materialCode: String(row.materialCode || ""),
                  beforeDrmBoq: "",
                  afterDrmBoq: "",
                  constDoneBoq: "",
                  abdBoq: "",
                };
              }
              // Map the correct field based on statusKey
              const fieldMap: {[key: string]: string} = {
                "beforeDrmBoq": "beforeDrmBoq",
                "afterDrmBoq": "afterDrmBoq", 
                "constDoneBoq": "constDoneBoq",
                "abdBoq": "abdBoq"
              };
              const fieldName = fieldMap[statusKey] || statusKey;
              allRows[code][fieldName] = row.quantity || row.qty || row.amount || "";
            });
          });
          
          setBoqData(Object.values(allRows));
        } else {
          setBoqData([]);
        }
      } catch (error) {
        console.error("Error fetching BOQ data:", error);
        setBoqData([]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && siteName) {
      fetchBOQData();
    }
  }, [isOpen, siteName]);

  if (!isOpen) return null;

  // Filter data by material item
  const filteredData = boqData.filter((row) => {
    try {
      const materialName = String(row.materialName || "");
      const materialCode = String(row.materialCode || "");
      const searchLower = search.toLowerCase();
      
      return materialName.toLowerCase().includes(searchLower) ||
             materialCode.toLowerCase().includes(searchLower);
    } catch (error) {
      console.error("Error filtering BOQ data:", error, row);
      return false;
    }
  });

  // Helper function to safely parse numeric values
  const safeParseFloat = (value: any): number => {
    if (!value || value === "") return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-[1200px] h-[90vh] flex flex-col relative p-12"
        style={{ minWidth: 900 }}
      >
        <button
          className="absolute top-6 right-8 text-gray-500 hover:text-gray-700 text-3xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h1 className="text-5xl font-extrabold mb-8 text-black">BOQ Compare</h1>
        
        {/* Compare Status Selector */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <span className="font-semibold text-lg text-black">GAP = </span>
          <select 
            value={compareStatus} 
            onChange={e => setCompareStatus(e.target.value)} 
            className="border border-gray-300 rounded px-3 py-2 text-base text-black"
          >
            <option value="ABD BOQ">ABD BOQ</option>
            <option value="Construction Done BOQ">Construction Done BOQ</option>
            <option value="After DRM BOQ">After DRM BOQ</option>
            <option value="Before DRM BOQ">Before DRM BOQ</option>
          </select>
          <span className="text-base">-</span>
          <select 
            value={compareStatus2} 
            onChange={e => setCompareStatus2(e.target.value)} 
            className="border border-gray-300 rounded px-3 py-2 text-base text-black"
          >
            <option value="ABD BOQ">ABD BOQ</option>
            <option value="Construction Done BOQ">Construction Done BOQ</option>
            <option value="After DRM BOQ">After DRM BOQ</option>
            <option value="Before DRM BOQ">Before DRM BOQ</option>
          </select>
        </div>

        <input
          type="text"
          placeholder="Search Material Item"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-6 w-full border border-gray-300 rounded px-3 py-2 text-gray-800 bg-white text-base"
        />
        
        <div className="bg-blue-900 text-white rounded-t-xl px-8 py-4 font-bold text-lg flex items-center justify-end mb-0">
          <span className="w-full text-center text-base font-semibold tracking-wide">
            COMPARE BOQ - {siteName}
          </span>
        </div>
        
        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500 text-sm font-medium">
                No BOQ data found for this site
              </p>
            </div>
          ) : (
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
                {filteredData.map((row, idx) => {
                  const val = (status: string) => {
                    if (status === "ABD BOQ") return safeParseFloat(row.abdBoq);
                    if (status === "Construction Done BOQ") return safeParseFloat(row.constDoneBoq);
                    if (status === "After DRM BOQ") return safeParseFloat(row.afterDrmBoq);
                    if (status === "Before DRM BOQ") return safeParseFloat(row.beforeDrmBoq);
                    return 0;
                  };
                  const gap = val(compareStatus) - val(compareStatus2);
                  
                  return (
                    <tr key={idx} className="bg-white text-black text-base">
                      <td className="px-4 py-2 border-b text-center">{idx + 1}</td>
                      <td className="px-4 py-2 border-b">{row.materialName || ""}</td>
                      <td className="px-4 py-2 border-b text-center">{row.materialCode || ""}</td>
                      <td className="px-4 py-2 border-b text-center">{row.beforeDrmBoq || ""}</td>
                      <td className="px-4 py-2 border-b text-center">{row.afterDrmBoq || ""}</td>
                      <td className="px-4 py-2 border-b text-center">{row.constDoneBoq || ""}</td>
                      <td className="px-4 py-2 border-b text-center">{row.abdBoq || ""}</td>
                      <td className="px-4 py-2 border-b text-center font-bold">{gap.toFixed(2)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={8} className="h-24 bg-white"></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default BOQDetailsModal; 