"use client";

import React from "react";
import { useSidebar } from "@/context/SidebarContext";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import AuthGuard from "./AuthGuard";

export default function ClientLayout({ children }: React.PropsWithChildren) {
  const { isSidebarOpen } = useSidebar();
  const pathname = usePathname();
  
  // Halaman yang tidak menampilkan header dan sidebar
  const hideHeader = pathname === "/" || pathname === "/menu" || pathname === "/login" || pathname.startsWith("/menu");
  
  // Halaman public yang tidak memerlukan auth guard
  const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/menu";

  // Margin kiri dinamis - hanya untuk halaman yang menampilkan sidebar
  const mainMargin = !hideHeader && isSidebarOpen ? "ml-64" : !hideHeader ? "ml-16" : "";



  return (
    <>
      {!hideHeader && <Header />}
      {!hideHeader && <Sidebar />}
      <main className={`${!hideHeader ? `${mainMargin} pt-16` : ""}  bg-[#F8F9FA] min-h-screen transition-all duration-300`}>
        {isPublicPage ? children : <AuthGuard>{children}</AuthGuard>}
      </main>
    </>
  );
} 