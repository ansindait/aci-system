import { useState, useEffect } from 'react';
import { collection, onSnapshot, collectionGroup, getDoc } from 'firebase/firestore';
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
    const userName = user.name?.toLowerCase();
    let unsubscribeRpm: (() => void) | null = null;
    let unsubscribePermit: (() => void) | null = null;

    // Listen to request_ops_rpm collection (same as approval page)
    unsubscribeRpm = onSnapshot(collection(db, 'request_ops_rpm'), (snapshot) => {
      const rpmData = snapshot.docs.filter(doc => {
        const data = doc.data();
        const isPendingRpm = data.status_ops === 'pending_rpm';
        const isPendingTop = data.status_ops === 'pending_top';
        
        // For RPM role, filter by user name
        if (userRole === 'rpm' && userName) {
          const rpmField = (data.rpm || '').toLowerCase();
          return isPendingRpm && rpmField === userName;
        }
        
        // For other roles, return based on status
        if (userRole === 'top management') {
          return isPendingTop;
        } else if (userRole === 'ops') {
          return isPendingTop;
        }
        
        return isPendingRpm;
      });

      // Listen to all request_ops subcollections (same as approval page)
      unsubscribePermit = onSnapshot(collectionGroup(db, 'request_ops'), async (permitSnapshot) => {
        // Process subcollection documents with async filtering
        const permitDataPromises = permitSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const isPendingRpm = data.status_ops === 'pending_rpm';
          const isPendingTop = data.status_ops === 'pending_top';
          
          // For RPM role, filter by user name
          if (userRole === 'rpm' && userName) {
            // Check RPM field in the document itself
            const rpmField = (data.rpm || '').toLowerCase();
            if (isPendingRpm && rpmField === userName) {
              return doc;
            }
            
            // If not found in document, check parent document (tasks)
            if (doc.ref.parent.parent) {
              try {
                const parentSnap = await getDoc(doc.ref.parent.parent);
                if (parentSnap.exists()) {
                  const parentData = parentSnap.data();
                  const parentRpmField = (parentData.rpm || '').toLowerCase();
                  if (isPendingRpm && parentRpmField === userName) {
                    return doc;
                  }
                }
              } catch (error) {
                console.error('Error fetching parent document:', error);
              }
            }
            
            return null; // No match found
          }
          
          // For other roles, return based on status
          if (userRole === 'top management') {
            return isPendingTop ? doc : null;
          } else if (userRole === 'ops') {
            return isPendingTop ? doc : null;
          }
          
          return isPendingRpm ? doc : null;
        });
        
        const permitDataResults = await Promise.all(permitDataPromises);
        const permitData = permitDataResults.filter(doc => doc !== null);

        // Combine both sources and count based on role
        let totalPending = 0;

        if (userRole === 'rpm') {
          // RPM sees pending_rpm requests from both request_ops_rpm and subcollections
          // Filtered by user name (already done above)
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