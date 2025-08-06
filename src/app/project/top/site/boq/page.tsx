"use client";

import React, { useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import { useSidebar } from "@/context/SidebarContext";

// Define types for table data
interface BOQItem {
  no: number;
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
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen } = useSidebar();

  // State for form inputs
  const [city, setCity] = useState("");
  const [siteIdSiteName, setSiteIdSiteName] = useState("");
  const [drmHp, setDrmHp] = useState("");
  const [abdHp, setAbdHp] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Sample table data (can be replaced with dynamic data from Firebase)
  const [boqData, setBoqData] = useState<BOQItem[]>([
    {
      no: 1,
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
      siteId: "EZATNG250722001",
      siteName: "TANGERANG RW 1",
      drmHp: 300,
      abdHp: 300,
      beforeDrmBoq: "BOQ.xls",
      afterDrmBoq: "BOQ.xls",
      constDoneBoq: "BOQ.xls",
      abdBoq: "Redline.pdf",
    },
    {
      no: 3,
      siteId: "EZATNG250722001",
      siteName: "TANGERANG RW 1",
      drmHp: 300,
      abdHp: 300,
      beforeDrmBoq: "BOQ.xls",
      afterDrmBoq: "BOQ.xls",
      constDoneBoq: "BOQ.xls",
      abdBoq: "Redline.pdf",
    },
    {
      no: 4,
      siteId: "EZATNG250722001",
      siteName: "TANGERANG RW 1",
      drmHp: 300,
      abdHp: 300,
      beforeDrmBoq: "BOQ.xls",
      afterDrmBoq: "BOQ.xls",
      constDoneBoq: "BOQ.xls",
      abdBoq: "Redline.pdf",
    },
    {
      no: 5,
      siteId: "EZATNG250722001",
      siteName: "TANGERANG RW 1",
      drmHp: 300,
      abdHp: 300,
      beforeDrmBoq: "BOQ.xls",
      afterDrmBoq: "BOQ.xls",
      constDoneBoq: "BOQ.xls",
      abdBoq: "Redline.pdf",
    },
    {
      no: 6,
      siteId: "EZATNG250722001",
      siteName: "TANGERANG RW 1",
      drmHp: 300,
      abdHp: 300,
      beforeDrmBoq: "BOQ.xls",
      afterDrmBoq: "BOQ.xls",
      constDoneBoq: "BOQ.xls",
      abdBoq: "Redline.pdf",
    },
    {
      no: 7,
      siteId: "EZATNG250722001",
      siteName: "TANGERANG RW 1",
      drmHp: 300,
      abdHp: 300,
      beforeDrmBoq: "BOQ.xls",
      afterDrmBoq: "BOQ.xls",
      constDoneBoq: "BOQ.xls",
      abdBoq: "Redline.pdf",
    },
  ]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

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
                <h1 className="text-3xl font-bold text-blue-900">UPLOAD BOQ</h1>
                <img src="/logo.jpeg" alt="Ansinda Logo" className="h-10" />
              </div>
            </div>
          </div>

          {/* Input Fields Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-2 block w-full border border-gray-300 rounded-md p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Site ID - Site Name</label>
                <input
                  type="text"
                  value={siteIdSiteName}
                  onChange={(e) => setSiteIdSiteName(e.target.value)}
                  className="mt-2 block w-full border border-gray-300 rounded-md p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter Site ID - Site Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">DRM HP</label>
                <input
                  type="text"
                  value={drmHp}
                  onChange={(e) => setDrmHp(e.target.value)}
                  className="mt-2 block w-full border border-gray-300 rounded-md p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter DRM HP"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ABD HP</label>
                <input
                  type="text"
                  value={abdHp}
                  onChange={(e) => setAbdHp(e.target.value)}
                  className="mt-2 block w-full border border-gray-300 rounded-md p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter ABD HP"
                />
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="w-full md:w-2/3">
                <label className="block text-sm font-medium text-gray-700">Uploaded BOQ File</label>
                <div className="mt-2 flex items-center">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="w-full border border-gray-300 rounded-md p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {uploadedFile && (
                    <span className="ml-4 text-sm text-gray-600">{uploadedFile.name}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition duration-200">
                  <span className="text-2xl">+</span>
                </button>
                <span className="text-sm text-gray-600">
                  UPLOAD BEFORE DRM BOQ, AFTER DRM BOQ, CONST DONE BOQ, & ABD BOQ
                </span>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DRM HP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ABD HP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Before DRM BOQ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">After DRM BOQ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Const Done BOQ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ABD BOQ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {boqData.map((item) => (
                    <tr key={item.no}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.no}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.siteId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.siteName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.drmHp}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.abdHp}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.beforeDrmBoq}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.afterDrmBoq}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.constDoneBoq}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.abdBoq}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex space-x-2">
                          <button className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition duration-200">
                            Compare
                          </button>
                          <button className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition duration-200">
                            Logs
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BOQDetailsPage;