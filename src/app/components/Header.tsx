"use client";
import React from "react";
import { useSidebar } from "@/context/SidebarContext";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";

const Header = () => {
  const { user, isSidebarOpen } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();

  // Halaman yang tidak menampilkan header
  const hideHeader = pathname === "/" || pathname === "/menu" || pathname === "/login" || pathname.startsWith("/menu");
  
  // Jika di halaman yang tidak menampilkan header, return null
  if (hideHeader) {
    return null;
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const handleBack = () => {
    router.back();
  };

  const handleNext = () => {
    router.forward();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <header className="absolute top-0 left-0 w-full h-16 flex items-center justify-between px-8 bg-white shadow z-0">
      {/* Back Button - positioned on the left near sidebar */}
      <div className={`flex items-center gap-2 ${isSidebarOpen ? 'ml-60' : 'ml-16'} transition-all duration-300`}>
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
        >
          Next
          <ArrowRight size={18} />
        </button>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* User info and logout - positioned on the right */}
      <div className="flex items-center">
        <span className="mr-4 font-semibold text-gray-700">
          Hello, {user?.name || "User"}
        </span>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;