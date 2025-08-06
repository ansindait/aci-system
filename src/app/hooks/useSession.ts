import { useEffect } from 'react';
import sessionManager from '@/lib/sessionManager';

export const useSession = () => {
  useEffect(() => {
    // Initialize session management when component mounts
    sessionManager.init();

    // Cleanup when component unmounts
    return () => {
      sessionManager.destroy();
    };
  }, []);
}; 