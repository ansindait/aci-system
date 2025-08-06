import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { SESSION_CONFIG } from './sessionConfig';

class SessionManager {
  private timeoutId: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    this.resetTimer = this.resetTimer.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }

  private resetTimer() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.timeoutId = setTimeout(() => {
      this.handleLogout();
    }, SESSION_CONFIG.TIMEOUT);
  }

  private async handleLogout() {
    try {
      await signOut(auth);
      // Clear any stored session data
      localStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
      localStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_START);
      sessionStorage.clear();
      
      // Redirect to login page
      window.location.href = '/';
    } catch (error) {
      console.error('Error during auto-logout:', error);
    }
  }

  private updateLastActivity() {
    localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
  }

  private checkSessionOnLoad() {
    const lastActivity = localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
      if (timeSinceLastActivity >= SESSION_CONFIG.TIMEOUT) {
        // Session has expired, logout immediately
        this.handleLogout();
        return false;
      }
    }
    return true;
  }

  public init() {
    if (this.isInitialized) return;

    // Check if session is still valid on page load
    if (!this.checkSessionOnLoad()) {
      return;
    }

    // Update last activity
    this.updateLastActivity();

    // Add event listeners for user activity
    SESSION_CONFIG.ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, this.resetTimer, true);
    });

    // Set initial timer
    this.resetTimer();

    this.isInitialized = true;
  }

  public destroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Remove event listeners
    SESSION_CONFIG.ACTIVITY_EVENTS.forEach(event => {
      document.removeEventListener(event, this.resetTimer, true);
    });

    this.isInitialized = false;
  }

  public updateActivity() {
    this.updateLastActivity();
    this.resetTimer();
  }

  public getSessionStatus() {
    const lastActivity = localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
    if (!lastActivity) return { status: 'inactive', timeLeft: 0 };

    const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
    const timeLeft = SESSION_CONFIG.TIMEOUT - timeSinceLastActivity;

    if (timeLeft <= 0) {
      return { status: 'expired', timeLeft: 0 };
    } else if (timeLeft <= SESSION_CONFIG.WARNING_TIME) {
      return { status: 'warning', timeLeft };
    } else {
      return { status: 'active', timeLeft };
    }
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

export default sessionManager; 