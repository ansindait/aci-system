"use client";

import React, { useState, useEffect } from 'react';
import sessionManager from '@/lib/sessionManager';
import { SESSION_CONFIG } from '@/lib/sessionConfig';

const SessionWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const checkSession = () => {
      const status = sessionManager.getSessionStatus();
      
      if (status.status === 'warning') {
        setShowWarning(true);
        setTimeLeft(Math.ceil(status.timeLeft / 1000));
      } else {
        setShowWarning(false);
      }
    };

    // Check immediately
    checkSession();

    // Check every second
    const interval = setInterval(checkSession, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleExtendSession = () => {
    sessionManager.updateActivity();
    setShowWarning(false);
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-red-600 mb-4">Session Timeout Warning</h2>
        <p className="text-gray-700 mb-4">
          Your session will expire in <span className="font-bold">{timeLeft}</span> seconds due to inactivity.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleExtendSession}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-200"
          >
            Extend Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionWarning; 