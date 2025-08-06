import { useState, useEffect } from 'react';
import { collection, onSnapshot, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSidebar } from '@/context/SidebarContext';

export const usePendingOpsRequests = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useSidebar();

  useEffect(() => {
    if (!user) {
      setPendingCount(0);
      setLoading(false);
      return;
    }

    const userRole = user.role.toLowerCase();
    let unsubscribeRpm: (() => void) | null = null;
    let unsubscribePermit: (() => void) | null = null;

    // Listen to request_ops_rpm collection (same as approval page)
    unsubscribeRpm = onSnapshot(collection(db, 'request_ops_rpm'), (snapshot) => {
      const rpmData = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status_ops === 'pending_rpm';
      });

      // Listen to all request_ops subcollections (same as approval page)
      unsubscribePermit = onSnapshot(collectionGroup(db, 'request_ops'), (permitSnapshot) => {
        const permitData = permitSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.status_ops === 'pending_rpm';
        });

        // Combine both sources and count based on role
        let totalPending = 0;

        if (userRole === 'rpm') {
          // RPM sees pending_rpm requests from both request_ops_rpm and subcollections
          totalPending = rpmData.length + permitData.length;
        } else if (userRole === 'top management') {
          // Top management sees pending_top requests (requests approved by RPM that need TOP approval)
          const topRpmData = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.status_ops === 'pending_top';
          });
          const topPermitData = permitSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.status_ops === 'pending_top';
          });
          totalPending = topRpmData.length + topPermitData.length;
        } else if (userRole === 'pic') {
          // PIC sees requests for their assigned division
          const userDivision = user.division?.toLowerCase();
          if (userDivision) {
            totalPending += rpmData.filter(doc => {
              const data = doc.data();
              return data.division?.toLowerCase() === userDivision;
            }).length;
            totalPending += permitData.filter(doc => {
              const data = doc.data();
              return data.division?.toLowerCase() === userDivision;
            }).length;
          }
        } else if (userRole === 'qc') {
          // QC sees requests for quality-related divisions
          const qualityDivisions = ['snd', 'el', 'dc'];
          totalPending += rpmData.filter(doc => {
            const data = doc.data();
            return qualityDivisions.includes(data.division?.toLowerCase());
          }).length;
          totalPending += permitData.filter(doc => {
            const data = doc.data();
            return qualityDivisions.includes(data.division?.toLowerCase());
          }).length;
        } else if (userRole === 'ops') {
          // OPS sees all pending_top requests
          const topRpmData = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.status_ops === 'pending_top';
          });
          const topPermitData = permitSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.status_ops === 'pending_top';
          });
          totalPending = topRpmData.length + topPermitData.length;
        }

        setPendingCount(totalPending);
        setLoading(false);
      }, (error) => {
        console.error('Error listening to permit requests:', error);
        setPendingCount(0);
        setLoading(false);
      });
    }, (error) => {
      console.error('Error listening to RPM requests:', error);
      setPendingCount(0);
      setLoading(false);
    });

    return () => {
      if (unsubscribeRpm) {
        unsubscribeRpm();
      }
      if (unsubscribePermit) {
        unsubscribePermit();
      }
    };
  }, [user]);

  return { pendingCount, loading };
}; 