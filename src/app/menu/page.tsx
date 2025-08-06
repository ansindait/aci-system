"use client";

import React, { useEffect, useState } from 'react';
// Mengembalikan ikon-ikon ke versi sebelumnya dan menambahkan ikon Lock
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Package, 
  BarChart3,
  Lock // Ikon gembok
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../lib/firebase';

// Interface untuk data pengguna
interface UserData {
  name: string;
  role: string;
  email?: string;
}

// Menjadikan Ikon sebagai Tipe untuk digunakan di array
type IconType = React.FC<React.SVGProps<SVGSVGElement>>;

// Interface untuk tema dan modul
interface ModuleTheme {
  bg: string;
  text: string;
  borderHover: string;
  textHover: string;
}
interface ModuleItem {
  id: number;
  title: string;
  Icon: IconType;
  theme: ModuleTheme;
}

// Helper component untuk memuat Google Font secara dinamis
const GoogleFontLoader = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    // Fungsi cleanup untuk menghapus link saat komponen tidak lagi digunakan
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return null; // Komponen ini tidak me-render apapun ke DOM
};


const AnsindaDashboard: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Mendefinisikan tema biru yang seragam
  const blueTheme: ModuleTheme = {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    borderHover: 'hover:border-blue-500',
    textHover: 'group-hover:text-blue-600',
  };

  // Mendefinisikan modul dengan ikon-ikon yang sudah dikembalikan
  const modules: ModuleItem[] = [
    { id: 1, title: 'HUMAN RESOURCE', Icon: Users, theme: blueTheme },
    { id: 2, title: 'OPERATIONS', Icon: DollarSign, theme: blueTheme },
    { id: 3, title: 'PROJECT', Icon: TrendingUp, theme: blueTheme },
    { id: 4, title: 'MATERIAL', Icon: Package, theme: blueTheme },
    { id: 5, title: 'FINANCE', Icon: BarChart3, theme: blueTheme },
  ];

  const getAccessibleModules = (role: string | undefined) => {
    if (!role) return [];
    const lowerCaseRole = role.toLowerCase();
    if (lowerCaseRole === 'top management') return ['HUMAN RESOURCE', 'OPERATIONS', 'PROJECT', 'MATERIAL', 'FINANCE'];
    if (lowerCaseRole === 'rpm') return ['HUMAN RESOURCE', 'PROJECT', 'MATERIAL'];
    if (lowerCaseRole === 'pic') return ['PROJECT'];
    if (lowerCaseRole === 'qc') return ['PROJECT'];
    if (lowerCaseRole === 'ops') return ['OPERATIONS'];
    if (lowerCaseRole === 'hr') return ['HUMAN RESOURCE'];
    return [];
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({ name: data.name || 'User', role: data.role || 'Unknown Role', email: user.email || 'No email provided' });
          } else { setError('User data not found in Firestore.'); }
        } catch (err: any) { setError(`Failed to load user data: ${err.message}`); }
      } else {
        setError('No user is logged in.');
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleModuleClick = (title: string) => {
    const role = userData?.role?.toLowerCase();
    if (title === 'PROJECT') {
      if (role === 'rpm') router.push('/project/rpm/dashboard');
      else if (role === 'pic') router.push('/project/pic/dashboard');
      else if (role === 'top management') router.push('/project/top/dashboard');
      else if (role === 'qc') router.push('/project/qc/site/details');
      else if (role === 'ops') router.push('/project/ops/ops/details');
    } else if (title === 'OPERATIONS') {
      // Semua role yang mengakses OPERATIONS akan menggunakan struktur ops
      router.push('/project/ops/ops/details');
    } else if (title === 'HUMAN RESOURCE') {
      if (role === 'hr') router.push('/project/hr/personal/employee-data');
      else if (role === 'rpm') router.push('/project/hr/personal/employee-data');
      else if (role === 'top management') router.push('/project/hr/personal/employee-data');
    }
  };

  const accessibleModules = getAccessibleModules(userData?.role);
  const userInitial = userData?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <>
      <GoogleFontLoader />
      <div className="min-h-screen bg-gray-50 font-[Poppins]">
        <div className="p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <header className="mb-8">
              <div>
                {loading ? (
                  <div className="inline-flex items-center space-x-3 bg-white border border-gray-200 rounded-full p-2 pr-6">
                    <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse"></div>
                    <div>
                      <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                ) : error ? (
                  <div className="text-sm text-red-600 p-2">{error}</div>
                ) : (
                  <div className="inline-flex items-center space-x-4 bg-white border border-gray-300 rounded-full p-2 pr-6 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xl flex-shrink-0">
                      {userInitial}
                    </div>
                    <div>
                      <h1 className="text-lg font-medium text-gray-800">
                        Hello, <strong className="font-bold">{userData?.name || 'User'}</strong>!
                      </h1>
                      <p className="text-sm text-gray-600">
                        Position: {userData?.role || 'Unknown Role'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </header>

            {/* Logo and Title Section */}
            <div className="text-center mb-16">
              <div className="flex justify-center mb-6">
                <img src="/logo.jpeg" alt="Ansinda Logo" className="w-24 h-auto object-contain" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">
                ANSINDA COMMUNICATION INDONESIA
              </h1>
              <h2 className="text-xl sm:text-3xl font-bold text-[#124688]">
                SYSTEM
              </h2>
            </div>

            {/* --- Module Cards --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
              {modules.map((module) => {
                const { Icon, theme } = module;
                const isAccessible = accessibleModules.includes(module.title);
                return (
                  <div
                    key={module.id}
                    className={`relative bg-white rounded-xl p-6 group transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-2 border-b-4 border-gray-200 ${theme.borderHover} ${isAccessible ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                    onClick={() => isAccessible && handleModuleClick(module.title)}
                    tabIndex={isAccessible ? 0 : -1}
                    aria-disabled={!isAccessible}
                  >
                    {!isAccessible && (
                      <div className="absolute top-4 right-4 bg-red-100 p-2 rounded-full">
                        <Lock className="w-4 h-4 text-red-500" />
                      </div>
                    )}
                    <div className="flex flex-col items-center text-center pt-4">
                      <div className={`w-20 h-20 ${theme.bg} rounded-full flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className={`w-9 h-9 ${theme.text}`} />
                      </div>
                      <h3 className={`text-sm font-bold text-gray-700 uppercase tracking-wider transition-colors ${theme.textHover}`}>
                        {module.title}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AnsindaDashboard;