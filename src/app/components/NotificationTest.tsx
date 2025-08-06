"use client";

import React from 'react';
import { usePendingOpsRequests } from '@/app/hooks/usePendingOpsRequests';
import NotificationDot from './NotificationDot';

const NotificationTest: React.FC = () => {
  const { pendingCount, loading } = usePendingOpsRequests();

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50">
      <h3 className="text-sm font-semibold mb-2">Notification Test</h3>
      <div className="text-xs space-y-1">
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Pending Count: {pendingCount}</div>
        <div className="flex items-center space-x-2">
          <span>Notification Dot:</span>
          <NotificationDot count={pendingCount} size="sm" />
        </div>
      </div>
    </div>
  );
};

export default NotificationTest; 