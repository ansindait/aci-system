"use client";

import React, { useState } from 'react';
import Sidebar from '@/app/components/Sidebar'; // Assuming Sidebar component exists

// Define the data structure for the history table
interface HistoryData {
  date: string;
  activityId: string;
  siteName: string;
  picName: string;
  activityCategory: string;
  workPackage: string;
  detailPlan: string;
  ops: string;
  opsDetail: string;
  nota: boolean; // true for check, false for cross
}

// Icons for the table and form
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const CrossIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const PlusCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


const RequestOpsPage = () => {
  const [requireReceipt, setRequireReceipt] = useState(false);
  const [opsValue, setOpsValue] = useState('');

  const handleOpsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Hapus semua karakter non-digit untuk mendapatkan angka mentah
    const rawValue = e.target.value.replace(/[^0-9]/g, '');

    // 2. Jika ada nilai, format sebagai mata uang IDR. Jika tidak, kosongkan.
    if (rawValue) {
      // Gunakan Intl.NumberFormat untuk format mata uang yang akurat
      const formattedValue = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0, // Tanpa angka desimal
      }).format(Number(rawValue));
      setOpsValue(formattedValue);
    } else {
      setOpsValue('');
    }
  };

  // Dummy data for the history table
  const historyData: HistoryData[] = [
    { date: '15/07/2025', activityId: 'EZATNG250722001', siteName: 'TANGERANG RW 1', picName: 'SURYANA', activityCategory: 'PERMIT', workPackage: 'VISIT', detailPlan: 'Marking Pole', ops: 'Rp.30.000', opsDetail: 'BBM', nota: true },
    { date: '15/07/2025', activityId: 'EZATNG250722001', siteName: 'TANGERANG RW 1', picName: 'SURYANA', activityCategory: 'PERMIT', workPackage: 'VISIT', detailPlan: 'Marking Pole', ops: 'Rp.30.000', opsDetail: 'BBM', nota: false },
    { date: '15/07/2025', activityId: 'EZATNG250722001', siteName: 'TANGERANG RW 1', picName: 'SURYANA', activityCategory: 'PERMIT', workPackage: 'VISIT', detailPlan: 'Marking Pole', ops: 'Rp.30.000', opsDetail: 'BBM', nota: true },
    { date: '15/07/2025', activityId: 'EZATNG250722001', siteName: 'TANGERANG RW 1', picName: 'SURYANA', activityCategory: 'PERMIT', workPackage: 'VISIT', detailPlan: 'Marking Pole', ops: 'Rp.30.000', opsDetail: 'BBM', nota: true },
    { date: '15/07/2025', activityId: 'EZATNG250722001', siteName: 'TANGERANG RW 1', picName: 'SURYANA', activityCategory: 'PERMIT', workPackage: 'VISIT', detailPlan: 'Marking Pole', ops: 'Rp.30.000', opsDetail: 'BBM', nota: false },
  ];

  const FormInput = ({ label, placeholder, type = 'text' }: { label: string, placeholder: string, type?: string }) => (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      <input type={type} placeholder={placeholder} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
    </div>
  );

  const FormSelect = ({ label, children }: { label: string, children: React.ReactNode }) => (
     <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      <select className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white">
        {children}
      </select>
    </div>
  );

  return (
    <div className="flex h-screen bg-white font-sans">
      <Sidebar />
      
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          
          {/* Page Header */}
          <div className="flex flex-col items-center mb-8">
            <img src="/logo.jpeg" alt="Ansinda Logo" className="h-20 mb-4" />
            <h1 className='text-black text-4xl font-bold'>REQUEST OPS</h1>
          </div>
          
          {/* Form Section */}
          <div className="bg-white p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 text-black gap-x-12 gap-y-6">
              {/* Left Column */}
              <div>
                <FormInput label="Date" placeholder="dd/mm/yyyy" type="date" />
                <div className="mt-6">
                   <FormSelect label="City">
                      <option>--City--</option>
                  </FormSelect>
                </div>
                <div className="mt-6">
                   <FormSelect label="Site Name">
                      <option>--Site Name--</option>
                  </FormSelect>
                </div>
                <div className="mt-6">
                   <FormSelect label="Division">
                      <option>--Division--</option>
                  </FormSelect>
                </div>
                <div className="mt-6">
                  <label htmlFor="require-receipt" className="flex items-center cursor-pointer">
                    <span className="block text-sm font-bold text-gray-700 mr-4">Require Receipt</span>
                    <div className="relative">
                        <input id="require-receipt" type="checkbox" className="sr-only" checked={requireReceipt} onChange={() => setRequireReceipt(!requireReceipt)} />
                        <div className={`block w-14 h-8 rounded-full transition ${requireReceipt ? 'bg-blue-900' : 'bg-gray-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${requireReceipt ? 'transform translate-x-6' : ''}`}></div>
                    </div>
                  </label>
                </div>
                {/* Conditional Receipt Upload */}
                {requireReceipt && (
                  <div className="mt-6">
                    <label className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                      <input type="file" className="hidden" />
                      <PlusCircleIcon />
                      <span className="text-gray-500 font-medium">Tap to upload receipt</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div>
                <FormSelect label="PIC/RPM">
                    <option>Select Name</option>
                </FormSelect>
                <div className="mt-6">
                  <FormInput label="Request Type" placeholder="" />
                </div>
                <div className="mt-6">
                  <FormInput label="Detail Plan" placeholder="" />
                </div>
                <div className="mt-6">
                  {/* Ganti FormInput dengan input terkontrol untuk format mata uang */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">OPS</label>
                    <input
                      type="text"
                      placeholder="Enter OPS (IDR)"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={opsValue}
                      onChange={handleOpsChange}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-8">
                <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-10 rounded-md transition-colors">
                    Submit
                </button>
            </div>
          </div>

          {/* History OPS Section */}
          <div className="bg-white p-6">
              <div className="mb-4">
                <div>
                    <label className="text-sm font-bold text-gray-700 mb-2 block">Filter by date</label>
                    <input 
                        type="date"
                        className="border border-gray-300 rounded-md p-2 text-sm bg-white text-gray-500"
                    />
                </div>
                <h2 className="text-2xl font-bold text-black mt-4">History OPS</h2>
              </div>

              {/* History Table */}
              <div>
                <table className="w-full text-sm text-left text-gray-800">
                  <thead className="text-xs text-white uppercase bg-blue-900 font-bold">
                    <tr>
                      <th scope="col" className="px-4 py-3">Date</th>
                      <th scope="col" className="px-4 py-3">Activity ID</th>
                      <th scope="col" className="px-4 py-3">Site Name</th>
                      <th scope="col" className="px-4 py-3">PIC Name</th>
                      <th scope="col" className="px-4 py-3">Activity Category</th>
                      <th scope="col" className="px-4 py-3">Work Package</th>
                      <th scope="col" className="px-4 py-3">Detail Plan</th>
                      <th scope="col" className="px-4 py-3">OPS</th>
                      <th scope="col" className="px-4 py-3">OPS Detail</th>
                      <th scope="col" className="px-4 py-3">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((item, index) => (
                      <tr key={index} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-4 py-4">{item.date}</td>
                        <td className="px-4 py-4">{item.activityId}</td>
                        <td className="px-4 py-4">{item.siteName}</td>
                        <td className="px-4 py-4">{item.picName}</td>
                        <td className="px-4 py-4">{item.activityCategory}</td>
                        <td className="px-4 py-4">{item.workPackage}</td>
                        <td className="px-4 py-4">{item.detailPlan}</td>
                        <td className="px-4 py-4">{item.ops}</td>
                        <td className="px-4 py-4">{item.opsDetail}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <a href="#" className="font-medium text-blue-600 hover:underline">Preview</a>
                            {item.nota ? <CheckIcon /> : <CrossIcon />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RequestOpsPage;