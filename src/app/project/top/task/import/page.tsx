"use client";

import React, { useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import { useSidebar } from "@/context/SidebarContext";
import * as XLSX from "xlsx";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

interface TaskItem {
  no: number;
  siteId: string;
  siteName: string;
  hp: number;
  siteType: string;
  region: string;
  city: string;
}

interface UserOption {
  id: string;
  name: string;
  division: string;
  pic: string;
  role: string;
}

const ImportTaskPage = () => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [assignedTo, setAssignedTo] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [taskData, setTaskData] = useState<TaskItem[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedRpm, setSelectedRpm] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedPic, setSelectedPic] = useState("");
  const [selectedSites, setSelectedSites] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [existingSiteNames, setExistingSiteNames] = useState<string[]>([]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const userList: UserOption[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            division: data.division || "",
            pic: data.pic || "",
            role: data.role || "",
          };
        });
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();

    // Fetch existing site names
    const fetchExistingSites = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "site"));
        const names: string[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return (data.siteName || "").toString().toLowerCase().trim();
        });
        setExistingSiteNames(names);
      } catch (error) {
        console.error("Error fetching existing sites:", error);
      }
    };
    fetchExistingSites();
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadedFile(file); // simpan nama file
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      // Ambil header dan data
      const rows = jsonData as Array<any[]>;
      if (rows.length < 2) return;
      const header = rows[0].map((h) => (h ? h.toString().toLowerCase().trim() : ""));
      const dataRows = rows.slice(1);
      const mappedData: TaskItem[] = dataRows
        .filter((row) => row && row.length > 0 && row.some((cell) => cell !== undefined && cell !== null && cell !== ""))
        .map((row, idx) => {
          const get = (col: string) => {
            const i = header.indexOf(col);
            return i !== -1 ? row[i] : "";
          };
          return {
            no: idx + 1,
            siteId: get("site id") || get("siteid"),
            siteName: get("site name") || get("sitename"),
            hp: Number(get("hp")) || 0,
            siteType: get("site type") || get("sitetype"),
            region: get("region"),
            city: get("city"),
          };
        });
      setTaskData(mappedData);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleSelectSite = (no: number) => {
    setSelectedSites((prev) =>
      prev.includes(no) ? prev.filter((n) => n !== no) : [...prev, no]
    );
  };

  const handleSelectAllSites = () => {
    const allNos = filteredTasks.map((task) => task.no);
    if (selectedSites.length === allNos.length) {
      setSelectedSites([]);
    } else {
      setSelectedSites(allNos);
    }
  };

  const handleUploadSites = async () => {
    if (!selectedRpm || !selectedDivision || !selectedPic) {
      alert("Pilih RPM, Division, dan PIC terlebih dahulu!");
      return;
    }
    const selectedData = filteredTasks.filter((task) => selectedSites.includes(task.no));
    if (selectedData.length === 0) {
      alert("Pilih site yang ingin di-upload!");
      return;
    }
    setUploading(true);
    try {
      for (const site of selectedData) {
        const { no, ...siteWithoutNo } = site;
        const sitePayload = {
          ...siteWithoutNo,
          rpm: selectedRpm,
          division: selectedDivision,
          pic: selectedPic,
          createdAt: new Date(),
        };
        await addDoc(collection(db, "site"), sitePayload);
        await addDoc(collection(db, "tasks"), { ...site, rpm: selectedRpm, division: selectedDivision, pic: selectedPic, createdAt: new Date() });
      }
      alert("Upload berhasil!");
      setSelectedSites([]);
    } catch (err) {
      alert("Upload gagal: " + err);
    } finally {
      setUploading(false);
    }
  };

  const filteredTasks = taskData.filter((task) =>
    task.siteId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.siteName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar
    
      />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1920px] mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <h1 className="text-3xl font-bold text-blue-900">Import Task</h1>
              </div>
            </div>
          </div>

          {/* Assign To Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700">Assign To (RPM):</label>
                <select
                  value={selectedRpm}
                  onChange={(e) => setSelectedRpm(e.target.value)}
                  className="mt-2 block w-full border border-gray-300 rounded-md p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Pilih RPM</option>
                  {users.filter((user) => user.role === "RPM").map((user) => (
                    <option key={user.id} value={user.name}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Division</label>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="mt-2 block w-full border border-gray-300 rounded-md p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Pilih Division</option>
                  <option value="permit">Permit</option>
                  <option value="snd">SND</option>
                  <option value="cw">CW</option>
                  <option value="el">EL</option>
                  <option value="dc">DC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PIC</label>
                <select
                  value={selectedPic}
                  onChange={(e) => setSelectedPic(e.target.value)}
                  className="mt-2 block w-full border border-gray-300 rounded-md p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Pilih PIC</option>
                  {users
                    .filter((user) => user.role === "PIC" && user.division.toLowerCase() === selectedDivision.toLowerCase())
                    .map((user) => (
                      <option key={user.id} value={user.name}>{user.name}</option>
                    ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition duration-200"
                  onClick={handleImportButtonClick}
                >
                  Import File
                </button>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  ref={fileInputRef}
                  className="hidden"
                />
                {uploadedFile && (
                  <span className="text-xs text-gray-600 mt-1 truncate">{uploadedFile.name}</span>
                )}
              </div>
            </div>
            <div className="mt-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-2 block w-full border border-gray-300 rounded-md p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search By"
              />
            </div>
          </div>

          {/* Assign Site Table */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">ASSIGN SITE</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input type="checkbox" checked={selectedSites.length === filteredTasks.length && filteredTasks.length > 0} onChange={handleSelectAllSites} />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTasks.map((task) => {
                    return (
                      <tr key={task.no}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedSites.includes(task.no)}
                            onChange={() => handleSelectSite(task.no)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.siteId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.siteName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.hp}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.siteType}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.region}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.city}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-200"
                onClick={handleUploadSites}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Sites"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportTaskPage;