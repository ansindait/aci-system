// Session Configuration
export const SESSION_CONFIG = {
// Session timeout in milliseconds (2 hours)
TIMEOUT: 2 * 60 * 60 * 1000,
  
// Warning time before logout (5 minutes)
WARNING_TIME: 5 * 60 * 1000,

  // Activity events to monitor
  ACTIVITY_EVENTS: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
  
  // Local storage keys
  STORAGE_KEYS: {
    LAST_ACTIVITY: 'lastActivity',
    SESSION_START: 'sessionStart',
  },
  
  // Check intervals
  CHECK_INTERVAL: 60000, // 1 minute
  COUNTDOWN_INTERVAL: 1000, // 1 second
};

// Session status types
export enum SessionStatus {
  ACTIVE = 'active',
  WARNING = 'warning',
  EXPIRED = 'expired',
}

// Session warning levels
export enum WarningLevel {
  NONE = 'none',
  WARNING = 'warning',
  CRITICAL = 'critical',
} 